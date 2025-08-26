import { MenuItem } from '@jbrowse/core/ui'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { types } from 'mobx-state-tree'

const stateModel = types
  .model({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: ElementId as any,
    type: types.literal('ImageGalleryView'),
    displayName: types.optional(types.string, 'Images'),
    minimized: types.optional(types.boolean, false),
    // Store the selected feature and images for this view
    selectedFeatureId: types.maybe(types.string),
    featureImages: types.maybe(types.string),
    featureImageLabels: types.maybe(types.string),
    featureImageTypes: types.maybe(types.string),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session = (self as any).getRoot?.()?.session
      if (session?.removeView) {
        session.removeView(self)
      }
    },

    // Update the feature and images displayed in this view
    updateFeature(
      featureId: string,
      images: string,
      imageLabels?: string,
      imageTypes?: string,
    ) {
      self.selectedFeatureId = featureId
      self.featureImages = images
      self.featureImageLabels = imageLabels ?? ''
      self.featureImageTypes = imageTypes ?? ''
    },

    // Clear the current feature
    clearFeature() {
      self.selectedFeatureId = undefined
      self.featureImages = undefined
      self.featureImageLabels = undefined
      self.featureImageTypes = undefined
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
        ? `${self.displayName} for ${String(self.selectedFeatureId)}`
        : self.displayName
    },
  }))

export default stateModel
