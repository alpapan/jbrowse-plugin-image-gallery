import PluginManager from '@jbrowse/core/PluginManager'
import { configSchema } from './configSchema'
export { configSchema }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stateModelFactory(pluginManager: PluginManager) {
  return pluginManager.lib['mobx-state-tree'].types.model(
    'ImageGalleryWidget',
    {
      id: pluginManager.lib['mobx-state-tree'].types.identifier,
      type: pluginManager.lib['mobx-state-tree'].types.literal('ImageGalleryWidget'), // Add this line
      feature: pluginManager.lib['mobx-state-tree'].types.frozen(),
    },
  )
}