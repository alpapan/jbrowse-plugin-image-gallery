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
  Autocomplete,
} from '@mui/material'
import { TextualDescriptionsViewF } from '../../TextualDescriptionsView/components/Explainers'
import { getAssemblyDisplayName } from '../stateModel'
import { observer } from 'mobx-react'

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
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Handle search input changes with debouncing
    const handleSearchInputChange = (value: string) => {
      setSearchInputValue(value)

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Set new timeout
      debounceTimeoutRef.current = setTimeout(() => {
        model.setSearchTerm(value)
        if (value.trim()) {
          model.searchFeatures()
        } else {
          model.clearSearch()
        }
      }, 300)
    }

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }
      }
    }, [])

    // Use features from the model instead of loading them directly
    useEffect(() => {
      // Simply use the features from the model - no direct data loading here
      if (model.selectedTrackId && model.selectedTrack) {
        // The model will handle loading features through proper JBrowse2 patterns
        console.log('Track selected, model will handle feature loading')
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
            <Autocomplete
              key={`search-${model.selectedTrackId}`}
              freeSolo
              disableListWrap
              inputValue={searchInputValue}
              onInputChange={(_, value) => handleSearchInputChange(value || '')}
              onChange={(_, value) => {
                if (typeof value === 'object' && value !== null) {
                  handleFeatureSelect(value)
                } else {
                  handleFeatureSelect(null)
                }
              }}
              options={model.features || []}
              getOptionLabel={option => {
                if (typeof option === 'string') return option
                return `${option.name ?? option.id} (${option.type})`
              }}
              loading={model.isSearching}
              disabled={!model.canSearch}
              renderInput={params => {
                const { InputProps, ...restParams } = params
                return (
                  <TextField
                    {...restParams}
                    label="Search Features"
                    placeholder="Type to search for features..."
                    InputProps={{
                      ...InputProps,
                      endAdornment: (
                        <>
                          {model.isSearching && (
                            <CircularProgress color="inherit" size={20} />
                          )}
                          {InputProps?.endAdornment}
                        </>
                      ),
                    }}
                  />
                )
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body2">
                      <strong>{option.name ?? option.id}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.type}
                      {option.location && ` • ${option.location}`}
                    </Typography>
                    {option.description && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        {option.description.length > 100
                          ? `${option.description.substring(0, 100)}...`
                          : option.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              noOptionsText={
                !model.hasSearchTerm
                  ? 'Start typing to search features...'
                  : model.isSearching
                    ? 'Searching...'
                    : 'No features found'
              }
              ListboxProps={{
                style: { maxHeight: '200px' },
              }}
            />
            {!model.canSearch && model.selectedTrackId && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                Text search not available for this track
              </Typography>
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
              // Use the existing Explainers component for content display
              <TextualDescriptionsViewF
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
                their textual descriptions.
              </Typography>
            </Box>
          )}
      </Paper>
    )
  })

export default FlexibleTextualDescriptionsViewComponent
