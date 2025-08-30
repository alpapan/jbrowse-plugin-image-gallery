import { MenuItem } from '@jbrowse/core/ui'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { types, getRoot, Instance, IAnyStateTreeNode } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject, getConf } from '@jbrowse/core/configuration'

// Interface for root model with pluginManager
interface RootModelWithPluginManager {
  pluginManager: unknown
}

// Utility function for deduplicating image arrays
function deduplicateImages(images: string[]): string[] {
  const imageMap: Record<string, string> = {}

  // Only deduplicate by URL, not by type
  for (const image of images) {
    if (image && !imageMap[image]) {
      imageMap[image] = image
    }
  }
  return Object.keys(imageMap)
}

const stateModel: IAnyStateTreeNode = types
  .model('SelectImageGalleryView', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: ElementId as any,
    type: types.literal('SelectImageGalleryView'),
    displayName: types.optional(types.string, 'Image Gallery'),
    minimized: types.optional(types.boolean, false),
    width: types.optional(types.number, 400),
    // Store the selected feature and images for this view
    selectedFeatureId: types.maybe(types.string),
    selectedFeatureType: types.optional(
      types.enumeration('FeatureType', ['GENE', 'NON_GENE']),
      'GENE',
    ),
    featureImages: types.optional(types.string, ''),
    featureLabels: types.optional(types.string, ''),
    featureTypes: types.optional(types.string, ''),
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

    // Update the feature and images displayed in this view
    updateFeature(
      featureId: string,
      featureType: 'GENE' | 'NON_GENE',
      images: string,
      labels?: string,
      types?: string,
    ) {
      // Validate input
      if (!featureId || !images) {
        return
      }

      // Parse comma-separated strings from GFF3 attributes (not JSON)
      const imageList = images
        ? images
            .split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0)
        : []
      const labelList = labels
        ? labels
            .split(',')
            .map(label => label.trim())
            .filter(label => label.length > 0)
        : []
      const typeList = types
        ? types
            .split(',')
            .map(type => type.trim())
            .filter(type => type.length > 0)
        : []

      // Use the utility function to deduplicate images
      const uniqueImages = deduplicateImages(imageList)

      // Get max items limit from configuration
      const session = getSession(self)
      const config = session.jbrowse.configuration
      const maxItems = Number(
        readConfObject(config, ['imageGallery', 'maxItems']) || 0,
      )
      const limitedImages =
        maxItems > 0 ? uniqueImages.slice(0, maxItems) : uniqueImages

      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType
      self.featureImages = limitedImages.join(',')
      self.featureLabels = labelList.join(',')
      self.featureTypes = typeList.join(',')
    },

    // Clear the current feature
    clearFeature() {
      // Set selectedFeatureId to undefined (types.maybe allows this)
      // Set content fields to empty strings (consistent with types.optional defaults)
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      self.featureImages = ''
      self.featureLabels = ''
      self.featureTypes = ''
    },

    // Update feature when it has no images but we still want to show it's selected
    updateFeatureWithoutImages(
      featureId: string,
      featureType: 'GENE' | 'NON_GENE',
    ) {
      // Validate input
      if (!featureId) {
        return
      }

      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType
      self.featureImages = '' // Explicitly empty to trigger hasContent = false
      self.featureLabels = ''
      self.featureTypes = ''
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
        readConfObject(this.config, ['imageGallery', 'defaultDisplayName']) ||
        'Image Gallery'
      )
    },

    get maxItems(): number {
      return Number(
        readConfObject(this.config, ['imageGallery', 'maxItems']) || 0,
      ) // 0 means unlimited
    },

    get imageSize() {
      return (
        readConfObject(this.config, ['imageGallery', 'imageSize']) || {
          width: 200,
          height: 150,
        }
      )
    },

    get gff3AttributeNames() {
      return (
        readConfObject(this.config, ['imageGallery', 'gff3AttributeNames']) || {
          images: 'images,image_urls,gallery_images',
          labels: 'image_labels,labels,descriptions',
          types: 'image_types,types,categories',
        }
      )
    },

    // unused by this view, but represents of 'view level' menu items
    menuItems(): MenuItem[] {
      return []
    },

    // Computed properties for easy access
    hasContent() {
      return self.featureImages.trim() !== ''
    },

    displayTitle() {
      const displayName = self.displayName || this.defaultDisplayName
      return self.selectedFeatureId
        ? `${displayName} for ${String(self.selectedFeatureId)}`
        : displayName
    },

    // Computed view that returns deduplicated images from the stored comma-separated strings
    deduplicatedImages(): string[] {
      if (self.featureImages.trim() === '') {
        return []
      }
      const imageList = self.featureImages
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0)
      const uniqueImages = deduplicateImages(imageList)

      // Apply max items limit from configuration
      const maxItems = this.maxItems
      return maxItems > 0 ? uniqueImages.slice(0, maxItems) : uniqueImages
    },

    // Example usage of pluginManager for potential future enhancements:
    // - Custom adapters for fetching image data: this.pluginManager?.getAdapterType('CustomImageAdapter')
    // - Plugin-defined configuration schemas: this.pluginManager?.getConfigurationSchema('imageGallery')
    // - Integration with other JBrowse 2 plugins: this.pluginManager?.getPlugin('SomeOtherPlugin')
    // - Custom renderers for image display: this.pluginManager?.getRendererType('CustomImageRenderer')
  }))

export type SelectImageGalleryViewModel = Instance<typeof stateModel>
export default stateModel
