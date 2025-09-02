import React from 'react'
import {
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
} from '@mui/material'
import { getAssemblyDisplayName } from '../flexibleViewUtils'

// Common types for feature options
export interface FeatureOption {
  id: string
  name: string
  type: string
  location?: string
  locString?: string
  description?: string
  // Textual specific fields
  markdown_urls?: string
  descriptions?: string
  content_types?: string
  content_type?: string
  // Image specific fields
  images?: string
  image_captions?: string
  image_group?: string
  image_tag?: string
}

// Assembly selector props
interface AssemblySelectorProps {
  selectedAssemblyId?: string
  availableAssemblies: {
    name: string
    displayName?: string
  }[]
  onAssemblyChange: (assemblyId: string) => void
  disabled?: boolean
}

// Track selector props
interface TrackSelectorProps {
  selectedTrackId?: string
  availableTracks: {
    trackId: string
    name: string
    configuration: {
      adapter: {
        type: string
      }
    }
  }[]
  onTrackChange: (trackId: string) => void
  disabled?: boolean
  selectedAssemblyId?: string
  isLoadingTracks?: boolean
}

// Feature search props
interface FeatureSearchAutocompleteProps {
  searchInputValue: string
  onSearchInputChange: (value: string) => void
  features: FeatureOption[]
  onFeatureSelect: (feature: FeatureOption | null) => void
  isSearching: boolean
  canSearch: boolean
  selectedTrackId?: string
  hasSearchTerm: boolean
  contentType: 'textual' | 'image'
}

// Container props
interface FlexibleViewContainerProps {
  model: {
    displayTitle: string
  }
  children: React.ReactNode
}

// Instructions panel props
interface InstructionsPanelProps {
  selectedAssemblyId?: string
  selectedTrackId?: string
  selectedFeatureId?: string
  hasSearchTerm?: boolean
  isSearching?: boolean
  selectedAssembly?: {
    name: string
    displayName?: string
  }
  selectedTrack?: {
    trackId: string
    name: string
  }
  contentType: 'textual' | 'image'
}

// Assembly Selector Component
export const AssemblySelector: React.FC<AssemblySelectorProps> = ({
  selectedAssemblyId,
  availableAssemblies,
  onAssemblyChange,
  disabled = false,
}) => {
  const handleChange = (value: string) => {
    onAssemblyChange(value)
  }

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth>
        <InputLabel id="assembly-select-label">Select Assembly</InputLabel>
        <Select
          labelId="assembly-select-label"
          id="assembly-select"
          value={selectedAssemblyId ?? ''}
          label="Select Assembly"
          onChange={e => handleChange(e.target.value)}
          disabled={disabled}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {(availableAssemblies || []).map(assembly => (
            <MenuItem key={assembly.name} value={assembly.name}>
              {getAssemblyDisplayName(assembly)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {(!availableAssemblies || availableAssemblies.length === 0) && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: 'block' }}
        >
          No assemblies available in this session
        </Typography>
      )}
    </Box>
  )
}

// Track Selector Component
export const TrackSelector: React.FC<TrackSelectorProps> = ({
  selectedTrackId,
  availableTracks,
  onTrackChange,
  disabled = false,
  selectedAssemblyId,
  isLoadingTracks = false,
}) => (
  <Box sx={{ mb: 2 }}>
    <FormControl fullWidth>
      <InputLabel id="track-select-label">Select Track</InputLabel>
      <Select
        labelId="track-select-label"
        id="track-select"
        value={selectedTrackId ?? ''}
        label="Select Track"
        onChange={e => onTrackChange(e.target.value)}
        disabled={disabled || !selectedAssemblyId || isLoadingTracks}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {availableTracks.map(track => (
          <MenuItem key={track.trackId} value={track.trackId}>
            {String(track.name || track.trackId)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
    {!selectedAssemblyId && (
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1, display: 'block' }}
      >
        Select an assembly first to view available tracks
      </Typography>
    )}
    {selectedAssemblyId && availableTracks.length === 0 && (
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1, display: 'block' }}
      >
        No compatible tracks available for selected assembly
      </Typography>
    )}
  </Box>
)

// Feature Search Autocomplete Component
export const FeatureSearchAutocomplete: React.FC<
  FeatureSearchAutocompleteProps
> = ({
  searchInputValue,
  onSearchInputChange,
  features,
  onFeatureSelect,
  isSearching,
  canSearch,
  selectedTrackId,
  hasSearchTerm,
  contentType,
}) => {
  // Ensure features is always an array
  const safeFeatures = Array.isArray(features) ? features : []

  // Only hide if we have no track selected AND no search results to show
  // Allow rendering even without selectedTrackId if there are features to display
  if (!selectedTrackId && safeFeatures.length === 0) {
    return null
  }

  const placeholderText =
    contentType === 'image'
      ? 'Type to search for features (min 3 chars)...'
      : 'Type to search for features...'

  return (
    <Box sx={{ mb: 2 }}>
      <Autocomplete
        disableListWrap
        inputValue={searchInputValue}
        open={safeFeatures.length > 0 && hasSearchTerm}
        slotProps={{
          popper: {
            sx: { zIndex: 9999 }, // Very high z-index to ensure dropdown appears above other content
          },
        }}
        onInputChange={(_, value, reason) => {
          // Handle all input changes except reset and selectOption
          // Reset events can cause focus loss, so we ignore them
          if (reason !== 'reset' && reason !== 'selectOption') {
            onSearchInputChange(value || '')
          }
          // Clear results when input is completely empty
          if (!value || value.trim() === '') {
            onSearchInputChange('')
          }
        }}
        onOpen={() => {
          // Ensure dropdown opens when user interacts
        }}
        onClose={() => {
          // Allow natural close behavior
        }}
        onChange={(_, value) => {
          if (typeof value === 'object' && value !== null) {
            onFeatureSelect(value)
          } else {
            onFeatureSelect(null)
          }
        }}
        options={safeFeatures}
        filterOptions={options => options}
        getOptionLabel={option => {
          if (typeof option === 'string') return option
          // Use simple display for selected value to avoid parsing issues
          return option.name ?? option.id
        }}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={isSearching}
        disabled={!canSearch}
        renderInput={params => (
          <TextField
            {...params}
            label="Search Features"
            placeholder={placeholderText}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isSearching && (
                    <CircularProgress color="inherit" size={20} />
                  )}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            onPaste={e => {
              // Prevent default to avoid duplication
              e.preventDefault()
              // Ensure paste events trigger search
              const pastedValue = e.clipboardData.getData('text')
              if (pastedValue) {
                onSearchInputChange(pastedValue)
              }
            }}
          />
        )}
        renderOption={(props, option) => {
          // Use locString if available (from BaseResult), otherwise fallback to location
          const displayLocation = option.locString ?? option.location ?? ''
          return (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body2">
                  <strong>{option.name ?? option.id}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.type}
                  {displayLocation && ` • ${displayLocation}`}
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
          )
        }}
        noOptionsText={
          !hasSearchTerm
            ? 'Start typing to search features...'
            : isSearching
            ? 'Searching...'
            : 'No features found'
        }
        ListboxProps={{
          style: { maxHeight: '200px' },
        }}
      />
      {!canSearch && selectedTrackId && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: 'block' }}
        >
          Text search not available for this track
        </Typography>
      )}
    </Box>
  )
}

// Flexible View Container Component
export const FlexibleViewContainer: React.FC<FlexibleViewContainerProps> = ({
  model,
  children,
}) => (
  <Paper sx={{ p: 2, m: 1 }} elevation={1}>
    <Typography variant="h6" gutterBottom>
      {model.displayTitle}
    </Typography>
    {children}
  </Paper>
)

// Instructions Panel Component
export const InstructionsPanel: React.FC<InstructionsPanelProps> = ({
  selectedAssemblyId,
  selectedTrackId,
  selectedFeatureId,
  hasSearchTerm,
  isSearching,
  selectedAssembly,
  selectedTrack,
  contentType,
}) => {
  const contentTypeText =
    contentType === 'textual' ? 'textual descriptions' : 'image galleries'

  if (!selectedAssemblyId) {
    return (
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Select an assembly from the dropdown above to begin browsing tracks
          and features independently of the main JBrowse selection.
        </Typography>
      </Box>
    )
  }

  if (selectedAssemblyId && !selectedTrackId) {
    return (
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Select a track from the &ldquo;
          {getAssemblyDisplayName(selectedAssembly) || 'selected'}
          &rdquo; assembly to view available features.
        </Typography>
      </Box>
    )
  }

  if (selectedTrackId && !selectedFeatureId && !hasSearchTerm && !isSearching) {
    return (
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Start typing in the search box above to find features from the &ldquo;
          {selectedTrack?.name ?? 'selected'}&rdquo; track and view their{' '}
          {contentTypeText}.
        </Typography>
      </Box>
    )
  }

  return null
}

// Error Display Component
export const ErrorDisplay: React.FC<{ error: string | null }> = ({ error }) => {
  if (!error) return null

  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      {error}
    </Alert>
  )
}

// Clear Selections Button Component
interface ClearSelectionsButtonProps {
  hasSelections: boolean
  onClear: () => void
}

export const ClearSelectionsButton: React.FC<ClearSelectionsButtonProps> = ({
  hasSelections,
  onClear,
}) => {
  if (!hasSelections) return null

  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="body2"
        color="primary"
        sx={{ cursor: 'pointer', textDecoration: 'underline' }}
        onClick={onClear}
      >
        Clear Selections
      </Typography>
    </Box>
  )
}
