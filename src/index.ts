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
              featureSummary = {
                id: f.get('id'),
                images: f.get('image') || f.get('images'), // Primary: 'image', fallback: 'images'
                image_group: f.get('image_group'),
                image_tag: f.get('image_tag'),
              }
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
                  console.log('Created new auto ImageGalleryView:', viewId)
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
          // console.debug('Error in autorun logging', e)
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
}
