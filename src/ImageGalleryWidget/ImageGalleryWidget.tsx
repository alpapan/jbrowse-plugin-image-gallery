import React, { useState, useCallback, useRef, useEffect } from 'react'
import { observer } from 'mobx-react'
import {
  Box,
  Typography,
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
import ExpandMore from '@mui/icons-material/ExpandMore'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ErrorIcon from '@mui/icons-material/Error'

interface ImageData {
  url: string
  label: string
  type: string
  isValid?: boolean
  isLoading?: boolean
  hasError?: boolean
  errorMessage?: string
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

interface ImageGalleryWidgetModel {
  id: string
  type: string
  feature?: Feature
  featureImages?: string | string[]
}

interface ImageGalleryWidgetProps {
  // Support both model-based (widget) and direct props (component) usage
  model?: ImageGalleryWidgetModel
  feature?: Feature
  config?: ImageGalleryConfig
  featureImages?: string | string[]
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

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const image = entry.target as HTMLImageElement
            if (image.dataset.src) {
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
  }, [])

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
      <Box
        sx={{
          height: maxHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <ErrorIcon color="error" />
        <Typography variant="caption" color="error">
          Failed to load image
        </Typography>
      </Box>
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

const ImageGalleryWidget = observer(
  ({ model, feature, config, featureImages }: ImageGalleryWidgetProps) => {
    // Support both model-based and direct props usage
    const actualFeature = model?.feature || feature
    const actualFeatureImages = model?.featureImages || featureImages
    const actualConfig = config || {}
    const [expanded, setExpanded] = useState(true)
    const [imageStates, setImageStates] = useState<Map<number, ImageData>>(
      new Map(),
    )

    // Configuration with better defaults
    const maxWidth = actualConfig?.maxImageWidth ?? 300
    const maxHeight = actualConfig?.maxImageHeight ?? 200
    const enableLazyLoading = actualConfig?.enableLazyLoading ?? true
    const validateUrls = actualConfig?.validateUrls ?? true
    const maxImages = actualConfig?.maxImages ?? 50

    // Log whenever the widget mounts or the feature prop changes so we can trace
    // why the widget may not be rendering for selected features.
    useEffect(() => {
      // eslint-disable-next-line no-console
      console.debug('ImageGalleryWidget mounted/updated', {
        featureSummary: {
          images: actualFeature?.get('images'),
          image_labels: actualFeature?.get('image_labels'),
          image_types: actualFeature?.get('image_types'),
        },
        featureObject: actualFeature,
      })
    }, [actualFeature])

    // Parse images from feature attributes (simple, lint-friendly)
    const parseImages = useCallback((): ImageData[] => {
      // First try to use featureImages prop as primary source
      let imageUrls: string[] = []
      
      if (actualFeatureImages) {
        if (typeof actualFeatureImages === 'string') {
          // Handle single string - could be single URL or comma-separated URLs
          imageUrls = actualFeatureImages
            .split(',')
            .map((url: string) => url.trim())
            .filter((url: string) => url.length > 0)
        } else if (Array.isArray(actualFeatureImages)) {
          // Handle array of URLs
          imageUrls = actualFeatureImages
            .filter((url: string) => url && typeof url === 'string')
            .map((url: string) => url.trim())
            .filter((url: string) => url.length > 0)
        }
      }
      
      // Fallback to feature.get('images') for backward compatibility
      if (imageUrls.length === 0 && actualFeature) {
        const images = actualFeature.get('images')
        if (images && typeof images === 'string' && images.trim() !== '') {
          imageUrls = images
            .split(',')
            .map((url: string) => url.trim())
            .filter((url: string) => url.length > 0)
        }
      }

      // Get labels and types from feature attributes (fallback data)
      const imageLabels = actualFeature?.get('image_labels')
      const imageTypes = actualFeature?.get('image_types')
      
      // eslint-disable-next-line no-console
      console.debug('ImageGallery parseImages:', {
        featureImages: actualFeatureImages,
        fallbackImages: actualFeature?.get('images'),
        imageLabels,
        imageTypes,
        finalImageUrls: imageUrls,
      })

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

      return limitedUrls.map((url: string, index: number): ImageData => {
        const imageData: ImageData = {
          url,
          label: labels[index] || `Image ${index + 1}`,
          type: types[index] || 'general',
          isLoading: true,
          hasError: false,
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
    }, [actualFeature, actualFeatureImages, maxImages, validateUrls])
    const images = parseImages()

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

    const validImages = images.filter(img => !img.hasError)
    const errorCount = images.length - validImages.length

    return (
      <Box sx={{ mt: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1,
            bgcolor: 'grey.50',
            cursor: 'pointer',
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Images ({images.length})
            {errorCount > 0 && (
              <Chip
                label={`${errorCount} failed`}
                size="small"
                color="error"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ p: 2 }}>
            {errorCount > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {errorCount} image{errorCount > 1 ? 's' : ''} failed to load.
                Check the URLs and try again.
              </Alert>
            )}
            <Grid container spacing={2}>
              {images.map((image: ImageData, index: number) => {
                const currentState = imageStates.get(index) ?? image

                return (
                  <Grid size={{ xs: 12, sm: 6 }} key={index}>
                    <Card sx={{ maxWidth: maxWidth }}>
                      {currentState.hasError ? (
                        <Box
                          sx={{
                            height: maxHeight,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'grey.100',
                            flexDirection: 'column',
                            gap: 1,
                          }}
                        >
                          <ErrorIcon color="error" />
                          <Typography
                            variant="caption"
                            color="error"
                            align="center"
                          >
                            {currentState.errorMessage ??
                              'Failed to load image'}
                          </Typography>
                        </Box>
                      ) : enableLazyLoading ? (
                        <LazyImage
                          src={image.url}
                          alt={image.label}
                          maxHeight={maxHeight}
                          onLoad={() => handleImageLoad(index)}
                          onError={error => handleImageError(index, error)}
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
                          alt={image.label}
                          onClick={() => window.open(image.url, '_blank')}
                          onLoad={() => handleImageLoad(index)}
                          onError={() =>
                            handleImageError(index, 'Failed to load image')
                          }
                        />
                      )}
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="body2" noWrap>
                          {image.label}
                        </Typography>
                        {image.type !== 'general' && (
                          <Chip
                            label={image.type}
                            size="small"
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
    )
  },
)

export default ImageGalleryWidget
