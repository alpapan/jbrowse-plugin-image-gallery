import { types, isAlive } from 'mobx-state-tree'
import { BaseViewStateModel } from '../shared/BaseViewStateModel'
import {
  SearchableViewMixin,
  SearchableViewMixinProperties,
} from '../shared/SearchableViewMixin'
import { SearchResult } from '../shared/flexibleViewUtils'

const stateModel = types
  .compose(
    'FlexibleTextualDescriptionsView',
    BaseViewStateModel,
    types.model({
      type: types.literal('FlexibleTextualDescriptionsView'),
      featureMarkdownUrls: types.maybe(types.string),
      featureDescriptions: types.maybe(types.string),
      featureContentTypes: types.maybe(types.string),
      isLoadingTracks: types.optional(types.boolean, false),
      isLoadingFeatures: types.optional(types.boolean, false),
      // Include mixin properties (selectedFeatureId/Type come from BaseViewStateModel)
      ...SearchableViewMixinProperties,
    }),
  )
  .views(self => ({
    get defaultDisplayName() {
      return 'Textual Descriptions View'
    },

    hasContent() {
      return !!self.featureDescriptions
    },
  }))
  .actions(self => ({
    updateFeature(
      featureId: string,
      featureType: string,
      content: string,
      descriptions?: string,
      contentTypes?: string,
    ) {
      if (!featureId) {
        return
      }

      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType
      self.featureDescriptions = descriptions ?? ''
      self.featureContentTypes = contentTypes ?? ''
    },

    clearFeature() {
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      self.featureDescriptions = undefined
      self.featureContentTypes = undefined
    },

    // Implement component-expected methods directly
    setSelectedAssembly(assemblyId: string) {
      // console.log(
      //   'DEBUG: TextualDescriptionsView.setSelectedAssembly called with:',
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
      //   'DEBUG: TextualDescriptionsView.setSelectedTrack called with:',
      //   trackId,
      // )
      self.selectedTrackId = trackId
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    setSearchTerm(searchTerm: string) {
      // console.log(
      //   'DEBUG: TextualDescriptionsView.setSearchTerm called with:',
      //   searchTerm,
      // )
      self.searchTerm = searchTerm
    },

    clearSearch() {
      // console.log('DEBUG: TextualDescriptionsView.clearSearch called')
      // Check if the MST node is still alive before modifying state
      if (!isAlive(self as unknown as Parameters<typeof isAlive>[0])) {
        // console.log('DEBUG: clearSearch called on dead MST node, skipping')
        return
      }
      self.searchTerm = ''
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    selectFeature(featureId: string, featureType: string) {
      // console.log(
      //   'DEBUG: TextualDescriptionsView.selectFeature called with:',
      //   featureId,
      //   featureType,
      // )
      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType
    },

    setSelectedFeature(
      featureId: string | undefined,
      featureType?: string,
      markdownUrls?: string,
      descriptions?: string,
      contentTypes?: string,
    ) {
      // console.log(
      //   'DEBUG: TextualDescriptionsView.setSelectedFeature called with:',
      //   { featureId, featureType, markdownUrls, descriptions, contentTypes },
      // )
      if (featureId) {
        self.selectedFeatureId = featureId
        self.selectedFeatureType = featureType ?? 'GENE'
        self.featureMarkdownUrls = markdownUrls ?? ''
        self.featureDescriptions = descriptions ?? ''
        self.featureContentTypes = contentTypes ?? ''
      } else {
        self.selectedFeatureId = undefined
        self.selectedFeatureType = 'GENE'
        self.featureMarkdownUrls = undefined
        self.featureDescriptions = undefined
        self.featureContentTypes = undefined
      }
    },
    selectFeatureWithTextualData(featureId: string | undefined) {
      // console.log(
      //   'DEBUG: TextualDescriptionsView.selectFeatureWithTextualData called with:',
      //   featureId,
      // )
      if (featureId) {
        // Find the feature in search results to get its textual data
        const feature = self.searchResults.find(
          (f: SearchResult) => f.id === featureId,
        )
        if (feature) {
          // Call the method within the same actions scope (no self prefix)
          this.setSelectedFeature(
            String(feature.id),
            feature.type === 'gene' ? 'GENE' : 'NON_GENE',
            String(feature.markdownUrls || ''),
            String(feature.descriptions || ''),
            String(feature.contentTypes || ''),
          )
        } else {
          this.setSelectedFeature(featureId, 'GENE')
        }
      } else {
        this.setSelectedFeature(undefined)
      }
    },
    clearFeatureSelection() {
      // console.log('DEBUG: TextualDescriptionsView.clearFeatureSelection called')
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      self.featureMarkdownUrls = undefined
      self.featureDescriptions = undefined
      self.featureContentTypes = undefined
    },

    clearSelections() {
      // Call the mixin's clearSelections (which has the alive check)
      ;(self as unknown as { clearSelections: () => void }).clearSelections()

      // Add view-specific textual cleanup
      if (!isAlive(self as unknown as Parameters<typeof isAlive>[0])) return
      self.featureMarkdownUrls = undefined
      self.featureDescriptions = undefined
      self.featureContentTypes = undefined
    },

    setLoadingFeatures(loading: boolean) {
      // console.log(
      //   'DEBUG: TextualDescriptionsView.setLoadingFeatures called with:',
      //   loading,
      // )
      self.isLoadingFeatures = loading
    },
  }))
  .extend(SearchableViewMixin)

export default stateModel
