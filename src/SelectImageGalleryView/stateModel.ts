import { types, Instance, IAnyStateTreeNode } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject } from '@jbrowse/core/configuration'
import BaseViewStateModel, {
  deduplicateContent,
} from '../shared/BaseViewStateModel'

// Alias deduplicateContent as deduplicateImages for consistency with original code
const deduplicateImages = deduplicateContent

const stateModel: IAnyStateTreeNode = BaseViewStateModel.props({
  type: types.literal('SelectImageGalleryView'),
  // View-specific properties
  featureImages: types.optional(types.string, ''),
  featureLabels: types.optional(types.string, ''),
  featureTypes: types.optional(types.string, ''),
})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .actions((self: any) => ({
    // Override updateFeature with image gallery specific logic
    updateFeature(
      featureId: string,
      featureType: 'GENE' | 'NON_GENE',
      images: string,
      labels?: string,
      types?: string,
    ) {
      // Validate input
      if (!featureId || !images) {
        return
      }

      // Parse comma-separated strings from GFF3 attributes (not JSON)
      const imageList = images
        ? images
            .split(',')
            .map((url: string) => url.trim())
            .filter((url: string) => url.length > 0)
        : []
      const labelList = labels
        ? labels
            .split(',')
            .map((label: string) => label.trim())
            .filter((label: string) => label.length > 0)
        : []
      const typeList = types
        ? types
            .split(',')
            .map((type: string) => type.trim())
            .filter((type: string) => type.length > 0)
        : []

      // Use the utility function to deduplicate images
      const uniqueImages = deduplicateImages(imageList)

      // Get max items limit from configuration
      const session = getSession(self as IAnyStateTreeNode)
      const config = session.jbrowse.configuration
      const maxItems = Number(
        readConfObject(config, ['selectImageGallery', 'maxItems']) || 0,
      )
      const limitedImages =
        maxItems > 0 ? uniqueImages.slice(0, maxItems) : uniqueImages

      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType
      self.featureImages = limitedImages.join(',')
      self.featureLabels = labelList.join(',')
      self.featureTypes = typeList.join(',')
    },

    // Override clearFeature with specific field clearing
    clearFeature() {
      // Set selectedFeatureId to undefined (types.maybe allows this)
      // Set content fields to empty strings (consistent with types.optional defaults)
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      self.featureImages = ''
      self.featureLabels = ''
      self.featureTypes = ''
    },

    // Update feature when it has no images but we still want to show it's selected
    updateFeatureWithoutImages(
      featureId: string,
      featureType: 'GENE' | 'NON_GENE',
    ) {
      // Validate input
      if (!featureId) {
        return
      }

      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType
      self.featureImages = '' // Explicitly empty to trigger hasContent = false
      self.featureLabels = ''
      self.featureTypes = ''
    },
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .views((self: any) => ({
    // Override default display name
    get defaultDisplayName() {
      return (
        readConfObject(self.config, [
          'selectImageGallery',
          'defaultDisplayName',
        ]) || 'Image Gallery'
      )
    },

    get maxItems(): number {
      return Number(
        readConfObject(self.config, ['selectImageGallery', 'maxItems']) || 0,
      ) // 0 means unlimited
    },

    get imageSize() {
      return (
        readConfObject(self.config, ['selectImageGallery', 'imageSize']) || {
          width: 200,
          height: 150,
        }
      )
    },

    get gff3AttributeNames() {
      return (
        readConfObject(self.config, [
          'selectImageGallery',
          'gff3AttributeNames',
        ]) || {
          images: 'images,image_urls,gallery_images',
          labels: 'image_labels,labels,descriptions',
          types: 'image_types,types,categories',
        }
      )
    },

    // Override hasContent for image content
    hasContent() {
      return self.featureImages.trim() !== ''
    },

    // Computed view that returns deduplicated images from the stored comma-separated strings
    deduplicatedImages(): string[] {
      if (self.featureImages.trim() === '') {
        return []
      }
      const imageList = self.featureImages
        .split(',')
        .map((url: string) => url.trim())
        .filter((url: string) => url.length > 0)
      const uniqueImages = deduplicateImages(imageList as string[])

      // Apply max items limit from configuration
      const maxItems = Number(self.maxItems) || 0
      return maxItems > 0 ? uniqueImages.slice(0, maxItems) : uniqueImages
    },

  }))

export type SelectImageGalleryViewModel = Instance<typeof stateModel>
export default stateModel
