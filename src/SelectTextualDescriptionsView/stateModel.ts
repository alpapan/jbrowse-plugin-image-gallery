import { types, Instance, IAnyStateTreeNode } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject } from '@jbrowse/core/configuration'
import BaseViewStateModel, {
  deduplicateContent,
} from '../shared/BaseViewStateModel'

const stateModel: IAnyStateTreeNode = BaseViewStateModel.props({
  type: types.literal('SelectTextualDescriptionsView'),
  // View-specific properties
  featureMarkdownUrls: types.optional(types.string, ''),
  featureDescriptions: types.optional(types.string, ''),
  featureContentTypes: types.optional(types.string, ''),
})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .actions((self: any) => ({
    // Override updateFeature with textual descriptions specific logic
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
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0)

        const descriptionList = descriptions
          ? descriptions
              .split(',')
              .map((desc: string) => desc.trim())
              .filter((desc: string) => desc.length > 0)
          : []
        const typeList = contentTypes
          ? contentTypes
              .split(',')
              .map((type: string) => type.trim())
              .filter((type: string) => type.length > 0)
          : []

        // Use the utility function to deduplicate content
        const uniqueContent = deduplicateContent(urlList)

        // Get max items limit from configuration
        const session = getSession(self as IAnyStateTreeNode)
        const config = session.jbrowse.configuration
        const maxItems = Number(
          readConfObject(config, ['selectTextualDescriptions', 'maxItems']) ||
            0,
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

    // Override clearFeature with specific field clearing
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .views((self: any) => ({
    // Override default display name
    get defaultDisplayName() {
      return (
        readConfObject(self.config, [
          'selectTextualDescriptions',
          'defaultDisplayName',
        ]) || 'Text Descriptions'
      )
    },

    get maxItems(): number {
      return Number(
        readConfObject(self.config, [
          'selectTextualDescriptions',
          'maxItems',
        ]) || 0,
      ) // 0 means unlimited
    },

    get gff3AttributeNames() {
      return (
        readConfObject(self.config, [
          'selectTextualDescriptions',
          'gff3AttributeNames',
        ]) || {
          markdownUrls: 'markdown_urls,text_content,descriptions',
          descriptions: 'content_descriptions,labels,summaries',
          types: 'content_types,text_types,categories',
        }
      )
    },

    // Override hasContent for textual content
    hasContent() {
      return self.featureMarkdownUrls.trim() !== ''
    },

    // Computed view that returns deduplicated content from the stored comma-separated strings
    deduplicatedMarkdownUrls(): string[] {
      if (self.featureMarkdownUrls.trim() === '') {
        return []
      }
      const urlList = self.featureMarkdownUrls
        .split(',')
        .map((url: string) => url.trim())
        .filter((url: string) => url.length > 0)
      const uniqueContent = deduplicateContent(urlList as string[])

      // Apply max items limit from configuration
      const maxItems = Number(self.maxItems) || 0
      return maxItems > 0 ? uniqueContent.slice(0, maxItems) : uniqueContent
    },
  }))

export type SelectTextualDescriptionsViewModel = Instance<typeof stateModel>
export default stateModel
