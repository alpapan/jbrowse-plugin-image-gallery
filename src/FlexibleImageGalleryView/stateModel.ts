import { types } from 'mobx-state-tree'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { getSession } from '@jbrowse/core/util'
import { MenuItem } from '@jbrowse/core/ui'
import {
  SearchableViewMixin,
  SearchableViewMixinProperties,
  SearchFeature,
} from '../shared/SearchableViewMixin'

const stateModel = types
  .model('FlexibleImageGalleryView', {
    // Core properties from BaseViewStateModel that we need
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: ElementId as any,
    displayName: types.optional(types.string, ''),
    minimized: types.optional(types.boolean, false),
    width: types.optional(types.number, 400),
    selectedFeatureId: types.maybe(types.string),
    selectedFeatureType: types.optional(types.string, 'GENE'),

    // View-specific properties
    type: types.literal('FlexibleImageGalleryView'),
    imageUrls: types.maybe(types.string),
    imageTitles: types.maybe(types.string),
    imageDescriptions: types.maybe(types.string),
    isLoadingTracks: types.optional(types.boolean, false),
    isLoadingFeatures: types.optional(types.boolean, false),

    // Image-specific properties
    featureImages: types.maybe(types.string),
    featureLabels: types.maybe(types.string),
    featureTypes: types.maybe(types.string),

    // Mixin properties
    ...SearchableViewMixinProperties,
  })
  .actions(self => ({
    // Essential actions from BaseViewStateModel that React components expect
    setWidth(newWidth: number) {
      self.width = newWidth
    },

    setDisplayName(name: string) {
      self.displayName = name
    },

    setMinimized(flag: boolean) {
      self.minimized = flag
    },

    closeView() {
      try {
        const session = getSession(self)
        if (session?.removeView) {
          // Use TypeScript-suggested unknown conversion for type safety
          session.removeView(
            self as unknown as Parameters<typeof session.removeView>[0],
          )
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error closing view:', error)
      }
    },

    updateFeature(
      featureId: string,
      featureType: string,
      images?: string,
      labels?: string,
      types_?: string,
    ) {
      // console.log('DEBUG: ImageGalleryView.updateFeature called with:', {
      //   featureId,
      //   featureType,
      //   images,
      //   labels,
      //   types_,
      // })
      // Validate input - featureId is required, but content can be empty
      if (!featureId) {
        return
      }

      // Always set the selected feature, even if there is no content
      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType
      self.featureImages = images ?? ''
      self.featureLabels = labels ?? ''
      self.featureTypes = types_ ?? ''
    },

    clearFeature() {
      // console.log('DEBUG: ImageGalleryView.clearFeature called')
      // Set selectedFeatureId to undefined (types.maybe allows this)
      // Set content fields to appropriate defaults (subclasses handle specifics)
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      self.featureImages = undefined
      self.featureLabels = undefined
      self.featureTypes = undefined
    },

    // Implement component-expected methods directly
    setSelectedAssembly(assemblyId: string) {
      // console.log(
      //   'DEBUG: ImageGalleryView.setSelectedAssembly called with:',
      //   assemblyId,
      // )
      self.selectedAssemblyId = assemblyId
      self.selectedTrackId = undefined
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    setSelectedTrack(trackId: string) {
      // console.log(
      //   'DEBUG: ImageGalleryView.setSelectedTrack called with:',
      //   trackId,
      // )
      self.selectedTrackId = trackId
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    setSearchText(searchTerm: string) {
      // console.log(
      //   'DEBUG: ImageGalleryView.setSearchText called with:',
      //   searchTerm,
      // )
      self.searchTerm = searchTerm
    },

    clearSearch() {
      // console.log('DEBUG: ImageGalleryView.clearSearch called')
      self.searchTerm = ''
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    selectFeature(featureId: string, featureType: string) {
      // console.log(
      //   'DEBUG: ImageGalleryView.selectFeature called with:',
      //   featureId,
      //   featureType,
      // )
      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType
    },

    setSelectedFeature(
      featureId: string | undefined,
      featureType?: string,
      images?: string,
      labels?: string,
      types_?: string,
    ) {
      // console.log('DEBUG: ImageGalleryView.setSelectedFeature called with:', {
      //   featureId,
      //   featureType,
      //   images,
      //   labels,
      //   types_,
      // })
      if (featureId) {
        self.selectedFeatureId = featureId
        self.selectedFeatureType = featureType ?? 'GENE'
        self.featureImages = images ?? ''
        self.featureLabels = labels ?? ''
        self.featureTypes = types_ ?? ''
      } else {
        self.selectedFeatureId = undefined
        self.selectedFeatureType = 'GENE'
        self.featureImages = undefined
        self.featureLabels = undefined
        self.featureTypes = undefined
      }
    },

    selectFeatureWithImageData(featureId: string | undefined) {
      // console.log(
      //   'DEBUG: ImageGalleryView.selectFeatureWithImageData called with:',
      //   featureId,
      // )
      if (featureId) {
        // Find the feature in search results to get its image data
        const feature = self.searchResults.find(
          (f: SearchFeature) => f.id === featureId,
        )
        if (feature) {
          // Call the method within the same actions scope (no self prefix)
          this.setSelectedFeature(
            feature.id,
            feature.type === 'gene' ? 'GENE' : 'NON_GENE',
            feature.images,
            feature.image_captions,
            feature.image_group,
          )
        } else {
          this.setSelectedFeature(featureId, 'GENE')
        }
      } else {
        this.setSelectedFeature(undefined)
      }
    },

    clearFeatureSelection() {
      // console.log('DEBUG: ImageGalleryView.clearFeatureSelection called')
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      self.featureImages = undefined
      self.featureLabels = undefined
      self.featureTypes = undefined
    },

    clearSelections() {
      // console.log('DEBUG: ImageGalleryView.clearSelections called')
      self.selectedAssemblyId = undefined
      self.selectedTrackId = undefined
      self.searchTerm = ''
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      self.featureImages = undefined
      self.featureLabels = undefined
      self.featureTypes = undefined
    },

    setLoadingFeatures(loading: boolean) {
      // console.log(
      //   'DEBUG: ImageGalleryView.setLoadingFeatures called with:',
      //   loading,
      // )
      self.isLoadingFeatures = loading
    },

    searchFeatures() {
      // console.log('DEBUG: ImageGalleryView.searchFeatures called')
      // Delegate to mixin search functionality
      return (self as any).searchFeatures()
    },
  }))
  .views(self => ({
    // Essential views from BaseViewStateModel that React components expect
    menuItems(): MenuItem[] {
      return []
    },

    get defaultDisplayName() {
      return 'Image Gallery View'
    },

    hasContent() {
      return !!self.featureImages
    },

    get displayTitle() {
      const displayName = self.displayName || this.defaultDisplayName
      return self.selectedFeatureId
        ? String(self.selectedFeatureId)
        : displayName
    },

    get canSelectFeature() {
      return !!self.selectedTrackId && !self.isLoadingFeatures
    },
  }))
  .extend(SearchableViewMixin)

export default stateModel
