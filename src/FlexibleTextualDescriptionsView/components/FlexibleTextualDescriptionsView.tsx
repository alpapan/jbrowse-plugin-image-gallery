import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react'
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material'
import { TextualDescriptionsViewF } from '../../TextualDescriptionsView/components/Explainers'

interface FlexibleTextualDescriptionsViewProps {
  model: {
    id: string
    displayTitle: string
    selectedTrackId?: string
    selectedFeatureId?: string
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
    hasContent: boolean
    featureMarkdownUrls?: string
    featureDescriptions?: string
    featureContentTypes?: string
    isLoadingTracks: boolean
    isLoadingFeatures: boolean
    canSelectFeature: boolean
    isReady: boolean
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

interface FeatureOption {
  id: string
  name: string
  type: string
  markdown_urls?: string
  descriptions?: string
  content_types?: string
}

const FlexibleTextualDescriptionsViewComponent: React.FC<FlexibleTextualDescriptionsViewProps> =
  observer(({ model }) => {
    const [features, setFeatures] = useState<FeatureOption[]>([])
    const [loadingFeatures, setLoadingFeatures] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load features when track selection changes
    useEffect(() => {
      const loadFeatures = async () => {
        if (!model.selectedTrackId || !model.selectedTrack) {
          setFeatures([])
          return
        }

        setLoadingFeatures(true)
        setError(null)
        model.setLoadingFeatures(true)

        try {
          // Mock feature loading - in a real implementation, this would
          // fetch features from the selected track's adapter
          // For now, we'll create some sample features
          await new Promise(resolve => setTimeout(resolve, 500)) // Simulate loading

          const sampleFeatures: FeatureOption[] = [
            {
              id: 'gene1',
              name: 'Sample Gene 1',
              type: 'gene',
              markdown_urls: 'https://example.com/gene1.md',
              descriptions: 'First sample gene',
              content_types: 'markdown',
            },
            {
              id: 'gene2',
              name: 'Sample Gene 2',
              type: 'gene',
              markdown_urls: 'https://example.com/gene2.md',
              descriptions: 'Second sample gene',
              content_types: 'markdown',
            },
            {
              id: 'exon1',
              name: 'Sample Exon 1',
              type: 'exon',
            },
          ]

          setFeatures(sampleFeatures)
        } catch (err) {
          setError(`Failed to load features: ${String(err)}`)
          setFeatures([])
        } finally {
          setLoadingFeatures(false)
          model.setLoadingFeatures(false)
        }
      }

      void loadFeatures()
    }, [model.selectedTrackId, model])

    // Clear feature selection when features change
    useEffect(() => {
      if (model.selectedFeatureId && features.length > 0) {
        const selectedFeatureExists = features.some(
          f => f.id === model.selectedFeatureId,
        )
        if (!selectedFeatureExists) {
          model.setSelectedFeature(undefined)
        }
      }
    }, [features, model])

    const handleTrackChange = (trackId: string) => {
      model.setSelectedTrack(trackId ?? undefined)
    }

    const handleFeatureChange = (featureId: string) => {
      const selectedFeature = features.find(f => f.id === featureId)
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
      setFeatures([])
      setError(null)
    }

    return (
      <Paper sx={{ p: 2, m: 1 }} elevation={1}>
        <Typography variant="h6" gutterBottom>
          {model.displayTitle}
        </Typography>

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
              disabled={model.isLoadingTracks}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {model.availableTracks.map(track => (
                <MenuItem key={track.trackId} value={track.trackId}>
                  {track.name ?? track.trackId}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
                disabled={loadingFeatures || !model.canSelectFeature}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {features.map(feature => (
                  <MenuItem key={feature.id} value={feature.id}>
                    {feature.name ?? feature.id} ({feature.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {loadingFeatures && (
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
        {!model.selectedTrackId && (
          <Box
            sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              Select a track from the dropdown above to begin browsing features
              independently of the main JBrowse selection.
            </Typography>
          </Box>
        )}

        {model.selectedTrackId &&
          !model.selectedFeatureId &&
          !loadingFeatures && (
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
