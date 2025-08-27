import { MenuItem } from '@jbrowse/core/ui'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { types } from 'mobx-state-tree'

enum FeatureType {
  GENE = 'GENE',
  NON_GENE = 'NON_GENE',
}

export class ImageGalleryState {
  selectedFeatureId?: string
  selectedFeatureType: FeatureType = FeatureType.NON_GENE
  featureImages = ''
  featureLabels = ''
  featureTypes = ''

  // Add deduplicateImages method
  deduplicateImages(images: string[]): string[] {
    const imageMap: Record<string, string> = {}

    // Only deduplicate by URL, not by type
    for (const image of images) {
      if (image && !imageMap[image]) {
        imageMap[image] = image
      }
    }
    return Object.keys(imageMap)
  }
}

const stateModel = types
  .model({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: ElementId as any,
    type: types.literal('ImageGalleryView'),
    displayName: types.optional(types.string, 'Image Gallery'),
    minimized: types.optional(types.boolean, false),
    // Store the selected feature and images for this view
    selectedFeatureId: types.maybe(types.string),
    selectedFeatureType: types.optional(types.string, 'GENE'),
    featureImages: types.maybe(types.string),
    featureLabels: types.maybe(types.string),
    featureTypes: types.maybe(types.string),
  })
  .actions(self => ({
    // unused by this view but it is updated with the current width in pixels of
    // the view panel
    setWidth() {},

    // Set the display name for the view (required for view renaming)
    setDisplayName(name: string) {
      self.displayName = name
    },

    // Set the minimized state for the view
    setMinimized(flag: boolean) {
      self.minimized = flag
    },

    // Close the view by removing it from the session
    closeView() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = (self as any).getRoot?.()?.session
        if (session?.removeView) {
          session.removeView(self)
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error closing view:', error)
      }
    },

    // Update the feature and images displayed in this view
    updateFeature(
      featureId: string,
      featureType: FeatureType,
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
            .map(url => url.trim())
            .filter(url => url.length > 0)
        : []
      const labelList = labels
        ? labels
            .split(',')
            .map(label => label.trim())
            .filter(label => label.length > 0)
        : []
      const typeList = types
        ? types
            .split(',')
            .map(type => type.trim())
            .filter(type => type.length > 0)
        : []

      // Deduplicate images using the class method
      const uniqueImages = new ImageGalleryState().deduplicateImages(imageList)

      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType.toString()
      self.featureImages = uniqueImages.join(',')
      self.featureLabels = labelList.join(',')
      self.featureTypes = typeList.join(',')
    },

    // Clear the current feature
    clearFeature() {
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      self.featureImages = undefined
      self.featureLabels = undefined
      self.featureTypes = undefined
    },
  }))
  .views(self => ({
    // unused by this view, but represents of 'view level' menu items
    menuItems(): MenuItem[] {
      return []
    },

    // Computed properties for easy access
    get hasContent() {
      return !!(self.featureImages && self.featureImages.trim() !== '')
    },

    get displayTitle() {
      return self.selectedFeatureId
        ? `${self.displayName} for ${String(self.selectedFeatureId)}`
        : self.displayName
    },
  }))

export default stateModel
export { FeatureType }
