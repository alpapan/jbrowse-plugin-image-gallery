import React, { useState, useCallback, useRef, useEffect } from 'react'
import { observer } from 'mobx-react'
import {
  Paper,
  Typography,
  Box,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Collapse,
  IconButton,
  Chip,
  Alert,
  Skeleton,
} from '@mui/material'

// Simple expand/collapse icon components to replace Material-UI icons
const ExpandMore: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ transition: 'transform 0.2s' }}
  >
    <path d="M7 10l5 5 5-5z" />
  </svg>
)

const ExpandLess: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ transition: 'transform 0.2s' }}
  >
    <path d="M7 14l5-5 5 5z" />
  </svg>
)

interface ImageData {
  url: string
  label: string
  type: string
  isValid?: boolean
  isLoading?: boolean
  hasError?: boolean
  errorMessage?: string
  displayName: string // URL basename for display
}

interface ImageGroup {
  label: string
  images: ImageData[]
  errorCount: number
  validCount: number
}

interface Feature {
  get(key: string): string | undefined
}

interface ImageGalleryConfig {
  maxImageWidth?: number
  maxImageHeight?: number
  enableLazyLoading?: boolean
  validateUrls?: boolean
  maxImages?: number
}

interface ImageGalleryViewProps {
  model: {
    selectedFeatureId?: string
    featureImages?: string
    featureImageLabels?: string
    featureImageTypes?: string
    hasImages: boolean
    displayTitle: string
  }
}

// Utility function to validate if a URL is likely an image
const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false

  // Basic URL validation
  try {
    new URL(url)
  } catch {
    return false
  }

  // Check for common image extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|ico)(\?.*)?$/i
  return imageExtensions.test(url)
}

// Utility function to extract basename from URL
const getUrlBasename = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const basename = pathname.split('/').pop() ?? 'image'
    // Remove query parameters from basename
    return basename.split('?')[0]
  } catch {
    return 'image'
  }
}

// Lazy loading image component
const LazyImage: React.FC<{
  src: string
  alt: string
  maxHeight: number
  onError: (error: string) => void
  onLoad: () => void
}> = ({ src, alt, maxHeight, onError, onLoad }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    // Set src immediately for now to debug loading issues
    if (img.dataset.src && !img.src) {
      img.src = img.dataset.src
      img.removeAttribute('data-src')
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const image = entry.target as HTMLImageElement
            if (image.dataset.src && !image.src) {
              image.src = image.dataset.src
              image.removeAttribute('data-src')
              observer.unobserve(image)
            }
          }
        })
      },
      { threshold: 0.1 },
    )

    observer.observe(img)
    return () => observer.disconnect()
  }, [src])

  const handleLoad = () => {
    setIsLoading(false)
    onLoad()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError('Failed to load image')
  }

  if (hasError) {
    return (
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg"
        alt="Failed to load image"
        style={{
          maxHeight,
          width: '100%',
          objectFit: 'contain',
          backgroundColor: '#f5f5f5',
          cursor: 'pointer',
        }}
        onClick={() => window.open(src, '_blank')}
      />
    )
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {isLoading && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height={maxHeight}
          sx={{ position: 'absolute', top: 0, left: 0 }}
        />
      )}
      <img
        ref={imgRef}
        data-src={src}
        alt={alt}
        style={{
          maxHeight,
          width: '100%',
          objectFit: 'contain',
          backgroundColor: '#f5f5f5',
          cursor: 'pointer',
          display: isLoading ? 'none' : 'block',
        }}
        onLoad={handleLoad}
        onError={handleError}
        onClick={() => window.open(src, '_blank')}
      />
    </Box>
  )
}

// Internal ImageGallery component with all functionality
const ImageGalleryContent = observer(function ImageGalleryContent({
  featureImages,
  featureImageLabels,
  featureImageTypes,
  feature,
  config,
}: {
  featureImages?: string | string[]
  featureImageLabels?: string
  featureImageTypes?: string
  feature?: Feature
  config?: ImageGalleryConfig
}) {
  const actualConfig = config ?? {}
  const [expandedGroups, setExpandedGroups] = useState<Map<string, boolean>>(
    new Map(),
  )
  const [imageStates, setImageStates] = useState<Map<number, ImageData>>(
    new Map(),
  )

  // Configuration with better defaults
  const maxWidth = actualConfig?.maxImageWidth ?? 300
  const maxHeight = actualConfig?.maxImageHeight ?? 200
  const enableLazyLoading = actualConfig?.enableLazyLoading ?? true
  const validateUrls = actualConfig?.validateUrls ?? true
  const maxImages = actualConfig?.maxImages ?? 50

  // Parse images from feature attributes (simple, lint-friendly)
  const parseImages = useCallback((): ImageData[] => {
    // First try to use featureImages prop as primary source
    let imageUrls: string[] = []

    if (featureImages) {
      if (typeof featureImages === 'string') {
        // Handle single string - could be single URL or comma-separated URLs
        imageUrls = featureImages
          .split(',')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0)
      } else if (Array.isArray(featureImages)) {
        // Handle array of URLs
        imageUrls = featureImages
          .filter((url: string) => url && typeof url === 'string')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0)
      }
    }

    // Fallback to feature attributes for backward compatibility
    if (feature) {
      const images = feature.get('image') ?? feature.get('images') // Primary: 'image', fallback: 'images'
      if (images && typeof images === 'string' && images.trim() !== '') {
        imageUrls = images
          .split(',')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0)
      }
    }

    // Get labels and types from model props first, then feature attributes as fallback
    const imageLabels = featureImageLabels ?? feature?.get('image_group')
    const imageTypes = featureImageTypes ?? feature?.get('image_tag')

    if (imageUrls.length === 0) {
      return []
    }

    // Limit number of images
    const limitedUrls = imageUrls.slice(0, maxImages)

    const labels = imageLabels
      ? imageLabels.split(',').map((label: string) => label.trim())
      : []
    const types = imageTypes
      ? imageTypes.split(',').map((type: string) => type.trim())
      : []

    // console.debug('Final parsing:', {
    //   limitedUrls,
    //   labels,
    //   types,
    //   imageLabels,
    //   imageTypes,
    // })

    return limitedUrls.map((url: string, index: number): ImageData => {
      const imageData: ImageData = {
        url,
        label: labels[index] || `Image ${index + 1}`,
        type: types[index] || 'general',
        isLoading: true,
        hasError: false,
        displayName: getUrlBasename(url),
      }
      // Validate URL if validation is enabled
      if (validateUrls) {
        imageData.isValid = isValidImageUrl(url)
        if (!imageData.isValid) {
          imageData.hasError = true
          imageData.isLoading = false
          imageData.errorMessage = 'Invalid image URL format'
        }
      } else {
        imageData.isValid = true
      }

      return imageData
    })
  }, [
    feature,
    featureImages,
    featureImageLabels,
    featureImageTypes,
    maxImages,
    validateUrls,
  ])

  const images = parseImages()

  // Group images by their labels
  const groupImagesByLabel = useCallback(
    (imageList: ImageData[]): ImageGroup[] => {
      const groups = new Map<string, ImageData[]>()

      imageList.forEach(image => {
        const label = image.label
        if (!groups.has(label)) {
          groups.set(label, [])
        }
        groups.get(label)!.push(image)
      })

      return Array.from(groups.entries()).map(([label, groupImages]) => {
        const errorCount = groupImages.filter(img => img.hasError).length
        const validCount = groupImages.length - errorCount
        return {
          label,
          images: groupImages,
          errorCount,
          validCount,
        }
      })
    },
    [],
  )

  const imageGroups = groupImagesByLabel(images)

  // Helper function to get expanded state for a group
  const isGroupExpanded = (groupLabel: string): boolean => {
    return expandedGroups.get(groupLabel) ?? true // Default to expanded
  }

  // Helper function to toggle expanded state for a group
  const toggleGroupExpanded = (groupLabel: string) => {
    setExpandedGroups(prev => {
      const newMap = new Map(prev)
      newMap.set(groupLabel, !isGroupExpanded(groupLabel))
      return newMap
    })
  }

  // Handle image loading state updates
  const handleImageLoad = useCallback(
    (index: number) => {
      setImageStates(prev => {
        const newStates = new Map(prev)
        const currentState = newStates.get(index) ?? images[index]
        newStates.set(index, {
          ...currentState,
          isLoading: false,
          hasError: false,
        })
        return newStates
      })
    },
    [images],
  )

  const handleImageError = useCallback(
    (index: number, error: string) => {
      setImageStates(prev => {
        const newStates = new Map(prev)
        const currentState = newStates.get(index) ?? images[index]
        newStates.set(index, {
          ...currentState,
          isLoading: false,
          hasError: true,
          errorMessage: error,
        })
        return newStates
      })
    },
    [images],
  )

  // Don't render widget if no images
  if (images.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No images found for this feature. Make sure the feature has an
        &apos;images&apos; attribute with comma-separated URLs.
      </Alert>
    )
  }

  return (
    <Box sx={{ mt: 2 }}>
      {imageGroups.map((group: ImageGroup, groupIndex: number) => (
        <Box
          key={groupIndex}
          sx={{ mb: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 1,
              bgcolor: 'grey.50',
              cursor: 'pointer',
            }}
            onClick={() => toggleGroupExpanded(group.label)}
          >
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              {group.label} ({group.images.length})
              {group.errorCount > 0 && (
                <Chip
                  label={`${group.errorCount} failed`}
                  size="small"
                  color="error"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            <IconButton size="small">
              {isGroupExpanded(group.label) ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={isGroupExpanded(group.label)}>
            <Box sx={{ p: 2 }}>
              {group.errorCount > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {group.errorCount} image{group.errorCount > 1 ? 's' : ''}{' '}
                  failed to load. Check the URLs and try again.
                </Alert>
              )}
              <Grid container spacing={2}>
                {group.images.map((image: ImageData, imageIndex: number) => {
                  // Calculate global index for state management
                  const globalIndex = images.findIndex(
                    img => img.url === image.url,
                  )
                  const currentState = imageStates.get(globalIndex) ?? image

                  return (
                    <Grid size={{ xs: 12, sm: 6 }} key={imageIndex}>
                      <Card sx={{ maxWidth: maxWidth }}>
                        {currentState.hasError ? (
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg"
                            alt="Failed to load image"
                            style={{
                              maxHeight,
                              width: '100%',
                              objectFit: 'contain',
                              backgroundColor: '#f5f5f5',
                              cursor: 'pointer',
                            }}
                            onClick={() => window.open(image.url, '_blank')}
                          />
                        ) : enableLazyLoading ? (
                          <LazyImage
                            src={image.url}
                            alt={image.displayName}
                            maxHeight={maxHeight}
                            onLoad={() => handleImageLoad(globalIndex)}
                            onError={error =>
                              handleImageError(globalIndex, error)
                            }
                          />
                        ) : (
                          <CardMedia
                            component="img"
                            sx={{
                              maxHeight: maxHeight,
                              objectFit: 'contain',
                              bgcolor: 'grey.100',
                              cursor: 'pointer',
                            }}
                            image={image.url}
                            alt={image.displayName}
                            onClick={() => window.open(image.url, '_blank')}
                            onLoad={() => handleImageLoad(globalIndex)}
                            onError={() =>
                              handleImageError(
                                globalIndex,
                                'Failed to load image',
                              )
                            }
                          />
                        )}
                        <CardContent sx={{ p: 1 }}>
                          <Typography variant="body2" noWrap>
                            {image.displayName}
                          </Typography>
                          {image.type !== 'general' && (
                            <Chip
                              label={image.type}
                              size="small"
                              color="primary"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            </Box>
          </Collapse>
        </Box>
      ))}
    </Box>
  )
})

const ImageGalleryView = observer(function ImageGalleryView({
  model,
}: ImageGalleryViewProps) {
  if (!model.hasImages) {
    return (
      <Paper
        elevation={12}
        sx={{
          padding: 2,
          margin: 1,
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
        className="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation12 css-4h24oc-MuiPaper-root-viewContainer-unfocusedView"
      >
        <Typography variant="h6" color="textSecondary">
          No feature with images selected
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          When you select a feature with images, they will appear here
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper
      elevation={12}
      sx={{
        padding: 1,
        margin: 1,
        minHeight: 200,
      }}
      className="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation12 css-4h24oc-MuiPaper-root-viewContainer-unfocusedView"
    >
      <Box sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
          {model.displayTitle}
        </Typography>
      </Box>

      {/* Use the merged ImageGalleryContent component */}
      <ImageGalleryContent
        featureImages={model.featureImages}
        featureImageLabels={model.featureImageLabels}
        featureImageTypes={model.featureImageTypes}
        config={{
          maxImages: 10,
          maxImageHeight: 200,
          validateUrls: true,
        }}
      />
    </Paper>
  )
})

export default ImageGalleryView
