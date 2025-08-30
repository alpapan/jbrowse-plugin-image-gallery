import { ElementId } from '@jbrowse/core/util/types/mst'
import { types } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject } from '@jbrowse/core/configuration'
import { MenuItem } from '@jbrowse/core/ui'

// compatible adapter types for track filtering
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

// Helper function to check if adapter type is compatible
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCompatibleAdapter(adapterType: string): boolean {
  return COMPATIBLE_ADAPTER_TYPES.includes(adapterType)
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
    // Assembly, track and feature selection state - order matters!
    selectedAssemblyId: types.maybe(types.string),
    selectedTrackId: types.maybe(types.string),
    selectedFeatureId: types.maybe(types.string),
    selectedFeatureType: types.optional(types.string, 'GENE'),
    // Content fields for textual descriptions
    featureMarkdownUrls: types.maybe(types.string),
    featureDescriptions: types.maybe(types.string),
    featureContentTypes: types.maybe(types.string),
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSearchResults(results: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      self.searchResults = results as any
    },

    // Perform text search using JBrowse2's text search system
    searchFeatures(searchTerm: string) {
      if (
        !searchTerm.trim() ||
        !self.selectedAssemblyId ||
        !self.selectedTrackId
      ) {
        self.searchResults.replace([])
        return
      }

      try {
        self.isSearching = true
        const session = getSession(self)

        // Check if track has text search configured using proper JBrowse2 API
        const selectedTrack = session?.tracks?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (track: any) => track.trackId === self.selectedTrackId,
        )

        if (!selectedTrack) {
          console.warn('Selected track not found')
          self.searchResults.replace([])
          return
        }

        // Check if track has text search configured
        const textSearchConfig = readConfObject(selectedTrack, 'textSearching')
        if (!textSearchConfig?.textSearchAdapter) {
          console.warn('Track has no text search adapter configured')
          self.searchResults.replace([])
          return
        }

        // For now, create mock search results to test the UI integration
        // This would be replaced with actual text search adapter calls
        const mockResults = [
          {
            id: `search_${searchTerm}_1`,
            name: `Feature matching "${searchTerm}"`,
            type: 'gene',
            location: 'chr1:1000-2000',
            description: `Mock feature for search term: ${searchTerm}`,
            markdown_urls: '',
            descriptions: '',
            content_types: '',
          },
        ]

        // Filter and format results for UI display
        const formattedResults = mockResults
          .map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (result: any) => {
              try {
                return {
                  id: result.featureId || result.id || result.name,
                  name: result.name || result.featureId || result.id,
                  type: result.type || 'unknown',
                  location: result.location
                    ? `${result.location.refName}:${result.location.start}-${result.location.end}`
                    : result.location || '',
                  description: result.description || '',
                  // Textual description-specific attributes
                  markdown_urls:
                    result.attributes?.markdown_urls ||
                    result.markdown_urls ||
                    '',
                  descriptions:
                    result.attributes?.descriptions ||
                    result.descriptions ||
                    '',
                  content_types:
                    result.attributes?.content_types ||
                    result.content_types ||
                    '',
                  // Store original result for reference
                  originalResult: result,
                }
              } catch (error) {
                console.error('Error formatting search result:', error)
                return null
              }
            },
          )
          .filter(result => result !== null)

        // Set results using MST array replace method
        self.searchResults.replace(formattedResults)
      } catch (error) {
        console.error('Error performing text search:', error)
        self.searchResults.replace([])
      } finally {
        self.isSearching = false
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

    // Set selected feature and update content
    setSelectedFeature(
      featureId: string | undefined,
      featureType?: FeatureType,
      markdownUrls?: string,
      descriptions?: string,
      contentTypes?: string,
    ) {
      self.selectedFeatureId = featureId
      if (featureType) {
        self.selectedFeatureType = featureType.toString()
      }

      if (featureId && markdownUrls) {
        this.updateFeatureContent(markdownUrls, descriptions, contentTypes)
      } else {
        this.clearFeatureContent()
      }
    },

    // Update the feature content displayed in this view
    updateFeatureContent(
      markdownUrls: string,
      descriptions?: string,
      contentTypes?: string,
    ) {
      // Only process URLs if they exist and are not empty
      if (markdownUrls && markdownUrls.trim() !== '') {
        // Parse comma-separated strings from GFF3 attributes (not JSON)
        const urlList = markdownUrls
          .split(',')
          .map(url => url.trim())
          .filter(url => url.length > 0)

        const descriptionList = descriptions
          ? descriptions.split(',').map(desc => desc.trim())
          : []
        const typeList = contentTypes
          ? contentTypes.split(',').map(type => type.trim())
          : []

        // Use Set to deduplicate URLs after parsing them
        const uniqueUrls = Array.from(new Set(urlList))

        // Store processed data
        self.featureMarkdownUrls = uniqueUrls.join(',')
        self.featureDescriptions = descriptionList.join(',')
        self.featureContentTypes = typeList.join(',')
      } else {
        this.clearFeatureContent()
      }
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
      // Must have assembly selected first
      if (!self.selectedAssemblyId) {
        return []
      }

      const session = getSession(self)

      if (!session?.tracks) {
        return []
      }

      // Filter tracks by assembly and compatible adapters
      const filteredTracks = session.tracks.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (track: any) => {
          try {
            // Use proper JBrowse API - the track itself is a configuration object
            let trackAssemblyId: string | undefined
            let adapterType: string | undefined

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
            } catch (e) {
              // Fallback methods if needed
            }

            // Method 2: Alternative getConf method if track has it
            if (!trackAssemblyId && typeof track.getConf === 'function') {
              try {
                const assemblyNames = track.getConf('assemblyNames')
                trackAssemblyId = Array.isArray(assemblyNames)
                  ? assemblyNames[0]
                  : assemblyNames
                const adapterConfig = track.getConf('adapter')
                adapterType = adapterConfig ? adapterConfig.type : undefined
              } catch (e) {
                // Continue with what we have
              }
            }

            // Check if track belongs to selected assembly
            if (
              !trackAssemblyId ||
              trackAssemblyId !== self.selectedAssemblyId
            ) {
              return false
            }

            // Check if adapter type is compatible
            const isCompatible =
              typeof adapterType === 'string' &&
              COMPATIBLE_ADAPTER_TYPES.includes(adapterType)

            return isCompatible
          } catch (error) {
            console.error('Error checking track configuration:', error)
            return false
          }
        },
      )

      // Return tracks with resolved names for React rendering
      return filteredTracks.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (track: any) => ({
          ...track,
          name: track.getConf
            ? track.getConf('name')
            : readConfObject(track, 'name') || track.trackId,
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
        if (!session || !self.selectedAssemblyId || !self.selectedTrackId) {
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
      return !!(
        self.featureMarkdownUrls && self.featureMarkdownUrls.trim() !== ''
      )
    },

    get displayTitle() {
      return self.selectedFeatureId
        ? `${self.displayName} for ${String(self.selectedFeatureId)}`
        : self.displayName || 'Flexible Text Descriptions'
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

export default stateModel
