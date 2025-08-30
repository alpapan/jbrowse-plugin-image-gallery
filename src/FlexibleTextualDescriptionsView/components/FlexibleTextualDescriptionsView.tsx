import React, { useState, useEffect, useMemo } from 'react'
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
} from '@mui/material'
import { TextualDescriptionsViewF } from '../../TextualDescriptionsView/components/Explainers'
import { getAssemblyDisplayName } from '../stateModel'
import { observer } from 'mobx-react'
import { readConfObject } from '@jbrowse/core/configuration'
import { getSession } from '@jbrowse/core/util'

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
    features: {
      id: string
      name: string
      type: string
      markdown_urls?: string
      descriptions?: string
      content_types?: string
    }[]
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
  }
}

const FlexibleTextualDescriptionsViewComponent: React.FC<FlexibleTextualDescriptionsViewProps> =
  observer(({ model }) => {
    const [error, setError] = useState<string | null>(null)

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

    const handleAssemblyChange = (assemblyId: string) => {
      model.setSelectedAssembly(assemblyId ?? undefined)
    }

    const handleTrackChange = (trackId: string) => {
      model.setSelectedTrack(trackId ?? undefined)
    }

    const handleFeatureChange = (featureId: string) => {
      const selectedFeature = model.features.find(f => f.id === featureId)
      if (selectedFeature) {
        model.setSelectedFeature(
          selectedFeature.id,
          selectedFeature.type === 'gene' ? 'GENE' : 'NON_GENE',
          selectedFeature.markdown_urls,
          selectedFeature.descriptions,
          selectedFeature.content_types,
        )
      } else {
        model.setSelectedFeature(undefined)
      }
    }

    const handleClearSelections = () => {
      model.clearSelections()
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

        {/* Feature Selection */}
        {model.selectedTrackId && (
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="feature-select-label">Select Feature</InputLabel>
              <Select
                labelId="feature-select-label"
                id="feature-select"
                value={model.selectedFeatureId ?? ''}
                label="Select Feature"
                onChange={e => handleFeatureChange(e.target.value)}
                disabled={model.isLoadingFeatures || !model.canSelectFeature}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {model.features.map(feature => (
                  <MenuItem key={feature.id} value={feature.id}>
                    {feature.name ?? feature.id} ({feature.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {model.isLoadingFeatures && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <CircularProgress size={20} />
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
        {(model.selectedTrackId ?? model.selectedFeatureId) && (
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
          !model.isLoadingFeatures && (
            <Box
              sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Select a feature from the &ldquo;
                {model.selectedTrack?.name ?? 'selected'}&rdquo; track to view
                its textual descriptions.
              </Typography>
            </Box>
          )}
      </Paper>
    )
  })

export default FlexibleTextualDescriptionsViewComponent
