import { types, Instance } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject } from '@jbrowse/core/configuration'

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

// Helper function to extract friendly assembly name in "Species (code)" format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAssemblyDisplayName(assembly: any): string {
  try {
    if (!assembly) {
      return 'Unknown Assembly'
    }

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

    // For all assemblies, use the original name without hardcoded mappings
    return String(
      assemblyCode || assembly.name || assembly.id || 'Unknown Assembly',
    )
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const session = getSession(self)

  // 1. static tracks from config.json
  const cfgTracks = (
    readConfObject(session.jbrowse.configuration, 'tracks') ?? []
  )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((tc: any) =>
      (readConfObject(tc, 'assemblyNames') ?? []).includes(assemblyName),
    )

  // 2. tracks added after start-up (stored on the session model)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liveTracks = (session.sessionTracks ?? []).filter((t: any) =>
    (t.assemblyNames ?? []).includes(assemblyName),
  )

  return [...cfgTracks, ...liveTracks]
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

        // Use only officially supported session assemblies
        const assemblies = session.assemblies || []
        console.log(
          '🔍 DEBUG: Available assemblies objects:',
          assemblies.length,
        )
        return assemblies
      } catch (error) {
        console.error('Error getting available assemblies:', error)
        return []
      }
    },

    get availableTrackCount() {
      if (!self.selectedAssemblyId) {
        return 0
      }

      // Use the reusable function
      const allTracks = getAllTracksForAssembly(self, self.selectedAssemblyId)

      console.log(
        '🔍 DEBUG: Config tracks from readConfObject:',
        allTracks.length,
      )
      console.log('🔍 DEBUG: Total tracks for assembly:', allTracks.length)

      return allTracks.length
    },

    get availableTracks(): TrackInfo[] {
      if (!self.selectedAssemblyId) {
        return []
      }

      const assemblyId = self.selectedAssemblyId

      // Find all compatible tracks for display in the dropdown
      const trackConfs = getAllTracksForAssembly(self, assemblyId)

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

            // Check if this track has compatible adapter
            const adapterConfig = trackConf.configuration
              ? readConfObject(trackConf, 'adapter')
              : trackConf.adapter

            const adapterType = adapterConfig
              ? trackConf.configuration
                ? readConfObject(adapterConfig, 'type')
                : adapterConfig.type
              : null

            const hasIndex = adapterConfig
              ? trackConf.configuration
                ? !!readConfObject(adapterConfig, 'index')
                : !!adapterConfig.index
              : false

            const isCompatible =
              typeof adapterType === 'string' &&
              COMPATIBLE_ADAPTER_TYPES.includes(adapterType)

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
    },

    // unused by this view, but required for JBrowse2 view compatibility
    menuItems(): MenuItem[] {
      return []
    },
  }))
  .actions(self => ({
    // unused by this view but it is updated with the current width in pixels of
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
    setSelectedAssemblyId(assemblyId: string) {
      self.selectedAssemblyId = assemblyId
      // Reset dependent selections when assembly changes
      self.selectedTrackId = undefined
      self.selectedFeatureId = undefined
    },

    // Track selection actions
    setSelectedTrackId(trackId: string) {
      self.selectedTrackId = trackId
      // Reset feature selection when track changes
      self.selectedFeatureId = undefined
    },

    // Feature selection actions
    setSelectedFeatureId(featureId: string) {
      self.selectedFeatureId = featureId
    },

    // Search and display actions
    setSearchText(text: string) {
      self.searchText = text
    },

    setMaxImages(count: number) {
      self.maxImages = count
    },

    setImageDimensions(width: number, height: number) {
      self.imageWidth = width
      self.imageHeight = height
    },

    setShowImageNames(show: boolean) {
      self.showImageNames = show
    },

    setShowDescriptions(show: boolean) {
      self.showDescriptions = show
    },

    setEnableZoom(enable: boolean) {
      self.enableZoom = enable
    },

    setEnableDownload(enable: boolean) {
      self.enableDownload = enable
    },
  }))

export type FlexibleImageGalleryViewModel = Instance<typeof stateModel>
export default stateModel
