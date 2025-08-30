import React, { useState, useEffect, useRef } from 'react'
import {
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  CircularProgress,
  Alert,
  TextField,
  // Autocomplete,
} from '@mui/material'
import { observer } from 'mobx-react'
import ImageGalleryView from '../../ImageGalleryView/components/ImageGalleryView'
import { getAssemblyDisplayName } from '../stateModel'

// Constants
const SEARCH_DEBOUNCE_MS = 300

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
    setSelectedFeature: (
      featureId: string | undefined,
      featureType?: string,
      images?: string,
      labels?: string,
      types?: string,
    ) => void
    clearSelections: () => void
    setLoadingFeatures: (loading: boolean) => void
    // Text search related methods
    setSearchTerm: (term: string) => void
    searchFeatures: () => void
    clearSearch: () => void
  }
}

const FlexibleImageGalleryViewComponent: React.FC<FlexibleImageGalleryViewProps> =
  observer(({ model }) => {
    const [error, setError] = useState<string | null>(null)
    const [searchInputValue, setSearchInputValue] = useState('')
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isUpdatingSearchRef = useRef(false)

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }
      }
    }, [])

    // Debounced search effect
    useEffect(() => {
      if (!searchInputValue?.trim()) {
        return
      }

      const timeoutId = setTimeout(() => {
        if (isUpdatingSearchRef.current) {
          return // Skip if we're updating from model changes
        }

        //console.log('🔍 Debounced search executing with:', searchInputValue)
        model.setSearchTerm(searchInputValue)
        // Search is automatically triggered by the model when searchTerm changes
      }, SEARCH_DEBOUNCE_MS)

      return () => clearTimeout(timeoutId)
    }, [searchInputValue, model])

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
      // Only sync if we're not the ones updating the search term
      if (
        !isUpdatingSearchRef.current &&
        model.searchTerm !== searchInputValue
      ) {
        setSearchInputValue(model.searchTerm ?? '')
      }
      isUpdatingSearchRef.current = false
    }, [model.searchTerm])

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
        model.setSelectedFeature(
          feature.id,
          feature.type === 'gene' ? 'GENE' : 'NON_GENE',
          feature.images,
          feature.image_captions,
          feature.image_group,
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

    return (
      <Paper sx={{ p: 2, m: 1 }} elevation={1}>
        <Typography variant="h6" gutterBottom>
          {model.displayTitle}
        </Typography>

        {/* Assembly Selection */}
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="assembly-select-label">Select Assembly</InputLabel>
            <Select
              labelId="assembly-select-label"
              id="assembly-select"
              value={model.selectedAssemblyId ?? ''}
              label="Select Assembly"
              onChange={e => handleAssemblyChange(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {model.availableAssemblies.map(assembly => (
                <MenuItem key={assembly.name} value={assembly.name}>
                  {getAssemblyDisplayName(assembly)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {model.availableAssemblies.length === 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              No assemblies available in this session
            </Typography>
          )}
        </Box>

        {/* Track Selection */}
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="track-select-label">Select Track</InputLabel>
            <Select
              labelId="track-select-label"
              id="track-select"
              value={model.selectedTrackId ?? ''}
              label="Select Track"
              onChange={e => handleTrackChange(e.target.value)}
              disabled={!model.selectedAssemblyId || model.isLoadingTracks}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {model.availableTracks.map(track => (
                <MenuItem key={track.trackId} value={track.trackId}>
                  {String(track.name || track.trackId)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {!model.selectedAssemblyId && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              Select an assembly first to view available tracks
            </Typography>
          )}
          {model.selectedAssemblyId && model.availableTracks.length === 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              No compatible tracks available for selected assembly
            </Typography>
          )}
        </Box>

        {/* Feature Search */}
        {model.selectedTrackId && (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Search Features"
              placeholder="Type to search for features (min 3 chars)..."
              value={searchInputValue}
              onChange={e => {
                const newValue = e.target.value
                //console.log('DEBUG: onChange fired with:', newValue)
                setSearchInputValue(newValue)

                // Handle debounced search separately
                if (debounceTimeoutRef.current) {
                  clearTimeout(debounceTimeoutRef.current)
                }
                debounceTimeoutRef.current = setTimeout(() => {
                  isUpdatingSearchRef.current = true
                  model.setSearchTerm(newValue)
                  if (newValue.trim().length >= 3) {
                    model.searchFeatures()
                  } else {
                    model.clearSearch()
                  }
                }, 300)
              }}
              onFocus={() => {}}
              onBlur={() => {}}
              onKeyDown={() => {}} // Remove unused parameter from onKeyDown
              InputProps={{
                endAdornment: (
                  <>
                    {model.isSearching && (
                      <CircularProgress color="inherit" size={20} />
                    )}
                  </>
                ),
              }}
            />
            {/* Show search results in a simple list for now */}
            {model.features.length > 0 && (
              <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                {model.features.map(feature => (
                  <Box
                    key={feature.id}
                    sx={{
                      p: 1,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                    onClick={() => handleFeatureSelect(feature)}
                  >
                    <Typography variant="body2">
                      <strong>{feature.name ?? feature.id}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {feature.type}
                      {feature.location && ` • ${feature.location}`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Clear Button */}
        {(model.selectedTrackId ??
          model.selectedFeatureId ??
          model.hasSearchTerm) && (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={handleClearSelections}
            >
              Clear Selections
            </Typography>
          </Box>
        )}

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
        {!model.selectedAssemblyId && (
          <Box
            sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              Select an assembly from the dropdown above to begin browsing
              tracks and features independently of the main JBrowse selection.
            </Typography>
          </Box>
        )}

        {model.selectedAssemblyId && !model.selectedTrackId && (
          <Box
            sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              Select a track from the &ldquo;
              {getAssemblyDisplayName(model.selectedAssembly) || 'selected'}
              &rdquo; assembly to view available features.
            </Typography>
          </Box>
        )}

        {model.selectedTrackId &&
          !model.selectedFeatureId &&
          !model.hasSearchTerm &&
          !model.isSearching && (
            <Box
              sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Start typing in the search box above to find features from the
                &ldquo;
                {model.selectedTrack?.name ?? 'selected'}&rdquo; track and view
                their image galleries.
              </Typography>
            </Box>
          )}
      </Paper>
    )
  })

export default FlexibleImageGalleryViewComponent
