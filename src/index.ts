import Plugin from '@jbrowse/core/Plugin'
import PluginManager from '@jbrowse/core/PluginManager'
import ViewType from '@jbrowse/core/pluggableElementTypes/ViewType'
import WidgetType from '@jbrowse/core/pluggableElementTypes/WidgetType'
import { AbstractSessionModel, isAbstractMenuManager } from '@jbrowse/core/util'
import React from 'react'
import { autorun } from 'mobx'
import { version } from '../package.json'
import {
  ReactComponent as HelloViewReactComponent,
  stateModel as helloViewStateModel,
} from './HelloView'
import { configSchema as imageGalleryConfigSchema, stateModelFactory as imageGalleryStateModelFactory } from './ImageGalleryWidget'
import ImageGalleryWidgetReactComponent from './ImageGalleryWidget/ImageGalleryWidget'

export default class ImageGalleryPlugin extends Plugin {
  name = 'ImageGalleryPlugin'
  version = version

  install(pluginManager: PluginManager) {
    pluginManager.addViewType(() => {
      return new ViewType({
        name: 'HelloView',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stateModel: helloViewStateModel as any,
        ReactComponent: HelloViewReactComponent,
      })
    })
pluginManager.addWidgetType(() => {
  // eslint-disable-next-line no-console
  console.debug('Registering ImageGallery widget')
  return new WidgetType({
    name: 'ImageGalleryWidget',
    heading: 'Images', // Added explicit heading
    configSchema: imageGalleryConfigSchema,
    stateModel: imageGalleryStateModelFactory(pluginManager),
    ReactComponent: ImageGalleryWidgetReactComponent,
  })
})
// eslint-disable-next-line no-console
console.debug('PluginManager widget types after registration:', Object.keys(pluginManager.widgetTypes));

// Add feature detail extension to show images
pluginManager.addToExtensionPoint(
  'Core-extendPluggableElement',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pluggableElement: any) => {
    // reduced noise: only instrument BaseFeatureDetail below; don't spam logs for every pluggable element

    if (pluggableElement.name === 'BaseFeatureDetail') {
      const originalReactComponent = pluggableElement.ReactComponent

      // wrap the react component to log feature props whenever it renders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pluggableElement.ReactComponent = (props: any) => {
        try {
          const { feature } = props
          // eslint-disable-next-line no-console
          console.debug('Wrapped BaseFeatureDetail rendering; feature summary:', {
            id: typeof feature?.get === 'function' ? feature.get('id') : undefined,
            images: typeof feature?.get === 'function' ? feature.get('images') : undefined,
            image_labels: typeof feature?.get === 'function' ? feature.get('image_labels') : undefined,
          })
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug('Error while logging feature in wrapper', e)
        }

        // Render original feature detail
        const originalElement = originalReactComponent(props)

        // If feature has images, add our widget
        try {
          const feature = props.feature
          const hasImages = feature && typeof feature.get === 'function' && !!feature.get('images')
          if (hasImages) {
            // eslint-disable-next-line react/jsx-key
            return [originalElement, React.createElement(ImageGalleryWidgetReactComponent, { feature, config: {} })]
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug('Error while attempting to mount ImageGalleryComponent', e)
        }

        return originalElement
      }
    }

    return pluggableElement
  },
) // This closing parenthesis was missing in previous diff

// autorun to log session selection changes (prints both to browser console and to server)
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-console
  autorun(() => {
    try {
      const session: any = pluginManager.rootModel?.session
      
      // Clean up corrupted widgets (widgets with undefined type)
      if (session?.widgets) {
        try {
          // MobX observable map - get all widget entries
          const widgets = Array.from(session.widgets.entries()) as Array<[string, any]>
          const corruptedWidgets = widgets.filter(([id, widget]) =>
            !widget.type || widget.type === 'undefined'
          )
          
          if (corruptedWidgets.length > 0) {
            // eslint-disable-next-line no-console
            console.debug('Removing corrupted widgets:', corruptedWidgets.map(([id]) => id))
            corruptedWidgets.forEach(([id]) => {
              // Wrap deletion in an action to comply with MobX strict mode
              // session.deleteWidget is an action that correctly modifies the session
              session.deleteWidget?.(id)
            })
          }
          
          // eslint-disable-next-line no-console
          console.debug('Session widgets after cleanup:', widgets.length - corruptedWidgets.length)
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug('Error cleaning widgets:', e)
        }
      }
      
      // eslint-disable-next-line no-console
      console.debug('Session debug:', {
        hasRootModel: !!pluginManager.rootModel,
        hasSession: !!session,
        sessionKeys: session ? Object.keys(session) : [],
        selectionValue: session?.selection,
        selectionType: typeof session?.selection,
      })
      
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
      console.debug('Autorun selection change:', { sel: !!sel, featureSummary })
      
      // If feature has images, programmatically show the ImageGalleryWidget
      if (featureSummary &&
          typeof featureSummary === 'object' &&
          featureSummary.images &&
          featureSummary.images !== 'none' &&
          selectedFeature) {
        try {
          // Use simple pattern like ICGC example
          const widgetTypeName = 'ImageGalleryWidget'
          const simpleWidgetId = 'imageGalleryWidget'
          
          // eslint-disable-next-line no-console
          console.debug('Opening ImageGallery widget for feature with images:', {
            featureImages: featureSummary.images,
            widgetId: simpleWidgetId,
            widgetTypeName,
            availableWidgetTypes: Object.keys(pluginManager.widgetTypes),
          })
          
          // Pass featureImages and other props to the widget
          session.showWidget(session.addWidget(widgetTypeName, simpleWidgetId, {
            featureImages: featureSummary.images,
            feature: selectedFeature
          }))
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug('Error opening ImageGallery widget:', e)
        }
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
} // Closing brace for install method

configure(pluginManager: PluginManager) {
if (isAbstractMenuManager(pluginManager.rootModel)) {
  pluginManager.rootModel.appendToMenu('Add', {
    label: 'Hello View',
    onClick: (session: AbstractSessionModel) => {
      session.addView('HelloView', {})
    },
  })
}
}
}
