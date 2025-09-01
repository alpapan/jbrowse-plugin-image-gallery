# JBrowse 2 Best Practices for AI

This document outlines the correct way to interact with the JBrowse 2 API, intended for an AI agent. It covers core concepts, configuration, and data access patterns.

**Related Documentation:**
- [JBROWSE_PLUGIN_TEMPLATE_USAGE.md](JBROWSE_PLUGIN_TEMPLATE_USAGE.md) - Plugin template usage guide
- [JBROWSE_TYPES.md](JBROWSE_TYPES.md) - Comprehensive type definitions reference

You can also parse the definition files in @/node_modules/@jbrowse/core/

## Core Concepts

### Products and Plugins

- **Product:** A standalone application (e.g., `jbrowse-web`, `jbrowse-desktop`).
- **Plugin:** A package of functionality that extends a product at runtime. Plugins can add new views, tracks, adapters, renderers, etc. This is the primary way to customize and extend JBrowse 2.


### State Management: MobX-State-Tree (MST)

- **Core Idea:** The entire application state is a single, inspectable, and mutable (via actions) tree of models. This provides predictability and traceability.
- **`rootModel`:** The top of the tree. It contains:
    - `jbrowse`: A model representing the static `config.json`.
    - `session`: A model representing the dynamic, mutable state of the user's session (open views, tracks, etc.).
- **Accessing Models:** Use `getSession(anyModelInTree)` to traverse up to the session model. From the session, you can access views, the assemblyManager, etc.
- **MST Actions:** All state modifications **must** happen within a model's `actions` block. This is fundamental to MST and ensures changes are trackable.
```javascript
const MyModel = types.model({       value: types.string,     }).actions(self => ({       setValue(newValue) {         self.value = newValue; // Correct way to modify state       },     }));
```
- **MST Views:** Use `views` blocks for derived data. These are memoized getters that recompute only when their dependencies change.
```javascript
    const MyModel = types.model({       width: types.number,       height: types.number     }).views(self => ({       get area() {         return self.width * self.height; // This is a computed view       },     }));
 ```


## Configuration (`config.json`)

- **Always use `readConfObject(config, ['slotName'])` to access configuration values.** Do not access them directly (e.g., `config.slotName`). This function correctly handles defaults and callbacks.
- **Nested Configuration:** For nested configuration, use an array of keys: `readConfObject(config, ['parentSlot', 'childSlot'])`.
- **Callback Functions (Jexl):** Configuration values can be Jexl expressions for dynamic values. To evaluate them, pass the required context variables as the third argument: `readConfObject(config, 'color', { feature })`.


## Correct Way to Access PluginManager

The `pluginManager` is passed as a parameter to plugin methods and is not directly accessible from the session or root model.

**Correct access pattern in plugin install method:**

```javascript
export default class MyPlugin extends Plugin {
  install(pluginManager: PluginManager) {
    // pluginManager is passed as parameter here
    pluginManager.addTrackType(() => { /* ... */ })
  }
}
```

**To access pluginManager from within model actions/views:**

PluginManager is not directly accessible from model instances. Store a reference during plugin installation or use the methods available on the session/model.


```javascript
import { getSession } from '@jbrowse/core/util'
import { getRoot } from 'mobx-state-tree'
import { readConfObject } from '@jbrowse/core/configuration'

function getTracksForAssembly(self: any) {
  const session = getSession(self)
  const rootModel = getRoot(self)

  // CORRECTED: PluginManager is not accessible via session.root.pluginManager
  // Instead, store reference during plugin installation or use alternative approaches

  // only for mobx-state-tree (MST) models that possess a `.configuration` property
  const trackConfs = (getConf(jbrowse.configuration, 'tracks') ?? [])
  const trackConf = trackConfs.filter(tc =>(getConf(tc, 'trackId') ?? []).includes(trackId),)

  // For adapter access, use the session's RPC manager or other available methods
  const adapterConfig = readConfObject(trackConf, ['adapter'])
  // ... rest of adapter instantiation using available session methods
}
```

This is the correct way to access the `pluginManager` from within JBrowse 2 plugin code.

and trackConfs = (getConf(jbrowse.configuration, 'tracks') ?? []) is a way to access tracks if you have the mst configuration.

However,  `readConfObject` can be used for reading properties from plain configuration objects, such as TrackConfiguration instances, which do not have a `.configuration` property. For example, to access the assembly names in a track config object, use:

```ts
assemblyNames = readConfObject(tc, ['assemblyNames'])
```

This approach is appropriate when working directly with configuration data (e.g., iterating through the static config tree during startup, or when processing config files), because `readConfObject` extracts values directly from config schemas or plain objects.

By contrast, use `getConf` only on mobx-state-tree (MST) models that possess a `.configuration` property, typically in reactive UI or plugin code. Attempting to use `getConf` on a TrackConfiguration object is incorrect and will not work since these objects do not meet the method's requirements.[^1]

[^1]: https://jbrowse.org/jb2/docs/developer_guides/config_model/

## WHEN TO ACCESS PROPERTIES DIRECTLY

Important: direct property access (e.g. t.assemblyNames) on track config objects is the correct way in JBrowse 2 when you have plain objects from configuration files or session track lists. The official track configs use an assemblyNames property that is an array of strings specifying which assemblies a track belongs to. You do not need to use readConfObject unless you are working with a config schema/model (which is uncommon for sessionTracks or config.json data). For example:
```typescript
export function getAllTracksForAssembly(
  // ...
  // Session-added tracks live on session.sessionTracks or session.tracks depending on environment
  const sessionTracks = (session.sessionTracks ??
    session.tracks ??
    []) as TrackConfiguration[]

  const liveTracks = (sessionTracks ?? []).filter((t: TrackConfiguration) => {

const assemblyNames = Array.isArray(t.assemblyNames)
  ? t.assemblyNames
  : [t.assemblyNames]

   // ..
   })
 )
```

## Accessing Data

### Assemblies

1. **Get the `assemblyManager`:** `const assemblyManager = getSession(self).assemblyManager`
2. **List available assembly names:** `const assemblyNames = assemblyManager.assemblyNamesList`
3. **Get a specific assembly object:** `const assembly = await assemblyManager.waitForAssembly('assemblyName');` This ensures the assembly's regions and other data are loaded.
4. **Get assembly regions:** `const regions = assembly.regions`

**PROVEN WORKING**: ✅ `getSession(self).assemblyManager.waitForAssembly(assemblyId)` works correctly for assembly access.
**PROVEN WORKING**: ✅ `assemblyManager.assemblyNamesList` for getting list of assembly names.

### Tracks

```javascript
import { getSession } from '@jbrowse/core/util'
import { getConf } from '@jbrowse/core/configuration'


function getTracksForAssembly(self: any) {
  const session = getSession(self)
  const { jbrowse } = session
  const assemblyName = self.selectedAssemblyId // or self.assemblyNames?.[0]


  // Use reactive configuration API - picks up dynamic changes automatically
  const trackConfs = (getConf(jbrowse.configuration, 'tracks') ?? [])


  // Filter by assemblyNames using getConf
  const tracksForAssembly = trackConfs.filter(tc =>
    (getConf(tc, 'assemblyNames') ?? []).includes(assemblyName),
  )


  return tracksForAssembly
}
```

**PROVEN WORKING**: ✅ `getConf(jbrowse.configuration, 'tracks')` for reactive track access
**PROVEN WORKING**: ✅ `session.tracks` - This is the correct way to access tracks from the session (contrary to previous incorrect statement)

### Features from a Track

The process involves getting the track's adapter and using it to fetch features.

1. **Get the session and track configuration:**
    ```javascript     const session = getSession(self)     const trackConfs = getConf(session.jbrowse.configuration, 'tracks') ?? []     const trackConf = trackConfs.find(tc => getConf(tc, 'trackId') === trackId)     ```
2. **Get the adapter configuration from the track configuration:**
    ```javascript     const adapterConfig = getConf(trackConf, 'adapter')     ```
3. **Instantiate the Adapter:**
    - You need the `pluginManager`
    - Get the adapter class constructor: `const adapterTypeObj = pluginManager.getAdapterType(adapterConfig.type);`.
    - **PROVEN WORKING**: `await adapterTypeObj.getAdapterClass()` method returns a Promise that resolves to the constructor.
    - Create an instance: `const adapter = new AdapterClass(adapterConfig);`
4. **Fetch Features:**
    - `getFeatures` returns an RxJS `Observable`.
    ```javascript
    import { toArray } from 'rxjs/operators';

const region = { refName: 'chr1', start: 0, end: 50000, assemblyName: 'hg19' };
    const featuresObservable = adapter.getFeatures(region);
    const features = await featuresObservable.pipe(toArray()).toPromise();
    ```

**ALTERNATIVE - PROVEN WORKING RPC PATTERN:**
For getting features using JBrowse's RPC system (recommended approach):

```javascript
// Get adapter config from track config using readConfObject
const adapter = readConfObject(trackConf, ['adapter'])

// Use session's RPC manager to get features
const rpcManager = session.rpcManager
const sessionId = session.id

const featureResults = await rpcManager.call(
  sessionId,
  'CoreGetFeatures',
  {
    sessionId,
    regions: [queryRegion],
    adapterConfig: adapter,
  },
)

// The RPC result IS the features array directly
const features = Array.isArray(featureResults) ? featureResults : []
```

**PROVEN WORKING**: ✅ `rpcManager.call(sessionId, 'CoreGetFeatures', {...})` with sessionId as first parameter
**PROVEN WORKING**: ✅ Using `readConfObject(trackConf, ['adapter'])` for adapterConfig
**PROVEN WORKING**: ✅ `regions: [queryRegion]` (array format) and `adapterConfig: adapter`


#### Fetching Unique Identifiers from a GFF Track

For a GFF track (using `Gff3TabixAdapter`), the features are standard `SimpleFeature` objects.

1. Follow the steps above to get an array of features.
2. Iterate through the features and get their IDs. The primary ID is often in the 'ID' attribute.
   ```javascript     const featureIds = features.map(feature => feature.get('ID'));     const uniqueIds = [...new Set(featureIds)]; ```
   You can also use `feature.id()` for a unique internal ID for the feature object.

#### Searching

to use the textsearchmanager, make sure you pass an object with an array of assemblynames
@see [code definition](https://raw.githubusercontent.com/GMOD/jbrowse-components/refs/heads/main/plugins/text-indexing/src/TextIndexRpcMethod/TextIndexRpcMethod.ts)

```javascript
import { readConfObject } from '@jbrowse/core/configuration'

// Get the text search adapter configuration
const textSearchAdapter = readConfObject(trackConf, ['textSearching', 'textSearchAdapter'])
const ixxUri = readConfObject(textSearchAdapter, ['ixxFilePath', 'uri'])
const ixUri = readConfObject(textSearchAdapter, ['ixFilePath', 'uri'])
const metaUri = readConfObject(textSearchAdapter, ['metaFilePath', 'uri'])
```
## Important Best Practices

- **Immutability:** Treat data from `readConfObject` and MST models as immutable. To change state, use actions defined on the MST models.
- **Asynchronicity:** Many operations are asynchronous (e.g., loading assemblies, fetching features). Always use `await` or handle Promises correctly.
- **RPC and Web Workers:** JBrowse 2 offloads data fetching and rendering to Web Workers for performance. When creating plugins, be mindful of this architecture. RPC calls are managed by the `RpcManager`.
- **Pluggable Elements:** The most powerful way to extend JBrowse is through its pluggable element system (Tracks, Views, Adapters, Renderers, etc.). When adding functionality, create a new pluggable element rather than modifying core code.
- **Use `jbrequire` in no-build plugins:** For simple plugins without a build step, use `pluginManager.jbrequire('packageName')` to access JBrowse's internal dependencies.


## Creating Pluggable Elements

The primary way to extend JBrowse 2 is by creating new pluggable elements within a plugin.

### Creating a View


A "view" is a top-level container for displaying data, like `LinearGenomeView` or `CircularView`.[^1]

1. **Define the State Model:** Create an MST model for your view. It must have an `id` and `type` property. It will often contain an array of tracks.[^1]
```javascript
import { types } from 'mobx-state-tree'
import { ElementId } from '@jbrowse/core/util/types/mst'

const MyCustomView = types
  .model('MyCustomView', {
    id: ElementId,
    type: types.literal('MyCustomView'),
    displayName: types.maybe(types.string),
    tracks: types.array(pluginManager.pluggableMstType('track', 'stateModel')),
    // Add any custom properties your view needs
    customProperty: types.optional(types.string, 'default value')
  })
  .views(self => ({
    // Add computed properties here
    get trackCount() {
      return self.tracks.length
    },
  }))
  .actions(self => ({
    // Add actions to modify state
    addTrack(trackConfig: any) {
      const trackType = pluginManager.getTrackType(trackConfig.type)
      const track = trackType.stateModel.create({
        ...trackConfig,
        id: `${self.id}_track_${self.tracks.length}`,
      })
      self.tracks.push(track)
    },

    removeTrack(trackId: string) {
      const trackIndex = self.tracks.findIndex(track => track.id === trackId)
      if (trackIndex !== -1) {
        self.tracks.splice(trackIndex, 1)
      }
    },

    setCustomProperty(value: string) {
      self.customProperty = value
    },
  }))
```

2. **Create the React Component:** Build the UI component that will render your view.[^3]
```javascript
import React from 'react'
import { observer } from 'mobx-react'
import { getSession } from '@jbrowse/core/util'

const MyCustomViewComponent = observer(({ model }: { model: any }) => {
  const session = getSession(model)


  return (
    <div style={{ width: '100%', height: '100%' }}>
      <h2>{model.displayName || 'My Custom View'}</h2>
      <p>Track count: {model.trackCount}</p>
      <div>
        {model.tracks.map((track: any) => (
          <div key={track.id}>
            Track: {track.name || track.id}
          </div>
        ))}
      </div>
    </div>
  )
})

export default MyCustomViewComponent
```

3. **Register the View in Your Plugin:** Add the view type to your plugin's install method.[^3]

```javascript
import { ViewType } from '@jbrowse/core/pluggableElementTypes'

export default class MyPlugin extends Plugin {
  name = 'MyPlugin'
  install(pluginManager: PluginManager) {
    pluginManager.addViewType(() => {
      return new ViewType({
        name: 'MyCustomView',
        stateModel: MyCustomView,
        ReactComponent: MyCustomViewComponent,
      })
    })
  }

  configure(pluginManager: PluginManager) {
    // Add menu items or other configuration
    if (isAbstractMenuManager(pluginManager.rootModel)) {
      pluginManager.rootModel.appendToMenu('Add', {
        label: 'My Custom View',
        icon: GridOn,
        onClick: (session: SessionWithWidgets) => {
          session.addView('MyCustomView', {})
        },
      })
    }
  }
}
```

The view state model extends the `BaseViewModel` automatically, which provides core functionality like `id`, `displayName`, `minimized`, and actions like `setWidth` and `setMinimized`. Your custom view can then add additional properties and functionality specific to its purpose.[^2]