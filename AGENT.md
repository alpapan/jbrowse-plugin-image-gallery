# JBrowse 2 Best Practices for AI

This document outlines the correct way to interact with the JBrowse 2 API, intended for an AI agent. It covers core concepts, configuration, and data access patterns.

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
    ```javascript     const MyModel = types.model({       value: types.string,     }).actions(self => ({       setValue(newValue) {         self.value = newValue; // Correct way to modify state       },     }));     ```
- **MST Views:** Use `views` blocks for derived data. These are memoized getters that recompute only when their dependencies change.
    ```javascript     const MyModel = types.model({       width: types.number,       height: types.number     }).views(self => ({       get area() {         return self.width * self.height; // This is a computed view       },     }));     ```


## Configuration (`config.json`)

- **Always use `readConfObject(config, 'slotName')` to access configuration values.** Do not access them directly (e.g., `config.slotName`). This function correctly handles defaults and callbacks.
- **Nested Configuration:** For nested configuration, use an array of keys: `readConfObject(config, ['parentSlot', 'childSlot'])`.
- **Callback Functions (Jexl):** Configuration values can be Jexl expressions for dynamic values. To evaluate them, pass the required context variables as the third argument: `readConfObject(config, 'color', { feature })`.


## Correct Way to Access PluginManager

 The `pluginManager` is located on the root model, not the session model.

**Correct access pattern:**

```javascript
import { getRoot } from 'mobx-state-tree'

// From within any model in the tree
const rootModel = getRoot(self)
const pluginManager = rootModel.pluginManager
```

**Alternative pattern:**

```javascript
import { getSession } from '@jbrowse/core/util'

// Access via session's root reference
const session = getSession(self)
const pluginManager = session.root.pluginManager
```

The JBrowse 2 documentation notes that while they "generally prefer using the session model (via e.g. getSession) over the root model (via e.g. getRoot) in plugin code", the `pluginManager` is one of the properties that remains on the root model and must be accessed through `getRoot()` or via the session's root reference.


```javascript
import { getSession } from '@jbrowse/core/util'
import { getRoot } from 'mobx-state-tree'
import { readConfObject } from '@jbrowse/core/configuration'

function getTracksForAssembly(self: any) {
  const session = getSession(self)
  const rootModel = getRoot(self)
  const pluginManager = rootModel.pluginManager
  
  const trackConfs = readConfObject(session.jbrowse.configuration, 'tracks') ?? []
  const trackConf = trackConfs.find(tc => readConfObject(tc, 'trackId') === trackId)
  
  // Now use pluginManager to get adapter
  const adapterConfig = readConfObject(trackConf, 'adapter')
  const adapterTypeObj = pluginManager.getAdapterType(adapterConfig.type)
  // ... rest of adapter instantiation
}
```

This is the correct way to access the `pluginManager` from within JBrowse 2 plugin code.



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
**DOES NOT WORK**: ❌ `session.tracks` - Breaks reactivity and violates JBrowse 2 best practices



### Features from a Track

The process involves getting the track's adapter and using it to fetch features.

1. **Get the session and track configuration:**
    ```javascript     const session = getSession(self)     const trackConfs = getConf(session.jbrowse.configuration, 'tracks') ?? []     const trackConf = trackConfs.find(tc => getConf(tc, 'trackId') === trackId)     ```
2. **Get the adapter configuration from the track configuration:**
    ```javascript     const adapterConfig = getConf(trackConf, 'adapter')     ```
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

#### Fetching Unique Identifiers from a GFF Track

For a GFF track (using `Gff3TabixAdapter`), the features are standard `SimpleFeature` objects.

1. Follow the steps above to get an array of features.
2. Iterate through the features and get their IDs. The primary ID is often in the 'ID' attribute.
    ```javascript     const featureIds = features.map(feature => feature.get('ID'));     const uniqueIds = [...new Set(featureIds)];     ```
    You can also use `feature.id()` for a unique internal ID for the feature object.

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
    }
  }))
  .actions(self => ({
    // Add actions to modify state
    addTrack(trackConfig: any) {
      const trackType = pluginManager.getTrackType(trackConfig.type)
      const track = trackType.stateModel.create({
        ...trackConfig,
        id: `${self.id}_track_${self.tracks.length}`
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
    }
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
        onClick: (session: SessionWithWidgets) => {
          session.addView('MyCustomView', {})
        },
      })
    }
  }
}
```

The view state model extends the `BaseViewModel` automatically, which provides core functionality like `id`, `displayName`, `minimized`, and actions like `setWidth` and `setMinimized`. Your custom view can then add additional properties and functionality specific to its purpose.[^2]
