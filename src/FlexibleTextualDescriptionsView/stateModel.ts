import { MenuItem } from '@jbrowse/core/ui'
import { types } from 'mobx-state-tree'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { getSession } from '@jbrowse/core/util'

enum FeatureType {
  GENE = 'GENE',
  NON_GENE = 'NON_GENE',
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
    displayName: types.optional(types.string, 'Flexible Textual Descriptions'),
    minimized: types.optional(types.boolean, false),
    // Assembly, track and feature selection state - order matters!
    selectedAssemblyId: types.maybe(types.string),
    selectedTrackId: types.maybe(types.string),
    selectedFeatureId: types.maybe(types.string),
    selectedFeatureType: types.optional(types.string, 'GENE'),
    // Content fields for textual descriptions
    featureDescriptions: types.maybe(types.string),
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
      descriptions?: string,
      labels?: string,
      types?: string,
    ) {
      self.selectedFeatureId = featureId
      if (featureType) {
        self.selectedFeatureType = featureType.toString()
      }

      if (featureId && descriptions) {
        this.updateFeatureContent(descriptions, labels, types)
      } else {
        this.clearFeatureContent()
      }
    },

    // Update the feature content displayed in this view
    updateFeatureContent(
      descriptions: string,
      labels?: string,
      types?: string,
    ) {
      // Only process descriptions if they exist and are not empty
      if (descriptions && descriptions.trim() !== '') {
        // Parse comma-separated strings from GFF3 attributes (not JSON)
        const descriptionList = descriptions
          .split(',')
          .map(desc => desc.trim())
          .filter(desc => desc.length > 0)

        const labelList = labels
          ? labels.split(',').map(label => label.trim())
          : []
        const typeList = types ? types.split(',').map(type => type.trim()) : []

        // Store processed data
        self.featureDescriptions = descriptionList.join(',')
        self.featureLabels = labelList.join(',')
        self.featureTypes = typeList.join(',')
      } else {
        this.clearFeatureContent()
      }
    },

    // Clear feature content
    clearFeatureContent() {
      self.featureDescriptions = ''
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
        // Use any type for sessionAssemblies as it may not be in type definition
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

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = (self as any).getRoot?.()?.session
        if (!session) {
          return undefined
        }

        // Check both configuration and session assemblies
        const allAssemblies = [
          ...(session.assemblies || []),
          ...(session.sessionAssemblies || []),
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = (self as any).getRoot?.()?.session
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
      return !!(
        self.featureDescriptions && self.featureDescriptions.trim() !== ''
      )
    },

    get displayTitle() {
      return self.selectedFeatureId
        ? `${self.displayName} for ${String(self.selectedFeatureId)}`
        : self.displayName || 'Flexible Textual Descriptions'
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
export { FeatureType }
