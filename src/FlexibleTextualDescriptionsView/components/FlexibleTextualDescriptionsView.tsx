import React, { useCallback, useEffect, useState } from 'react'
import { observer } from 'mobx-react'
import { isAlive } from 'mobx-state-tree'
import { Box, Typography } from '@mui/material'
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
  }
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

    const handleFeatureSelect = (
      feature: {
        id: string
        name: string
        type: string
        markdown_urls?: string
        descriptions?: string
        content_types?: string
      } | null,
    ) => {
      if (feature) {
        model.setSelectedFeature(
          feature.id,
          feature.type === 'gene' ? 'GENE' : 'NON_GENE',
          feature.markdown_urls,
          feature.descriptions,
          feature.content_types,
        )
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
