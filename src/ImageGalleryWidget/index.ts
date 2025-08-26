import PluginManager from '@jbrowse/core/PluginManager'
import { lazy } from 'react'
import { configSchema } from './configSchema'

const ImageGalleryWidget = lazy(() => import('./ImageGalleryWidget'))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ImageGalleryWidgetF(pluginManager: PluginManager): any {
  return {
    name: 'ImageGalleryWidget',
    heading: 'Images',
    configSchema,
    ReactComponent: ImageGalleryWidget,
    stateModel: pluginManager.lib['mobx-state-tree'].types.model(
      'ImageGalleryWidget',
      {},
    ),
  }
}
