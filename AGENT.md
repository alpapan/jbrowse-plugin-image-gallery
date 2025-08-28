# Agent Rules Standard (AGENT.md):
# JBrowse2 Plugin Development API Reference

This comprehensive guide provides detailed API documentation for developing plugins in JBrowse2, covering all major APIs, methods, properties, and concepts.

## Table of Contents

1. [JBrowse2 Architecture Overview](#jbrowse2-architecture-overview)
2. [Plugin Development Fundamentals](#plugin-development-fundamentals)
3. [Pluggable Elements](#pluggable-elements)
4. [View Types API](#view-types-api)
5. [Track Types API](#track-types-api)
6. [Display Types API](#display-types-api)
7. [Adapter Types API](#adapter-types-api)
8. [Renderer Types API](#renderer-types-api)
9. [Widget Types API](#widget-types-api)
10. [Session Management API](#session-management-api)
11. [Configuration System API](#configuration-system-api)
12. [Extension Points API](#extension-points-api)
13. [Jexl Expressions API](#jexl-expressions-api)
14. [Best Practices](#best-practices)
15. [Common Issues and Solutions](#common-issues-and-solutions)

## JBrowse2 Architecture Overview

JBrowse2 is a modern, plugin-based genome browser built with:

- **React** for UI components
- **MobX State Tree (MST)** for state management
- **TypeScript** for type safety
- **Webpack/Rollup** for bundling

### Core Concepts

- **Products**: Applications (jbrowse-web, jbrowse-desktop, jbrowse-cli)
- **Plugins**: Runtime extensions that add functionality
- **Pluggable Elements**: Modular components (views, tracks, adapters, etc.)
- **Sessions**: User working environments containing views and tracks
- **Configuration**: Declarative setup via JSON/TypeScript

## Plugin Development Fundamentals

### Plugin Structure

Every JBrowse2 plugin extends `@jbrowse/core/Plugin` and implements:

```typescript
export default class MyPlugin extends Plugin {
  name = 'MyPlugin'
  version = '1.0.0'

  install(pluginManager: PluginManager) {
    // Register pluggable elements here
    // pluginManager methods for registration:
    // .addViewType(() => new ViewType({ name, stateModel, ReactComponent }))
    // .addTrackType(() => new TrackType({ name, configSchema, stateModel }))
    // .addDisplayType(() => new DisplayType({ name, configSchema, stateModel, trackType, viewType, ReactComponent }))
    // .addAdapterType(() => new AdapterType({ name, configSchema, adapterClass }))}
    // .addRendererType(() => new RendererType({ name, configSchema, ReactComponent, pluginManager }))
    // .addWidgetType(() => new WidgetType({ name, configSchema, stateModel, ReactComponent }))
    // .addConnectionType(() => new ConnectionType({ name, configSchema, ConnectionClass, configDefaults }));
    // .addTextSearchAdapterType(() => new TextSearchAdapterType({ name, AdapterClass, configSchema }));
    // .addAddTrackWorkflow(() => new AddTrackWorkflowType({ name, displayName, ReactComponent, type }));
  }

  configure(pluginManager: PluginManager) {
    // Set up autoruns, Jexl functions, extension points
    // pluginManager methods for configuration/runtime:
    // .jexl.addFunction(name: string, func: Function)
    // .addToExtensionPoint(extensionPointName: string, callback: Function)
    // .evaluateExtensionPoint(extensionPointName: string, args: unknown, props?: object)
    // .evaluateAsyncExtensionPoint(extensionPointName: string, args: unknown, props?: object)
    // .rootModel: Provides access to the root MST model for global state and actions (e.g., app menus)
  }
}
```


## Pluggable Elements

Plugins can add various types of pluggable elements to extend JBrowse functionality.

### Common Pluggable Element Types

1. **View Types**: Custom visualization panels
2. **Track Types**: Data display containers
3. **Display Types**: Rendering methods for tracks in specific views
4. **Adapter Types**: Data format parsers
5. **Renderer Types**: Low-level drawing engines
6. **Widget Types**: UI panels and dialogs
7. **Connection Types**: Data source connections
8. **Text Search Adapters**: Search functionality
9. **Add Track Workflows**: Custom track addition processes

## View Types API

Views are high-level containers that can display arbitrary content. They extend the base view functionality.

### Creating a Custom View

Views extend a base model with the following API:

```typescript
interface BaseViewModel {
  // Properties
  id: ElementId // Unique identifier for the view
  displayName: types.maybe(types.string) // Display name in the view header
  minimized: types.literal(false) // Whether the view is minimized

  // Getters
  menuItems(): MenuItem[] // Array of menu items to display in the view's menu

  // Actions
  setDisplayName(name: string): void // Sets the display name of the view
  setWidth(newWidth: number): void // Sets the width of the view in pixels
  setMinimized(flag: boolean): void // Sets the minimized state of the view
}
```

Example of creating a custom view:

```typescript
// src/MyCustomView/index.ts
import { ConfigurationSchema } from '@jbrowse/core/configuration'
import PluginManager from '@jbrowse/core/PluginManager'
import { ViewType } from '@jbrowse/core/pluggableElementTypes'
import { types } from 'mobx-state-tree'

export const configSchema = ConfigurationSchema('MyCustomView', {
  // Configuration slots for MyCustomView
})

export const stateModelFactory = (pluginManager: PluginManager) => {
  return types.model('MyCustomView', {
    id: ElementId,
    type: types.literal('MyCustomView'),
    // View-specific state
  })
  .actions(self => ({
    // View actions
  }))
  .views(self => ({
    // View getters
  }))
}

// src/index.ts
pluginManager.addViewType(() => {
  return new ViewType({
    name: 'MyCustomView',
    stateModel: stateModelFactory(pluginManager),
    ReactComponent: MyCustomViewReactComponent,
  })
})
```

### Built-in View Types

- **LinearGenomeView**: Classic linear genome browser
- **CircularView**: Circos-style circular genome view
- **DotplotView**: Comparative 2D genome view
- **SvInspectorView**: Structural variant inspector
- **SpreadsheetView**: Tabular data view

## Track Types API

Tracks are high-level concepts that control what data to display and how. They combine adapters, displays, and renderers.

### Creating a Custom Track

Tracks extend a base model with the following API:

```typescript
interface BaseTrackModel {
  // Properties
  id: ElementId // Unique identifier for the track instance
  type: types.literal(trackType) // Literal string matching the track type name
  configuration: AnyConfigurationSchemaType // Configuration reference for the track
  minimized: types.literal(false) // Whether the track is minimized
  pinned: types.literal(false) // Whether the track is pinned
  displays: IArrayType<IAnyType> // Array of display models associated with this track

  // Getters
  rpcSessionId: any // Identifier for the webworker session (derived from trackId)
  name: any // Display name of the track
  textSearchAdapter: any // Text search adapter instance
  adapterConfig: any // Configuration for the data adapter
  adapterType: AdapterType // The type of the data adapter
  viewMenuActions: MenuItem[] // Menu items specific to the track in the view
  canConfigure: boolean | ConfigurationSchema // Indicates if the track can be configured

  // Methods
  trackMenuItems(): (MenuDivider | MenuSubHeader | NormalMenuItem | CheckboxMenuItem | RadioMenuItem | SubMenuItem | { ...; })[] // Returns an array of menu items for the track

  // Actions
  setPinned(flag: boolean): void // Sets the pinned state of the track
  setMinimized(flag: boolean): void // Sets the minimized state of the track
  showDisplay(displayId: string, initialSnapshot?: object): void // Shows a specific display by its ID
  hideDisplay(displayId: string): number // Hides a specific display by its ID, returns number of visible displays remaining
  replaceDisplay(oldId: string, newId: string, initialSnapshot?: object): void // Replaces an existing display with a new one
}
```

Example of creating a custom track:

```typescript
// src/MyCustomTrack/index.ts
import { ConfigurationSchema } from '@jbrowse/core/configuration'
import { TrackType } from '@jbrowse/core/pluggableElementTypes'

export const configSchema = ConfigurationSchema('MyCustomTrack', {
  adapter: {
    type: 'fileLocation',
    defaultValue: { uri: '', locationType: 'UriLocation' },
  },
})

pluginManager.addTrackType(() => {
  return new TrackType({
    name: 'MyCustomTrack',
    configSchema,
    stateModel: trackStateModelFactory(pluginManager),
  })
})
```

### Track Composition

Tracks can be composed of multiple displays for different views:

```typescript
// Register displays for the track
pluginManager.addDisplayType(() => {
  return new DisplayType({
    name: 'MyCustomDisplay',
    configSchema: displayConfigSchema,
    stateModel: displayStateModelFactory(pluginManager),
    trackType: 'MyCustomTrack',
    viewType: 'LinearGenomeView',
    ReactComponent: MyCustomDisplayComponent,
  })
})
```

## Display Types API

Displays determine how tracks are rendered in specific views. A single track can have multiple displays for different view types.

### Display Categories

- **Linear Displays**: For LinearGenomeView
- **Circular Displays**: For CircularView
- **Comparative Displays**: For comparative views

### Creating a Display

```typescript
export const configSchema = ConfigurationSchema('MyDisplay', {
  renderer: {
    type: 'rendererSelector',
    defaultValue: { type: 'MyRenderer' },
  },
  // Display-specific config
})

pluginManager.addDisplayType(() => {
  return new DisplayType({
    name: 'MyDisplay',
    configSchema,
    stateModel: displayStateModelFactory(pluginManager),
    trackType: 'MyTrack',
    viewType: 'LinearGenomeView',
    ReactComponent: MyDisplayComponent,
  })
})```

## Adapter Types API

Adapters parse data from various formats and sources.

**What is an Adapter:**
An adapter is a class that fetches and parses data, returning it in a format JBrowse understands. If custom rendering is needed, a custom display and/or renderer may also be required.

### What types of adapters are there:

-   **Feature adapter**: Most common, takes a region (chromosome, start, end) and returns features (genes, reads, variants) within that region. Examples: `BamAdapter`, `VcfAdapter`.
-   **Regions adapter**: Defines regions in an assembly, returning a list of chromosomes/contigs/scaffolds and their sizes.
-   **Sequence adapter**: Combination of regions and feature adapter, provides region list and sequence of queried region. Examples: `FastaAdapter`, `TwoBitAdapter`.
-   **RefName alias adapter**: Returns data about aliases for reference sequence names (e.g., "chr1" for "1").
-   **Text search adapter**: Searches text search indexes and returns a list of search results.

### Skeleton of a Feature Adapter

Feature adapters typically extend `BaseFeatureDataAdapter` and implement `getRefNames`, `getFeatures`, and `freeResources`.

```typescript
import { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter'
import SimpleFeature from '@jbrowse/core/util/simpleFeature'
import { readConfObject } from '@jbrowse/core/configuration'
import { ObservableCreate } from '@jbrowse/core/util/rxjs'

class MyAdapter extends BaseFeatureDataAdapter {
  // Constructor: Receives config object and optionally getSubAdapter for sub-adapters.
  // Properties defined in the constructor based on config.
  constructor(config: AnyConfigurationModel, getSubAdapter: (subadapterConfig: AnyConfigurationModel) => BaseAdapter) {
    super(config)
    const fileLocation = readConfObject(config, 'fileLocation')
    // const subadapter = readConfObject(config, 'sequenceAdapter')
    // const sequenceAdapter = getSubAdapter(subadapter)
  }

  // getRefNames: (Optional) Returns an array of reference sequence names
  async getRefNames(): Promise<string[]> {
    // Example: ['chr1', 'chr2', 'chrM']
    return ['chr1', 'chr2', 'chr3'] // etc
  }

  // getFeatures: Returns an RxJS Observable stream of features for a given region.
  // region: { refName: string, start: number, end: number, originalRefName: string, assemblyName: string }
  // options: { bpPerPx: number, stopToken?: AbortSignal, statusCallback?: Function, headers?: Record<string, string>, ...renderProps }
  getFeatures(region: Region, options: Options) {
    return ObservableCreate(async observer => {
      try {
        const { refName, start, end } = region
        // Custom logic to fetch and parse features
        // Example: API call, file parsing
        const response = await fetch(
          `http://myservice/genes/${refName}/${start}-${end}`,
          options,
        )
        if (response.ok) {
          const features = await response.json()
          features.forEach((feature: any) => {
            observer.next(
              new SimpleFeature({
                uniqueId: `${feature.refName}-${feature.start}-${feature.end}`,
                refName: feature.refName,
                start: feature.start,
                end: feature.end,
                // Add other feature properties here
              }),
            )
          })
          observer.complete()
        } else {
          throw new Error(`${response.status} - ${response.statusText}`)
        }
      } catch (e) {
        observer.error(e)
      }
    })
  }

  // freeResources: (Optional) Used to release resources, typically an empty function.
  freeResources(region: Region): void {
    // Implement if manual resource cleanup is needed
  }
}
```

### Common Adapter Types

- **BamAdapter**: Binary Alignment Map files
- **CramAdapter**: Compressed Reference-oriented Alignment Map
- **VcfAdapter**: Variant Call Format files
- **Gff3Adapter**: Generic Feature Format v3
- **BedAdapter**: Browser Extensible Data format
- **TwoBitAdapter**: 2bit sequence files
- **BigWigAdapter**: BigWig quantitative data
- **HicAdapter**: Hi-C contact matrix data

### Creating a Custom Adapter

```typescript
export const configSchema = ConfigurationSchema('MyAdapter', {
  location: {
    type: 'fileLocation',
    defaultValue: { uri: '', locationType: 'UriLocation' },
  },
})

pluginManager.addAdapterType(() => {
  return new AdapterType({
    name: 'MyAdapter',
    configSchema,
    adapterClass: MyAdapterClass,
  })
})
```

## Renderer Types API

Renderers handle the actual drawing of features. They can run in the main thread, web workers, or server-side.

### Renderer Architecture

- **Feature Renderers**: Draw individual features
- **Pileup Renderers**: Draw stacked alignments
- **Quantitative Renderers**: Draw wiggle plots
- **Comparative Renderers**: Draw synteny/contact data

### Creating a Renderer

Renderers implement a `render` function and may have a `ReactComponent` for custom SVG/Canvas drawing. They often extend `ServerSideRendererType` or `BoxRendererType`.

```typescript
// Basic Renderer Structure
interface RenderResult {
  reactElement: React.ReactElement // React component containing the rendering output
  imageData?: ImageBitmap // Optional: Image data for OffscreenCanvas
  height: number
  width: number
}

interface RendererProps {
  features: Map<string, Feature> // Map of features to render
  layout: { addRect: (featureId: string, leftBp: number, rightBp: number, height: number) => number } // Layout utility for pileup-like displays
  config: AnyConfigurationModel // Renderer's configuration
  regions: Region[] // Genomic regions to render
  bpPerPx: number // Base pairs per pixel (zoom level)
  height: number
  width: number
  highResolutionScaling: number // Scaling factor for high-resolution displays
  // Additional custom props can be passed via track's renderProps()
}

class MyRenderer implements ServerSideRendererType {
  // render: Main function to perform rendering operations.
  render(props: RendererProps): RenderResult {
    const { width, height, regions, features } = props
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      // Custom drawing logic using ctx
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);
      const imageData = canvas.transferToImageBitmap();
      return {
        reactElement: React.createElement(this.ReactComponent, { ...props }),
        imageData,
        height,
        width,
      }
    } else {
      // Fallback for non-OffscreenCanvas environments (e.g., Node.js, some browsers)
      // This would typically involve serializing drawing commands or returning only ReactElement
      return {
        reactElement: React.createElement(this.ReactComponent, { ...props }),
        height,
        width,
      }
    }
  }


  // getFeatures: (Optional) Overrides default feature fetching (e.g., for non-conventional data types like Hi-C).
  async getFeatures(args: RendererProps & { dataAdapter: BaseAdapter }): Promise<Feature[]> {
    const { dataAdapter, regions } = args
    // Custom feature fetching logic, e.g., for Hi-C where features are not standard
    const features = await dataAdapter.getFeatures(regions[0]).toPromise()
    return features
  }
}
```

Example of creating a custom renderer:

```typescript
export const configSchema = ConfigurationSchema('MyRenderer', {
  color: {
    type: 'color',
    defaultValue: 'blue',
  },
})

pluginManager.addRendererType(() => {
  return new RendererType({
    name: 'MyRenderer',
    configSchema,
    ReactComponent: MyRendererComponent,
    pluginManager,
  })
})```

## Widget Types API

Widgets are custom UI panels that can appear in side panels, modals, or drawers.

### Widget Categories

- **Feature Detail Widgets**: Show feature information
- **Configuration Widgets**: Configure tracks/views
- **Add Track Widgets**: Custom track addition workflows
- **Custom Widgets**: Application-specific panels

### Creating a Widget

```typescript
// src/MyWidget/index.tsx
import { ConfigurationSchema } from '@jbrowse/core/configuration'
import { WidgetType } from '@jbrowse/core/pluggableElementTypes'
import { types } from 'mobx-state-tree'

export const configSchema = ConfigurationSchema('MyWidget', {})

export function stateModelFactory(pluginManager: PluginManager) {
  return types.model('MyWidget', {
    id: ElementId,
    type: types.literal('MyWidget'),
    // Widget-specific state properties
    featureData: types.frozen({}),
    widgetByline: types.optional(types.string, 'Default widget byline'), // Example: custom text
  })
  .actions(self => ({
    // Widget actions
    setFeatureData(data: any) { self.featureData = data },
    clearFeatureData() { self.featureData = {} },
    setWidgetByline(byline: string) { self.widgetByline = byline },
  }))
  .views(self => ({
    // Widget getters
    get getWidgetByline() { return self.widgetByline || 'Default sybilline' },
    get hasFeatureData() { return Object.keys(self.featureData).length > 0 },
  }))
}


export { default as ReactComponent } from './MyWidget'

// src/index.ts
pluginManager.addWidgetType(() => {
  return new WidgetType({
    name: 'MyWidget',
    configSchema,
    stateModel: stateModelFactory(pluginManager),
    ReactComponent: MyWidgetComponent,
  })
})```

## Session Management API

Sessions manage the user's working environment, including views, tracks, and global state.

### Session Model Structure

A base session model defines the core API for managing application state.


```typescript
interface BaseSessionModel {
  // Properties
  id: string
  name: string
  margin: number
  // Other properties like is}t}yp}e etc inherited from MobX State Tree

  // Getters
  // root: TypeOrStateTreeNodeToStateTreeNode<ROOT_MODEL_TYPE> // The root model of the application
  // jbrowse: any // Reference to the JBrowse core (e.g., config, pluginManager)
  // rpcManager: RpcManager // RPC manager for offloading tasks to workers
  // configuration: Instance<JB_CONFIG_SCHEMA> // The main application configuration
  // adminMode: boolean // Indicates if in admin mode
  // textSearchManager: TextSearchManager // Manager for text search operations
  // assemblies: AssemblyModel[] // Array of assembly models in the session

  // Core functionality Actions
  setSelection(thing: unknown): void // Sets the global selection
  clearSelection(): void // Clears the global selection
  setHovered(thing: unknown): void // Sets the globally hovered object

  // Views management Actions
  addView(viewType: string, config: any): AbstractViewModel // Adds a new view of a specific type with configuration
  removeView(view: AbstractViewModel): void // Removes a specific view from the session
  views: AbstractViewModel[] // Array of active view models in the session

  // Tracks management Actions
  addTrack(trackConfig: any): TrackModel // Adds a new track with configuration
  removeTrack(track: TrackModel): void // Removes a specific track from the session
  tracks: TrackModel[] // Array of active track models in the session

  // Widgets management Actions
  addWidget(widgetType: string, id: string, config: any): WidgetModel // Adds a new widget of a specific type with configuration
  removeWidget(widget: WidgetModel): void // Removes a specific widget from the session
  showWidget(widget: WidgetModel): void // Displays a specific widget
}
```

### Working with Sessions

```typescript
import { getSession } from '@jbrowse/core/util'

// Get current session from any model (e.g., a view or track model)
const session = getSession(model)

```


## Configuration System API

JBrowse2 uses a typed configuration system with slots and schemas.

### Configuration Slot Types

- `string`: Text input
- `number`/`integer`: Numeric input
- `boolean`: Checkbox
- `color`: Color picker
- `stringEnum`: Dropdown selection
- `fileLocation`: File/URL input (e.g., `{ uri: 'path/to/file', locationType: 'UriLocation' }`)
- `frozen`: Arbitrary JSON data
- `text`: Multi-line text area
- `stringArray`: List of strings
- `stringArrayMap`: Key-value pairs (e.g., array of `{ key: string, value: string }` objects)

### Creating Configuration Schemas

Configuration schemas are created using `ConfigurationSchema` and define the structure and default values for configurable elements.


```typescript
import { ConfigurationSchema } from '@jbrowse/core/configuration'
import { types } from 'mobx-state-tree'

const myConfigSchema = ConfigurationSchema('MyElement', {
  // Simple string slot
  name: {
    type: 'string',
    description: 'Display name',
    defaultValue: 'My Element',
  },

  // Enum with options
  displayMode: {
    type: 'stringEnum',
    model: types.enumeration('Mode', ['normal', 'compact', 'detailed']),
    description: 'Display mode',
    defaultValue: 'normal',
  },

  // Color picker
  color: {
    type: 'color',
    description: 'Feature color',
    defaultValue: '#0000FF',
  },

  // File location
  dataFile: {
    type: 'fileLocation',
    description: 'Data file location',
    defaultValue: { uri: '', locationType: 'UriLocation' },
  },

  // Sub-schema for nested configuration
  advanced: ConfigurationSchema('AdvancedOptions', {
    threshold: {
      type: 'number',
      description: 'Threshold value',
      defaultValue: 0.5,
    },
  }),
})
```


### Reading Configuration Values

Use `readConfObject` to safely access configuration values, including handling default values and Jexl callbacks.


```typescript
import { readConfObject } from '@jbrowse/core/configuration'

const config = someConfigurationModel // Assume 'config' is an instance of a ConfigurationSchema

// Read simple value
const name = readConfObject(config, 'name') // e.g., 'My Element'

// Read nested value
const threshold = readConfObject(config, ['advanced', 'threshold']) // e.g., 0.5

// Read with context variables (for Jexl callbacks)
const feature = { type: 'SNV', name: 'mySNP’ } // Example context variable
const color = readConfObject(config, 'color', { feature }) // Evaluates any Jexl expression in 'color' slot using 'feature'
```


## Extension Points API

Extension points allow plugins to register callbacks that are executed at specific times. They are used for adding, overwriting, or modifying functionality within the JBrowse ecosystem.

### Producer API: Evaluating Extension Points

Components that provide extension points call `evaluateExtensionPoint` or `evaluateAsyncExtensionPoint` to run registered callbacks.

```typescript
// Synchronous evaluation
const result = pluginManager.evaluateExtensionPoint(
  'MyExtensionPoint', // Name of the extension point
  initialValue,       // Initial value, passed as 'args' to callbacks, mutated across chained callbacks
  context             // Optional: additional context, passed as 'props' to callbacks, consistent across chain
)

// Asynchronous evaluation (for operations that might involve Promises)
const asyncResult = await pluginManager.evaluateAsyncExtensionPoint(
  'MyAsyncExtensionPoint',
  initialValue,
  context
)
```

### Consumer API: Registering Callbacks to Extension Points

Plugins register callback functions to an extension point using `addToExtensionPoint`.

```typescript
pluginManager.addToExtensionPoint(
  'MyExtensionPoint', // Name of the extension point to add to
  (value: any, context: any) => {
    // 'value' is the result from the previous callback (or initialValue for the first)
    // 'context' is the 'props' object passed by the producer
    // Process value and/or context
    const modifiedValue = { ...value, processed: true }
    return modifiedValue // Return the (potentially modified) value for the next callback in the chain
  }
)```

### Common Extension Points

-   `Core-extendPluggableElement`: Extend pluggable element models (e.g., add new MobX State Tree properties or actions).
-   `Core-guessAdapterForLocation`: Infer an adapter configuration given a file location, used in "Add track" workflows.
-   `Core-guessTrackTypeForLocation`: Infer a track type given a file location, used in "Add track" workflows.
-   `Core-extendSession`: Extend the session model itself with new features.
-   `Core-replaceAbout`: Replace the default "About this track" React component with a custom one.
    *   `args`: Default `ReactComponent` for the About dialog.
    *   `props`: `{ session: AbstractSessionModel, config: AnyConfigurationModel }`
-   `Core-extraAboutPanel`: Add additional panels to the "About this track" dialog.
    *   Returns an object `{ name: string, Component: React.ReactComponent }`
    *   `props`: `{ session: AbstractSessionModel, config: AnyConfigurationModel }`
-   `Core-customizeAbout`: Modify the configuration snapshot (`Record<string, unknown>`) used for the About dialog after `formatAbout` is applied.
-   `Core-replaceWidget`: Replace the default React component for any widget (side panel, drawer, modal).
    *   `args`: Default `ReactComponent` of the widget.
    *   `props`: `{ session: AbstractSessionModel, model: WidgetModel }`
-   `Core-extraFeaturePanel`: Add additional panels to the Feature Detail Widget.
    *   Returns an object `{ name: string, Component: React.ReactComponent }`
    *   `props`: `{ model: BaseFeatureWidget, feature: Record<string, unknown>, session: AbstractSessionModel }`
-   `Core-preProcessTrackConfig`: Pre-process a track's configuration snapshot before it's used.
    *   `args`: `SnapshotIn<AnyConfigurationModel>` (copy of current track config).
    *   Returns a new track config snapshot.
-   `Core-layoutTree`: Overwrite the layout tree logic for managing detail panel arrangement.
-   `LaunchView-LinearGenomeView`: Customizes how a `LinearGenomeView` is launched.
    *   `args`: `{ session: AbstractSessionModel, assembly: string, loc: string, tracks: string[] }`
-   `LaunchView-CircularView`: Customizes how a `CircularView` is launched.
    *   `args`: `{ session: AbstractSessionModel, assembly: string, tracks: string[] }`
-   `LaunchView-SvInspectorView`: Customizes how an `SvInspectorView` is launched.
    *   `args`: `{ session: AbstractSessionModel, assembly: string, uri: string, fileType?: string }`
-   `LaunchView-SpreadsheetView`: Customizes how a `SpreadsheetView` is launched.
    *   `args`: `{ session: AbstractSessionModel, assembly: string, uri: string, fileType?: string }`
-   `LaunchView-DotplotView`: Customizes how a `DotplotView` is launched.
    *   `args`: `{ session: AbstractSessionModel, views: { loc: string, assembly: string, tracks?: string[] }[], tracks: string[] }`
-   `LaunchView-LinearSyntenyView`: Customizes how a `LinearSyntenyView` is launched.
    *   `args`: `{ session: AbstractSessionModel, views: { loc: string, assembly: string, tracks?: string[] }[], tracks: string[] }`
-   `LinearGenomeView-TracksContainer`: Allows rendering a custom component as a child of the `LinearGenomeView`'s "TracksContainer".
    *   `args`: `React.ReactNode[]` (array of rendered React components).
    *   `props`: `{ model: LinearGenomeViewModel }`
## Jexl Expressions API

JBrowse2 uses Jexl (JavaScript Expression Language) for dynamic configuration.

### Jexl in Configuration

Jexl expressions allow configuration values to be dynamically computed based on runtime data (e.g., feature properties, track state).


```json
{
  "type": "VariantTrack",
  "displays": [
    {
      "type": "LinearVariantDisplay",
      "renderer": {
        "type": "SvgFeatureRenderer",
        "color": "jexl:get(feature, 'type') === 'SNV' ? 'green' : 'red'" // Example Jexl expression
      }
    }
  ]
}
```


### Adding Custom Jexl Functions

Plugins can extend Jexl with custom functions available in configuration.


```typescript
// In plugin configure() method
pluginManager.jexl.addFunction('myFunction', (feature: any, track: any) => {
  // Custom logic
  return feature.name.toUpperCase() // Example: Transform feature name
})

// Example usage in configuration:
// {
//   "color": "jexl:myFunction(feature, track)"
// }
```


## Best Practices

### Code Organization

-   **Separate concerns**: Keep state models, React components, and configuration separate.
-   **Use TypeScript**: Leverage type safety for robust development.
-   **Follow naming conventions**: Use consistent naming for pluggable elements.
-   **Document APIs**: Add JSDoc comments for public APIs, classes, methods, and properties.

### Performance

-   **Use web workers**: For computationally intensive renderers and data processing.
-   **Implement virtualization**: For large datasets to render only visible parts.
-   **Optimize re-renders**: Use MobX observers appropriately and minimize unnecessary updates.
-   **Lazy load**: Load heavy components or data only when genuinely needed.

### Configuration

-   **Provide sensible defaults**: Make plugins functional out-of-the-box.
-   **Use Jexl callbacks**: For dynamic configuration based on contextual data.
-   **Validate inputs**: Use configuration schema validation to prevent invalid settings.
-   **Document options**: Provide clear descriptions for all configuration slots.

### Error Handling

-   **Graceful degradation**: Handle missing data or errors gracefully to maintain application stability.
-   **User feedback**: Show loading states, error messages, and success notifications.
-   **Logging**: Use console for debugging during development (remove or reduce verbosity in production).
-   **Type safety**: Utilize TypeScript to catch potential errors at compile time.



## Issues and Solutions

### Assembly Display Names
**Issue**: Get assembly dropdowns friendly names.

**Solution**: Use `assembly.getConf()` method and implement pattern matching for common assemblies:

```typescript
// Helper function to extract friendly assembly name
export function getAssemblyDisplayName(assembly: any): string {
  try {
    const displayName = assembly.getConf ? assembly.getConf('displayName') : ''
    const assemblyCode = assembly.getConf ? assembly.getConf('name') : assembly.name

    // Check if displayName is actually different from name (meaning it's a friendly name)
    if (displayName && String(displayName).trim() !== '' && displayName !== assemblyCode) {
      return String(displayName)
    }

    // Look for common assembly patterns and create friendly names
    const name = String(assemblyCode || assembly.name || '').toLowerCase()
    
    if (name.includes('hg19') || name === 'grch37') {
      return 'Homo sapiens (hg19)'
    } else if (name.includes('hg38') || name === 'grch38') {
      return 'Homo sapiens (hg38)'
    } else if (name.includes('mm10')) {
      return 'Mus musculus (mm10)'
    } else if (name.includes('mm39')) {
      return 'Mus musculus (mm39)'
    }

    return String(assemblyCode || assembly.name || 'Unknown Assembly')
  } catch (error) {
    console.error('Error reading assembly configuration:', error)
    return String(assembly.name || assembly.id || 'Unknown Assembly')
  }
}
```

**Key Points**:
- Never access `assembly.displayName` directly - it returns configuration slot objects
- Use `assembly.getConf('displayName')` to get the actual value
- Implement fallback patterns for common assembly codes
- Always handle errors and provide fallbacks