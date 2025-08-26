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
                images: f.get('images'),
                image_labels: f.get('image_labels'),
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

              // eslint-disable-next-line no-console
              // console.debug('Managing ImageGalleryView for feature:', {
              //   featureId: featureSummary.id,
              //   featureImages: featureSummary.images,
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

              if (!imageGalleryView && session) {
                // Create new ImageGalleryView if it doesn't exist
                imageGalleryView = session.addView('ImageGalleryView', {
                  id: viewId,
                })
                // eslint-disable-next-line no-console
                // console.debug('Created new ImageGalleryView:', viewId)
              }

              // Update the view with the current feature data
              if (imageGalleryView?.updateFeature) {
                imageGalleryView.updateFeature(
                  featureSummary.id || 'unknown',
                  featureSummary.images,
                  featureSummary.image_labels,
                )
                // eslint-disable-next-line no-console
                // console.debug('Updated ImageGalleryView with feature data')
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
  } // Closing brace for install method

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
