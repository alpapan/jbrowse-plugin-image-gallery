import { ElementId } from '@jbrowse/core/util/types/mst'
import { types } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject } from '@jbrowse/core/configuration'

// Compatible adapter types for track filtering
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

export class FlexibleImageGalleryViewState {
  selectedAssemblyId?: string
  selectedTrackId?: string
  selectedFeatureId?: string
  selectedFeatureType: FeatureType = FeatureType.NON_GENE
  featureImages = ''
  featureLabels = ''
  featureTypes = ''
  isLoadingTracks = false
  isLoadingFeatures = false

  // Add deduplicateImages method
  deduplicateImages(images: string[]): string[] {
    const imageMap: Record<string, string> = {}

    // Only deduplicate by URL, not by type
    for (const image of images) {
      if (image && !imageMap[image]) {
        imageMap[image] = image
      }
    }
    return Object.keys(imageMap)
  }
}

// Helper function to extract friendly assembly name in "Species (code)" format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAssemblyDisplayName(assembly: any): string {
  // Debug logging to understand the actual structure
  console.log('Assembly object:', assembly)

  try {
    // Use the getConf method from Assembly API
    const displayName = assembly.getConf ? assembly.getConf('displayName') : ''
    const assemblyCode = assembly.getConf
      ? assembly.getConf('name')
      : assembly.name

    console.log('Display name:', displayName, 'Assembly code:', assemblyCode)

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
  }

  // Fallback to direct property access
  const displayName = String(assembly.displayName || '')
  const assemblyCode = String(assembly.name || '')

  if (
    displayName &&
    displayName.trim() !== '' &&
    !displayName.includes('ConfigSlot')
  ) {
    return displayName
  } else if (assemblyCode && assemblyCode.trim() !== '') {
    return assemblyCode
  }

  // Final fallback
  return String(assembly.name || assembly.id || 'Unknown Assembly')
}

const stateModel = types
  .model('FlexibleImageGalleryView', {
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
    // Loading states for progressive UI
    isLoadingTracks: types.optional(types.boolean, false),
    isLoadingFeatures: types.optional(types.boolean, false),
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
    },

    // Set selected track (clears dependent selections)
    setSelectedTrack(trackId: string | undefined) {
      self.selectedTrackId = trackId
      // Clear feature selection when track changes
      if (self.selectedFeatureId) {
        self.selectedFeatureId = undefined
        this.clearFeatureContent()
      }
    },

    // Set selected feature and update content
    setSelectedFeature(
      featureId: string | undefined,
      featureType?: FeatureType,
      images?: string,
      labels?: string,
      types?: string,
    ) {
      self.selectedFeatureId = featureId
      if (featureType) {
        self.selectedFeatureType = featureType.toString()
      }

      if (featureId && images) {
        this.updateFeatureContent(images, labels, types)
      } else {
        this.clearFeatureContent()
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

        // Create instances for deduplication
        const helper = new FlexibleImageGalleryViewState()
        const uniqueImages = helper.deduplicateImages(imageUrls)

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

        // Combine both configuration and session assemblies
        const configAssemblies = session.assemblies || []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionAssemblies = (session as any).sessionAssemblies || []
        const assemblies = [...configAssemblies, ...sessionAssemblies]

        return assemblies
      } catch (error) {
        console.error('Error getting available assemblies:', error)
        return []
      }
    },

    // Get available tracks from session (filtered by assembly and compatibility)
    get availableTracks() {
      console.log(
        'availableTracks called with selectedAssemblyId:',
        self.selectedAssemblyId,
      )

      // Must have assembly selected first
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
            // Try multiple ways to access track configuration
            let trackAssemblyId: string | undefined
            let adapterType: string | undefined

            // Method 1: Direct getConf method (like assemblies)
            if (track.getConf) {
              trackAssemblyId = track.getConf('assemblyId')
              const adapterConfig = track.getConf('adapter')
              adapterType = adapterConfig ? adapterConfig.type : undefined
              console.log('Method 1 - getConf:', {
                trackAssemblyId,
                adapterType,
              })
            }

            // Method 2: Configuration property with readConfObject
            if (!trackAssemblyId && track.configuration) {
              trackAssemblyId = readConfObject(
                track.configuration,
                'assemblyId',
              )
              const adapterConfig = readConfObject(
                track.configuration,
                'adapter',
              )
              adapterType = adapterConfig
                ? readConfObject(adapterConfig, 'type')
                : undefined
              console.log('Method 2 - configuration:', {
                trackAssemblyId,
                adapterType,
              })
            }

            // Method 3: Direct property access
            if (!trackAssemblyId && track.assemblyId) {
              trackAssemblyId = track.assemblyId
              adapterType = track.adapter?.type
              console.log('Method 3 - direct properties:', {
                trackAssemblyId,
                adapterType,
              })
            }

            // Method 4: Check if track has assemblyNames property (some tracks use this)
            if (
              !trackAssemblyId &&
              track.assemblyNames &&
              track.assemblyNames.length > 0
            ) {
              trackAssemblyId = track.assemblyNames[0]
              console.log('Method 4 - assemblyNames:', { trackAssemblyId })
            }

            console.log('Final track info:', {
              trackName: track.name || track.trackId,
              trackAssemblyId,
              adapterType,
              selectedAssemblyId: self.selectedAssemblyId,
            })

            // Check if track belongs to selected assembly
            if (
              !trackAssemblyId ||
              trackAssemblyId !== self.selectedAssemblyId
            ) {
              console.log(
                `Track ${track.name || track.trackId} assembly mismatch or missing: ${trackAssemblyId} !== ${self.selectedAssemblyId}`,
              )
              return false
            }

            // Check if adapter type is compatible
            const isCompatible =
              typeof adapterType === 'string' &&
              COMPATIBLE_ADAPTER_TYPES.includes(adapterType)

            console.log(
              `Track ${track.name || track.trackId} adapter compatible:`,
              isCompatible,
              'Type:',
              adapterType,
              'Compatible types:',
              COMPATIBLE_ADAPTER_TYPES,
            )

            return isCompatible
          } catch (error) {
            console.error('Error checking track configuration:', error)
            return false
          }
        },
      )

      console.log('Filtered tracks:', filteredTracks)
      return filteredTracks
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

        // Check both configuration and session assemblies
        const allAssemblies = [
          ...(session.assemblies || []),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...((session as any).sessionAssemblies || []),
        ]

        return allAssemblies.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (assembly: any) =>
            assembly.name === self.selectedAssemblyId ||
            assembly.configuration?.name === self.selectedAssemblyId,
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
        return session?.tracks?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (track: any) => track.trackId === self.selectedTrackId,
        )
      } catch (error) {
        console.error('Error getting selected track:', error)
        return undefined
      }
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
export { FeatureType }
