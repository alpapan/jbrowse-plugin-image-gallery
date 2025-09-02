import React, { useState, useEffect, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
import { observer } from 'mobx-react'
import { isAlive } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject } from '@jbrowse/core/configuration'
import {
  getTrackId,
  getAdapterConfig,
  getTracksFromSession,
} from '../../shared/configUtils'
import ImageGalleryView from '../../SelectImageGalleryView/components/ImageGalleryView'
import { SelectImageGalleryViewF } from '../../SelectImageGalleryView/components/Explainers'
import {
  AssemblySelector,
  TrackSelector,
  FeatureSearchAutocomplete,
  FlexibleViewContainer,
  InstructionsPanel,
  ErrorDisplay,
  ClearSelectionsButton,
  type FeatureOption,
} from '../../shared/components/FlexibleViewSelectors'

interface FlexibleImageGalleryViewProps {
  model: {
    id: string
    displayTitle: string
    selectedAssemblyId?: string
    selectedTrackId?: string
    selectedFeatureId?: string
    availableAssemblies: {
      name: string
      displayName?: string
    }[]
    availableTracks: {
      trackId: string
      name: string
      configuration: {
        adapter: {
          type: string
        }
      }
    }[]
    selectedTrack?: {
      trackId: string
      name: string
    }
    selectedAssembly?: {
      name: string
      displayName?: string
    }
    hasContent: boolean
    featureImages?: string
    featureLabels?: string
    featureTypes?: string
    isLoadingTracks: boolean
    isLoadingFeatures: boolean
    canSelectFeature: boolean
    isReady: boolean
    // Text search related properties
    searchTerm?: string
    searchResults: FeatureOption[]
    isSearching: boolean
    hasSearchTerm: boolean
    hasSearchResults: boolean
    canSearch: boolean
    features: FeatureOption[]
    setSelectedAssembly: (assemblyId: string | undefined) => void
    setSelectedTrack: (trackId: string | undefined) => void
    setSearchTerm: (term: string) => void
    searchFeatures: () => void
    clearSearch: () => void
    // Feature selection with image data fetching
    selectFeatureWithImageData: (featureId: string | undefined) => void
    setSelectedFeature: (
      featureId: string | undefined,
      featureType?: string,
      images?: string,
      labels?: string,
      types?: string,
    ) => void
    clearSelections: () => void
    setLoadingFeatures: (loading: boolean) => void
  }
}

const FlexibleImageGalleryViewComponent: React.FC<FlexibleImageGalleryViewProps> =
  observer(({ model }) => {
    const [error, setError] = useState<string | null>(null)
    const [searchInputValue, setSearchInputValue] = useState('')

    const searchHandler = useCallback(
      (value: string) => {
        console.log('🔍 DEBUG: Component searchHandler called with:', value)
        model.setSearchTerm(value)
        const trimmedValue = value.trim()

        if (trimmedValue.length >= 3) {
          console.log(
            '🔍 DEBUG: Component calling model.searchFeatures() - meets min length',
          )
          model.searchFeatures()
        } else if (trimmedValue.length === 0) {
          // Clear search when input is completely empty
          console.log(
            '🔍 DEBUG: Component calling model.clearSearch() - empty input',
          )
          model.clearSearch()
        }
        // For 1-2 characters, do nothing (don't search, don't clear existing results)
      },
      [model],
    )

    // Cleanup on unmount - safely check if model is still alive
    useEffect(() => {
      return () => {
        // Check if the MST node is still alive before calling methods
        if (isAlive(model as unknown as Parameters<typeof isAlive>[0])) {
          model.clearSearch()
        }
      }
    }, [model])

    // Clear selected feature if it no longer exists in features list
    useEffect(() => {
      if (model.selectedFeatureId && model.features.length > 0) {
        const selectedFeatureExists = model.features.some(
          f => f.id === model.selectedFeatureId,
        )
        if (!selectedFeatureExists) {
          model.setSelectedFeature(undefined)
        }
      }
    }, [model.features, model])

    // Sync search input when model search term changes externally
    useEffect(() => {
      if (model.searchTerm !== searchInputValue) {
        setSearchInputValue(model.searchTerm ?? '')
      }
    }, [model.searchTerm, searchInputValue])

    // Force re-render when search results change to ensure MobX reactivity
    const [, forceUpdate] = useState({})
    useEffect(() => {
      // Force component to re-render when searchResults length changes
      forceUpdate({})
      console.log(
        '🔄 DEBUG: ImageGallery forced re-render due to searchResults change:',
        model.searchResults.length,
      )
    }, [model.searchResults.length])

    const handleAssemblyChange = (assemblyId: string) => {
      model.setSelectedAssembly(assemblyId ?? undefined)
    }

    const handleTrackChange = (trackId: string) => {
      model.setSelectedTrack(trackId ?? undefined)
      // Clear search when track changes
      setSearchInputValue('')
      model.clearSearch()
    }

    const handleFeatureSelect = (feature: FeatureOption | null) => {
      console.log('🎯 DEBUG: handleFeatureSelect called with:', feature)
      if (feature?.location) {
        // Set feature immediately to show the view, then fetch data
        model.setSelectedFeature(
          feature.id,
          feature.type === 'gene' ? 'GENE' : 'NON_GENE',
          '',
          '',
          '',
        )

        // Async operation to fetch actual feature data
        const fetchFeatureData = async () => {
          try {
            console.log('🎯 DEBUG: Starting fetchFeatureData for:', feature.id)
            // Parse location to get coordinates for fetching actual feature data
            const locationMatch = feature.location!.match(
              /^(.+):(\d+)\.\.(\d+)$/,
            )
            console.log('🎯 DEBUG: Location match result:', locationMatch)
            if (locationMatch) {
              const [, refName, startStr, endStr] = locationMatch
              const start = parseInt(startStr, 10)
              const end = parseInt(endStr, 10)

              // Get session and fetch feature data directly using RPC
              const session = getSession(model as any)
              console.log('🎯 DEBUG: Got session:', !!session)
              const trackConfs = getTracksFromSession(session)
              console.log('🎯 DEBUG: trackConfs length:', trackConfs.length)
              console.log(
                '🎯 DEBUG: Looking for trackId:',
                model.selectedTrackId,
              )

              const trackConf = trackConfs.find((tc: any) => {
                const tcTrackId = getTrackId(tc)
                console.log(
                  '🎯 DEBUG: Comparing track IDs:',
                  tcTrackId,
                  'vs',
                  model.selectedTrackId,
                )
                return tcTrackId === model.selectedTrackId
              })
              console.log('🎯 DEBUG: Found trackConf:', !!trackConf)

              if (trackConf && session.id) {
                // Get adapter configuration using unified utility
                const adapter = getAdapterConfig(trackConf)
                console.log('🎯 DEBUG: Got adapter config:', !!adapter)
                const rpcManager = session.rpcManager
                const sessionId = session.id

                const queryRegion = {
                  refName,
                  start: start - 1, // Convert to 0-based
                  end,
                  assemblyName: model.selectedAssemblyId,
                }
                console.log('🎯 DEBUG: Query region:', queryRegion)

                const featureResults = await rpcManager.call(
                  sessionId,
                  'CoreGetFeatures',
                  {
                    sessionId,
                    regions: [queryRegion],
                    adapterConfig: adapter,
                  },
                )
                console.log('🎯 DEBUG: RPC featureResults:', featureResults)

                const features = Array.isArray(featureResults)
                  ? featureResults
                  : []
                console.log('🎯 DEBUG: Features array length:', features.length)

                // Debug: Log all available attributes on the first feature
                if (features.length > 0) {
                  const firstFeature = features[0]
                  console.log('🎯 DEBUG: First feature object:', firstFeature)
                  console.log('🎯 DEBUG: First feature attributes:')
                  // Try to get all possible attributes
                  const possibleAttrs = [
                    'ID',
                    'id',
                    'Name',
                    'name',
                    'gene',
                    'gene_name',
                    'locus_tag',
                    'product',
                    'images',
                    'image',
                    'image_urls',
                    'image_url',
                  ]
                  possibleAttrs.forEach(attr => {
                    try {
                      const value = firstFeature.get?.(attr)
                      if (value !== undefined) {
                        console.log(`🎯 DEBUG: ${attr}:`, value)
                      }
                    } catch (e) {
                      // ignore
                    }
                  })
                }

                const matchingFeature = features.find((f: any) => {
                  // Use the same comprehensive ID extraction as flexibleViewUtils.ts
                  const fId =
                    f.get?.('ID') ??
                    f.get?.('id') ??
                    f.get?.('Name') ??
                    f.get?.('name') ??
                    f.id?.() ??
                    ''
                  const fName =
                    f.get?.('Name') ??
                    f.get?.('name') ??
                    f.get?.('ID') ??
                    f.get?.('id') ??
                    'Unnamed feature'

                  console.log(
                    '🎯 DEBUG: Checking feature ID/Name:',
                    fId,
                    fName,
                    'against:',
                    feature.id,
                  )
                  return fId === feature.id || fName === feature.id
                })
                console.log(
                  '🎯 DEBUG: Found matching feature:',
                  !!matchingFeature,
                )

                if (matchingFeature) {
                  // Extract GFF attributes from the actual feature
                  const images = String(
                    matchingFeature.get?.('images') ||
                      matchingFeature.get?.('image') ||
                      '',
                  )
                  const imageCaptions = String(
                    matchingFeature.get?.('image_captions') ||
                      matchingFeature.get?.('image_caption') ||
                      '',
                  )
                  const imageGroup = String(
                    matchingFeature.get?.('image_group') ||
                      matchingFeature.get?.('image_groups') ||
                      '',
                  )
                  console.log(
                    '🎯 DEBUG: Extracted GFF attributes - images:',
                    images,
                    'captions:',
                    imageCaptions,
                    'group:',
                    imageGroup,
                  )

                  // Update with actual content
                  model.setSelectedFeature(
                    feature.id,
                    feature.type === 'gene' ? 'GENE' : 'NON_GENE',
                    images,
                    imageCaptions,
                    imageGroup,
                  )
                  console.log(
                    '🎯 DEBUG: Called setSelectedFeature with content',
                  )
                  return
                } else {
                  console.log(
                    '🎯 DEBUG: No matching feature found in RPC results',
                  )
                }
              } else {
                console.log(
                  '🎯 DEBUG: Missing trackConf or session.id:',
                  !!trackConf,
                  !!session.id,
                )
              }
            }
          } catch (error) {
            console.error('🎯 DEBUG: Error in fetchFeatureData:', error)
          }

          // Fallback to basic selection without content
          console.log(
            '🎯 DEBUG: Falling back to basic selection without content',
          )
          model.setSelectedFeature(
            feature.id,
            feature.type === 'gene' ? 'GENE' : 'NON_GENE',
            '',
            '',
            '',
          )
        }

        // Start async fetch but don't await it
        void fetchFeatureData()
      } else {
        console.log('🎯 DEBUG: No feature or location, clearing selection')
        model.setSelectedFeature(undefined)
      }
    }

    const handleClearSelections = () => {
      model.clearSelections()
      setSearchInputValue('')
      model.clearSearch()
      setError(null)
    }

    const hasSelections = Boolean(
      model.selectedTrackId ?? model.selectedFeatureId ?? model.hasSearchTerm,
    )

    return (
      <FlexibleViewContainer model={model}>
        {/* Assembly Selection */}
        <AssemblySelector
          selectedAssemblyId={model.selectedAssemblyId}
          availableAssemblies={model.availableAssemblies}
          onAssemblyChange={handleAssemblyChange}
        />

        {/* Track Selection */}
        <TrackSelector
          selectedTrackId={model.selectedTrackId}
          availableTracks={model.availableTracks}
          onTrackChange={handleTrackChange}
          selectedAssemblyId={model.selectedAssemblyId}
          isLoadingTracks={model.isLoadingTracks}
        />

        {/* Feature Search */}
        <FeatureSearchAutocomplete
          searchInputValue={searchInputValue}
          onSearchInputChange={value => {
            setSearchInputValue(value)
            searchHandler(value)
          }}
          features={model.searchResults}
          onFeatureSelect={handleFeatureSelect}
          isSearching={model.isSearching}
          canSearch={model.canSearch}
          selectedTrackId={model.selectedTrackId}
          hasSearchTerm={model.hasSearchTerm}
          contentType="image"
        />

        {/* Error Display */}
        <ErrorDisplay error={error} />

        {/* Clear Button */}
        <ClearSelectionsButton
          hasSelections={hasSelections}
          onClear={handleClearSelections}
        />

        {/* Content Display */}
        {model.selectedFeatureId && model.isReady && (
          <Box sx={{ mt: 2 }}>
            {model.hasContent ? (
              // Use the SelectImageGalleryViewF component directly for proper formatting
              <SelectImageGalleryViewF
                model={{
                  hasContent: model.hasContent,
                  displayTitle: `Images for ${model.selectedFeatureId}`,
                  featureImages: model.featureImages,
                  featureLabels: model.featureLabels,
                  featureTypes: model.featureTypes,
                  selectedFeatureId: model.selectedFeatureId,
                }}
              />
            ) : (
              <Box
                sx={{
                  mt: 2,
                  p: 3,
                  textAlign: 'center',
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body1" gutterBottom>
                  Feature has no images
                </Typography>
                <Typography variant="body2">
                  Selected feature: {model.selectedFeatureId}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Instructions */}
        <InstructionsPanel
          selectedAssemblyId={model.selectedAssemblyId}
          selectedTrackId={model.selectedTrackId}
          selectedFeatureId={model.selectedFeatureId}
          hasSearchTerm={model.hasSearchTerm}
          isSearching={model.isSearching}
          selectedAssembly={model.selectedAssembly}
          selectedTrack={model.selectedTrack}
          contentType="image"
        />
      </FlexibleViewContainer>
    )
  })

export default FlexibleImageGalleryViewComponent
