// Shared utilities for FlexibleImageGalleryView and FlexibleTextualDescriptionsView
import { flow } from 'mobx-state-tree'
import { getSession, AbstractSessionModel } from '@jbrowse/core/util'
import {
  readConfObject,
  AnyConfigurationModel,
} from '@jbrowse/core/configuration'
import type { Region } from '@jbrowse/core/util/types'
import type { Feature } from '@jbrowse/core/util/simpleFeature'
import type { BaseTrackConfig } from '@jbrowse/core/pluggableElementTypes/models'
import type { IBaseViewModel } from '@jbrowse/core/pluggableElementTypes/models'

// Constants used by feature searches
const FEATURE_SEARCH_MAX_RESULTS = 5
const FEATURE_SEARCH_MAX_RANGE = 1000000 // 1Mb chunks

// Compatible adapter types (shared list)
const COMPATIBLE_ADAPTER_TYPES = [
  'Gff3Adapter',
  'Gff3TabixAdapter',
  'GtfAdapter',
  'BedAdapter',
  'GeneFeaturesAdapter',
]

// Type definitions

// Using official JBrowse 2 configuration type
export type AdapterConfiguration = AnyConfigurationModel

export interface SearchableViewModel extends IBaseViewModel {
  selectedAssemblyId?: string
  selectedTrackId?: string
  searchText?: string
  searchTerm?: string
  searchInProgress?: boolean
  isSearching?: boolean
  searchResults?: SearchResult[]
  clearSearch?: () => void
}

export interface SearchResult {
  id: string
  name: string
  type: string
  location: string
  getLocation?: () => string
  [key: string]: unknown
}

export interface SearchMatch {
  refName?: string
  ref?: string
  start?: number
  end?: number
  loc?: {
    refName?: string
    start?: number
    end?: number
  }
  location?: {
    refName?: string
    start?: number
    end?: number
  }
}

export interface TrackInfo {
  trackId: string
  name: string
  adapterType: string
  hasIndex: boolean
  isCompatible: boolean
}

// Interface for view models with updateFeature and clearFeature methods
export interface FeatureSelectableViewModel extends IBaseViewModel {
  selectedFeatureId?: string
  selectedFeatureType: string
  updateFeature: (
    featureId: string,
    featureType: 'GENE' | 'NON_GENE',
    content: string,
    descriptions?: string,
    contentTypes?: string,
  ) => void
  clearFeature: () => void
  hasContent: () => boolean
}

// Specific interface for SelectImageGalleryViewModel
export interface SelectImageGalleryViewModel extends IBaseViewModel {
  selectedFeatureId?: string
  selectedFeatureType: string
  featureImages: string
  featureLabels: string
  featureTypes: string
  updateFeature: (
    featureId: string,
    featureType: 'GENE' | 'NON_GENE',
    images: string,
    labels?: string,
    types?: string,
  ) => void
  clearFeature: () => void
  updateFeatureWithoutImages: (
    featureId: string,
    featureType: 'GENE' | 'NON_GENE',
  ) => void
  hasContent: () => boolean
  deduplicatedImages: () => string[]
  maxItems: number
  imageSize: {
    width: number
    height: number
  }
  gff3AttributeNames: {
    images: string
    labels: string
    types: string
  }
}

// Specific interface for SelectTextualDescriptionsViewModel
export interface SelectTextualDescriptionsViewModel extends IBaseViewModel {
  selectedFeatureId?: string
  selectedFeatureType: string
  featureMarkdownUrls: string
  featureDescriptions: string
  featureContentTypes: string
  updateFeature: (
    featureId: string,
    featureType: 'GENE' | 'NON_GENE',
    markdownUrls: string,
    descriptions?: string,
    contentTypes?: string,
  ) => void
  clearFeature: () => void
  hasContent: () => boolean
  deduplicatedMarkdownUrls: () => string[]
  maxItems: number
  gff3AttributeNames: {
    markdownUrls: string
    descriptions: string
    types: string
  }
}

//////////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////////
export async function searchTrackFeatures(
  session: AbstractSessionModel,
  trackConf: AnyConfigurationModel,
  searchTerm: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  maxResults = 100,
): Promise<SearchMatch[]> {
  // Get text search adapter configuration
  const textSearchAdapter = readConfObject(trackConf, [
    'textSearching',
    'textSearchAdapter',
  ])

  if (!textSearchAdapter) {
    console.log('🔍 DEBUG: No textSearchAdapter found')
    return []
  }

  // Note: pluginManager is not accessible at runtime from session
  // Text search functionality needs to be redesigned to work without pluginManager
  console.warn(
    'Text search adapter access not available at runtime - functionality disabled',
  )
  return await Promise.resolve([])
}

function getBaseTrackConfigs(session: AbstractSessionModel): BaseTrackConfig[] {
  const { jbrowse } = session
  let trackConfs: BaseTrackConfig[] = []

  try {
    // Try multiple ways to access tracks
    if (jbrowse?.configuration && 'tracks' in jbrowse.configuration) {
      trackConfs = jbrowse.configuration.tracks || []
      // console.log(
      //   '🔍 DEBUG: Found config tracks via configuration:',
      //   trackConfs.length,
      // )
    } else if (jbrowse?.tracks && Array.isArray(jbrowse.tracks)) {
      trackConfs = jbrowse.tracks
      // console.log(
      //   '🔍 DEBUG: Found config tracks via jbrowse.tracks:',
      //   trackConfs.length,
      // )
    }

    // Add session tracks
    const sessionTracks = session.sessionTracks ?? session.tracks ?? []
    if (sessionTracks.length > 0) {
      trackConfs = [...trackConfs, ...sessionTracks]
      // console.log(
      //   '🔍 DEBUG: Added session tracks:',
      //   sessionTracks.length,
      //   'total:',
      //   trackConfs.length,
      // )
    }
  } catch (error) {
    console.warn(
      '[FlexibleViewUtils] Could not access track configurations:',
      error,
    )
    trackConfs = []
  }

  // console.log('🔍 DEBUG: Final track configurations:', trackConfs.length)
  return trackConfs
}

function findTrackById(
  trackConfs: BaseTrackConfig[],
  trackId: string,
): BaseTrackConfig | undefined {
  return trackConfs.find((tc: BaseTrackConfig) => {
    try {
      if ('setSubschema' in tc && typeof tc.setSubschema === 'function') {
        const id = readConfObject(tc, ['trackId'])
        return id === trackId
      } else {
        return tc.trackId === trackId || tc.configuration?.trackId === trackId
      }
    } catch {
      return tc.trackId === trackId || tc.configuration?.trackId === trackId
    }
  })
}

function safeGetAdapter(trackConf: BaseTrackConfig): unknown {
  // console.log(
  //   '🔍 DEBUG: safeGetAdapter called with trackConf keys:',
  //   Object.keys(trackConf),
  // )

  let adapter: unknown = undefined

  // First, try direct property access
  adapter = trackConf.adapter
  if (adapter) {
    // console.log('🔍 DEBUG: Found adapter via direct access:', adapter)
  } else if (trackConf.configuration?.adapter) {
    adapter = trackConf.configuration.adapter
    // console.log('🔍 DEBUG: Found adapter via configuration:', adapter)
  }

  // If no direct access, try readConfObject for MobX objects
  if (
    !adapter &&
    'setSubschema' in trackConf &&
    typeof trackConf.setSubschema === 'function'
  ) {
    try {
      adapter = readConfObject(trackConf, ['adapter'])
      // console.log('🔍 DEBUG: Found adapter via readConfObject:', adapter)
    } catch (error) {
      // console.log('🔍 DEBUG: readConfObject failed:', error)
    }
  }

  console.log('🔍 DEBUG: Final adapter:', adapter)

  // Validate adapter
  if (adapter && typeof adapter === 'object' && 'type' in adapter) {
    return adapter
  } else {
    console.warn('🔍 DEBUG: Invalid or missing adapter configuration')
    return undefined
  }
}

// Friendly assembly display name helper (shared)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAssemblyDisplayName(assembly: any): string {
  try {
    if (!assembly) return 'Unknown Assembly'

    try {
      const displayName = readConfObject(assembly, ['displayName'])
      const assemblyName = readConfObject(assembly, ['name'])
      return String(displayName ?? assemblyName ?? 'Unknown Assembly')
    } catch (e) {
      const displayName =
        typeof assembly.getConf === 'function'
          ? assembly.getConf('displayName')
          : assembly.displayName
      const assemblyName =
        typeof assembly.getConf === 'function'
          ? assembly.getConf('name')
          : assembly.name
      return String(
        displayName ?? assemblyName ?? assembly?.id ?? 'Unknown Assembly',
      )
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error resolving assembly display name:', error)
    return String(assembly?.name ?? assembly?.id ?? 'Unknown Assembly')
  }
}

// Return all track objects (config-defined + session-added) for a given assembly
// Return all track objects (config-defined + session-added) for a given assembly
export function getAllTracksForAssembly(
  self: { session?: AbstractSessionModel } | AbstractSessionModel,
  requestedAssemblyName: string,
): BaseTrackConfig[] {
  // console.log(
  //   '[FlexibleViewUtils] getAllTracksForAssembly called with assemblyName:',
  //   requestedAssemblyName,
  // )

  const session =
    'session' in self && self.session
      ? self.session
      : getSession(self as Parameters<typeof getSession>[0])

  // console.log('🔧 DEBUG: Session obtained:', !!session)

  let allConfigTracks: BaseTrackConfig[] = []

  // Get config tracks - use direct access to avoid getConf type errors
  try {
    if (session.jbrowse?.tracks && Array.isArray(session.jbrowse.tracks)) {
      allConfigTracks = session.jbrowse.tracks
      // console.log(
      //   '[FlexibleViewUtils] Found tracks via jbrowse.tracks:',
      //   allConfigTracks.length,
      // )
    }
  } catch (error) {
    console.warn('[FlexibleViewUtils] Error accessing config tracks:', error)
    allConfigTracks = []
  }

  // Get session-added tracks
  let allSessionTracks: BaseTrackConfig[] = []
  try {
    allSessionTracks = (session.sessionTracks ??
      session.tracks ??
      []) as BaseTrackConfig[]
    // console.log(
    //   '[FlexibleViewUtils] Found session tracks:',
    //   allSessionTracks.length,
    // )
  } catch (error) {
    console.error('[FlexibleViewUtils] Error getting session tracks:', error)
    allSessionTracks = []
  }

  // Combine both config and session tracks
  const allTracks = [...allConfigTracks, ...allSessionTracks]
  // console.log(
  //   '[FlexibleViewUtils] Total tracks (config + session):',
  //   allTracks.length,
  // )

  // Filter by assembly name using proper JBrowse 2 configuration reading
  const assemblyTracks = allTracks.filter((tc: BaseTrackConfig) => {
    try {
      let assemblyNames: string[] = []
      try {
        const configAssemblyNames = readConfObject(tc, ['assemblyNames'])
        if (Array.isArray(configAssemblyNames)) {
          assemblyNames = configAssemblyNames.filter(
            name => typeof name === 'string',
          )
        } else if (typeof configAssemblyNames === 'string') {
          assemblyNames = [configAssemblyNames]
        }
        // console.log(
        //   `[FlexibleViewUtils] Track ${
        //     readConfObject(tc as BaseTrackConfig, ['trackId']) ??
        //     'unknown'
        //   }: readConfObject assemblyNames=`,
        //   configAssemblyNames,
        //   'extracted=',
        //   assemblyNames,
        // )
      } catch (readConfError) {
        // Fallback to direct property access for non-MobX objects
        console.log(
          '[FlexibleViewUtils] readConfObject failed, trying direct access:',
          readConfError,
        )
        const directAssemblyNames = tc.configuration?.assemblyNames
        if (Array.isArray(directAssemblyNames)) {
          assemblyNames = directAssemblyNames.filter(
            name => typeof name === 'string',
          )
        } else if (typeof directAssemblyNames === 'string') {
          assemblyNames = [directAssemblyNames]
        }
        // console.log(
        //   `[FlexibleViewUtils] Track ${
        //     tc.trackId ?? 'unknown'
        //   }: direct access assemblyNames=`,
        //   directAssemblyNames,
        //   'extracted=',
        //   assemblyNames,
        // )
      }

      const matchesAssembly = assemblyNames.includes(requestedAssemblyName)

      // console.log(
      //   `[FlexibleViewUtils] Track final check: assemblyNames=${assemblyNames.join(
      //     ', ',
      //   )}, requestedAssemblyName=${requestedAssemblyName}, matches=${matchesAssembly}`,
      // )

      return matchesAssembly
    } catch (error) {
      console.error(
        '[FlexibleViewUtils] Error filtering track by assembly:',
        error,
      )
      return false
    }
  })

  // console.log(
  //   '[FlexibleViewUtils] getAllTracksForAssembly result:',
  //   assemblyTracks.length,
  //   'tracks for assembly',
  //   requestedAssemblyName,
  // )
  return assemblyTracks
}

// Normalize/resolves basic track info for UI dropdowns
export function extractTrackInfo(trackConf: BaseTrackConfig): TrackInfo {
  try {
    let trackId = ''
    let name = ''
    let adapterConfig: AdapterConfiguration | undefined

    // Extract trackId using readConfObject first, then fallback
    try {
      trackId = String(readConfObject(trackConf, ['trackId']) ?? '')
    } catch {
      trackId = String(
        trackConf.trackId ?? trackConf.configuration?.trackId ?? '',
      )
    }

    // Extract name using readConfObject first, then fallback
    try {
      const configName = readConfObject(trackConf, ['name'])
      // Check if we got a ConfigSlot reference (contains '@' and 'ConfigSlot')
      if (
        typeof configName === 'string' &&
        !configName.includes('ConfigSlot@')
      ) {
        name = configName
      } else {
        // Try alternative extraction methods for ConfigSlot
        name = String(
          trackConf.name ??
            trackConf.configuration?.name ??
            trackId ??
            'Unnamed Track',
        )
      }
    } catch {
      name = String(
        trackConf.name ??
          trackConf.configuration?.name ??
          trackId ??
          'Unnamed Track',
      )
    }

    // Extract adapter configuration
    try {
      adapterConfig = readConfObject(trackConf, ['adapter'])
    } catch {
      adapterConfig = trackConf.adapter ?? trackConf.configuration?.adapter
    }

    const adapterType = adapterConfig?.type ?? ''
    const hasIndex = Boolean(adapterConfig?.index)
    const isCompatible =
      typeof adapterType === 'string' &&
      COMPATIBLE_ADAPTER_TYPES.includes(adapterType)

    // console.log('[FlexibleViewUtils] extractTrackInfo result:', {
    //   trackId,
    //   name,
    //   adapterType,
    //   hasIndex,
    //   isCompatible,
    // })

    return {
      trackId,
      name,
      adapterType,
      hasIndex,
      isCompatible,
    }
  } catch (e) {
    console.warn('extractTrackInfo fallback for trackConf:', e)
    return {
      trackId: String(trackConf?.trackId ?? ''),
      name: String(
        trackConf?.name ??
          trackConf?.configuration?.name ??
          'Error Loading Track',
      ),
      adapterType: '',
      hasIndex: false,
      isCompatible: false,
    }
  }
}

// Create a reusable search flow that uses the RPC CoreGetFeatures pattern and allows
// callers to supply a contentExtractor(feature) that returns additional fields per result.
// contentExtractor should accept a feature object and return a plain object of extra fields.
export const searchFeatureRangeQueries = (
  contentExtractor: (feature: Feature) => Record<string, unknown> = () => ({}),
) =>
  flow(function* RangeQueryFeatureSearch(
    this: unknown,
    self: SearchableViewModel,
  ) {
    try {
      const searchTerm = (self.searchText ?? self.searchTerm ?? '').trim()
      if (!searchTerm) {
        if (typeof self.clearSearch === 'function') self.clearSearch()
        return []
      }

      if (searchTerm.length < 3) {
        // Don't clear search - just return empty results to allow term accumulation
        return []
      }

      // Add null checks for required fields
      if (!self.selectedAssemblyId || !self.selectedTrackId) {
        console.warn(
          '[FlexibleViewUtils] Missing selectedAssemblyId or selectedTrackId for search',
        )
        return []
      }

      if (typeof self.searchInProgress !== 'undefined')
        self.searchInProgress = true
      if (typeof self.isSearching !== 'undefined') self.isSearching = true

      const session = getSession(self as Parameters<typeof getSession>[0])

      const assembly = yield session.assemblyManager.waitForAssembly(
        self.selectedAssemblyId,
      )
      console.log(
        '🔍 DEBUG: Assembly:',
        self.selectedAssemblyId,
        'regions:',
        assembly?.regions?.length || 0,
      )
      if (!assembly?.regions) {
        console.log('🔍 DEBUG: No assembly regions found')
        return []
      }

      // Get all track configurations using proven working pattern from AGENT.md
      const trackConfs = getBaseTrackConfigs(session)
      console.log(
        '🔍 DEBUG: All available tracks:',
        trackConfs.map(tc => ({
          trackId: tc.trackId,
          configTrackId: tc.configuration?.trackId,
          isMobX: 'setSubschema' in tc,
        })),
      )
      const trackConf = trackConfs.find((tc: BaseTrackConfig) => {
        try {
          let trackId: string | undefined
          if ('setSubschema' in tc && typeof tc.setSubschema === 'function') {
            trackId = readConfObject(tc, ['trackId'])
          } else {
            trackId = tc.trackId ?? tc.configuration?.trackId
          }
          console.log(
            `🔍 DEBUG: Checking track: ${trackId} vs ${self.selectedTrackId}`,
          )
          return trackId === self.selectedTrackId
        } catch (error) {
          console.log('🔍 DEBUG: Error checking track:', error)
          return false
        }
      })

      console.log('🔍 DEBUG: Found track config:', !!trackConf, trackConf)

      // fallback: try session track if no config track found
      let adapter: unknown = undefined
      if (trackConf) {
        // Check if this is a MobX configuration object before using readConfObject
        if (
          'setSubschema' in trackConf &&
          typeof trackConf.setSubschema === 'function'
        ) {
          // TypeScript now knows this is a MobX object - safe to use readConfObject
          try {
            adapter = readConfObject(trackConf, ['adapter'])
            console.log('🔍 DEBUG: Got adapter via readConfObject')
          } catch (e) {
            console.warn(
              '🔍 DEBUG: readConfObject failed, falling back to direct access:',
              e,
            )
            adapter = trackConf.adapter ?? trackConf.configuration?.adapter
          }
        } else {
          // This is a plain object - use direct property access
          adapter = trackConf.adapter ?? trackConf.configuration?.adapter
          console.log('🔍 DEBUG: Got adapter via direct access')
        }
      }

      if (!adapter || typeof adapter !== 'object' || !('type' in adapter)) {
        console.warn(
          '🔍 DEBUG: Invalid adapter, skipping region. Adapter:',
          adapter,
        )
        return []
      }

      const rpcManager = session.rpcManager
      const sessionId = session.id ?? ''
      let allResults: SearchResult[] = []

      for (const region of assembly.regions) {
        if (allResults.length >= FEATURE_SEARCH_MAX_RESULTS) break

        const refName = region.refName

        for (
          let start = Number(region.start) || 0;
          start < (Number(region.end) || 0);
          start += FEATURE_SEARCH_MAX_RANGE
        ) {
          if (allResults.length >= FEATURE_SEARCH_MAX_RESULTS) break
          const regionEndNum = Number(region.end) || 0
          const end = Math.min(start + FEATURE_SEARCH_MAX_RANGE, regionEndNum)

          const queryRegion: Region = {
            refName,
            start,
            end,
            assemblyName: self.selectedAssemblyId,
          }

          try {
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
              ? (featureResults as Feature[])
              : []

            if (features.length > 0) {
              // console.log(
              //   `🔍 DEBUG: RPC returned ${features.length} features for region ${refName}:${start}-${end}`,
              // )
            }

            // Log first few features for debugging
            // if (features.length > 0) {
            //   features.slice(0, 3).forEach(f => {
            //     const id =
            //       f.get?.('ID') || f.get?.('Name') || f.id?.() || 'no-id'
            //     const name = f.get?.('Name') || f.get?.('ID') || 'no-name'
            //     const type = f.get?.('type') || 'no-type'
            // console.log(
            //   `🔍 DEBUG: Processed feature ${i}: id="${id}", name="${name}", type="${type}"`,
            // )
            //   })
            // }

            const filtered = features.filter((feature: Feature) => {
              try {
                // Get standard attributes
                const idVal = getFeatureId(feature)
                const nameVal = getFeatureName(feature)
                const typeVal = String(
                  feature.get?.('type') ?? feature.get?.('Type') ?? '',
                )

                // Get GFF-specific attributes that contain the actual gene names
                const geneNameVal = String(
                  feature.get?.('gene') ?? feature.get?.('gene_name') ?? '',
                )
                const locusTagVal = String(feature.get?.('locus_tag') ?? '')
                const productVal = String(feature.get?.('product') ?? '')
                const noteVal = String(feature.get?.('note') ?? '')
                const descriptionVal = String(
                  feature.get?.('description') ??
                    feature.get?.('comment') ??
                    '',
                )

                // Use the get() methods instead of accessing .data directly
                const dataNameVal = String(feature.get('name') ?? '')
                const dataGeneVal = String(feature.get('gene') ?? '')

                const lower = searchTerm.toLowerCase()
                const matches =
                  idVal.toLowerCase().includes(lower) ||
                  nameVal.toLowerCase().includes(lower) ||
                  typeVal.toLowerCase().includes(lower) ||
                  geneNameVal.toLowerCase().includes(lower) ||
                  locusTagVal.toLowerCase().includes(lower) ||
                  productVal.toLowerCase().includes(lower) ||
                  noteVal.toLowerCase().includes(lower) ||
                  descriptionVal.toLowerCase().includes(lower) ||
                  dataNameVal.toLowerCase().includes(lower) ||
                  dataGeneVal.toLowerCase().includes(lower)

                if (matches) {
                  // console.log(
                  //   `🔍 DEBUG: MATCH found - searchTerm="${searchTerm}"`,
                  //   {
                  //     id: idVal,
                  //     name: nameVal,
                  //     type: typeVal,
                  //     gene_name: geneNameVal,
                  //     locus_tag: locusTagVal,
                  //     data_name: dataNameVal,
                  //     data_gene: dataGeneVal,
                  //   },
                  // )
                }
                return matches
              } catch (e) {
                console.error('🔍 DEBUG: Filter error:', e)
                return false
              }
            })

            if (features.length > 0) {
              // console.log(
              //   `🔍 DEBUG: Filtered ${filtered.length} matching features from ${features.length} total`,
              // )
            }

            const mapped = filtered
              .slice(0, FEATURE_SEARCH_MAX_RESULTS - allResults.length)
              .map((feature: Feature) => {
                const id = String(
                  feature.get?.('id') ??
                    feature.get?.('name') ??
                    feature.id?.(),
                )
                // Improved name extraction - use gene_name as fallback
                const name = String(
                  feature.get?.('name') ??
                    feature.get?.('id') ??
                    // feature.get?.('uniqueId') ?? // internal jb name, useless
                    feature.get?.('gene') ??
                    'Unnamed Feature',
                )
                const type = String(feature.get?.('type') ?? 'Unknown')
                const startPos = String(feature.get?.('start') ?? '')
                const endPos = String(feature.get?.('end') ?? '')
                const location = queryRegion
                  ? `${queryRegion.refName}:${startPos}-${endPos}`
                  : 'unknown'
                const extra = contentExtractor(feature) || {}
                return Object.assign(
                  { id, name, type, location },
                  extra,
                ) as SearchResult
              })

            allResults = allResults.concat(mapped)
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('commonFeatureSearch: chunk search error', e)
          }
        }
      }

      if (typeof self.searchResults !== 'undefined') {
        try {
          self.searchResults = allResults.slice(0, FEATURE_SEARCH_MAX_RESULTS)
        } catch (_e) {
          // fallback plain assignment
          // eslint-disable-next-line no-console
          console.warn(
            'commonFeatureSearch: cast failed, using plain assignment',
          )
          self.searchResults = allResults.slice(0, FEATURE_SEARCH_MAX_RESULTS)
        }
      }

      return allResults.slice(0, FEATURE_SEARCH_MAX_RESULTS)
    } catch (error) {
      // console.log(error)
      if (typeof self.searchResults !== 'undefined') {
        try {
          self.searchResults = []
        } catch (_e) {
          self.searchResults = []
        }
      }
      return []
    } finally {
      if (typeof self.searchInProgress !== 'undefined')
        self.searchInProgress = false
      if (typeof self.isSearching !== 'undefined') self.isSearching = false
    }
  })

// Add a text-search-based alternative that prefers session.textSearchManager
export const searchFeatureTextIndex = (
  contentExtractor: (feature: Feature) => Record<string, unknown> = () => ({}),
) =>
  flow(function* textIndexFeatureSearch(
    this: unknown,
    self: SearchableViewModel,
  ) {
    try {
      const searchTerm = (self.searchText ?? self.searchTerm ?? '').trim()
      if (!searchTerm) {
        if (typeof self.clearSearch === 'function') self.clearSearch()
        return []
      }

      if (searchTerm.length < 3) {
        return []
      }

      if (!self.selectedAssemblyId || !self.selectedTrackId) {
        console.warn(
          '[FlexibleViewUtils] Missing selectedAssemblyId or selectedTrackId for search',
        )
        return []
      }

      if (typeof self.searchInProgress !== 'undefined')
        self.searchInProgress = true
      if (typeof self.isSearching !== 'undefined') self.isSearching = true

      const session = getSession(self)
      let matches: SearchMatch[] = []

      // Direct track adapter approach to bypass TextSearchManager bug
      try {
        // Use the centralized search function
        const trackConfs = getBaseTrackConfigs(session)
        const trackConf = findTrackById(trackConfs, self.selectedTrackId)

        if (trackConf) {
          matches = yield searchTrackFeatures(
            session,
            trackConf,
            searchTerm,
            FEATURE_SEARCH_MAX_RESULTS,
          )
        }
      } catch (error) {
        console.warn('🔍 DEBUG: Direct adapter approach failed:', error)
        matches = []
      }
      // Use RPC fallback if no matches from textIndexSearch
      if (matches.length === 0) {
        // console.log(
        //   '🔍 DEBUG: No matches from textIndexSearch, falling back to RPC search',
        // )
        const fallback = searchFeatureRangeQueries(contentExtractor)
        return yield fallback.call(this, self)
      }

      // Process matches to fetch full feature details using RPC
      const trackConfs = getBaseTrackConfigs(session)
      const trackConf = findTrackById(trackConfs, self.selectedTrackId)
      if (!trackConf) {
        console.warn(
          '🔍 DEBUG: No track configuration found for ID:',
          self.selectedTrackId,
        )
        return []
      }

      const adapter = safeGetAdapter(trackConf)
      if (!adapter) {
        console.warn(
          '🔍 DEBUG: No adapter found for track:',
          self.selectedTrackId,
        )
        return []
      }

      const rpcManager = session.rpcManager
      const sessionId = session.id ?? ''
      let allResults: SearchResult[] = []

      // console.log(
      //   '🔍 DEBUG: Processing',
      //   matches.length,
      //   'matches from textIndexSearch',
      // )

      for (const m of matches) {
        if (allResults.length >= FEATURE_SEARCH_MAX_RESULTS) break
        let queryRegion: Region | undefined

        try {
          const refName =
            m.refName ?? m.ref ?? m.loc?.refName ?? m.location?.refName
          const start = Number(
            m.start ?? m.loc?.start ?? m.location?.start ?? 0,
          )
          const end = Number(
            m.end ?? m.loc?.end ?? m.location?.end ?? start + 1,
          )

          if (!refName) {
            // console.log('🔍 DEBUG: Skipping match - no refName')
            continue
          }

          // console.log(
          //   `🔍 DEBUG: Processing match at ${refName}:${start}-${end}`,
          // )

          queryRegion = {
            refName,
            start: Math.max(0, start - 5),
            end: end + 5,
            assemblyName: self.selectedAssemblyId,
          }

          if (!adapter || typeof adapter !== 'object' || !('type' in adapter)) {
            // console.warn(
            //   '🔍 DEBUG: Invalid adapter, skipping match. Adapter:',
            //   adapter,
            // )
            continue
          }

          const featureResults = yield rpcManager.call(
            sessionId,
            'CoreGetFeatures',
            {
              regions: [queryRegion],
              adapterConfig: adapter,
            },
          )

          const features = Array.isArray(featureResults)
            ? (featureResults as Feature[])
            : []

          const mapped = features
            .slice(0, FEATURE_SEARCH_MAX_RESULTS - allResults.length)
            .map((feature: Feature) => {
              const id = getFeatureId(feature)
              const name = getFeatureName(feature)
              const type = String(feature.get?.('type') ?? 'Unknown')
              const startPos = String(feature.get?.('start') ?? '')
              const endPos = String(feature.get?.('end') ?? '')
              const location = queryRegion
                ? `${queryRegion.refName}:${startPos}-${endPos}`
                : 'unknown'
              const extra = contentExtractor(feature) || {}
              return Object.assign(
                { id, name, type, location },
                extra,
              ) as SearchResult
            })

          allResults = allResults.concat(mapped)
        } catch (rpcError) {
          const regionInfo = queryRegion
            ? `${queryRegion.refName}:${queryRegion.start}-${queryRegion.end}`
            : 'unknown'
          console.warn(
            `🔍 DEBUG: RPC call failed for region ${regionInfo}:`,
            rpcError,
          )
          continue
        }
      }

      if (typeof self.searchResults !== 'undefined') {
        if (self.selectedTrackId) {
          allResults = allResults.filter(
            result => result.trackId === self.selectedTrackId,
          )
        }

        try {
          self.searchResults = allResults.slice(0, FEATURE_SEARCH_MAX_RESULTS)
        } catch (_e) {
          console.warn(
            'textIndexFeatureSearch: cast failed, using plain assignment',
          )
          self.searchResults = allResults.slice(0, FEATURE_SEARCH_MAX_RESULTS)
        }
      }

      return allResults.slice(0, FEATURE_SEARCH_MAX_RESULTS)
    } catch (error) {
      console.error('textIndexFeatureSearch: unexpected error', error)
      if (typeof self.searchResults !== 'undefined') {
        try {
          self.searchResults = []
        } catch (_e) {
          self.searchResults = []
        }
      }
      return []
    } finally {
      if (typeof self.searchInProgress !== 'undefined')
        self.searchInProgress = false
      if (typeof self.isSearching !== 'undefined') self.isSearching = false
    }
  })

export function getFeatureId(feature: Feature) {
  return (
    feature.get?.('ID') ??
    feature.get?.('id') ??
    feature.get?.('Name') ??
    feature.get?.('name') ??
    feature.id?.() ??
    ''
  )
}

export function getFeatureName(feature: Feature) {
  return (
    feature.get?.('Name') ??
    feature.get?.('name') ??
    feature.get?.('ID') ??
    feature.get?.('id') ??
    'Unnamed feature'
  )
}
