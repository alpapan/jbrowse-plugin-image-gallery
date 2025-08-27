import { MenuItem } from '@jbrowse/core/ui'
import { ElementId } from '@jbrowse/core/util/types/mst'
import { types } from 'mobx-state-tree'

enum FeatureType {
  GENE = 'GENE',
  NON_GENE = 'NON_GENE',
}

export class TextualDescriptionsState {
  selectedFeatureId?: string
  selectedFeatureType: FeatureType = FeatureType.NON_GENE
  featureMarkdownUrls = ''
  featureDescriptions = ''
  featureContentTypes = ''

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

const stateModel = types
  .model({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: ElementId as any,
    type: types.literal('TextualDescriptionsView'),
    displayName: types.optional(types.string, 'Text Descriptions'),
    minimized: types.optional(types.boolean, false),
    // Store the selected feature and content for this view
    selectedFeatureId: types.maybe(types.string),
    selectedFeatureType: types.optional(types.string, 'GENE'),
    featureMarkdownUrls: types.maybe(types.string),
    featureDescriptions: types.maybe(types.string),
    featureContentTypes: types.maybe(types.string),
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

    // Update the feature and content displayed in this view
    updateFeature(
      featureId: string,
      featureType: FeatureType,
      markdownUrls: string,
      descriptions?: string,
      contentTypes?: string,
    ) {
      // Validate input
      if (!featureId || !markdownUrls) {
        console.error('Invalid feature data')
        return
      }

      // Parse comma-separated strings from GFF3 attributes (not JSON)
      const urlList = markdownUrls
        ? markdownUrls
            .split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0)
        : []
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
      const uniqueContent = new TextualDescriptionsState().deduplicateContent(
        urlList,
      )

      self.selectedFeatureId = featureId
      self.selectedFeatureType = featureType.toString()
      self.featureMarkdownUrls = uniqueContent.join(',')
      self.featureDescriptions = descriptionList.join(',')
      self.featureContentTypes = typeList.join(',')
    },

    // Clear the current feature
    clearFeature() {
      self.selectedFeatureId = undefined
      self.selectedFeatureType = 'GENE'
      self.featureMarkdownUrls = undefined
      self.featureDescriptions = undefined
      self.featureContentTypes = undefined
    },
  }))
  .views(self => ({
    // unused by this view, but represents of 'view level' menu items
    menuItems(): MenuItem[] {
      return []
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
        : self.displayName
    },
  }))

export default stateModel
export { FeatureType }
