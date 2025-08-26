import { ConfigurationSchema } from '@jbrowse/core/configuration'

export const configSchema = ConfigurationSchema('ImageGalleryWidget', {
  maxImageWidth: {
    type: 'number',
    defaultValue: 300,
    description: 'Maximum width for images in pixels',
  },
  maxImageHeight: {
    type: 'number',
    defaultValue: 200,
    description: 'Maximum height for images in pixels',
  },
  enableLazyLoading: {
    type: 'boolean',
    defaultValue: true,
    description: 'Enable lazy loading for better performance with many images',
  },
  validateUrls: {
    type: 'boolean',
    defaultValue: true,
    description: 'Validate image URLs before attempting to load them',
  },
  maxImages: {
    type: 'number',
    defaultValue: 50,
    description:
      'Maximum number of images to display (prevents performance issues)',
  },
})

export type ImageGalleryWidgetConfigModel = typeof configSchema
