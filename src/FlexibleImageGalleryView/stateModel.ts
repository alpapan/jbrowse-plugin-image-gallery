import { types } from 'mobx-state-tree'
import { BaseViewStateModel } from '../shared/BaseViewStateModel'
import {
  SearchableViewMixin,
  SearchableViewMixinProperties,
} from '../shared/SearchableViewMixin'
import { SearchResult } from '../shared/flexibleViewUtils'

const stateModel = types
  .compose(
    'FlexibleImageGalleryView',
    BaseViewStateModel,
    types.model({
      // View-specific properties only (BaseViewStateModel provides core properties)
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
    }),
  )
  .actions(self => ({
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

    setSearchTerm(searchTerm: string) {
      // console.log(
      //   'DEBUG: ImageGalleryView.setSearchTerm called with:',
      //   searchTerm,
      // )
      self.searchTerm = searchTerm
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
          (f: SearchResult) => f.id === featureId,
        )
        if (feature) {
          // Call the method within the same actions scope (no self prefix)
          this.setSelectedFeature(
            String(feature.id),
            feature.type === 'gene' ? 'GENE' : 'NON_GENE',
            String(feature.images || ''),
            String(feature.image_captions || ''),
            String(feature.image_group || ''),
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

    setLoadingFeatures(loading: boolean) {
      // console.log(
      //   'DEBUG: ImageGalleryView.setLoadingFeatures called with:',
      //   loading,
      // )
      self.isLoadingFeatures = loading
    },
  }))
  .views(self => ({
    // View-specific views only (BaseViewStateModel provides core views)
    get defaultDisplayName() {
      return 'Image Gallery View'
    },

    hasContent() {
      return !!self.featureImages
    },

    get canSelectFeature() {
      return !!self.selectedTrackId && !self.isLoadingFeatures
    },
  }))
  .extend(SearchableViewMixin)

export default stateModel
