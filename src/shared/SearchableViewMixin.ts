import { types, flow, isAlive } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import {
  getAssemblyDisplayName,
  getAllTracksForAssembly,
  extractTrackInfo,
  searchFeatureTextIndex,
  SearchResult,
  TrackInfo,
  SearchableViewModel,
} from './flexibleViewUtils'

// Define the mixin properties that need to be added to models using this mixin
export const SearchableViewMixinProperties = {
  selectedAssemblyId: types.maybe(types.string),
  selectedTrackId: types.maybe(types.string),
  searchTerm: types.optional(types.string, ''),
  isSearching: types.optional(types.boolean, false),
  searchResults: types.array(types.frozen<SearchResult>()),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SearchableViewMixin = (self: any) => ({
  views: {
    get availableAssemblies() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const session = getSession(self)
        const assemblyManager = session.assemblyManager
        const assemblyNames = assemblyManager?.assemblyNamesList || []

        const assemblies = assemblyNames.map((name: string) => ({
          name,
          displayName: getAssemblyDisplayName({ name }),
        }))
        return assemblies
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in availableAssemblies getter:', error)
        return []
      }
    },

    get availableTracks() {
      if (!self.selectedAssemblyId) {
        return []
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const tracks = getAllTracksForAssembly(self, self.selectedAssemblyId)
        return tracks.map(extractTrackInfo)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in availableTracks getter:', error)
        return []
      }
    },

    get assemblyName() {
      return self.selectedAssemblyId
    },

    get selectedAssembly() {
      if (!self.selectedAssemblyId) {
        return undefined
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const session = getSession(self)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const assembly = session.assemblyManager.get(self.selectedAssemblyId)
        return assembly
          ? {
              name: self.selectedAssemblyId,
              displayName: getAssemblyDisplayName(assembly),
            }
          : undefined
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in selectedAssembly getter:', error)
        return undefined
      }
    },

    get selectedTrack() {
      if (!self.selectedTrackId) {
        return undefined
      }
      const track = self.availableTracks.find(
        (t: TrackInfo) => t.trackId === self.selectedTrackId,
      )
      return track
        ? {
            trackId: track.trackId,
            name: track.name,
          }
        : undefined
    },

    get hasSelectedAssembly() {
      return !!self.selectedAssemblyId
    },

    get hasSelectedTrack() {
      return !!self.selectedTrackId
    },

    get hasSearchResults() {
      return self.searchResults.length > 0
    },

    get hasSearchTerm() {
      return !!(self.searchTerm && self.searchTerm.length > 0)
    },

    get features() {
      return self.searchResults || []
    },

    get canSearch() {
      return !!self.selectedTrackId
    },

    get isReady() {
      return !!(self.selectedAssemblyId && !self.isLoadingTracks)
    },

    get isTrackReady() {
      return !!self.selectedTrackId && !self.isLoadingFeatures
    },

    get viewDisplayName() {
      return self.selectedFeatureId
        ? `${self.displayName} for ${String(self.selectedFeatureId)}`
        : self.displayName
    },

    get selectedFeature() {
      return self.searchResults.find(
        (f: SearchResult) => f.id === self.selectedFeatureId,
      )
    },
  },

  actions: {
    // Method names that components expect
    setSelectedAssembly(assemblyId: string) {
      self.selectedAssemblyId = assemblyId
      self.selectedTrackId = undefined
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    setSelectedTrack(trackId: string) {
      self.selectedTrackId = trackId
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    setSearchTerm(searchTerm: string) {
      self.searchTerm = searchTerm
    },

    // Base method for common clearSearch logic
    clearSearchBase() {
      // Check if the MST node is still alive before modifying state
      if (!isAlive(self as unknown as Parameters<typeof isAlive>[0])) {
        return
      }
      self.searchTerm = ''
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    clearSearch() {
      // Check if the MST node is still alive before calling base method
      if (!isAlive(self as unknown as Parameters<typeof isAlive>[0])) {
        return
      }
      // Delegate to base implementation
      this.clearSearchBase()
    },

    selectFeature(featureId: string, featureType: string) {
      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType
    },

    clearFeatureSelection() {
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    // Base method for common clearSelections logic
    clearSelectionsBase() {
      // Check if the MST node is still alive before modifying state
      if (!isAlive(self as unknown as Parameters<typeof isAlive>[0])) {
        return
      }
      self.selectedAssemblyId = undefined
      self.selectedTrackId = undefined
      self.searchTerm = ''
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    clearSelections() {
      // Check if the MST node is still alive before calling base method
      if (!isAlive(self as unknown as Parameters<typeof isAlive>[0])) {
        return
      }
      // Delegate to base implementation
      this.clearSelectionsBase()
    },

    searchFeatures: flow(function* searchFeatures() {
      self.isSearching = true
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'

      try {
        // Use default contentExtractor since BaseResult doesn't have the needed attributes
        const searchFn = searchFeatureTextIndex()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = yield searchFn.call(
          undefined,
          self as SearchableViewModel,
        )

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        self.searchResults.replace(results as SearchResult[])
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error searching features:', e)
      } finally {
        self.isSearching = false
      }
    }),
  },
})
