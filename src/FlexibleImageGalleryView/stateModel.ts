import { types, cast, Instance, flow } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject } from '@jbrowse/core/configuration'
import { MenuItem } from '@jbrowse/core/ui'
import { toArray } from 'rxjs/operators'
import { Feature } from '@jbrowse/core/util/simpleFeature'

// Feature search configuration constants
const FEATURE_SEARCH_MAX_RESULTS = 5 // Stop after finding 5 results
const FEATURE_SEARCH_MAX_RANGE = 1000000 // 1M bp chunks

interface ImageData {
  g: string
  annot_feature_id: string[]
  imgs: string[]
  titles: string[]
  type: string[]
  url: string[]
  caption: string[]
  images: string[]
}
export interface ImageGroupData {
  images: ImageData[]
  source: string[]
  caption?: string
  description?: string
  experimental_conditions?: string[]
  pubmed_id?: string[]
  publication_doi?: string[]
  annotation_feature_id?: string
  group_title?: string
}

// Define compatible adapter types
const COMPATIBLE_ADAPTER_TYPES = [
  'Gff3Adapter',
  'Gff3TabixAdapter',
  'GtfAdapter',
  'BedAdapter',
  'GeneFeaturesAdapter',
]

// Interface for search feature results
export interface SearchFeature {
  id: string
  name: string
  type: string
  location: string
  trackId: string
  images: string
  imageCaptions: string
  imageGroup: string
}

// Simple interface for internal search results before converting to SearchFeature
interface FeatureSearchResult {
  featureId: string
  displayName: string
  location: string
}

// MST model for search result items
const SearchResultDesign = types.model('SearchResultItem', {
  id: types.string,
  name: types.string,
  type: types.string,
  location: types.string,
})

// Helper function to extract friendly assembly name using JBrowse 2 configuration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAssemblyDisplayName(assembly: any): string {
  try {
    if (!assembly) {
      return 'Unknown Assembly'
    }

    // Use proper JBrowse 2 configuration access
    const displayName = readConfObject(assembly, 'displayName')
    const assemblyName = readConfObject(assembly, 'name')

    // Return displayName if available, otherwise use name
    return String(displayName || assemblyName || 'Unknown Assembly')
  } catch (error) {
    console.error('Error reading assembly configuration:', error)
    return String(assembly?.name || assembly?.id || 'Unknown Assembly')
  }
}

/**
 * Return all track objects—configuration-defined and session-added—
 * whose assemblyNames include the requested assembly.
 * Following exact JBrowse 2 best practices from AGENT.md
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAllTracksForAssembly(self: any, assemblyName: string) {
  console.log('🔍 DEBUG: getAllTracksForAssembly called with:', assemblyName)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const session = getSession(self)

  // FIXED: Use correct path based on debug findings
  // Debug showed tracks are at session.jbrowse.tracks, not session.jbrowse.configuration.tracks

  // 1. Static tracks from config.json - using the working method from debug
  const allConfigTracks = readConfObject(session.jbrowse, 'tracks') ?? []
  console.log(
    '🔍 DEBUG: readConfObject(session.jbrowse, "tracks") returned:',
    allConfigTracks.length,
  )

  if (allConfigTracks.length > 0) {
    console.log('🔍 DEBUG: First config track sample:', allConfigTracks[0])

    // Better PROXY OBJECT INSPECTION - Proxies don't show content in console.log
    console.log('🔍 DEBUG: === INSPECTING PROXY OBJECTS ===')

    // Inspect session.tracks properly
    console.log('🔍 DEBUG: session.tracks.length:', session.tracks?.length)
    if (session.tracks?.length > 0) {
      console.log('🔍 DEBUG: session.tracks[0] (raw):', session.tracks[0])
      console.log(
        '🔍 DEBUG: session.tracks[0].toJSON():',
        session.tracks[0].toJSON?.(),
      )
      console.log(
        '🔍 DEBUG: session.tracks[0] keys:',
        Object.keys(session.tracks[0]),
      )
    }

    // Inspect session.views properly
    console.log('🔍 DEBUG: session.views.length:', session.views?.length)
    if (session.views?.length > 0) {
      console.log('🔍 DEBUG: session.views[0] type:', session.views[0].type)
      console.log(
        '🔍 DEBUG: session.views[0] keys:',
        Object.keys(session.views[0]),
      )
    }

    // Inspect sessionTracks properly
    console.log(
      '🔍 DEBUG: session.sessionTracks.length:',
      session.sessionTracks?.length,
    )
    if (session.sessionTracks?.length > 0) {
      console.log('🔍 DEBUG: sessionTracks[0]:', session.sessionTracks[0])
      console.log(
        '🔍 DEBUG: sessionTracks[0] toJSON:',
        session.sessionTracks[0].toJSON?.(),
      )
    } else {
      console.log('🔍 DEBUG: sessionTracks is empty array')
    }

    // Try to iterate through tracks array manually
    console.log('🔍 DEBUG: Iterating through session.tracks manually...')
    for (let i = 0; i < (session.tracks?.length || 0); i++) {
      const track = session.tracks[i]
      console.log(`🔍 DEBUG: Track ${i}:`, {
        trackId: track.trackId || track.configuration?.trackId,
        type: track.type,
        name: track.name || track.configuration?.name,
        hasGetFeatures: typeof track.getFeatures === 'function',
        hasAdapter: !!track.adapter,
        keys: Object.keys(track).slice(0, 10), // First 10 keys
      })
    }

    console.log('🔍 DEBUG: === END PROXY INSPECTION ===')

    // Debug each track's assembly configuration using readConfObject
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allConfigTracks.forEach((tc: any, index: number) => {
      const trackId = readConfObject(tc, 'trackId')
      const assemblyNames = readConfObject(tc, 'assemblyNames')
      console.log(
        `🔍 DEBUG: Track ${index} - trackId:`,
        trackId,
        'assemblyNames:',
        assemblyNames,
      )
    })
  }

  // Filter tracks by assembly using readConfObject
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfgTracks = allConfigTracks.filter((tc: any) => {
    const trackAssemblyNames = readConfObject(tc, 'assemblyNames') ?? []
    console.log(
      '🔍 DEBUG: Track assemblyNames:',
      trackAssemblyNames,
      'Looking for:',
      assemblyName,
    )
    const includes = trackAssemblyNames.includes(assemblyName)
    console.log('🔍 DEBUG: Track includes assembly?', includes)
    return includes
  })

  console.log('🔍 DEBUG: Config tracks found:', cfgTracks.length)

  // 2. tracks added after start-up (stored on the session model)
  console.log('🔍 DEBUG: Session sessionTracks:', session.sessionTracks)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liveTracks = (session.sessionTracks ?? []).filter((t: any) =>
    (t.assemblyNames ?? []).includes(assemblyName),
  )

  console.log('🔍 DEBUG: Session tracks found:', liveTracks.length)

  const allTracks = [...cfgTracks, ...liveTracks]
  console.log('🔍 DEBUG: Total tracks for assembly:', allTracks.length)

  return allTracks
}

interface TrackInfo {
  trackId: string
  name: string
  adapterType: string
  hasIndex: boolean
  isCompatible: boolean
}

// MST model definition with proper typing
const stateModel = types
  .model('FlexibleImageGalleryView', {
    id: types.optional(types.identifier, () => `gallery_${Date.now()}`),
    type: types.literal('FlexibleImageGalleryView'),
    displayName: types.optional(types.string, 'Flexible Image Gallery'),
    selectedAssemblyId: types.maybe(types.string),
    selectedTrackId: types.maybe(types.string),
    selectedFeatureId: types.maybe(types.string),
    searchText: types.optional(types.string, ''),
    // Use simple frozen objects instead of complex MST models
    searchResults: types.optional(types.array(types.frozen()), []),
    searchInProgress: types.optional(types.boolean, false),
    // Add image data storage properties like SelectImageGalleryView
    featureImages: types.optional(types.string, ''),
    featureLabels: types.optional(types.string, ''),
    featureTypes: types.optional(types.string, ''),
    maxImages: types.optional(types.number, 50),
    imageWidth: types.optional(types.number, 200),
    imageHeight: types.optional(types.number, 150),
    showImageNames: types.optional(types.boolean, true),
    showDescriptions: types.optional(types.boolean, true),
    enableZoom: types.optional(types.boolean, true),
    enableDownload: types.optional(types.boolean, true),
  })
  .views(self => ({
    get availableAssemblyNames() {
      const session = getSession(self)
      console.log('🔍 DEBUG: Getting available assembly names...')
      const assemblyNames = session.assemblyManager.assemblyNamesList
      console.log('🔍 DEBUG: Found assemblies:', assemblyNames)
      return assemblyNames
    },

    get availableAssemblies() {
      try {
        const session = getSession(self)
        if (!session) {
          return []
        }

        // Cache the assemblies to avoid re-computation on every state change
        // This view should only re-compute when assemblies actually change,
        // not when selectedAssemblyId changes
        const assemblies = session.assemblies || []
        return assemblies
      } catch (error) {
        console.error('Error getting available assemblies:', error)
        return []
      }
    },

    get availableTrackCount() {
      if (!self.selectedAssemblyId) {
        console.log('🔍 DEBUG: No assembly selected, returning 0 tracks')
        return 0
      }

      try {
        // Use the reusable function
        const allTracks = getAllTracksForAssembly(self, self.selectedAssemblyId)

        console.log(
          '🔍 DEBUG: Config tracks from readConfObject:',
          allTracks.length,
        )

        console.log('🔍 DEBUG: Total tracks for assembly:', allTracks.length)

        return allTracks.length
      } catch (error) {
        console.error('🔍 DEBUG: Error getting track count:', error)
        return 0
      }
    },

    get availableTracks(): TrackInfo[] {
      if (!self.selectedAssemblyId) {
        console.log(
          '🔍 DEBUG: No assembly selected, returning empty tracks array',
        )
        return []
      }

      try {
        const assemblyId = self.selectedAssemblyId

        // Find all compatible tracks for display in the dropdown
        const trackConfs = getAllTracksForAssembly(self, assemblyId)

        console.log(
          '🔍 DEBUG: Processing',
          trackConfs.length,
          'tracks for compatibility',
        )

        return (
          trackConfs
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((trackConf: any): TrackInfo => {
              // For config tracks use readConfObject, for session tracks use direct access
              const trackId = trackConf.configuration
                ? readConfObject(trackConf, 'trackId')
                : trackConf.trackId

              const trackName = trackConf.configuration
                ? readConfObject(trackConf, 'name')
                : trackConf.name

              console.log('🔍 DEBUG: Processing track:', trackId, trackName)

              // Check if this track has compatible adapter
              const adapterConfig = trackConf.configuration
                ? readConfObject(trackConf, 'adapter')
                : trackConf.adapter

              const adapterType = adapterConfig
                ? trackConf.configuration
                  ? readConfObject(adapterConfig, 'type')
                  : adapterConfig.type
                : null

              /**
               * For tracks with an index property, whether or not that is an actual index (which indexes features by positions) is implementation dependent/non-standard.
               * So, 'true' is the ONLY safe interpretation.
               */
              const hasIndex = adapterConfig
                ? trackConf.configuration
                  ? !!readConfObject(adapterConfig, 'index')
                  : !!adapterConfig.index
                : false

              const isCompatible =
                typeof adapterType === 'string' &&
                COMPATIBLE_ADAPTER_TYPES.includes(adapterType)

              console.log(
                '🔍 DEBUG: Track',
                trackId,
                'adapterType:',
                adapterType,
                'isCompatible:',
                isCompatible,
              )

              return {
                trackId,
                name: trackName || trackId,
                adapterType: adapterType || '',
                hasIndex,
                isCompatible,
              }
            })
            .filter((track: TrackInfo) => track.isCompatible)
        )
      } catch (error) {
        console.error('🔍 DEBUG: Error getting available tracks:', error)
        return []
      }
    },

    // Add missing features property that React component expects
    get features() {
      // Return search results directly since they're already formatted for UI
      return self.searchResults.map((feature: any) => ({
        id: feature.id,
        name: feature.name,
        type: feature.type,
        location: feature.location,
      }))
    },

    // Properties expected by React component
    get isSearching() {
      return self.searchInProgress
    },

    get hasSearchResults() {
      return self.searchResults.length > 0
    },

    get hasSearchTerm() {
      return self.searchText.trim().length > 0
    },

    get canSelectFeature() {
      return self.searchResults.length > 0
    },

    get canSearch() {
      return Boolean(self.selectedAssemblyId && self.selectedTrackId)
    },

    get searchTerm() {
      return self.searchText
    },

    // unused by this view, but required for JBrowse 2 view compatibility
    menuItems(): MenuItem[] {
      return []
    },

    // Computed properties for compatibility with React component
    get hasContent() {
      return self.featureImages.trim() !== ''
    },

    get isReady() {
      return Boolean(self.selectedFeatureId)
    },

    get isLoadingTracks() {
      return false // No async track loading currently
    },

    get isLoadingFeatures() {
      return self.searchInProgress
    },
  }))
  .actions(self => ({
    // unused by this view, but it is updated with the current width in pixels of
    // the view panel
    setWidth() {},

    // Set the display name for the view (required for view renaming)
    setDisplayName(name: string) {
      self.displayName = name
    },

    // Set minimized state (required for view collapsing)
    setMinimized(flag: boolean) {
      // This view doesn't support minimizing, but the method is required
    },

    // Assembly selection actions
    setSelectedAssembly(assemblyId: string | undefined) {
      self.selectedAssemblyId = assemblyId
      // Reset dependent selections when assembly changes
      self.selectedTrackId = undefined
      self.selectedFeatureId = undefined
    },

    // Track selection actions
    setSelectedTrack(trackId: string | undefined) {
      console.log('🔍 DEBUG: setSelectedTrack called with:', trackId)
      self.selectedTrackId = trackId
      // Reset feature selection when track changes
      self.selectedFeatureId = undefined
      console.log(
        '🔍 DEBUG: Track selection updated, selectedTrackId now:',
        self.selectedTrackId,
      )
    },

    // Feature selection actions
    setSelectedFeature(featureId: string | undefined) {
      self.selectedFeatureId = featureId
    },

    // Select feature and fetch its image data like SelectImageGalleryView does
    selectFeatureWithImageData: flow(function* (featureId: string | undefined) {
      if (!featureId) {
        self.selectedFeatureId = undefined
        self.featureImages = ''
        self.featureLabels = ''
        self.featureTypes = ''
        return
      }

      try {
        // Set selected feature ID immediately
        self.selectedFeatureId = featureId

        // Find the basic feature info from search results
        const basicFeature = self.searchResults.find(
          (feature: any) => feature.id === featureId,
        )
        if (!basicFeature) {
          console.error(
            'Selected feature not found in search results:',
            featureId,
          )
          return
        }

        console.log('🔍 DEBUG: Fetching full feature data for:', featureId)

        // Parse location to get refName, start, end for RPC query
        const locationParts = basicFeature.location.split(':')
        const refName = locationParts[0] || 'unknown'
        const rangeParts = locationParts[1]?.split('-') || ['0', '1000']
        const start = Math.max(0, Number(rangeParts[0]) - 100) // Small buffer
        const end = Number(rangeParts[1]) + 100

        // Fetch full feature data using the same RPC pattern as search
        const session = getSession(self)
        const trackConfs =
          readConfObject(session.jbrowse.configuration, 'tracks') ?? []
        const trackConf = trackConfs.find(
          (tc: any) => readConfObject(tc, 'trackId') === self.selectedTrackId,
        )

        if (!trackConf) {
          console.error(
            'Track not found for feature fetch:',
            self.selectedTrackId,
          )
          return
        }

        const adapter = readConfObject(trackConf, 'adapter')
        const queryRegion = {
          refName,
          start,
          end,
          assemblyName: self.selectedAssemblyId,
        }

        const rpcManager = session.rpcManager
        const sessionId = session.id
        if (!sessionId) {
          console.warn('No session ID available for feature fetch')
          return
        }

        const featureResults = yield rpcManager.call(
          sessionId,
          'CoreGetFeatures',
          {
            sessionId,
            regions: [queryRegion],
            adapterConfig: adapter,
          },
        )

        const features = Array.isArray(featureResults) ? featureResults : []

        // Find the specific feature by ID
        const targetFeature = features.find((feature: any) => {
          const id = String(feature.get?.('ID') || feature.get?.('id') || '')
          return id === featureId
        })

        if (targetFeature) {
          const typedFeature = targetFeature as {
            get?: (key: string) => unknown
          }

          // Extract image attributes
          const images = String(
            typedFeature.get?.('images') ||
              typedFeature.get?.('image_urls') ||
              typedFeature.get?.('gallery_images') ||
              '',
          )
          const labels = String(
            typedFeature.get?.('image_labels') ||
              typedFeature.get?.('labels') ||
              typedFeature.get?.('descriptions') ||
              '',
          )
          const types = String(
            typedFeature.get?.('image_types') ||
              typedFeature.get?.('types') ||
              typedFeature.get?.('categories') ||
              '',
          )

          console.log('🔍 DEBUG: Selected feature image data:', {
            featureId,
            images,
            labels,
            types,
          })

          // Store the image data in state
          self.featureImages = images
          self.featureLabels = labels
          self.featureTypes = types

          if (images) {
            console.log('🔍 DEBUG: Feature has image data, ready to display')
          } else {
            console.log('🔍 DEBUG: Feature has no image data')
          }
        } else {
          console.log(
            '🔍 DEBUG: Could not find feature in region query results',
          )
          self.featureImages = ''
          self.featureLabels = ''
          self.featureTypes = ''
        }
      } catch (error) {
        console.error('🔍 DEBUG: Error fetching feature data:', error)
        self.featureImages = ''
        self.featureLabels = ''
        self.featureTypes = ''
      }
    }),

    // Add missing clearSelections action that React component calls
    clearSelections() {
      self.selectedAssemblyId = undefined
      self.selectedTrackId = undefined
      self.selectedFeatureId = undefined
      self.searchText = ''
    },

    // Search text management
    setSearchText(text: string) {
      self.searchText = text
    },

    clearSearch() {
      self.searchText = ''
      self.searchResults = cast([])
      self.selectedFeatureId = undefined
    },

    // Feature search using proper JBrowse 2 API - searches all chromosomes systematically
    searchFeatures: flow(function* () {
      try {
        if (!self.selectedAssemblyId || !self.selectedTrackId) {
          console.log(
            '🔍 DEBUG: Cannot search - missing assembly or track selection',
          )
          return
        }

        const searchTerm = self.searchText.trim()
        if (!searchTerm) {
          console.log('🔍 DEBUG: Cannot search - no search term provided')
          return
        }

        console.log('🔍 DEBUG: Starting feature search for term:', searchTerm)
        self.searchInProgress = true
        self.searchResults = cast([])

        const session = getSession(self)
        const assembly = yield session.assemblyManager.waitForAssembly(
          self.selectedAssemblyId,
        )

        if (!assembly?.regions) {
          console.error('🔍 DEBUG: Assembly regions not available')
          return
        }

        console.log('🔍 DEBUG: Assembly regions:', assembly.regions.length)

        // Get track configuration using reactive API
        const trackConfs =
          readConfObject(session.jbrowse.configuration, 'tracks') ?? []
        const trackConf = trackConfs.find(
          (tc: any) => readConfObject(tc, 'trackId') === self.selectedTrackId,
        )

        if (!trackConf) {
          console.error('🔍 DEBUG: Track configuration not found')
          return
        }

        // Get adapter config from track config using readConfObject
        const adapter = readConfObject(trackConf, 'adapter')

        // Use session's RPC manager to search features across all regions
        const rpcManager = session.rpcManager
        const sessionId = session.id

        console.log(
          '🔍 DEBUG: Searching across',
          assembly.regions.length,
          'regions',
        )

        let allResults: any[] = []
        let regionsSearched = 0
        const maxResults = FEATURE_SEARCH_MAX_RESULTS
        const maxRange = FEATURE_SEARCH_MAX_RANGE // 1M bp chunks

        // Process each chromosome/contig
        for (const region of assembly.regions) {
          if (allResults.length >= maxResults) break

          const refName = region.refName
          const regionLength = region.end - region.start

          console.log(
            `🔍 DEBUG: Searching region ${refName} (${regionLength} bp)`,
          )

          // Process large regions in chunks to avoid timeout
          const chunks = []
          for (
            let start = region.start;
            start < region.end;
            start += maxRange
          ) {
            const end = Math.min(start + maxRange, region.end)
            chunks.push({
              refName,
              start,
              end,
              assemblyName: self.selectedAssemblyId,
            })
          }

          // Search each chunk
          for (const queryRegion of chunks) {
            if (allResults.length >= maxResults) break

            try {
              console.log(
                `🔍 DEBUG: Querying chunk ${queryRegion.refName}:${queryRegion.start}-${queryRegion.end}`,
              )

              const featureResults = yield rpcManager.call(
                sessionId,
                'CoreGetFeatures',
                {
                  sessionId,
                  regions: [queryRegion],
                  adapterConfig: adapter,
                },
              )

              const features = Array.isArray(featureResults)
                ? featureResults
                : []
              console.log(
                `🔍 DEBUG: Chunk returned ${features.length} features`,
              )

              // Filter features by search term (case-insensitive)
              const filteredFeatures = features.filter((feature: any) => {
                const featureId =
                  feature.get('ID') ||
                  feature.get('Name') ||
                  feature.id() ||
                  'unknown'
                const featureName =
                  feature.get('Name') || feature.get('ID') || 'unnamed'
                const featureType =
                  feature.get('type') || feature.get('Type') || 'unknown'

                const searchLower = searchTerm.toLowerCase()
                return (
                  featureId.toLowerCase().includes(searchLower) ||
                  featureName.toLowerCase().includes(searchLower) ||
                  featureType.toLowerCase().includes(searchLower)
                )
              })

              console.log(
                `🔍 DEBUG: Filtered to ${filteredFeatures.length} matching features`,
              )

              // Convert filtered features to search result format
              const chunkResults = filteredFeatures
                .slice(0, maxResults - allResults.length)
                .map((feature: any) => ({
                  id: feature.get('ID') || feature.get('Name') || feature.id(),
                  name:
                    feature.get('Name') ||
                    feature.get('ID') ||
                    'Unnamed Feature',
                  type: feature.get('type') || 'Unknown',
                  location: `${queryRegion.refName}:${feature.get(
                    'start',
                  )}-${feature.get('end')}`,
                }))

              allResults = allResults.concat(chunkResults)
              console.log(
                `🔍 DEBUG: Total results so far: ${allResults.length}`,
              )
            } catch (chunkError) {
              console.warn(
                `🔍 DEBUG: Error searching chunk ${queryRegion.refName}:${queryRegion.start}-${queryRegion.end}:`,
                chunkError,
              )
            }
          }

          regionsSearched++
          console.log(
            `🔍 DEBUG: Completed region ${regionsSearched}/${assembly.regions.length}`,
          )
        }

        console.log('🔍 DEBUG: WORKING RPC TOTAL FEATURES:', allResults.length)

        // Store results using cast() for frozen array
        self.searchResults = cast(allResults.slice(0, maxResults))

        console.log(
          '🔍 DEBUG: Search completed, found',
          self.searchResults.length,
          'matching features',
        )
      } catch (error) {
        console.log('🔍 DEBUG: Error in working RPC searchFeatures:', error)
        self.searchResults = cast([])
      } finally {
        self.searchInProgress = false
      }
    }),

    // Get unique feature IDs from selected track for dropdown population
    getAvailableFeatureIds: flow(function* () {
      if (!self.selectedAssemblyId || !self.selectedTrackId) {
        console.log(
          '🔍 DEBUG: Cannot get feature IDs - missing assembly or track selection',
        )
        return []
      }

      try {
        const session = getSession(self)
        const assembly = yield session.assemblyManager.waitForAssembly(
          self.selectedAssemblyId,
        )

        if (!assembly?.regions) {
          console.error('🔍 DEBUG: Assembly regions not available')
          return []
        }

        // Get track configuration
        const trackConfs =
          readConfObject(session.jbrowse.configuration, 'tracks') ?? []
        const trackConf = trackConfs.find(
          (tc: any) => readConfObject(tc, 'trackId') === self.selectedTrackId,
        )

        if (!trackConf) {
          console.error('🔍 DEBUG: Track configuration not found')
          return []
        }

        // Get adapter config from track config using readConfObject
        const adapter = readConfObject(trackConf, 'adapter')

        // Use RPC to get features from a representative region (first region, limited range)
        const rpcManager = session.rpcManager
        const sessionId = session.id

        // Sample from first region only, limit range for performance
        const sampleRegion = {
          refName: assembly.regions[0].refName,
          start: assembly.regions[0].start,
          end: Math.min(
            assembly.regions[0].start + 1000000,
            assembly.regions[0].end,
          ), // 1MB sample
          assemblyName: self.selectedAssemblyId,
        }

        const featureResults = yield rpcManager.call(
          sessionId,
          'CoreGetFeatures',
          {
            sessionId,
            regions: [sampleRegion],
            adapterConfig: adapter,
          },
        )

        const features = Array.isArray(featureResults) ? featureResults : []

        // Extract unique feature IDs
        const featureIds = features.map((feature: any) => ({
          id: feature.get('ID') || feature.get('Name') || feature.id(),
          name: feature.get('Name') || feature.get('ID') || 'Unnamed Feature',
          gffId: feature.get('ID'), // Primary GFF3 ID
        }))

        // Remove duplicates based on ID
        const uniqueIds = featureIds.filter(
          (item, index, self) =>
            index === self.findIndex(t => t.id === item.id),
        )

        console.log('🔍 DEBUG: Found', uniqueIds.length, 'unique feature IDs')
        return uniqueIds
      } catch (error) {
        console.error('🔍 DEBUG: Error getting available feature IDs:', error)
        return []
      }
    }),
  }))

export type FlexibleImageGalleryViewModel = Instance<typeof stateModel>
export default stateModel
