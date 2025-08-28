import { MenuItem } from '@jbrowse/core/ui'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { types } from 'mobx-state-tree'

enum FeatureType {
  GENE = 'GENE',
  NON_GENE = 'NON_GENE',
}

export class FlexibleTextualDescriptionsViewState {
  selectedAssemblyId?: string
  selectedTrackId?: string
  selectedFeatureId?: string
  selectedFeatureType: FeatureType = FeatureType.NON_GENE
  featureMarkdownUrls = ''
  featureDescriptions = ''
  featureContentTypes = ''
  isLoadingTracks = false
  isLoadingFeatures = false

  // Add deduplicateContent method
  deduplicateContent(content: string[]): string[] {
    const contentMap: Record<string, string> = {}

    // Only deduplicate by URL, not by type
    for (const item of content) {
      if (item && !contentMap[item]) {
        contentMap[item] = item
      }
    }
    return Object.keys(contentMap)
  }
}

// Helper function to check if adapter type is compatible
function isCompatibleAdapter(adapterType: string): boolean {
  return (
    adapterType === 'Gff3Adapter' ||
    adapterType === 'GtfAdapter' ||
    adapterType === 'BedAdapter' ||
    adapterType === 'GeneFeaturesAdapter'
  )
}

const stateModel = types
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
    // Content fields inherited from TextualDescriptionsView
    featureMarkdownUrls: types.maybe(types.string),
    featureDescriptions: types.maybe(types.string),
    featureContentTypes: types.maybe(types.string),
    // Loading states for progressive UI
    isLoadingTracks: types.optional(types.boolean, false),
    isLoadingFeatures: types.optional(types.boolean, false),
  })
  .actions(self => ({
    // unused by this view but it is updated with the current width in pixels of
    // the view panel
    setWidth() {},

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = (self as any).getRoot?.()?.session
        if (session?.removeView) {
          session.removeView(self)
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

        // Deduplicate content using the class method
        const uniqueContent =
          new FlexibleTextualDescriptionsViewState().deduplicateContent(urlList)

        self.featureMarkdownUrls = uniqueContent.join(',')
        self.featureDescriptions = descriptionList.join(',')
        self.featureContentTypes = typeList.join(',')
      } else {
        this.clearFeatureContent()
      }
    },

    // Clear the current feature content
    clearFeatureContent() {
      self.featureMarkdownUrls = undefined
      self.featureDescriptions = undefined
      self.featureContentTypes = undefined
    },

    // Clear all selections
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

    // Get available assemblies from session by extracting from tracks
    get availableAssemblies() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = (self as any).getRoot?.()?.session
        if (!session?.tracks) {
          return []
        }

        // Extract unique assemblies from tracks
        const assemblyMap = new Map()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.tracks.forEach((track: any) => {
          const assemblyId = track.assemblyId || track.configuration?.assemblyId
          if (assemblyId && !assemblyMap.has(assemblyId)) {
            // Try to get assembly name from session assemblies or use assemblyId
            const assembly =
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              session.assemblies?.find((asm: any) => asm.name === assemblyId) ||
              session.assemblyManager?.get?.(assemblyId)
            assemblyMap.set(assemblyId, {
              name: assemblyId,
              displayName: assembly?.displayName || assemblyId,
            })
          }
        })

        return Array.from(assemblyMap.values())
      } catch (error) {
        console.error('Error getting available assemblies:', error)
        return []
      }
    },

    // Get available tracks from session (filtered by assembly and compatibility)
    get availableTracks() {
      try {
        // Must have assembly selected first
        if (!self.selectedAssemblyId) {
          return []
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = (self as any).getRoot?.()?.session
        if (!session?.tracks) {
          return []
        }

        // Filter tracks by assembly and compatible adapters
        return session.tracks.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (track: any) => {
            // Check if track belongs to selected assembly
            const trackAssemblyId =
              track.assemblyId || track.configuration?.assemblyId
            if (trackAssemblyId !== self.selectedAssemblyId) {
              return false
            }

            // Check if adapter type is compatible
            const adapterType = track?.configuration?.adapter?.type
            return (
              typeof adapterType === 'string' &&
              isCompatibleAdapter(adapterType)
            )
          },
        )
      } catch (error) {
        console.error('Error getting available tracks:', error)
        return []
      }
    },

    // Get selected assembly object
    get selectedAssembly() {
      if (!self.selectedAssemblyId) {
        return undefined
      }
      return this.availableAssemblies.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (assembly: any) => assembly.name === self.selectedAssemblyId,
      )
    },

    // Get selected track object
    get selectedTrack() {
      if (!self.selectedTrackId) {
        return undefined
      }
      return this.availableTracks.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (track: any) => track.trackId === self.selectedTrackId,
      )
    },

    // Computed properties for easy access
    get hasContent() {
      return !!(
        self.featureMarkdownUrls && self.featureMarkdownUrls.trim() !== ''
      )
    },

    get displayTitle() {
      if (self.selectedFeatureId) {
        return `${self.displayName} for ${String(self.selectedFeatureId)}`
      }
      if (self.selectedTrackId) {
        const trackName = this.selectedTrack?.name || self.selectedTrackId
        return `${self.displayName} - ${trackName}`
      }
      return self.displayName
    },

    get canSelectTrack() {
      return !!self.selectedAssemblyId && !self.isLoadingTracks
    },

    get canSelectFeature() {
      return !!self.selectedTrackId && !self.isLoadingFeatures
    },

    get isReady() {
      return (
        !!self.selectedAssemblyId &&
        !!self.selectedTrackId &&
        !!self.selectedFeatureId &&
        !self.isLoadingFeatures
      )
    },
  }))

export default stateModel
export { FeatureType }
