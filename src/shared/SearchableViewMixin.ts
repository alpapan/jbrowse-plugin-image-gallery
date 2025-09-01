import {
  types,
  flow,
  getSnapshot,
  getEnv,
  getParent,
  getRoot,
} from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { getConf } from '@jbrowse/core/configuration'
import {
  getAssemblyDisplayName,
  getAllTracksForAssembly,
  extractTrackInfo,
  searchFeatureRangeQueries,
  searchFeatureTextIndex,
  getFeatureId,
  getFeatureName,
} from './flexibleViewUtils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SearchFeature extends Record<string, any> {
  id: string
  name: string
  type: string
  location: string
}

interface TrackInfo {
  trackId: string
  name: string
  // Add other properties as needed
}

// Define the mixin properties that need to be added to models using this mixin
export const SearchableViewMixinProperties = {
  selectedAssemblyId: types.maybe(types.string),
  selectedTrackId: types.maybe(types.string),
  searchTerm: types.optional(types.string, ''),
  isSearching: types.optional(types.boolean, false),
  searchResults: types.array(types.frozen<SearchFeature>()),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SearchableViewMixin = (self: any) => ({
  views: {
    get availableAssemblies() {
      // console.log('DEBUG: availableAssemblies getter called')
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const session = getSession(self)
        const assemblyManager = session.assemblyManager
        // console.log('DEBUG: assemblyManager:', assemblyManager)
        const assemblyNames = assemblyManager?.assemblyNamesList || []
        // console.log('DEBUG: assemblyNames:', assemblyNames)

        const assemblies = assemblyNames.map((name: string) => ({
          name,
          displayName: getAssemblyDisplayName({ name }),
        }))
        // console.log('DEBUG: formatted assemblies:', assemblies)
        return assemblies
      } catch (error) {
        // console.error('DEBUG: Error in availableAssemblies getter:', error)
        return []
      }
    },

    get availableTracks() {
      // console.log(
      //   'DEBUG: availableTracks getter called, selectedAssemblyId:',
      //   self.selectedAssemblyId,
      // )
      if (!self.selectedAssemblyId) {
        return []
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const tracks = getAllTracksForAssembly(self, self.selectedAssemblyId)
        // console.log(
        //   'DEBUG: availableTracks result:',
        //   tracks?.length || 0,
        //   'tracks',
        // )
        return tracks.map(extractTrackInfo)
      } catch (error) {
        console.error('DEBUG: Error in availableTracks getter:', error)
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
        console.error('DEBUG: Error in selectedAssembly getter:', error)
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
        (f: SearchFeature) => f.id === self.selectedFeatureId,
      )
    },
  },

  actions: {
    // Method names that components expect
    setSelectedAssembly(assemblyId: string) {
      // console.log('DEBUG: setSelectedAssembly called with:', assemblyId)
      self.selectedAssemblyId = assemblyId
      self.selectedTrackId = undefined
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    setSelectedTrack(trackId: string) {
      // console.log('DEBUG: setSelectedTrack called with:', trackId)
      self.selectedTrackId = trackId
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    setSearchTerm(searchTerm: string) {
      // console.log('DEBUG: setSearchTerm called with:', searchTerm)
      self.searchTerm = searchTerm
    },

    clearSearch() {
      // console.log('DEBUG: clearSearch called')
      self.searchTerm = ''
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    selectFeature(featureId: string, featureType: string) {
      // console.log('DEBUG: selectFeature called with:', featureId, featureType)
      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType
    },

    clearFeatureSelection() {
      // console.log('DEBUG: clearFeatureSelection called')
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    clearSelections() {
      // console.log('DEBUG: clearSelections called')
      self.selectedAssemblyId = undefined
      self.selectedTrackId = undefined
      self.searchTerm = ''
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },

    searchFeatures: flow(function* searchFeatures() {
      // console.log('DEBUG: searchFeatures called')
      self.isSearching = true
      self.searchResults.clear()
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const results = yield searchFeatureTextIndex()(self)

        // if (results?.length > 0) {
        //   console.log('DEBUG: searchFeatures results:', results?.length || 0)
        // }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        self.searchResults.replace(results as SearchFeature[])
      } catch (e) {
        console.error('Error searching features:', e)
      } finally {
        self.isSearching = false
      }
    }),
  },
})
