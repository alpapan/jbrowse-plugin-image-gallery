import { MenuItem } from '@jbrowse/core/ui'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { types, getRoot, Instance, IAnyStateTreeNode } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject, getConf } from '@jbrowse/core/configuration'

// Interface for root model with pluginManager
interface RootModelWithPluginManager {
  pluginManager: unknown
}

// Utility function for deduplicating content arrays
function deduplicateContent(content: string[]): string[] {
  const contentMap: Record<string, string> = {}

  // Only deduplicate by URL, not by type
  for (const item of content) {
    if (item && !contentMap[item]) {
      contentMap[item] = item
    }
  }
  return Object.keys(contentMap)
}

const stateModel: IAnyStateTreeNode = types
  .model('SelectTextualDescriptionsView', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: ElementId as any,
    type: types.literal('SelectTextualDescriptionsView'),
    displayName: types.optional(types.string, 'Text Descriptions'),
    minimized: types.optional(types.boolean, false),
    width: types.optional(types.number, 400),
    // Store the selected feature and content for this view
    selectedFeatureId: types.maybe(types.string),
    selectedFeatureType: types.optional(
      types.enumeration('FeatureType', ['GENE', 'NON_GENE']),
      'GENE',
    ),
    featureMarkdownUrls: types.optional(types.string, ''),
    featureDescriptions: types.optional(types.string, ''),
    featureContentTypes: types.optional(types.string, ''),
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
      featureType: 'GENE' | 'NON_GENE',
      markdownUrls: string,
      descriptions?: string,
      contentTypes?: string,
    ) {
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

        // Use the utility function to deduplicate content
        const uniqueContent = deduplicateContent(urlList)

        // Get max items limit from configuration
        const session = getSession(self)
        const config = session.jbrowse.configuration
        const maxItems = Number(
          readConfObject(config, ['textualDescriptions', 'maxItems']) || 0,
        )
        const limitedContent =
          maxItems > 0 ? uniqueContent.slice(0, maxItems) : uniqueContent

        self.featureMarkdownUrls = limitedContent.join(',')
        self.featureDescriptions = descriptionList.join(',')
        self.featureContentTypes = typeList.join(',')
      } else {
        // Clear content fields with empty strings (consistent with types.optional defaults)
        self.featureMarkdownUrls = ''
        self.featureDescriptions = ''
        self.featureContentTypes = ''
      }
    },

    // Clear the current feature
    clearFeature() {
      // Set selectedFeatureId to undefined (types.maybe allows this)
      // Set content fields to empty strings (consistent with types.optional defaults)
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      self.featureMarkdownUrls = ''
      self.featureDescriptions = ''
      self.featureContentTypes = ''
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

    // Configuration values with defaults
    get defaultDisplayName() {
      return (
        readConfObject(this.config, [
          'textualDescriptions',
          'defaultDisplayName',
        ]) || 'Text Descriptions'
      )
    },

    get maxItems(): number {
      return Number(
        readConfObject(this.config, ['textualDescriptions', 'maxItems']) || 0,
      ) // 0 means unlimited
    },

    get gff3AttributeNames() {
      return (
        readConfObject(this.config, [
          'textualDescriptions',
          'gff3AttributeNames',
        ]) || {
          markdownUrls: 'markdown_urls,text_content,descriptions',
          descriptions: 'content_descriptions,labels,summaries',
          types: 'content_types,text_types,categories',
        }
      )
    },

    // unused by this view, but represents of 'view level' menu items
    menuItems(): MenuItem[] {
      return []
    },

    // Computed properties for easy access
    hasContent() {
      return self.featureMarkdownUrls.trim() !== ''
    },

    displayTitle() {
      const displayName = self.displayName || this.defaultDisplayName
      return self.selectedFeatureId
        ? `${displayName} for ${String(self.selectedFeatureId)}`
        : displayName
    },

    // Computed view that returns deduplicated content from the stored comma-separated strings
    deduplicatedMarkdownUrls(): string[] {
      if (self.featureMarkdownUrls.trim() === '') {
        return []
      }
      const urlList = self.featureMarkdownUrls
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0)
      const uniqueContent = deduplicateContent(urlList)

      // Apply max items limit from configuration
      const maxItems = this.maxItems
      return maxItems > 0 ? uniqueContent.slice(0, maxItems) : uniqueContent
    },

    // Example usage of pluginManager for potential future enhancements:
    // - Custom adapters for fetching text data: this.pluginManager?.getAdapterType('CustomTextAdapter')
    // - Plugin-defined configuration schemas: this.pluginManager?.getConfigurationSchema('textualDescriptions')
    // - Integration with other JBrowse 2 plugins: this.pluginManager?.getPlugin('MarkdownPlugin')
    // - Custom renderers for text display: this.pluginManager?.getRendererType('CustomMarkdownRenderer')
    // - Text processing plugins: this.pluginManager?.getUtilities('textProcessing')
  }))

export type SelectTextualDescriptionsViewModel = Instance<typeof stateModel>
export default stateModel
