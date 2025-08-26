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
      featureImages: pluginManager.lib['mobx-state-tree'].types.maybe(pluginManager.lib['mobx-state-tree'].types.union(
        pluginManager.lib['mobx-state-tree'].types.string,
        pluginManager.lib['mobx-state-tree'].types.array(pluginManager.lib['mobx-state-tree'].types.string)
      )),
    },
  )
}