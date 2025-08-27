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
    pluginManager.addViewType(() => {
      return new ViewType({
        name: 'ImageGalleryView',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stateModel: imageGalleryViewStateModel as any,
        ReactComponent: ImageGalleryViewReactComponent,
      })
    })

    // autorun to log session selection changes (prints both to browser console and to server)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-console
      autorun(() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const session: any = pluginManager.rootModel?.session

          // eslint-disable-next-line no-console
          // console.debug('Session debug:', {
          //   hasRootModel: !!pluginManager.rootModel,
          //   hasSession: !!session,
          //   sessionKeys: session
          //     ? Object.keys(session as Record<string, unknown>)
          //     : [],
          //   selectionValue: session?.selection,
          //   selectionType: typeof session?.selection,
          // })

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

              // console.log(
              //   'DEBUG: Aggregated image data for',
              //   f.get('id'),
              //   ':',
              //   aggregatedImageData,
              // )

              featureSummary = {
                id: f.get('id'),
                type: f.get('type'), // Add type property for FeatureType determination
                images: aggregatedImageData.images,
                image_group: aggregatedImageData.labels,
                image_tag: aggregatedImageData.types,
              }
              // console.log('DEBUG: Final feature summary:', featureSummary)
            } else {
              featureSummary = String(f)
            }
          }
          // eslint-disable-next-line no-console
          // console.debug('Autorun selection change:', {
          //   sel: !!sel,
          //   featureSummary,
          // })

          // Show ImageGallery view for features with images
          if (
            featureSummary &&
            typeof featureSummary === 'object' &&
            featureSummary.images &&
            featureSummary.images !== 'none' &&
            selectedFeature
          ) {
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

              // eslint-disable-next-line no-console
              // console.debug('Managing ImageGalleryView for feature:', {
              //   featureId: featureSummary.id,
              //   featureImages: featureSummary.images,
              //   featureImageLabels: featureSummary.image_group,
              //   viewId: viewId,
              // })

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
                    displayName: 'Image Gallery (Auto)',
                  })
                  // eslint-disable-next-line no-console
                  // console.log('Created new auto ImageGalleryView:', viewId)
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
                // eslint-disable-next-line no-console
                // console.debug('Updated ImageGalleryView with feature data:', {
                //   featureId: featureSummary.id,
                //   images: featureSummary.images,
                //   imagesString,
                //   imageLabels: featureSummary.image_group,
                //   labelsString,
                // })
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              // console.debug('Error managing ImageGalleryView:', e)
            }
          } else {
            // Clear the ImageGalleryView if no feature with images is selected
            try {
              const viewId = 'imageGalleryView'
              if (session?.views) {
                const imageGalleryView = session.views.find(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (view: any) =>
                    view.type === 'ImageGalleryView' && view.id === viewId,
                )
                if (imageGalleryView?.clearFeature) {
                  imageGalleryView.clearFeature()
                  // eslint-disable-next-line no-console
                  // console.debug('Cleared ImageGalleryView feature data')
                }
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              // console.debug('Error clearing ImageGalleryView:', e)
            }
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug('Error in autorun logging', e)
        }
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      // console.debug('Failed to set autorun for selection logging', e)
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

      // console.debug('DEBUG: Extracting from feature:', f.get('id'), {
      //   images,
      //   labels,
      //   types,
      // })

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
          // console.debug('DEBUG: Parsed arrays:', {
          //   imageList,
          //   labelList,
          //   typeList,
          // })

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

          // console.debug('DEBUG: After adding to collections:', {
          //   totalImages: allImageUrls.length,
          //   totalLabels: allLabels.length,
          //   totalTypes: allTypes.length,
          // })
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
