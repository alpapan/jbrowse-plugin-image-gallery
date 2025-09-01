import Plugin from '@jbrowse/core/Plugin'
import PluginManager from '@jbrowse/core/PluginManager'
import ViewType from '@jbrowse/core/pluggableElementTypes/ViewType'
import { AbstractSessionModel, isAbstractMenuManager } from '@jbrowse/core/util'
import { autorun } from 'mobx'
import { version } from '../package.json'
import {
  ReactComponent as SelectImageGalleryViewReactComponent,
  stateModel as selectImageGalleryViewStateModel,
} from './SelectImageGalleryView'
import {
  ReactComponent as SelectTextualDescriptionsViewReactComponent,
  stateModel as selectTextualDescriptionsViewStateModel,
} from './SelectTextualDescriptionsView'
import {
  ReactComponent as FlexibleTextualDescriptionsViewReactComponent,
  stateModel as flexibleTextualDescriptionsViewStateModel,
} from './FlexibleTextualDescriptionsView'
import {
  ReactComponent as FlexibleImageGalleryViewReactComponent,
  stateModel as flexibleImageGalleryViewStateModel,
} from './FlexibleImageGalleryView'

// Enum for the updateFeature method call
enum FeatureType {
  GENE = 'GENE',
  NON_GENE = 'NON_GENE',
}

// Interface for feature summary data
interface FeatureSummary {
  id: string
  type?: string
  images: string
  labels: string
  types: string
  markdownUrls: string
  descriptions: string
  contentTypes: string
}

// Interface for JBrowse2 Feature-like objects
interface JBrowseFeature {
  get(key: string): unknown
  subfeatures?: () => JBrowseFeature[]
  children?: () => JBrowseFeature[]
}

// Interface for SelectImageGalleryView with its specific methods
interface SelectImageGalleryView extends Record<string, unknown> {
  id: string
  type: string
  updateFeature?: (
    id: string,
    type: FeatureType,
    images: string,
    labels: string,
    types: string,
  ) => void
  updateFeatureWithoutImages?: (id: string, type: FeatureType) => void
  clearFeature?: () => void
}

// Interface for SelectTextualDescriptionsView with its specific methods
interface SelectTextualDescriptionsView extends Record<string, unknown> {
  id: string
  type: string
  updateFeature?: (
    id: string,
    type: FeatureType,
    markdownUrls: string,
    descriptions: string,
    contentTypes: string,
  ) => void
  clearFeature?: () => void
}

// Interface for rootModel with session property
interface RootModelWithSession {
  session?: AbstractSessionModel
}

export default class RichAnnotationsPlugin extends Plugin {
  name = 'RichAnnotationsPlugin'
  version = version
  private manuallyClosedViews = new Set<string>()
  private lastSelectedFeatureId: string | undefined = undefined

  install(pluginManager: PluginManager) {
    // Register SelectImageGalleryView
    pluginManager.addViewType(() => {
      return new ViewType({
        name: 'SelectImageGalleryView',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stateModel: selectImageGalleryViewStateModel as any,
        ReactComponent: SelectImageGalleryViewReactComponent,
      })
    })

    // Register SelectTextualDescriptionsView
    pluginManager.addViewType(() => {
      return new ViewType({
        name: 'SelectTextualDescriptionsView',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stateModel: selectTextualDescriptionsViewStateModel as any,
        ReactComponent: SelectTextualDescriptionsViewReactComponent,
      })
    })

    // Register FlexibleTextualDescriptionsView
    pluginManager.addViewType(() => {
      return new ViewType({
        name: 'FlexibleTextualDescriptionsView',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stateModel: flexibleTextualDescriptionsViewStateModel as any,
        ReactComponent: FlexibleTextualDescriptionsViewReactComponent,
      })
    })

    // Register FlexibleImageGalleryView
    pluginManager.addViewType(() => {
      return new ViewType({
        name: 'FlexibleImageGalleryView',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stateModel: flexibleImageGalleryViewStateModel as any,
        ReactComponent: FlexibleImageGalleryViewReactComponent,
      })
    })
  }

  configure(pluginManager: PluginManager) {
    if (isAbstractMenuManager(pluginManager.rootModel)) {
      pluginManager.rootModel.appendToMenu('Add', {
        label: 'Image gallery: select a feature',
        onClick: (session: AbstractSessionModel) => {
          session.addView('SelectImageGalleryView', {
            id: 'selectImageGalleryView',
            displayName: 'Image gallery: select a feature',
          })
        },
      })

      pluginManager.rootModel.appendToMenu('Add', {
        label: 'Image gallery: search for a feature',
        onClick: (session: AbstractSessionModel) => {
          session.addView('FlexibleImageGalleryView', {
            id: 'flexibleImageGalleryView',
            displayName: 'Image gallery: select a feature',
          })
        },
      })

      pluginManager.rootModel.appendToMenu('Add', {
        label: 'Text info: select a feature',
        onClick: (session: AbstractSessionModel) => {
          session.addView('SelectTextualDescriptionsView', {
            id: 'selectTextualDescriptionsView',
            displayName: 'Text info: select a feature',
          })
        },
      })

      pluginManager.rootModel.appendToMenu('Add', {
        label: 'Text info: search for a feature',
        onClick: (session: AbstractSessionModel) => {
          session.addView('FlexibleTextualDescriptionsView', {
            id: 'flexibleTextualDescriptionsView',
            displayName: 'Text info: search for a feature',
          })
        },
      })
    }

    // autorun to manage both view types based on feature selection
    // Set up in configure() where session is available
    try {
      autorun(() => {
        try {
          // Access session through the rootModel properly
          const rootModel = pluginManager.rootModel as RootModelWithSession
          const session: AbstractSessionModel | undefined = rootModel?.session

          if (!session) {
            // No session available yet, skip processing
            return
          }

          const sel = session?.selection
          let featureSummary = undefined
          let selectedFeature = undefined
          if (sel) {
            // try common shapes
            const f = (sel as unknown as Record<string, unknown>).feature ?? sel
            selectedFeature = f as unknown as JBrowseFeature
            const feature = f as unknown as JBrowseFeature
            if (feature && typeof feature.get === 'function') {
              // Collect images from the main feature and all subfeatures
              const aggregatedImageData =
                this.collectImagesFromFeatureAndSubfeatures(feature)

              // Collect textual content from the main feature and all subfeatures
              const aggregatedTextualData =
                this.collectTextualContentFromFeatureAndSubfeatures(feature)

              featureSummary = {
                id: String(feature.get('id') ?? ''),
                type: String(feature.get('type') ?? ''), // Add type property for FeatureType determination
                images: aggregatedImageData.images,
                labels: aggregatedImageData.labels,
                types: aggregatedImageData.types,
                markdownUrls: aggregatedTextualData.markdownUrls,
                descriptions: aggregatedTextualData.descriptions,
                contentTypes: aggregatedTextualData.contentTypes,
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
            featureSummary.images.trim() !== '' &&
            selectedFeature &&
            featureSummary.id
          ) {
            this.manageSelectImageGalleryView(session, featureSummary)
          } else if (
            featureSummary &&
            typeof featureSummary === 'object' &&
            selectedFeature &&
            featureSummary.id
          ) {
            // Feature selected but no images - update view to show selected feature without images
            this.manageSelectImageGalleryViewWithoutImages(
              session,
              featureSummary,
            )
          } else {
            // Clear view for all other cases: no selection, invalid data, etc.
            this.clearSelectImageGalleryView(session)
          }

          // Handle TextualDescriptionsView view for features with textual content
          if (
            featureSummary &&
            typeof featureSummary === 'object' &&
            selectedFeature &&
            featureSummary.id
          ) {
            this.manageSelectTextualDescriptionsView(session, featureSummary)
          } else {
            // Clear view for all other cases: no selection, invalid data, etc.
            this.clearSelectTextualDescriptionsView(session)
          }
        } catch (e) {
          console.error(
            'RichAnnotationsPlugin: Error in autorun feature selection handler:',
            e,
          )
        }
      })
    } catch (e) {
      console.error(
        'RichAnnotationsPlugin: Failed to set up autorun for feature selection handling:',
        e,
      )
    }
  }

  // Method to manage SelectImageGalleryView
  private manageSelectImageGalleryView(
    session: AbstractSessionModel,
    featureSummary: FeatureSummary,
  ) {
    try {
      const viewId = 'selectImageGalleryView'
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

      // Check if SelectImageGalleryView already exists - do NOT create new ones automatically
      const selectImageGalleryView = session?.views
        ? (session.views.find(
            view =>
              view.type === 'SelectImageGalleryView' && view.id === viewId,
          ) as unknown as SelectImageGalleryView)
        : null

      // Only update existing views, don't create new ones
      // Views should only be created when user explicitly adds them via menu
      if (
        selectImageGalleryView?.updateFeature &&
        featureSummary.id &&
        featureSummary.images
      ) {
        // Convert images array to comma-separated string if needed
        const imagesString = Array.isArray(featureSummary.images)
          ? featureSummary.images.join(',')
          : featureSummary.images
        const labelsString = Array.isArray(featureSummary.labels)
          ? featureSummary.labels.join(',')
          : featureSummary.labels
        const typesString = Array.isArray(featureSummary.types)
          ? featureSummary.types.join(',')
          : featureSummary.types

        // Validate that we still have the same feature (prevent race conditions)
        if (this.lastSelectedFeatureId === featureSummary.id) {
          selectImageGalleryView.updateFeature(
            featureSummary.id,
            featureSummary.type === 'gene'
              ? FeatureType.GENE
              : FeatureType.NON_GENE,
            imagesString,
            labelsString,
            typesString,
          )
        }
      }
    } catch (e) {
      console.error(
        'RichAnnotationsPlugin: Error managing SelectImageGalleryView for feature',
        featureSummary.id,
        ':',
        e,
      )
    }
  }

  // Method to manage SelectImageGalleryView for features without images
  private manageSelectImageGalleryViewWithoutImages(
    session: AbstractSessionModel,
    featureSummary: FeatureSummary,
  ) {
    try {
      const viewId = 'selectImageGalleryView'

      // Check if SelectImageGalleryView already exists - do NOT create new ones automatically
      const selectImageGalleryView = session?.views
        ? (session.views.find(
            view =>
              view.type === 'SelectImageGalleryView' && view.id === viewId,
          ) as unknown as SelectImageGalleryView)
        : null

      // Only update existing views, don't create new ones for features without images
      // Views should only be created when user explicitly adds them via menu
      if (
        selectImageGalleryView?.updateFeatureWithoutImages &&
        featureSummary.id
      ) {
        selectImageGalleryView.updateFeatureWithoutImages(
          featureSummary.id,
          featureSummary.type === 'gene'
            ? FeatureType.GENE
            : FeatureType.NON_GENE,
        )
      }
    } catch (e) {
      console.error(
        'RichAnnotationsPlugin: Error managing SelectImageGalleryView for feature without images',
        featureSummary.id,
        ':',
        e,
      )
    }
  }

  // Method to manage SelectTextualDescriptionsView
  private manageSelectTextualDescriptionsView(
    session: AbstractSessionModel,
    featureSummary: FeatureSummary,
  ) {
    try {
      const viewId = 'selectTextualDescriptionsView'
      const featureKey = `${viewId}-${featureSummary.id}`

      // Don't recreate view if user manually closed it for this feature
      if (this.manuallyClosedViews.has(featureKey)) {
        return
      }

      // Check if SelectTextualDescriptionsView already exists - do NOT create new ones automatically
      const selectTextualDescriptionsView = session?.views
        ? (session.views.find(
            view =>
              view.type === 'SelectTextualDescriptionsView' &&
              view.id === viewId,
          ) as unknown as SelectTextualDescriptionsView)
        : null

      // Only update existing views, don't create new ones
      // Views should only be created when user explicitly adds them via menu
      if (selectTextualDescriptionsView?.updateFeature) {
        // Convert arrays to comma-separated strings if needed
        const markdownUrlsString: string = Array.isArray(
          featureSummary.markdownUrls,
        )
          ? featureSummary.markdownUrls.join(',')
          : String(featureSummary.markdownUrls || '') // Default to empty string if undefined
        const descriptionsString: string = Array.isArray(
          featureSummary.descriptions,
        )
          ? featureSummary.descriptions.join(',')
          : String(featureSummary.descriptions || '') // Default to empty string if undefined
        const contentTypesString: string = Array.isArray(
          featureSummary.contentTypes,
        )
          ? featureSummary.contentTypes.join(',')
          : String(featureSummary.contentTypes || '') // Default to empty string if undefined

        selectTextualDescriptionsView.updateFeature(
          featureSummary.id || 'unknown',
          featureSummary.type
            ? featureSummary.type === 'gene'
              ? FeatureType.GENE
              : FeatureType.NON_GENE
            : FeatureType.GENE,
          markdownUrlsString,
          descriptionsString,
          contentTypesString,
        )
      }
    } catch (e) {
      console.error(
        'RichAnnotationsPlugin: Error managing SelectTextualDescriptionsView for feature',
        featureSummary.id,
        ':',
        e,
      )
    }
  }

  // Method to clear SelectImageGalleryView
  private clearSelectImageGalleryView(session: AbstractSessionModel) {
    try {
      const viewId = 'selectImageGalleryView'
      if (session?.views) {
        const selectImageGalleryView = session.views.find(
          view => view.type === 'SelectImageGalleryView' && view.id === viewId,
        ) as unknown as SelectImageGalleryView
        // Atomic clear: Only clear if view exists and has clearFeature method
        if (selectImageGalleryView?.clearFeature) {
          // Reset last selected feature to ensure clean state
          this.lastSelectedFeatureId = undefined
          selectImageGalleryView.clearFeature()
        }
      }
    } catch (e) {
      console.error(
        'RichAnnotationsPlugin: Error clearing SelectImageGalleryView:',
        e,
      )
    }
  }

  // Method to clear SelectTextualDescriptionsView
  private clearSelectTextualDescriptionsView(session: AbstractSessionModel) {
    try {
      const viewId = 'selectTextualDescriptionsView'
      if (session?.views) {
        const selectTextualDescriptionsView = session.views.find(
          view =>
            view.type === 'SelectTextualDescriptionsView' && view.id === viewId,
        ) as unknown as SelectTextualDescriptionsView
        if (selectTextualDescriptionsView?.clearFeature) {
          selectTextualDescriptionsView.clearFeature()
        }
      }
    } catch (e) {
      console.error(
        'RichAnnotationsPlugin: Error clearing SelectTextualDescriptionsView:',
        e,
      )
    }
  }

  // Method to collect textual content from a feature and all its subfeatures
  private collectTextualContentFromFeatureAndSubfeatures(
    feature: JBrowseFeature,
  ): {
    markdownUrls: string
    descriptions: string
    contentTypes: string
  } {
    const allMarkdownUrls: string[] = []
    const allDescriptions: string[] = []
    const allContentTypes: string[] = []

    // Helper function to extract textual data from a feature
    const extractTextualData = (f: JBrowseFeature) => {
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
          subfeatures.forEach((subfeature: JBrowseFeature) => {
            extractTextualData(subfeature)
          })
        }

        const children = feature.children?.()
        if (Array.isArray(children)) {
          children.forEach((child: JBrowseFeature) => {
            extractTextualData(child)
          })
        }
      }
    } catch (e) {
      console.error(
        'RichAnnotationsPlugin: Error accessing subfeatures for textual content collection:',
        e,
      )
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
  private collectImagesFromFeatureAndSubfeatures(feature: JBrowseFeature): {
    images: string
    labels: string
    types: string
  } {
    const allImageUrls: string[] = []
    const allLabels: string[] = []
    const allTypes: string[] = []

    // Helper function to extract image data from a feature
    const extractImageData = (f: JBrowseFeature) => {
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
          subfeatures.forEach((subfeature: JBrowseFeature) => {
            extractImageData(subfeature)
          })
        }

        const children = feature.children?.()
        if (Array.isArray(children)) {
          if (Array.isArray(children)) {
            children.forEach((child: JBrowseFeature) => {
              extractImageData(child)
            })
          }
        }
      }
    } catch (e) {
      console.error(
        'RichAnnotationsPlugin: Error accessing subfeatures for image data collection:',
        e,
      )
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
