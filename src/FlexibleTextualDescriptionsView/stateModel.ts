import { ElementId } from '@jbrowse/core/util/types/mst'
import { types, Instance } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject } from '@jbrowse/core/configuration'
import { MenuItem } from '@jbrowse/core/ui'
import { runInAction } from 'mobx'

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
  location: string
  type: string
  description: string
  markdown_urls: string
  descriptions: string
  content_types: string
  originalResult: unknown
}

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
    type: types.literal('FlexibleTextualDescriptionsView'),
    displayName: types.optional(types.string, 'Flexible Text Descriptions'),
    minimized: types.optional(types.boolean, false),

    // Assembly, track, and feature selection state
    selectedAssemblyId: types.maybe(types.string),
    selectedTrackId: types.maybe(types.string),
    selectedFeatureId: types.maybe(types.string),

    // TextualDescriptionsView-compatible state fields
    selectedFeatureType: types.optional(types.string, 'GENE'),
    featureMarkdownUrls: types.maybe(types.string),
    featureDescriptions: types.maybe(types.string),
    featureContentTypes: types.maybe(types.string),

    // Loading and search state
    isLoadingTracks: types.optional(types.boolean, false),
    isLoadingFeatures: types.optional(types.boolean, false),
    searchTerm: types.optional(types.string, ''),
    isSearching: types.optional(types.boolean, false),
    searchResults: types.array(
      types.model({
        id: types.string,
        name: types.string,
        type: types.string,
        location: types.string,
        description: types.string,
        markdown_urls: types.string,
        descriptions: types.string,
        content_types: types.string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalResult: types.maybe(types.frozen<any>()),
      }),
    ),
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSearchResults(results: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      self.searchResults = results as any
    },

    // Helper methods for consistent state management (matching FlexibleImageGalleryView)
    setSearchResultsAndState(results: SearchFeature[]): void {
      self.searchResults.replace(results)
      self.isSearching = false
    },

    clearSearchResultsAndState(): void {
      self.searchResults.clear()
      self.isSearching = false
    },

    // Perform text search using JBrowse2's text search system with RPC feature fetching
    async searchFeatures(): Promise<SearchFeature[]> {
      const searchTerm = self.searchTerm?.trim()
      // console.log('🔍 searchFeatures called with stored term:', searchTerm)

      if (!searchTerm?.trim() || !self.selectedTrackId) {
        // console.log('🔍 Early return: empty term or no track selected')
        this.clearSearchResultsAndState()
        return []
      }

      // Minimum search length to prevent TextSearchManager errors
      if (searchTerm.trim().length < 3) {
        // console.log('🔍 Search term too short, minimum 3 characters required')
        this.clearSearchResultsAndState()
        return []
      }

      // Set loading state
      try {
        const session = getSession(self)
        const selectedTrack = session?.tracks?.find(
          (t: unknown) =>
            (t as { trackId?: string }).trackId === self.selectedTrackId,
        )

        if (!selectedTrack) {
          // console.log('🔍 Track not found:', self.selectedTrackId)
          runInAction(() => {
            self.isSearching = false
          })
          return []
        }

        // Get textSearching configuration using fallback pattern
        let textSearchConfig: unknown
        try {
          textSearchConfig = readConfObject(selectedTrack, 'textSearching')
          if (
            !textSearchConfig ||
            (typeof textSearchConfig === 'object' &&
              textSearchConfig !== null &&
              Object.keys(textSearchConfig).length === 0)
          ) {
            const trackWithGetConf = selectedTrack as {
              getConf?: (key: string) => unknown
            }
            if (typeof trackWithGetConf.getConf === 'function') {
              textSearchConfig = trackWithGetConf.getConf('textSearching')
            }
            if (
              !textSearchConfig ||
              (typeof textSearchConfig === 'object' &&
                textSearchConfig !== null &&
                Object.keys(textSearchConfig).length === 0)
            ) {
              const trackWithTextSearching = selectedTrack as {
                textSearching?: unknown
              }
              textSearchConfig = trackWithTextSearching.textSearching
            }
          }
        } catch (e) {
          const trackWithTextSearching = selectedTrack as {
            textSearching?: unknown
          }
          textSearchConfig = trackWithTextSearching.textSearching
        }

        const typedTextSearchConfig = textSearchConfig as
          | { textSearchAdapter?: unknown }
          | null
          | undefined
        if (!typedTextSearchConfig?.textSearchAdapter) {
          console.warn('🔍 Track has no text search adapter configured')
          runInAction(() => {
            self.isSearching = false
          })
          return []
        }

        // console.log(
        //   '🔍 Using textSearchAdapter:',
        //   typedTextSearchConfig.textSearchAdapter,
        // )

        // Get assembly name for the selected track
        const assemblyNames = readConfObject(selectedTrack, 'assemblyNames')
        const assemblyName = Array.isArray(assemblyNames)
          ? assemblyNames[0]
          : assemblyNames

        try {
          // console.log('🔍 Using session.textSearchManager.search()')
          // console.log('🔍 Search with:', { searchTerm, assemblyName, trackId: self.selectedTrackId })

          // Step 1: Get search results from TextSearchManager
          const results = await session.textSearchManager?.search(
            {
              queryString: self.searchTerm,
            },
            {
              assemblyName,
              includeAggregateIndexes: false,
            },
            results => results, // Identity function for ranking
          )

          // console.log('🔍 Raw search results:', results)

          if (!results || results.length === 0) {
            console.warn('🔍 No results returned from search')
            this.clearSearchResultsAndState()
            return []
          }

          // Step 2: For each result, fetch the actual feature with full attributes
          const featuresWithData: SearchFeature[] = []

          for (const result of results) {
            try {
              const baseResult = result as {
                locString?: string
                label?: string
                displayString?: string
              }

              // Parse location string (e.g., "NC_000001.10:93744325..93744743")
              const locString = baseResult.locString
              if (!locString) {
                console.warn('🔍 No locString in result:', baseResult)
                continue
              }

              // console.log('🔍 Fetching feature for location:', locString)

              // Parse the location string to get refName, start, end
              const locationMatch = locString.match(/^([^:]+):(\d+)\.\.(\d+)$/)
              if (!locationMatch) {
                console.warn('🔍 Could not parse location string:', locString)
                continue
              }

              const [, refName, startStr, endStr] = locationMatch
              const start = parseInt(startStr, 10)
              const end = parseInt(endStr, 10)

              // console.log('🔍 Parsed location:', { refName, start, end })

              // Get the track's adapter to fetch features
              const adapter = readConfObject(selectedTrack, 'adapter')
              if (!adapter) {
                console.warn('🔍 No adapter found for track')
                continue
              }

              // Get features from the adapter in this region
              // Use session's RPC manager to call adapter methods
              const adapterType = readConfObject(adapter, 'type')
              // console.log('🔍 Adapter type:', adapterType)

              // Create a query region slightly larger to ensure we get the feature
              const queryRegion = {
                refName,
                start: Math.max(0, start - 1),
                end: end + 1,
                assemblyName,
              }

              // console.log('🔍 Querying region:', queryRegion)

              // Use session's RPC manager to get features
              const rpcManager = session.rpcManager
              const sessionId = session.id
              if (!sessionId) {
                console.warn('🔍 No session ID available')
                continue
              }

              const featureResults = await rpcManager.call(
                sessionId,
                'CoreGetFeatures',
                {
                  sessionId,
                  regions: [queryRegion],
                  adapterConfig: adapter,
                },
              )

              // console.log('🔍 RPC feature results:', featureResults)

              // The RPC result IS the features array directly, not { features: [...] }
              const features = Array.isArray(featureResults)
                ? featureResults
                : []

              // console.log('🔍 Number of features returned:', features.length)

              let matchingFeature: unknown = null

              for (const feature of features) {
                const typedFeature = feature as {
                  get?: (key: string) => unknown
                }

                // Match by name, ID, or location - be more flexible
                const featureName =
                  typedFeature.get?.('Name') ??
                  typedFeature.get?.('ID') ??
                  typedFeature.get?.('name') ??
                  typedFeature.get?.('gene')
                const featureStart = typedFeature.get?.('start')
                const featureEnd = typedFeature.get?.('end')

                const featureNameString =
                  typeof featureName === 'string' ? featureName : ''
                const baseLabel = baseResult.label ?? ''

                // Try multiple matching strategies
                const nameMatch = featureNameString
                  ?.toLowerCase()
                  ?.includes(baseLabel.toLowerCase())
                const reverseNameMatch = baseLabel
                  ?.toLowerCase()
                  ?.includes(featureNameString?.toLowerCase())
                const locationMatch =
                  featureStart === start && featureEnd === end
                const hasTextualData =
                  typedFeature.get?.('markdown_urls') ||
                  typedFeature.get?.('descriptions') ||
                  typedFeature.get?.('description')

                if (
                  nameMatch ||
                  reverseNameMatch ||
                  locationMatch ||
                  (features.length === 1 && hasTextualData)
                ) {
                  // console.log('🔍 Feature matched!')
                  matchingFeature = feature
                  break
                }
              }

              if (!matchingFeature) {
                console.warn('🔍 No matching feature found in region')
                // Still create a basic feature without textual data
                featuresWithData.push({
                  id: `gene-${baseResult.label ?? 'unknown'}`,
                  name: baseResult.label ?? 'Unknown Feature',
                  type: 'feature',
                  location: locString,
                  description: baseResult.displayString ?? '',
                  markdown_urls: '',
                  descriptions: '',
                  content_types: '',
                  originalResult: null,
                })
                continue
              }

              // console.log('🔍 Found matching feature:', matchingFeature)

              const typedMatchingFeature = matchingFeature as {
                get?: (key: string) => unknown
              }

              // Extract textual description attributes from the full feature
              const markdownUrls = String(
                typedMatchingFeature.get?.('markdown_urls') ??
                  typedMatchingFeature.get?.('markdown_url') ??
                  '',
              )
              const descriptions = String(
                typedMatchingFeature.get?.('descriptions') ??
                  typedMatchingFeature.get?.('description') ??
                  '',
              )
              const contentTypes = String(
                typedMatchingFeature.get?.('content_types') ??
                  typedMatchingFeature.get?.('content_type') ??
                  '',
              )

              // console.log('🔍 Extracted textual attributes:', {
              //   markdownUrls,
              //   descriptions,
              //   contentTypes,
              // })

              // Create feature with full textual data
              featuresWithData.push({
                id: `${baseResult.label ?? 'unknown'}-${locString}`,
                name: baseResult.label ?? 'Unknown Feature',
                type: 'feature',
                location: locString,
                description: baseResult.displayString ?? '',
                markdown_urls: markdownUrls ?? '',
                descriptions: descriptions ?? '',
                content_types: contentTypes ?? '',
                originalResult: matchingFeature,
              })
            } catch (error) {
              console.error('🔍 Error processing search result:', error)
              // Continue with next result
            }
          }

          // console.log('🔍 Final features with textual data:', featuresWithData)

          // Update state with results - use consistent helper method
          this.setSearchResultsAndState(featuresWithData)
          return featuresWithData
        } catch (error) {
          console.error('🔍 Text search error:', error)
          this.clearSearchResultsAndState()
          return []
        }
      } catch (error) {
        console.error('🔍 Search features error:', error)
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
      self.selectedAssemblyId = assemblyId
      // Clear dependent selections when assembly changes
      if (self.selectedTrackId) {
        self.selectedTrackId = undefined
      }
      if (self.selectedFeatureId) {
        self.selectedFeatureId = undefined
        this.clearFeatureContent()
      }
      // Clear search when assembly changes
      this.clearSearch()
    },

    // Set selected track (clears dependent selections)
    setSelectedTrack(trackId: string | undefined) {
      self.selectedTrackId = trackId
      // Clear feature selection when track changes
      if (self.selectedFeatureId) {
        self.selectedFeatureId = undefined
        this.clearFeatureContent()
      }
      // Clear search when track changes
      this.clearSearch()
    },

    // Handle feature selection - matches TextualDescriptionsView interface
    setSelectedFeature(featureId: string | undefined): void {
      if (!featureId) {
        // Clear selection using TextualDescriptionsView-compatible method
        this.clearFeature()
        return
      }

      // Find the selected feature in search results
      const selectedFeature = self.searchResults.find(f => f.id === featureId)
      if (!selectedFeature) {
        console.warn('Selected feature not found in search results')
        return
      }

      // Use TextualDescriptionsView-compatible updateFeature method
      this.updateFeature(
        featureId,
        'GENE', // Default to GENE type
        selectedFeature.markdown_urls || '',
        selectedFeature.descriptions || '',
        selectedFeature.content_types || '',
      )

      // console.log('🔍 Feature selected with textual data:', {
      //   featureId,
      //   markdown_urls: selectedFeature.markdown_urls,
      //   descriptions: selectedFeature.descriptions,
      //   content_types: selectedFeature.content_types,
      // })
    },

    // TextualDescriptionsView-compatible methods
    updateFeature(
      featureId: string,
      featureType: string,
      markdownUrls: string,
      descriptions?: string,
      contentTypes?: string,
    ): void {
      // Validate input - featureId is required, but markdownUrls can be empty
      if (!featureId) {
        return
      }

      // Always set the selected feature, even if there are no markdown URLs
      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType

      // Only process URLs if they exist and are not empty
      if (markdownUrls && markdownUrls.trim() !== '') {
        // Parse comma-separated strings from GFF3 attributes (not JSON)
        const urlList = markdownUrls
          .split(',')
          .map(url => url.trim())
          .filter(url => url.length > 0)

        const descriptionList = descriptions
          ? descriptions
              .split(',')
              .map(desc => desc.trim())
              .filter(desc => desc.length > 0)
          : []
        const typeList = contentTypes
          ? contentTypes
              .split(',')
              .map(type => type.trim())
              .filter(type => type.length > 0)
          : []

        self.featureMarkdownUrls = urlList.join(',')
        self.featureDescriptions = descriptionList.join(',')
        self.featureContentTypes = typeList.join(',')
      } else {
        // Clear content fields if no markdown URLs
        self.featureMarkdownUrls = undefined
        self.featureDescriptions = undefined
        self.featureContentTypes = undefined
      }
    },

    // Clear the current feature - TextualDescriptionsView compatible
    clearFeature(): void {
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      self.featureMarkdownUrls = undefined
      self.featureDescriptions = undefined
      self.featureContentTypes = undefined
    },

    // Clear feature content
    clearFeatureContent() {
      self.featureMarkdownUrls = ''
      self.featureDescriptions = ''
      self.featureContentTypes = ''
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
      if (!self.selectedAssemblyId) {
        console.log('No assembly selected, returning empty tracks array')
        return []
      }

      const session = getSession(self)
      console.log('Session object:', session)
      console.log('Session tracks:', session?.tracks)

      if (!session?.tracks) {
        console.log('No session tracks found')
        return []
      }

      // Filter tracks by assembly and compatible adapters
      const filteredTracks = session.tracks.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (track: any) => {
          console.log('Checking track:', track)
          console.log(
            'Track properties:',
            track ? Object.keys(track as Record<string, unknown>) : 'no track',
          )

          try {
            // Use proper JBrowse API - the track itself is a configuration object
            let trackAssemblyId: string | undefined
            let adapterType: string | undefined
            let hasTextSearch = false

            // Method 1: Use readConfObject directly on track (proper JBrowse API)
            try {
              const assemblyNames = readConfObject(track, 'assemblyNames')
              trackAssemblyId = Array.isArray(assemblyNames)
                ? assemblyNames[0]
                : assemblyNames
              const adapter = readConfObject(track, 'adapter')
              adapterType = adapter
                ? readConfObject(adapter, 'type')
                : undefined

              // Check for text search configuration using proper JBrowse2 API
              // Use Fallback Method Pattern from AGENT.md
              let textSearchConfig
              try {
                // Try readConfObject first (proper JBrowse2 API)
                textSearchConfig = readConfObject(track, 'textSearching')
                console.log(
                  'DEBUG: readConfObject(track, "textSearching"):',
                  textSearchConfig,
                )

                // If readConfObject returns empty object, try getConf fallback
                if (
                  !textSearchConfig ||
                  (typeof textSearchConfig === 'object' &&
                    textSearchConfig !== null &&
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    Object.keys(textSearchConfig).length === 0)
                ) {
                  if (typeof track.getConf === 'function') {
                    textSearchConfig = track.getConf('textSearching')
                    console.log(
                      'DEBUG: track.getConf("textSearching"):',
                      textSearchConfig,
                    )
                  }
                }

                // Final check: try direct property access (last resort)
                if (
                  !textSearchConfig ||
                  (typeof textSearchConfig === 'object' &&
                    textSearchConfig !== null &&
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    Object.keys(textSearchConfig).length === 0)
                ) {
                  const trackWithTextSearching = track as {
                    textSearching?: unknown
                  }
                  textSearchConfig = trackWithTextSearching.textSearching
                  console.log('DEBUG: track.textSearching:', textSearchConfig)
                }
              } catch (e) {
                console.log('Error reading text search config:', e)
                const trackWithTextSearching = track as {
                  textSearching?: unknown
                }
                textSearchConfig = trackWithTextSearching.textSearching
              }

              // Check if textSearching has textSearchAdapter configured
              hasTextSearch = Boolean(
                textSearchConfig &&
                  typeof textSearchConfig === 'object' &&
                  (textSearchConfig as { textSearchAdapter?: unknown })
                    .textSearchAdapter,
              )

              console.log(
                'Method 1 - JBrowse2 Fallback Pattern for track filtering:',
                {
                  assemblyNames,
                  trackAssemblyId,
                  adapter,
                  adapterType,
                  textSearchConfig,
                  textSearchAdapter: (
                    textSearchConfig as { textSearchAdapter?: unknown }
                  )?.textSearchAdapter,
                  hasTextSearch,
                },
              )
            } catch (e) {
              console.log('Method 1 failed, trying fallback methods:', e)
              // Fallback methods if needed
              try {
                const assemblyNames = readConfObject(
                  track.configuration,
                  'assemblyNames',
                )
                trackAssemblyId = Array.isArray(assemblyNames)
                  ? assemblyNames[0]
                  : assemblyNames
                const adapterConfig = readConfObject(
                  track.configuration,
                  'adapter',
                )
                adapterType = adapterConfig
                  ? readConfObject(adapterConfig, 'type')
                  : undefined

                // Check for text search configuration
                const textSearchConfig = readConfObject(
                  track.configuration,
                  'textSearching',
                )
                hasTextSearch = Boolean(
                  (textSearchConfig as { textSearchAdapter?: unknown })
                    ?.textSearchAdapter,
                )

                console.log(
                  'Method 2 - readConfObject on track.configuration:',
                  {
                    assemblyNames,
                    trackAssemblyId,
                    adapterConfig,
                    adapterType,
                    textSearchConfig,
                    hasTextSearch,
                  },
                )
              } catch (e2) {
                console.log('Method 2 failed as well:', e2)
              }
            }

            // Check for aggregate text search adapters (fallback)
            if (!hasTextSearch && trackAssemblyId) {
              try {
                const sessionAny = session as {
                  aggregateTextSearchAdapters?: unknown[]
                }
                if (sessionAny.aggregateTextSearchAdapters) {
                  hasTextSearch = sessionAny.aggregateTextSearchAdapters.some(
                    (adapter: unknown) => {
                      const typedAdapter = adapter as {
                        assemblyNames?: string | string[]
                      }
                      const adapterAssemblyNames = typedAdapter.assemblyNames
                      return Array.isArray(adapterAssemblyNames)
                        ? adapterAssemblyNames.includes(trackAssemblyId)
                        : adapterAssemblyNames === trackAssemblyId
                    },
                  )
                  console.log(
                    'Aggregate text search fallback:',
                    hasTextSearch,
                    'for assembly:',
                    trackAssemblyId,
                  )
                }
              } catch (e) {
                console.log('Aggregate text search check failed:', e)
              }
            }

            console.log('Final track info:', {
              trackName: track.name,
              trackAssemblyId,
              adapterType,
              hasTextSearch,
              selectedAssemblyId: self.selectedAssemblyId,
            })

            // Check if track belongs to selected assembly
            if (
              !trackAssemblyId ||
              trackAssemblyId !== self.selectedAssemblyId
            ) {
              console.log(
                `Track assembly mismatch or missing: ${trackAssemblyId} !== ${self.selectedAssemblyId}`,
              )
              return false
            }

            // Check if adapter type is compatible
            const isCompatible =
              typeof adapterType === 'string' &&
              COMPATIBLE_ADAPTER_TYPES.includes(adapterType)

            console.log(
              'Track adapter compatible:',
              isCompatible,
              'Type:',
              adapterType,
              'Compatible types:',
              COMPATIBLE_ADAPTER_TYPES,
            )

            console.log('Track has text search:', hasTextSearch)

            // Only show tracks that have both compatible adapter AND text search configured
            return isCompatible && hasTextSearch
          } catch (error) {
            console.error('Error checking track configuration:', error)
            return false
          }
        },
      )

      console.log('Filtered tracks:', filteredTracks)

      // Return tracks with resolved names for React rendering
      return filteredTracks.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (track: any) => ({
          trackId: track.trackId,
          name: String(readConfObject(track, 'name') || track.trackId),
        }),
      )
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
        return undefined
      }

      try {
        const session = getSession(self)
        const foundTrack = session?.tracks?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (track: any) => track.trackId === self.selectedTrackId,
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

    // Loading state checks
    // Search capability checks
    get canSearch() {
      return !!(
        self.selectedAssemblyId &&
        self.selectedTrackId &&
        !self.isSearching
      )
    },

    get canSelectTrack() {
      return !!(self.selectedAssemblyId && !self.isLoadingTracks)
    },

    get canSelectFeature() {
      return !!self.selectedTrackId && !self.isLoadingFeatures
    },

    get isReady() {
      return !self.isLoadingTracks && !self.isLoadingFeatures
    },

    // TextualDescriptionsView-compatible computed properties
    get hasContent() {
      return !!(
        self.featureMarkdownUrls && self.featureMarkdownUrls.trim() !== ''
      )
    },

    get displayTitle() {
      return self.selectedFeatureId
        ? `${self.displayName} for ${String(self.selectedFeatureId)}`
        : self.displayName
    },
  }))

export default stateModel
