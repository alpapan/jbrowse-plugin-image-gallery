import { MenuItem } from '@jbrowse/core/ui'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { types, getRoot } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { getConf } from '@jbrowse/core/configuration'

// Interface for root model with pluginManager
interface RootModelWithPluginManager {
  pluginManager: unknown
}

// Utility function for deduplicating content arrays (generic version)
export function deduplicateContent(content: string[]): string[] {
  const contentMap: Record<string, string> = {}

  // Only deduplicate by URL, not by type
  for (const item of content) {
    if (item && !contentMap[item]) {
      contentMap[item] = item
    }
  }
  return Object.keys(contentMap)
}

// Base view state model with all common functionality
export const BaseViewStateModel = types
  .model('BaseViewStateModel', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: ElementId as any,
    displayName: types.optional(types.string, ''),
    minimized: types.optional(types.boolean, false),
    width: types.optional(types.number, 400),
    // Store the selected feature for this view
    selectedFeatureId: types.maybe(types.string),
    selectedFeatureType: types.optional(types.string, 'GENE'),
  })
  .actions(self => ({
    // Set the width in pixels of the view panel
    setWidth(newWidth: number) {
      self.width = newWidth
    },

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
          // Use TypeScript-suggested unknown conversion for type safety
          session.removeView(
            self as unknown as Parameters<typeof session.removeView>[0],
          )
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error closing view:', error)
      }
    },

    // Update the feature and content displayed in this view
    updateFeature(
      featureId: string,
      featureType: string,
      _content: string,
      _descriptions?: string,
      _contentTypes?: string,
    ) {
      // Validate input - featureId is required, but content can be empty
      if (!featureId) {
        return
      }

      // Always set the selected feature, even if there is no content
      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType

      // Subclasses should override this to handle content-specific logic
    },

    // Clear the current feature
    clearFeature() {
      // Set selectedFeatureId to undefined (types.maybe allows this)
      // Set content fields to appropriate defaults (subclasses handle specifics)
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
    },
  }))
  .views(self => ({
    // Plugin manager access following JBrowse 2 best practices
    get pluginManager() {
      try {
        const rootModel = getRoot(self)
        return rootModel &&
          typeof rootModel === 'object' &&
          'pluginManager' in rootModel
          ? (rootModel as RootModelWithPluginManager).pluginManager
          : null
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to access pluginManager:', error)
        return null
      }
    },

    /**
     * Get the JBrowse 2 session object
     * @returns The current session
     */
    get session() {
      return getSession(self)
    },

    /**
     * Get the assembly manager for accessing assembly data
     * Following AGENT.md best practices: getSession(self).assemblyManager
     * @returns The assembly manager instance
     */
    get assemblyManager() {
      return getSession(self).assemblyManager
    },

    /**
     * Get list of available assembly names
     * Following AGENT.md best practices: assemblyManager.assemblyNamesList
     * @returns Array of assembly names
     */
    get availableAssemblies() {
      try {
        return this.assemblyManager.assemblyNamesList
      } catch (error) {
        console.warn('Failed to get available assemblies:', error)
        return []
      }
    },

    /**
     * Get track configurations using proven working pattern from AGENT.md
     * PROVEN WORKING: getConf(jbrowse.configuration, 'tracks')
     * NOT session.tracks - breaks reactivity and violates JBrowse 2 best practices
     * @returns Array of track configurations
     */
    get trackConfigurations() {
      try {
        const { jbrowse } = this.session
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return getConf(jbrowse.configuration, 'tracks') ?? []
      } catch (error) {
        console.warn('Failed to get track configurations:', error)
        return []
      }
    },

    /**
     * Get track configurations filtered by assembly
     * Following AGENT.md pattern: filter by assemblyNames using getConf
     * @param assemblyName - The assembly name to filter by
     * @returns Array of track configurations for the specified assembly
     */
    getTracksForAssembly(assemblyName: string) {
      if (!assemblyName) {
        return []
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.trackConfigurations.filter((tc: any) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          (getConf(tc, 'assemblyNames') ?? []).includes(assemblyName),
        )
      } catch (error) {
        console.warn('Failed to filter tracks for assembly:', error)
        return []
      }
    },

    /**
     * Get assembly object using proper async pattern from AGENT.md
     * PROVEN WORKING: assemblyManager.waitForAssembly(assemblyId)
     * @param assemblyId - The assembly ID to fetch
     * @returns Promise resolving to assembly object
     */
    async getAssembly(assemblyId: string) {
      try {
        return await this.assemblyManager.waitForAssembly(assemblyId)
      } catch (error) {
        console.error('Failed to get assembly:', error)
        throw error
      }
    },

    // Configuration access
    get config() {
      const session = getSession(self)
      return session.jbrowse.configuration
    },

    // Default display name - subclasses should override this
    get defaultDisplayName() {
      return 'Base View'
    },

    // unused by most views, but represents 'view level' menu items
    menuItems(): MenuItem[] {
      return []
    },

    // Computed properties for easy access - subclasses should override
    hasContent() {
      return false
    },

    get displayTitle() {
      const displayName = self.displayName || this.defaultDisplayName
      return self.selectedFeatureId
        ? String(self.selectedFeatureId)
        : displayName
    },
  }))

export default BaseViewStateModel
