import { MenuItem } from '@jbrowse/core/ui'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { types } from 'mobx-state-tree'

const stateModel = types
  .model({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: ElementId as any,
    type: types.literal('ImageGalleryView'),
    // Store the selected feature and images for this view
    selectedFeatureId: types.maybe(types.string),
    featureImages: types.maybe(types.string),
    featureImageLabels: types.maybe(types.string),
  })
  .actions(self => ({
    // unused by this view but it is updated with the current width in pixels of
    // the view panel
    setWidth() {},

    // Update the feature and images displayed in this view
    updateFeature(featureId: string, images: string, imageLabels?: string) {
      self.selectedFeatureId = featureId
      self.featureImages = images
      self.featureImageLabels = imageLabels ?? ''
    },

    // Clear the current feature
    clearFeature() {
      self.selectedFeatureId = undefined
      self.featureImages = undefined
      self.featureImageLabels = undefined
    },
  }))
  .views(self => ({
    // unused by this view, but represents of 'view level' menu items
    menuItems(): MenuItem[] {
      return []
    },

    // Computed properties for easy access
    get hasImages() {
      return !!(self.featureImages && self.featureImages.trim() !== '')
    },

    get displayTitle() {
      return self.selectedFeatureId
        ? `Images for ${String(self.selectedFeatureId)}`
        : 'Image Gallery'
    },
  }))

export default stateModel
