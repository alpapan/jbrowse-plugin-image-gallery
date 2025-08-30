import { ElementId } from '@jbrowse/core/util/types/mst'
import { types, Instance, getRoot } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject } from '@jbrowse/core/configuration'
import { MenuItem } from '@jbrowse/core/ui'
import { getConf } from '@jbrowse/core/configuration'
import { toArray } from 'rxjs/operators'

// Define compatible adapter types
const COMPATIBLE_ADAPTER_TYPES = [
  'Gff3Adapter',
  'Gff3TabixAdapter',
  'GtfAdapter',
  'BedAdapter',
  'GeneFeaturesAdapter',
]

// Feature types that can be selected in the view
export enum FeatureType {
  GENE = 'GENE',
  EXON = 'EXON',
  CDS = 'CDS',
  TRANSCRIPT = 'TRANSCRIPT',
  MRNA = 'mRNA',
  UTR = 'UTR',
  INTRON = 'INTRON',
  INTERGENIC = 'INTERGENIC',
  PSEUDOGENE = 'PSEUDOGENE',
  LNCRNA = 'lncRNA',
  MIRNA = 'miRNA',
  RRNA = 'rRNA',
  TRNA = 'tRNA',
  SNCRNA = 'sncRNA',
  SNORNA = 'snoRNA',
  SNRNA = 'snRNA',
  NONCODING = 'noncoding',
  REGULATORY = 'regulatory',
  ENHANCER = 'enhancer',
  PROMOTER = 'promoter',
  REPEAT = 'repeat',
  CENTROMERE = 'centromere',
  TELOMERE = 'telomere',
  CHROMOSOME = 'chromosome',
  SCAFFOLD = 'scaffold',
  CONTIG = 'contig',
  GAP = 'gap',
  UNKNOWN = 'unknown',
}

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

// Define proper interfaces for JBrowse2 objects
interface JBrowseTrack {
  trackId: string
  getConf?: (key: string) => unknown
  [key: string]: unknown
}

// Helper function to extract friendly assembly name in "Species (code)" format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAssemblyDisplayName(assembly: any): string {
  try {
    // Use the getConf method from Assembly API
    const displayName = assembly.getConf ? assembly.getConf('displayName') : ''
    const assemblyCode = assembly.getConf
      ? assembly.getConf('name')
      : assembly.name

    // Check if displayName is actually different from name (meaning it's a friendly name)
    if (
      displayName &&
      String(displayName).trim() !== '' &&
      displayName !== assemblyCode
    ) {
      return String(displayName)
    }

    // If displayName is same as name or empty, try to format it nicely
    // Look for common assembly patterns and create friendly names
    const name = String(assemblyCode || assembly.name || '').toLowerCase()

    if (name.includes('hg19') || name === 'grch37') {
      return 'Homo sapiens (hg19)'
    } else if (name.includes('hg38') || name === 'grch38') {
      return 'Homo sapiens (hg38)'
    } else if (name.includes('mm10')) {
      return 'Mus musculus (mm10)'
    } else if (name.includes('mm39')) {
      return 'Mus musculus (mm39)'
    }

    // For other assemblies, use the original name
    return String(assemblyCode || assembly.name || 'Unknown Assembly')
  } catch (error) {
    console.error('Error reading assembly configuration:', error)
    return String(assembly.name || assembly.id || 'Unknown Assembly')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stateModel: any = types
  .model({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: ElementId as any,
    type: types.literal('FlexibleImageGalleryView'),
    displayName: types.optional(types.string, 'Flexible Image Gallery'),
    minimized: types.optional(types.boolean, false),
    // Assembly, track and feature selection state - order matters!
    selectedAssemblyId: types.maybe(types.string),
    selectedTrackId: types.maybe(types.string),
    selectedFeatureId: types.maybe(types.string),
    selectedFeatureType: types.optional(types.string, 'GENE'),
    // Content fields inherited from ImageGalleryView
    featureImages: types.maybe(types.string),
    featureLabels: types.maybe(types.string),
    featureTypes: types.maybe(types.string),
    featureImageCaptions: types.maybe(types.string),
    featureImageGroup: types.maybe(types.string),
    // Loading states for progressive UI
    isLoadingTracks: types.optional(types.boolean, false),
    isLoadingFeatures: types.optional(types.boolean, false),
    // Text search state management
    searchTerm: types.optional(types.string, ''),
    searchResults: types.optional(types.array(types.frozen()), []),
    isSearching: types.optional(types.boolean, false),
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
        const session = getSession(self)
        if (session?.removeView) {
          // Cast self as unknown then to AbstractViewModel for compatibility
          session.removeView(
            self as unknown as Parameters<typeof session.removeView>[0],
          )
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

    // Text search actions
    setSearchTerm(term: string) {
      self.searchTerm = term
    },

    setSearching(searching: boolean) {
      self.isSearching = searching
    },

    // Helper action to set feature data with fallback values
    setFeatureDataFallback(featureId: string, featureType?: string) {
      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType ?? 'GENE'
      self.featureImages = ''
      self.featureImageCaptions = ''
      self.featureImageGroup = ''
    },

    // Helper action to set feature data synchronously (for async operations)
    setFeatureData(
      featureId: string,
      featureType: string,
      images: string,
      imageCaptions: string,
      imageGroup: string,
    ) {
      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType
      self.featureImages = images
      self.featureImageCaptions = imageCaptions
      self.featureImageGroup = imageGroup
    },

    // Set search results and clear loading state
    setSearchResultsAndState(results: SearchFeature[]): void {
      self.searchResults.replace(results)
      self.isSearching = false
    },

    // Clear search results and loading state
    clearSearchResultsAndState(): void {
      self.searchResults.clear()
      self.isSearching = false
    },

    async searchFeatures(): Promise<SearchFeature[]> {
      if (!self.searchTerm.trim() || !self.selectedTrackId) {
        this.clearSearchResultsAndState()
        return []
      }

      try {
        const session = getSession(self)
        const { jbrowse } = session

        // Use correct JBrowse 2 API - readConfObject for reactive track access
        const trackConfs = readConfObject(jbrowse.configuration, 'tracks') ?? []
        const selectedTrack = trackConfs.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (tc: any) => readConfObject(tc, 'trackId') === self.selectedTrackId,
        )

        if (!selectedTrack) {
          this.clearSearchResultsAndState()
          return []
        }

        // Get assembly name for search scope
        const assemblyNames = readConfObject(selectedTrack, 'assemblyNames')
        const assemblyName = Array.isArray(assemblyNames)
          ? assemblyNames[0]
          : assemblyNames

        // Use text search system - the CORRECT JBrowse 2 API per AGENT.md
        const results = await session.textSearchManager?.search(
          {
            queryString: self.searchTerm,
          },
          {
            assemblyName,
            includeAggregateIndexes: false,
          },
          results => results,
        )

        if (!results || results.length === 0) {
          this.clearSearchResultsAndState()
          return []
        }

        // Transform search results - limit to 5 and create unique React keys
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const featuresWithData: SearchFeature[] = results
          .slice(0, 5) // Limit to 5 results
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((result: any) => {
            const locString =
              result.locString ??
              `${result.refName}:${result.start}-${result.end}`
            const featureName =
              result.label ??
              result.name ??
              result.displayString ??
              'Unnamed Feature'

            // Create unique ID using name + location to avoid React key conflicts
            const uniqueId = `${featureName}@${locString}`

            return {
              id: uniqueId, // Unique ID for React keys
              name: String(featureName), // Display name
              type: 'gene',
              location: locString,
              trackId: self.selectedTrackId ?? 'unknown',
              // No image data during search - keep it lightweight
              images: '',
              imageCaptions: '',
              imageGroup: '',
            }
          })

        this.setSearchResultsAndState(featuresWithData)
        return featuresWithData
      } catch (error) {
        console.error('Search error:', error)
        this.clearSearchResultsAndState()
        return []
      }
    },

    // Clear search state
    clearSearch() {
      self.searchTerm = ''
      self.searchResults.replace([])
      self.isSearching = false
    },

    // Set selected assembly (clears dependent selections)
    setSelectedAssembly(assemblyId: string | undefined) {
      console.log('🔍 DEBUG: setSelectedAssembly called with:', assemblyId)

      self.selectedAssemblyId = assemblyId
      // Clear dependent selections when assembly changes
      if (self.selectedTrackId) {
        self.selectedTrackId = undefined
      }
      if (self.selectedFeatureId) {
        self.selectedFeatureId = undefined
        this.clearFeatureContent()
      }

      // Get session using JB2 best practices
      const session = getSession(self)
      console.log(
        '🔍 DEBUG: Session has assemblyManager:',
        !!session?.assemblyManager,
      )
      console.log('🔍 DEBUG: Session has assemblies:', !!session?.assemblies)

      // Debug available assembly methods per AGENT.md
      if (session?.assemblyManager) {
        console.log(
          '🔍 DEBUG: AssemblyManager methods:',
          Object.getOwnPropertyNames(session.assemblyManager),
        )
      }

      // Find selected assembly using JB2 API
      const selectedAssembly = session?.assemblies?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (assembly: any) => {
          const name = assembly.getConf
            ? assembly.getConf('name')
            : assembly.name
          return name === assemblyId
        },
      )

      if (selectedAssembly) {
        console.log(
          '🔍 DEBUG: Selected assembly methods:',
          Object.getOwnPropertyNames(selectedAssembly),
        )
      }
    },

    // Set selected track (clears dependent selections)
    async setSelectedTrack(trackId: string | undefined) {
      console.log('🔍 DEBUG: setSelectedTrack called with:', trackId)

      // Store the new track ID
      self.selectedTrackId = trackId

      // Clear dependent selections when track changes
      if (self.selectedFeatureId) {
        self.selectedFeatureId = undefined
        this.clearFeatureContent()
      }

      // Debug track access following JB2 API
      if (trackId) {
        const session = getSession(self)
        const { jbrowse } = session

        // Use correct JBrowse 2 API - readConfObject for reactive track access
        const trackConfs = readConfObject(jbrowse.configuration, 'tracks') ?? []
        const foundTrack = trackConfs.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (tc: any) => readConfObject(tc, 'trackId') === trackId,
        )

        if (foundTrack) {
          console.log(
            '🔍 DEBUG: Selected track methods:',
            Object.getOwnPropertyNames(foundTrack),
          )
          console.log('🔍 DEBUG: Track properties:', {
            hasConfiguration: !!foundTrack.configuration,
            trackId: readConfObject(foundTrack, 'trackId'),
          })

          // Debug adapter access per AGENT.md
          try {
            const adapterConfig = readConfObject(foundTrack, 'adapter')
            const adapterType = adapterConfig
              ? readConfObject(adapterConfig, 'type')
              : undefined

            console.log('🔍 DEBUG: Adapter config:', {
              hasAdapter: !!adapterConfig,
              adapterType,
            })
            console.log('🔍 DEBUG: Getting adapter type for:', adapterType)

            try {
              // Use correct JBrowse 2 API - access via session's root reference
              const session = getSession(self)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const pluginManager = (session as any).root.pluginManager
              console.log(
                '🔍 DEBUG: PluginManager via session.root:',
                !!pluginManager,
              )

              if (!pluginManager) {
                console.log('🔍 DEBUG: No pluginManager found!')
                return
              }

              console.log('🔍 DEBUG: Calling getAdapterType...')
              const adapterTypeObj = pluginManager.getAdapterType(adapterType)
              console.log('🔍 DEBUG: Adapter type object:', !!adapterTypeObj)
              console.log(
                '🔍 DEBUG: Adapter type object methods:',
                adapterTypeObj
                  ? Object.getOwnPropertyNames(adapterTypeObj)
                  : 'none',
              )

              if (adapterTypeObj?.getAdapterClass) {
                console.log('🔍 DEBUG: getAdapterClass method found')
                console.log('🔍 DEBUG: Calling getAdapterClass() (async)...')
                const AdapterClass = await adapterTypeObj.getAdapterClass()
                console.log(
                  '🔍 DEBUG: AdapterClass from getAdapterClass():',
                  !!AdapterClass,
                )
                console.log('🔍 DEBUG: AdapterClass type:', typeof AdapterClass)
                console.log(
                  '🔍 DEBUG: AdapterClass toString:',
                  AdapterClass?.toString(),
                )
                console.log(
                  '🔍 DEBUG: AdapterClass prototype:',
                  !!AdapterClass?.prototype,
                )
                console.log(
                  '🔍 DEBUG: AdapterClass constructor:',
                  AdapterClass?.constructor,
                )
                console.log(
                  '🔍 DEBUG: AdapterClass properties:',
                  Object.getOwnPropertyNames(AdapterClass),
                )

                if (AdapterClass) {
                  console.log(
                    '🔍 DEBUG: Attempting to create adapter instance...',
                  )
                  try {
                    const adapterInstance = new AdapterClass(adapterConfig)
                    console.log('🔍 DEBUG: Adapter created:', !!adapterInstance)
                    console.log(
                      '🔍 DEBUG: Adapter methods:',
                      Object.getOwnPropertyNames(adapterInstance),
                    )

                    // Test region for feature fetching (chr1:1-50000)
                    const testRegion = {
                      refName: 'chr1',
                      start: 1,
                      end: 50000,
                      assemblyName: self.selectedAssemblyId,
                    }
                    console.log('🔍 DEBUG: Test region:', testRegion)

                    if (adapterInstance.getFeatures) {
                      console.log('🔍 DEBUG: Calling getFeatures...')
                      const featuresObservable =
                        adapterInstance.getFeatures(testRegion)
                      console.log(
                        '🔍 DEBUG: Features observable:',
                        !!featuresObservable,
                      )

                      // Convert observable to array using imported toArray
                      console.log(
                        '🔍 DEBUG: Converting features observable to array...',
                      )

                      const features = await featuresObservable
                        .pipe(toArray())
                        .toPromise()
                      console.log(
                        '🔍 DEBUG: Features array length:',
                        features?.length || 0,
                      )

                      if (features && features.length > 0) {
                        console.log('🔍 DEBUG: First feature:', features[0])
                        console.log(
                          '🔍 DEBUG: First feature methods:',
                          Object.getOwnPropertyNames(features[0]),
                        )
                        console.log(
                          '🔍 DEBUG: First feature ID (get method):',
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                          features[0].get
                            ? features[0].get('ID')
                            : 'no get method',
                        )
                        console.log(
                          '🔍 DEBUG: First feature id() method:',
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                          features[0].id ? features[0].id() : 'no id method',
                        )

                        // Extract unique IDs from all features
                        const featureIds = features
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          .map((feature: any) => feature.get('ID'))
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          .filter((id: any) => id)
                        const uniqueIds = [...new Set(featureIds as string[])]
                        console.log(
                          '🔍 DEBUG: Unique feature IDs found:',
                          uniqueIds.length,
                        )
                        console.log(
                          '🔍 DEBUG: Sample unique IDs:',
                          uniqueIds.slice(0, 5),
                        )
                      }
                    } else {
                      console.log(
                        '🔍 DEBUG: Adapter missing getFeatures method',
                      )
                    }
                  } catch (error) {
                    console.log(
                      '🔍 DEBUG: Error creating adapter instance:',
                      error,
                    )
                  }
                } else {
                  console.log(
                    '🔍 DEBUG: getAdapterClass() returned null/undefined',
                  )
                }
              } else {
                console.log(
                  '🔍 DEBUG: getAdapterClass method not found in adapter type object',
                )
              }
            } catch (error) {
              console.log('🔍 DEBUG: Error during adapter operations:', error)
            }
          } catch (error) {
            console.log('🔍 DEBUG: Error getting adapter config:', error)
          }
        }
      }
    },

    // SYNCHRONOUS feature selection - no RPC calls per AGENT.md
    setSelectedFeature(
      featureId: string | undefined,
      featureType?: string,
      images?: string,
      imageCaptions?: string,
      imageGroup?: string,
    ) {
      if (!featureId) {
        this.clearFeatureContent()
        return
      }

      // If called with explicit image data, use it directly
      if (images && imageCaptions !== undefined && imageGroup !== undefined) {
        this.setFeatureData(
          featureId,
          featureType ?? 'GENE',
          images,
          imageCaptions,
          imageGroup,
        )
        return
      }

      // Find the feature in search results
      const foundFeature = self.searchResults.find(
        result => result.id === featureId,
      )
      if (foundFeature) {
        // Extract feature name from unique ID (format: "name@location")
        const featureName = foundFeature.name

        console.log('🔍 DEBUG: Found feature:', foundFeature)
        console.log('🔍 DEBUG: Feature name from ID:', featureName)

        // Set selection synchronously - no async RPC calls
        this.setFeatureData(
          String(featureName), // Use feature name as ID
          featureType ?? 'GENE',
          '', // No image data initially - will be populated if available
          '',
          '',
        )
      } else {
        // Fallback
        this.setFeatureDataFallback(featureId, featureType)
      }
    },

    // Update the feature content displayed in this view
    updateFeatureContent(images: string, labels?: string, types?: string) {
      // Only process images if they exist and are not empty
      if (images && images.trim() !== '') {
        // Parse comma-separated strings from GFF3 attributes (not JSON)
        const imageUrls = images
          .split(',')
          .map(url => url.trim())
          .filter(url => url.length > 0)

        const labelList = labels
          ? labels.split(',').map(label => label.trim())
          : []
        const typeList = types ? types.split(',').map(type => type.trim()) : []

        // Use Set to deduplicate images after parsing them
        const uniqueImages = Array.from(new Set(imageUrls))

        // Store processed data
        self.featureImages = uniqueImages.join(',')
        self.featureLabels = labelList.join(',')
        self.featureTypes = typeList.join(',')
      } else {
        this.clearFeatureContent()
      }
    },

    // Clear feature content
    clearFeatureContent() {
      self.featureImages = ''
      self.featureLabels = ''
      self.featureTypes = ''
    },

    // Clear all selections and content
    clearSelections() {
      self.selectedAssemblyId = undefined
      self.selectedTrackId = undefined
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      this.clearFeatureContent()
      this.clearSearch()
    },
  }))
  .views(self => ({
    // unused by this view, but represents of 'view level' menu items
    menuItems(): MenuItem[] {
      return []
    },

    // Get available assemblies from session with proper error handling
    get availableAssemblies() {
      try {
        const session = getSession(self)
        if (!session) {
          return []
        }

        // Use only officially supported session assemblies
        const assemblies = session.assemblies || []
        return assemblies
      } catch (error) {
        console.error('Error getting available assemblies:', error)
        return []
      }
    },

    // Get available tracks from session (filtered by assembly and compatibility)
    get availableTracks() {
      const session = getSession(self)
      const { jbrowse } = session

      if (!self.selectedAssemblyId) {
        return []
      }

      console.log(
        '🔍 DEBUG: Session tracks available: true count:',
        this.availableTrackCount,
      )

      // Use correct JBrowse 2 API - readConfObject for reactive track access
      const trackConfs = readConfObject(jbrowse.configuration, 'tracks') ?? []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const compatibleTracks = trackConfs.filter((trackConf: any) => {
        const trackId = readConfObject(trackConf, 'trackId')
        console.log('🔍 DEBUG: Checking track:', trackId)

        // Get track assembly names using readConfObject
        const trackAssemblyNames =
          readConfObject(trackConf, 'assemblyNames') ?? []
        const assemblyMatches = trackAssemblyNames.includes(
          self.selectedAssemblyId,
        )

        // Get adapter config using readConfObject
        const adapterConfig = readConfObject(trackConf, 'adapter')
        const adapterType = adapterConfig
          ? readConfObject(adapterConfig, 'type')
          : undefined
        const hasIndex = adapterConfig
          ? !!readConfObject(adapterConfig, 'index')
          : false

        console.log('🔍 DEBUG: Track info:', {
          trackId,
          trackAssemblyId: trackAssemblyNames[0] || 'none',
          selectedAssemblyId: self.selectedAssemblyId,
          adapterType,
          hasIndex,
        })

        const isCompatible = adapterType === 'Gff3TabixAdapter'

        console.log('🔍 DEBUG: Track filter results:', {
          assemblyMatches,
          isCompatible,
          hasIndex,
          willInclude: assemblyMatches && isCompatible && hasIndex,
        })

        return assemblyMatches && isCompatible && hasIndex
      })

      console.log('🔍 DEBUG: Filtered tracks count:', compatibleTracks.length)
      return compatibleTracks
    },

    get availableTrackCount() {
      const session = getSession(self)
      const { jbrowse } = session
      const trackConfs = readConfObject(jbrowse.configuration, 'tracks') ?? []
      return trackConfs.length
    },

    // Get selected assembly object
    get selectedAssembly() {
      if (!self.selectedAssemblyId) {
        return undefined
      }

      try {
        const session = getSession(self)
        if (!session) {
          return undefined
        }

        // Use only officially supported session assemblies
        const allAssemblies = session.assemblies || []

        return allAssemblies.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (assembly: any) => {
            const assemblyName = assembly.getConf
              ? assembly.getConf('name')
              : assembly.name
            return assemblyName === self.selectedAssemblyId
          },
        )
      } catch (error) {
        console.error('Error getting selected assembly:', error)
        return undefined
      }
    },

    // Get selected track object
    get selectedTrack() {
      if (!self.selectedTrackId) {
        try {
          // Use correct JBrowse 2 API - readConfObject for reactive track access
          const session = getSession(self)
          const { jbrowse } = session
          const trackConfs =
            readConfObject(jbrowse.configuration, 'tracks') ?? []
          const foundTrack = trackConfs.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (tc: any) => readConfObject(tc, 'trackId') === self.selectedTrackId,
          )

          // Resolve the name property of the selected track
          if (foundTrack) {
            return {
              ...foundTrack,
              name: readConfObject(foundTrack, 'name') || foundTrack.trackId,
            }
          }
          return undefined
        } catch (error) {
          console.error('Error getting selected track:', error)
          return undefined
        }
      }

      // TODO: Add real flow here
      return undefined
    },

    // Enhanced features getter that returns search results when available
    get features() {
      try {
        const session = getSession(self)
        if (
          !session?.textSearchManager ||
          !self.selectedAssemblyId ||
          !self.selectedTrackId
        ) {
          return []
        }

        // Return search results if we have them, otherwise empty array
        // The UI component will trigger searches via the searchFeatures action
        return self.searchResults || []
      } catch (error) {
        console.error('Error accessing features:', error)
        return []
      }
    },

    // Search state getters
    get hasSearchTerm() {
      return !!(self.searchTerm && self.searchTerm.trim() !== '')
    },

    get hasSearchResults() {
      return !!(self.searchResults && self.searchResults.length > 0)
    },

    get canSearch() {
      return !!(
        self.selectedAssemblyId &&
        self.selectedTrackId &&
        !self.isSearching
      )
    },

    // Computed properties for easy access
    get hasContent() {
      return !!(self.featureImages && self.featureImages.trim() !== '')
    },

    get displayTitle() {
      return self.selectedFeatureId
        ? `${self.displayName} for ${String(self.selectedFeatureId)}`
        : self.displayName || 'Flexible Image Gallery'
    },

    // Selection state helpers for UI
    get canSelectTrack() {
      return !!self.selectedAssemblyId && !self.isLoadingTracks
    },

    get canSelectFeature() {
      return !!self.selectedTrackId && !self.isLoadingFeatures
    },

    get isReady() {
      return !self.isLoadingTracks && !self.isLoadingFeatures
    },
  }))

export type FlexibleImageGalleryViewModel = Instance<typeof stateModel>
export default stateModel
