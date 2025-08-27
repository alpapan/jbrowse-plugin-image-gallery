import Plugin from '@jbrowse/core/Plugin'
import PluginManager from '@jbrowse/core/PluginManager'
import ViewType from '@jbrowse/core/pluggableElementTypes/ViewType'
import { AbstractSessionModel, isAbstractMenuManager } from '@jbrowse/core/util'
import { autorun } from 'mobx'
import { version } from '../package.json'
import {
  ReactComponent as ImageGalleryViewReactComponent,
  stateModel as imageGalleryViewStateModel,
} from './ImageGalleryView'
import {
  ReactComponent as TextualDescriptionsViewReactComponent,
  stateModel as textualDescriptionsViewStateModel,
} from './TextualDescriptions'

// Import FeatureType enum for the updateFeature method call
enum FeatureType {
  GENE = 'GENE',
  NON_GENE = 'NON_GENE',
}

export default class ImageGalleryPlugin extends Plugin {
  name = 'ImageGalleryPlugin'
  version = version
  private manuallyClosedViews = new Set<string>()
  private lastSelectedFeatureId: string | undefined = undefined

  install(pluginManager: PluginManager) {
    // Register ImageGalleryView
    pluginManager.addViewType(() => {
      return new ViewType({
        name: 'ImageGalleryView',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stateModel: imageGalleryViewStateModel as any,
        ReactComponent: ImageGalleryViewReactComponent,
      })
    })

    // Register TextualDescriptionsView
    pluginManager.addViewType(() => {
      return new ViewType({
        name: 'TextualDescriptionsView',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stateModel: textualDescriptionsViewStateModel as any,
        ReactComponent: TextualDescriptionsViewReactComponent,
      })
    })

    // autorun to manage both view types based on feature selection
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-console
      autorun(() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const session: any = pluginManager.rootModel?.session

          const sel = session?.selection
          let featureSummary = undefined
          let selectedFeature = undefined
          if (sel) {
            // try common shapes
            const f = sel.feature ?? sel
            selectedFeature = f
            if (f && typeof f.get === 'function') {
              // Collect images from the main feature and all subfeatures
              const aggregatedImageData =
                this.collectImagesFromFeatureAndSubfeatures(f)

              // Collect textual content from the main feature and all subfeatures
              const aggregatedTextualData =
                this.collectTextualContentFromFeatureAndSubfeatures(f)

              featureSummary = {
                id: f.get('id'),
                type: f.get('type'), // Add type property for FeatureType determination
                images: aggregatedImageData.images,
                image_group: aggregatedImageData.labels,
                image_tag: aggregatedImageData.types,
                markdown_urls: aggregatedTextualData.markdownUrls,
                descriptions: aggregatedTextualData.descriptions,
                content_type: aggregatedTextualData.contentTypes,
              }
            } else {
              featureSummary = String(f)
            }
          }

          // Handle ImageGallery view for features with images
          if (
            featureSummary &&
            typeof featureSummary === 'object' &&
            featureSummary.images &&
            featureSummary.images !== 'none' &&
            selectedFeature
          ) {
            this.manageImageGalleryView(session, featureSummary)
          } else {
            this.clearImageGalleryView(session)
          }

          // Handle TextualDescriptions view for features with textual content
          if (
            featureSummary &&
            typeof featureSummary === 'object' &&
            featureSummary.markdown_urls &&
            featureSummary.markdown_urls !== 'none' &&
            selectedFeature
          ) {
            this.manageTextualDescriptionsView(session, featureSummary)
          } else {
            this.clearTextualDescriptionsView(session)
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug('Error in autorun logging', e)
        }
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('Failed to set autorun for selection logging', e)
    }
  }

  configure(pluginManager: PluginManager) {
    if (isAbstractMenuManager(pluginManager.rootModel)) {
      pluginManager.rootModel.appendToMenu('Add', {
        label: 'Image Gallery View',
        onClick: (session: AbstractSessionModel) => {
          session.addView('ImageGalleryView', {})
        },
      })

      pluginManager.rootModel.appendToMenu('Add', {
        label: 'Textual Descriptions View',
        onClick: (session: AbstractSessionModel) => {
          session.addView('TextualDescriptionsView', {})
        },
      })
    }
  }

  // Method to manage ImageGalleryView
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private manageImageGalleryView(session: any, featureSummary: any) {
    try {
      const viewId = 'imageGalleryView'
      const featureKey = `${viewId}-${featureSummary.id}`

      // Clear manually closed flag when selection changes to different feature
      if (this.lastSelectedFeatureId !== featureSummary.id) {
        this.manuallyClosedViews.clear()
        this.lastSelectedFeatureId = featureSummary.id
      }

      // Don't recreate view if user manually closed it for this feature
      if (this.manuallyClosedViews.has(featureKey)) {
        return
      }

      // Check if ImageGalleryView already exists
      let imageGalleryView = session?.views
        ? session.views.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (view: any) =>
              view.type === 'ImageGalleryView' && view.id === viewId,
          )
        : null

      if (!imageGalleryView && session?.addView) {
        // Create new ImageGalleryView if it doesn't exist
        try {
          imageGalleryView = session.addView('ImageGalleryView', {
            id: viewId,
            displayName: 'Image Gallery',
          })
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to create ImageGalleryView:', e)
        }
      }

      // Update the view with the current feature data
      if (imageGalleryView?.updateFeature) {
        // Convert images array to comma-separated string if needed
        const imagesString = Array.isArray(featureSummary.images)
          ? featureSummary.images.join(',')
          : featureSummary.images
        const labelsString = Array.isArray(featureSummary.image_group)
          ? featureSummary.image_group.join(',')
          : featureSummary.image_group
        const typesString = Array.isArray(featureSummary.image_tag)
          ? featureSummary.image_tag.join(',')
          : featureSummary.image_tag

        imageGalleryView.updateFeature(
          featureSummary.id || 'unknown',
          // Add the missing featureType parameter based on feature type
          featureSummary.type === 'gene'
            ? FeatureType.GENE
            : FeatureType.NON_GENE,
          imagesString,
          labelsString,
          typesString,
        )
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('Error managing ImageGalleryView:', e)
    }
  }

  // Method to manage TextualDescriptionsView
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private manageTextualDescriptionsView(session: any, featureSummary: any) {
    try {
      const viewId = 'textualDescriptionsView'
      const featureKey = `${viewId}-${featureSummary.id}`

      // Don't recreate view if user manually closed it for this feature
      if (this.manuallyClosedViews.has(featureKey)) {
        return
      }

      // Check if TextualDescriptionsView already exists
      let textualDescriptionsView = session?.views
        ? session.views.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (view: any) =>
              view.type === 'TextualDescriptionsView' && view.id === viewId,
          )
        : null

      if (!textualDescriptionsView && session?.addView) {
        // Create new TextualDescriptionsView if it doesn't exist
        try {
          textualDescriptionsView = session.addView('TextualDescriptionsView', {
            id: viewId,
            displayName: 'Textual Descriptions',
          })
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to create TextualDescriptionsView:', e)
        }
      }

      // Update the view with the current feature data
      if (textualDescriptionsView?.updateFeature) {
        // Convert arrays to comma-separated strings if needed
        const markdownUrlsString = Array.isArray(featureSummary.markdown_urls)
          ? featureSummary.markdown_urls.join(',')
          : featureSummary.markdown_urls
        const descriptionsString = Array.isArray(featureSummary.descriptions)
          ? featureSummary.descriptions.join(',')
          : featureSummary.descriptions
        const contentTypesString = Array.isArray(featureSummary.content_type)
          ? featureSummary.content_type.join(',')
          : featureSummary.content_type

        textualDescriptionsView.updateFeature(
          featureSummary.id || 'unknown',
          featureSummary.type === 'gene'
            ? FeatureType.GENE
            : FeatureType.NON_GENE,
          markdownUrlsString,
          descriptionsString,
          contentTypesString,
        )
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('Error managing TextualDescriptionsView:', e)
    }
  }

  // Method to clear ImageGalleryView
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private clearImageGalleryView(session: any) {
    try {
      const viewId = 'imageGalleryView'
      if (session?.views) {
        const imageGalleryView = session.views.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (view: any) => view.type === 'ImageGalleryView' && view.id === viewId,
        )
        if (imageGalleryView?.clearFeature) {
          imageGalleryView.clearFeature()
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('Error clearing ImageGalleryView:', e)
    }
  }

  // Method to clear TextualDescriptionsView
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private clearTextualDescriptionsView(session: any) {
    try {
      const viewId = 'textualDescriptionsView'
      if (session?.views) {
        const textualDescriptionsView = session.views.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (view: any) =>
            view.type === 'TextualDescriptionsView' && view.id === viewId,
        )
        if (textualDescriptionsView?.clearFeature) {
          textualDescriptionsView.clearFeature()
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('Error clearing TextualDescriptionsView:', e)
    }
  }

  // Method to collect textual content from a feature and all its subfeatures
  private collectTextualContentFromFeatureAndSubfeatures(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    feature: any,
  ): {
    markdownUrls: string
    descriptions: string
    contentTypes: string
  } {
    const allMarkdownUrls: string[] = []
    const allDescriptions: string[] = []
    const allContentTypes: string[] = []

    // Helper function to extract textual data from a feature
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractTextualData = (f: any) => {
      if (!f || typeof f.get !== 'function') return

      const markdownUrls = f.get('markdown_urls') || f.get('markdown_url')
      const descriptions = f.get('descriptions') || f.get('description')
      const contentTypes = f.get('content_type') || f.get('content_types')

      if (markdownUrls && markdownUrls !== 'none') {
        let urlList: string[] = []
        let descriptionList: string[] = []
        let typeList: string[] = []

        // Handle both array and string formats from JBrowse
        if (Array.isArray(markdownUrls)) {
          urlList = markdownUrls
            .map((url: string) => url.trim())
            .filter((url: string) => url.length > 0)
        } else if (
          typeof markdownUrls === 'string' &&
          markdownUrls.trim() !== ''
        ) {
          urlList = markdownUrls
            .split(',')
            .map((url: string) => url.trim())
            .filter((url: string) => url.length > 0)
        }

        if (descriptions) {
          if (Array.isArray(descriptions)) {
            descriptionList = descriptions
              .map((desc: string) => desc.trim())
              .filter((desc: string) => desc.length > 0)
          } else if (
            typeof descriptions === 'string' &&
            descriptions.trim() !== ''
          ) {
            descriptionList = descriptions
              .split(',')
              .map((desc: string) => desc.trim())
              .filter((desc: string) => desc.length > 0)
          }
        }

        if (contentTypes) {
          if (Array.isArray(contentTypes)) {
            typeList = contentTypes
              .map((type: string) => type.trim())
              .filter((type: string) => type.length > 0)
          } else if (
            typeof contentTypes === 'string' &&
            contentTypes.trim() !== ''
          ) {
            typeList = contentTypes
              .split(',')
              .map((type: string) => type.trim())
              .filter((type: string) => type.length > 0)
          }
        }

        // Only proceed if we have markdown URLs
        if (urlList.length > 0) {
          // Add to collections
          allMarkdownUrls.push(...urlList)

          // Use actual descriptions if available, otherwise use 'no description'
          if (
            descriptionList.length > 0 &&
            descriptionList.length === urlList.length
          ) {
            allDescriptions.push(...descriptionList)
          } else if (descriptionList.length > 0) {
            // If we have some descriptions but count mismatch, repeat the first description
            allDescriptions.push(
              ...urlList.map(() => descriptionList[0] || 'no description'),
            )
          } else {
            allDescriptions.push(...urlList.map(() => 'no description'))
          }

          // Use actual types if available, otherwise use 'markdown'
          if (typeList.length > 0 && typeList.length === urlList.length) {
            allContentTypes.push(...typeList)
          } else if (typeList.length > 0) {
            // If we have some types but count mismatch, repeat the first type
            allContentTypes.push(
              ...urlList.map(() => typeList[0] || 'markdown'),
            )
          } else {
            allContentTypes.push(...urlList.map(() => 'markdown'))
          }
        }
      }
    }

    // Extract from main feature
    extractTextualData(feature)

    // Extract from subfeatures if they exist
    try {
      if (feature.get && typeof feature.get === 'function') {
        // Try to get subfeatures - JBrowse features might have children/subfeatures
        const subfeatures =
          feature.get('subfeatures') || feature.get('children') || []
        if (Array.isArray(subfeatures)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          subfeatures.forEach((subfeature: any) => {
            extractTextualData(subfeature)
          })
        }

        // Also try to get nested features through other possible accessor patterns
        if (feature.children && typeof feature.children === 'function') {
          const children = feature.children()
          if (Array.isArray(children)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            children.forEach((child: any) => {
              extractTextualData(child)
            })
          }
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('Error accessing subfeatures for textual content:', e)
    }

    // Deduplicate content by URL while preserving order
    const uniqueMarkdownUrls: string[] = []
    const uniqueDescriptions: string[] = []
    const uniqueContentTypes: string[] = []
    const seenUrls = new Set<string>()

    for (let i = 0; i < allMarkdownUrls.length; i++) {
      const url = allMarkdownUrls[i]
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url)
        uniqueMarkdownUrls.push(url)
        uniqueDescriptions.push(allDescriptions[i] || 'no description')
        uniqueContentTypes.push(allContentTypes[i] || 'markdown')
      }
    }

    return {
      markdownUrls: uniqueMarkdownUrls.join(','),
      descriptions: uniqueDescriptions.join(','),
      contentTypes: uniqueContentTypes.join(','),
    }
  }

  // Method to collect images from a feature and all its subfeatures
  private collectImagesFromFeatureAndSubfeatures(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    feature: any,
  ): {
    images: string
    labels: string
    types: string
  } {
    const allImageUrls: string[] = []
    const allLabels: string[] = []
    const allTypes: string[] = []

    // Helper function to extract image data from a feature
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractImageData = (f: any) => {
      if (!f || typeof f.get !== 'function') return

      const images = f.get('image') || f.get('images')
      const labels = f.get('image_group')
      const types = f.get('image_tag')

      if (images && images !== 'none') {
        let imageList: string[] = []
        let labelList: string[] = []
        let typeList: string[] = []

        // Handle both array and string formats from JBrowse
        if (Array.isArray(images)) {
          imageList = images
            .map((url: string) => url.trim())
            .filter((url: string) => url.length > 0)
        } else if (typeof images === 'string' && images.trim() !== '') {
          imageList = images
            .split(',')
            .map((url: string) => url.trim())
            .filter((url: string) => url.length > 0)
        }

        if (labels) {
          if (Array.isArray(labels)) {
            labelList = labels
              .map((label: string) => label.trim())
              .filter((label: string) => label.length > 0)
          } else if (typeof labels === 'string' && labels.trim() !== '') {
            labelList = labels
              .split(',')
              .map((label: string) => label.trim())
              .filter((label: string) => label.length > 0)
          }
        }

        if (types) {
          if (Array.isArray(types)) {
            typeList = types
              .map((type: string) => type.trim())
              .filter((type: string) => type.length > 0)
          } else if (typeof types === 'string' && types.trim() !== '') {
            typeList = types
              .split(',')
              .map((type: string) => type.trim())
              .filter((type: string) => type.length > 0)
          }
        }

        // Only proceed if we have images
        if (imageList.length > 0) {
          // Add to collections
          allImageUrls.push(...imageList)

          // Use actual labels if available, otherwise use 'unlabeled'
          if (labelList.length > 0 && labelList.length === imageList.length) {
            allLabels.push(...labelList)
          } else if (labelList.length > 0) {
            // If we have some labels but count mismatch, repeat the first label
            allLabels.push(...imageList.map(() => labelList[0] || 'unlabeled'))
          } else {
            allLabels.push(...imageList.map(() => 'unlabeled'))
          }

          // Use actual types if available, otherwise use 'unknown'
          if (typeList.length > 0 && typeList.length === imageList.length) {
            allTypes.push(...typeList)
          } else if (typeList.length > 0) {
            // If we have some types but count mismatch, repeat the first type
            allTypes.push(...imageList.map(() => typeList[0] || 'unknown'))
          } else {
            allTypes.push(...imageList.map(() => 'unknown'))
          }
        }
      }
    }

    // Extract from main feature
    extractImageData(feature)

    // Extract from subfeatures if they exist
    try {
      if (feature.get && typeof feature.get === 'function') {
        // Try to get subfeatures - JBrowse features might have children/subfeatures
        const subfeatures =
          feature.get('subfeatures') || feature.get('children') || []
        if (Array.isArray(subfeatures)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          subfeatures.forEach((subfeature: any) => {
            extractImageData(subfeature)
          })
        }

        // Also try to get nested features through other possible accessor patterns
        if (feature.children && typeof feature.children === 'function') {
          const children = feature.children()
          if (Array.isArray(children)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            children.forEach((child: any) => {
              extractImageData(child)
            })
          }
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('Error accessing subfeatures:', e)
    }

    // Deduplicate images by URL while preserving order
    const uniqueImages: string[] = []
    const uniqueLabels: string[] = []
    const uniqueTypes: string[] = []
    const seenUrls = new Set<string>()

    for (let i = 0; i < allImageUrls.length; i++) {
      const url = allImageUrls[i]
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url)
        uniqueImages.push(url)
        uniqueLabels.push(allLabels[i] || 'unlabeled')
        uniqueTypes.push(allTypes[i] || 'unknown')
      }
    }

    return {
      images: uniqueImages.join(','),
      labels: uniqueLabels.join(','),
      types: uniqueTypes.join(','),
    }
  }
}
