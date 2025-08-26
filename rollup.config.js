import globals from '@jbrowse/core/ReExports/list'
import { createRollupConfig } from '@jbrowse/development-tools'

function stringToBoolean(string) {
  if (string === undefined) {
    return undefined
  }
  if (string === 'true') {
    return true
  }
  if (string === 'false') {
    return false
  }
  throw new Error('unknown boolean string')
}

const includeUMD = stringToBoolean(process.env.JB_UMD)
const includeCJS = stringToBoolean(process.env.JB_CJS)
const includeESMBundle = stringToBoolean(process.env.JB_ESM_BUNDLE)
const includeNPM = stringToBoolean(process.env.JB_NPM)

const configs = createRollupConfig(globals, {
  includeUMD,
  includeCJS,
  includeESMBundle,
  includeNPM,
})

// Override the global name for UMD builds
const processedConfigs = Array.isArray(configs) ? configs : [configs]
processedConfigs.forEach(config => {
  if (config.output) {
    if (Array.isArray(config.output)) {
      config.output.forEach(output => {
        if (output.format === 'umd') {
          output.name = 'JBrowsePluginImageGalleryPlugin'
        }
      })
    } else if (config.output.format === 'umd') {
      config.output.name = 'JBrowsePluginImageGalleryPlugin'
    }
  }
})

export default configs
