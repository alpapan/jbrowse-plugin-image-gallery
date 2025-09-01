import React, { useState, useEffect, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
import { observer } from 'mobx-react'
import { isAlive } from 'mobx-state-tree'
import ImageGalleryView from '../../SelectImageGalleryView/components/ImageGalleryView'
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
  images?: string
  image_captions?: string
  image_group?: string
  image_tag?: string
}

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
        model.setSearchTerm(value)
        if (value.trim()) {
          model.searchFeatures()
        } else {
          model.clearSearch()
        }
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

    const handleAssemblyChange = (assemblyId: string) => {
      model.setSelectedAssembly(assemblyId ?? undefined)
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
        images?: string
        image_captions?: string
        image_group?: string
      } | null,
    ) => {
      if (feature) {
        // Use the new action that fetches image data
        model.selectFeatureWithImageData(feature.id)
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
          features={model.features}
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
              // Use the existing ImageGalleryView component for content display
              <ImageGalleryView
                model={{
                  hasContent: model.hasContent,
                  displayTitle: `Images for ${model.selectedFeatureId}`,
                  featureImages: model.featureImages,
                  featureLabels: model.featureLabels,
                  featureTypes: model.featureTypes,
                  selectedFeatureId: model.selectedFeatureId,
                  minimized: false,
                  setMinimized: () => {},
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
