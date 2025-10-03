import React, { useCallback, useEffect, useState } from 'react'
import { observer } from 'mobx-react'
import { isAlive } from 'mobx-state-tree'
import { Box, Typography } from '@mui/material'
import { getSession, AbstractSessionModel } from '@jbrowse/core/util'
import {
  getTrackId,
  getAdapterConfig,
  getTracksFromSession,
} from '../../shared/configUtils'
import { SelectTextualDescriptionsViewF } from '../../SelectTextualDescriptionsView/components/Explainers'
import {
  AssemblySelector,
  TrackSelector,
  FeatureSearchAutocomplete,
  FlexibleViewContainer,
  InstructionsPanel,
  ErrorDisplay,
  ClearSelectionsButton,
} from '../../shared/components/FlexibleViewSelectors'

interface FeatureOption {
  id: string
  name: string
  type: string
  location?: string
  description?: string
  markdown_urls?: string
  descriptions?: string
  content_types?: string
  content_type?: string
}

interface FlexibleTextualDescriptionsViewProps {
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
    selectedAssembly?: {
      name: string
      displayName?: string
    }
    selectedTrack?: {
      trackId: string
      name: string
    }
    hasContent: boolean
    featureMarkdownUrls?: string
    featureDescriptions?: string
    featureContentTypes?: string
    isLoadingTracks: boolean
    isLoadingFeatures: boolean
    canSelectTrack: boolean
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
    setSelectedFeature: (
      featureId: string | undefined,
      featureType?: string,
      markdownUrls?: string,
      descriptions?: string,
      contentTypes?: string,
    ) => void
    clearSelections: () => void
    setLoadingFeatures: (loading: boolean) => void
    // Text search related methods
    setSearchTerm: (term: string) => void
    searchFeatures: () => void
    clearSearch: () => void
  } & AbstractSessionModel // Add AbstractSessionModel to the model type
}

const FlexibleTextualDescriptionsViewComponent: React.FC<FlexibleTextualDescriptionsViewProps> =
  observer(({ model }) => {
    const [error, setError] = useState<string | null>(null)
    const [searchInputValue, setSearchInputValue] = useState('')

    const searchHandler = useCallback(
      (value: string) => {
        model.setSearchTerm(value)
        const trimmedValue = value.trim()

        if (trimmedValue.length >= 3) {
          model.searchFeatures()
        } else if (trimmedValue.length === 0) {
          // Clear search when input is completely empty
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

    // Use features from the model instead of loading them directly
    useEffect(() => {
      // Simply use the features from the model - no direct data loading here
      if (model.selectedTrackId && model.selectedTrack) {
        // The model will handle loading features through proper JBrowse2 patterns
        //console.log('Track selected, model will handle feature loading')
      }
    }, [model, model.selectedTrackId, model.selectedTrack])

    // Clear feature selection when features change
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
        '🔄 DEBUG: Forced re-render due to searchResults change:',
        model.searchResults.length,
      )
    }, [model.searchResults.length])

    const handleAssemblyChange = (assemblyId: string) => {
      // console.log('🎯 DEBUG: TextualDescriptionsView handleAssemblyChange called with:', assemblyId)
      // console.log('🎯 DEBUG: model.setSelectedAssembly exists:', typeof model.setSelectedAssembly)
      // console.log('🎯 DEBUG: model object:', Object.keys(model))
      if (typeof model.setSelectedAssembly === 'function') {
        model.setSelectedAssembly(assemblyId ?? undefined)
      } else {
        console.error(
          '🎯 DEBUG: model.setSelectedAssembly is not a function!',
          typeof model.setSelectedAssembly,
        )
      }
    }

    const handleTrackChange = (trackId: string) => {
      model.setSelectedTrack(trackId ?? undefined)
      // Clear search when track changes
      setSearchInputValue('')
      model.clearSearch()
    }
    const handleFeatureSelect = (feature: FeatureOption | null) => {
      if (feature?.location) {
        // Async operation to fetch actual feature data
        const fetchFeatureData = async () => {
          try {
            // Parse location to get coordinates for fetching actual feature data
            const locationMatch = feature.location!.match(
              /^(.+):(\d+)\.\.(\d+)$/,
            )
            if (locationMatch) {
              const [, refName, startStr, endStr] = locationMatch
              const start = parseInt(startStr, 10)
              const end = parseInt(endStr, 10)

              // Get session and fetch feature data directly using RPC
              const session = getSession(model)
              const trackConfs = getTracksFromSession(session)
              const trackConf = trackConfs.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (tc: any) => getTrackId(tc) === model.selectedTrackId,
              )

              if (trackConf && session.id) {
                // Get adapter configuration using unified utility
                const adapter = getAdapterConfig(trackConf)
                const rpcManager = session.rpcManager
                const sessionId = session.id

                const queryRegion = {
                  refName,
                  start: start - 1, // Convert to 0-based
                  end,
                  assemblyName: model.selectedAssemblyId,
                }

                const featureResults = await rpcManager.call(
                  sessionId,
                  'CoreGetFeatures',
                  {
                    sessionId,
                    regions: [queryRegion],
                    adapterConfig: adapter,
                  },
                )

                const features = Array.isArray(featureResults)
                  ? featureResults
                  : []
                const matchingFeature = features.find(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (f: any) => {
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

                    console.log('🎯 DEBUG: Checking feature ID/Name:', fId, fName, 'against:', feature.id)
                    return fId === feature.id || fName === feature.id
                  },
                )

                if (matchingFeature) {
                  // Extract GFF attributes from the actual feature
                  const markdownUrls = String(
                    matchingFeature.get?.('markdown_urls') ||
                      matchingFeature.get?.('markdown_url') ||
                      '',
                  )
                  const descriptions = String(
                    matchingFeature.get?.('descriptions') ||
                      matchingFeature.get?.('description') ||
                      '',
                  )
                  const contentTypes = String(
                    matchingFeature.get?.('content_types') ||
                      matchingFeature.get?.('content_type') ||
                      '',
                  )

                  model.setSelectedFeature(
                    feature.id,
                    feature.type === 'gene' ? 'GENE' : 'NON_GENE',
                    markdownUrls,
                    descriptions,
                    contentTypes,
                  )
                  return
                }
              }
            }
          } catch (error) {
            console.error('Error fetching feature data:', error)
          }

          // Fallback to basic selection without content
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
          contentType="textual"
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
              // Use the existing TextualDescriptionsView component for content display
              <SelectTextualDescriptionsViewF
                model={{
                  hasContent: model.hasContent,
                  displayTitle: `Content for ${model.selectedFeatureId}`,
                  featureMarkdownUrls: model.featureMarkdownUrls,
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
                  Feature has no textual descriptions
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
          contentType="textual"
        />
      </FlexibleViewContainer>
    )
  })

export default FlexibleTextualDescriptionsViewComponent
