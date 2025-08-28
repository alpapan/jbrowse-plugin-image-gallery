import { MenuItem } from '@jbrowse/core/ui'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { types } from 'mobx-state-tree'

enum FeatureType {
  GENE = 'GENE',
  NON_GENE = 'NON_GENE',
}

export class FlexibleImageGalleryViewState {
  selectedTrackId?: string
  selectedFeatureId?: string
  selectedFeatureType: FeatureType = FeatureType.NON_GENE
  featureImages = ''
  featureLabels = ''
  featureTypes = ''
  isLoadingTracks = false
  isLoadingFeatures = false

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
    type: types.literal('FlexibleImageGalleryView'),
    displayName: types.optional(types.string, 'Flexible Image Gallery'),
    minimized: types.optional(types.boolean, false),
    // Track and feature selection state
    selectedTrackId: types.maybe(types.string),
    selectedFeatureId: types.maybe(types.string),
    selectedFeatureType: types.optional(types.string, 'GENE'),
    // Content fields inherited from ImageGalleryView
    featureImages: types.maybe(types.string),
    featureLabels: types.maybe(types.string),
    featureTypes: types.maybe(types.string),
    // Loading states for progressive UI
    isLoadingTracks: types.optional(types.boolean, false),
    isLoadingFeatures: types.optional(types.boolean, false),
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

    // Set loading states
    setLoadingTracks(loading: boolean) {
      self.isLoadingTracks = loading
    },

    setLoadingFeatures(loading: boolean) {
      self.isLoadingFeatures = loading
    },

    // Set selected track
    setSelectedTrack(trackId: string | undefined) {
      self.selectedTrackId = trackId
      // Clear feature selection when track changes
      if (self.selectedFeatureId) {
        self.selectedFeatureId = undefined
        this.clearFeatureContent()
      }
    },

    // Set selected feature and update content
    setSelectedFeature(
      featureId: string | undefined,
      featureType?: FeatureType,
      images?: string,
      labels?: string,
      types?: string,
    ) {
      self.selectedFeatureId = featureId
      if (featureType) {
        self.selectedFeatureType = featureType.toString()
      }

      if (featureId && images) {
        this.updateFeatureContent(images, labels, types)
      } else {
        this.clearFeatureContent()
      }
    },

    // Update the feature content displayed in this view
    updateFeatureContent(images: string, labels?: string, types?: string) {
      // Only process images if they exist and are not empty
      if (images && images.trim() !== '') {
        // Parse comma-separated strings from GFF3 attributes (not JSON)
        const imageList = images
          .split(',')
          .map(url => url.trim())
          .filter(url => url.length > 0)

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
        const uniqueImages =
          new FlexibleImageGalleryViewState().deduplicateImages(imageList)

        self.featureImages = uniqueImages.join(',')
        self.featureLabels = labelList.join(',')
        self.featureTypes = typeList.join(',')
      } else {
        this.clearFeatureContent()
      }
    },

    // Clear the current feature content
    clearFeatureContent() {
      self.featureImages = undefined
      self.featureLabels = undefined
      self.featureTypes = undefined
    },

    // Clear all selections
    clearSelections() {
      self.selectedTrackId = undefined
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      this.clearFeatureContent()
    },
  }))
  .views(self => ({
    // unused by this view, but represents of 'view level' menu items
    menuItems(): MenuItem[] {
      return []
    },

    // Get available tracks from session (GFF tracks only)
    get availableTracks() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = (self as any).getRoot?.()?.session
        if (!session?.tracks) {
          return []
        }

        // Filter for GFF-compatible tracks (those that have features)
        return session.tracks.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (track: any) => {
            // Look for tracks that have adapters that can provide features
            const adapterType = track?.configuration?.adapter?.type
            return (
              adapterType === 'Gff3Adapter' ||
              adapterType === 'GtfAdapter' ||
              adapterType === 'BedAdapter' ||
              adapterType === 'GeneFeaturesAdapter'
            )
          },
        )
      } catch (error) {
        console.error('Error getting available tracks:', error)
        return []
      }
    },

    // Get selected track object
    get selectedTrack() {
      if (!self.selectedTrackId) {
        return undefined
      }
      return this.availableTracks.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (track: any) => track.trackId === self.selectedTrackId,
      )
    },

    // Computed properties for easy access
    get hasContent() {
      return !!(self.featureImages && self.featureImages.trim() !== '')
    },

    get displayTitle() {
      if (self.selectedFeatureId) {
        return `${self.displayName} for ${String(self.selectedFeatureId)}`
      }
      if (self.selectedTrackId) {
        const trackName = this.selectedTrack?.name || self.selectedTrackId
        return `${self.displayName} - ${trackName}`
      }
      return self.displayName
    },

    get canSelectFeature() {
      return !!self.selectedTrackId && !self.isLoadingFeatures
    },

    get isReady() {
      return (
        !!self.selectedTrackId &&
        !!self.selectedFeatureId &&
        !self.isLoadingFeatures
      )
    },
  }))

export default stateModel
export { FeatureType }
