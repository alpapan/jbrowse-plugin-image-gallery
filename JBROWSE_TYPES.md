# JBrowse 2 Type Definitions

This document provides a comprehensive reference for JBrowse 2 TypeScript type definitions. Designed for agentic AI systems to understand and work with JBrowse 2's type system.

## Core Plugin System

### Plugin
Base class for JBrowse 2 plugins.

**Import:** `import Plugin from '@jbrowse/core/Plugin'`

**Usage:**
```typescript
export default class MyPlugin extends Plugin {
  name = 'MyPlugin'
  install(pluginManager: PluginManager): void {
    // Plugin installation logic
  }
}
```

### PluginManager
Central registry for plugins and pluggable elements.

**Import:** `import PluginManager from '@jbrowse/core/PluginManager'`

**Key Methods:**
- `addPlugin(plugin: Plugin)` - Register a plugin
- `getElementType(group: string, name: string)` - Get pluggable element type
- `jbrequire(lib: string)` - Load JBrowse internal dependencies

## Pluggable Element Types

### AdapterType
Defines data adapter types for loading genomic data.

**Import:** `import AdapterType from '@jbrowse/core/pluggableElementTypes/AdapterType'`

**Usage:**
```typescript
const adapterType = new AdapterType({
  name: 'MyAdapter',
  configSchema: myConfigSchema,
  getAdapterClass: () => MyAdapterClass
})
```

### TrackType
Defines track types that can display data.

**Import:** `import TrackType from '@jbrowse/core/pluggableElementTypes/TrackType'`

**Usage:**
```typescript
const trackType = new TrackType({
  name: 'MyTrack',
  stateModel: myTrackModel,
  configSchema: myConfigSchema
})
```

### ViewType
Defines view types for displaying tracks.

**Import:** `import ViewType from '@jbrowse/core/pluggableElementTypes/ViewType'`

**Usage:**
```typescript
const viewType = new ViewType({
  name: 'MyView',
  stateModel: myViewModel,
  ReactComponent: MyViewComponent
})
```

### DisplayType
Defines display types for rendering track data.

**Import:** `import DisplayType from '@jbrowse/core/pluggableElementTypes/DisplayType'`

**Usage:**
```typescript
const displayType = new DisplayType({
  name: 'MyDisplay',
  stateModel: myDisplayModel,
  trackType: 'MyTrack',
  viewType: 'MyView',
  ReactComponent: MyDisplayComponent
})
```

### WidgetType
Defines widget types for UI components.

**Import:** `import WidgetType from '@jbrowse/core/pluggableElementTypes/WidgetType'`

**Usage:**
```typescript
const widgetType = new WidgetType({
  name: 'MyWidget',
  stateModel: myWidgetModel,
  ReactComponent: MyWidgetComponent
})
```

## Configuration System

### ConfigurationSchema
Defines configuration schemas for plugins and components.

**Import:** `import { ConfigurationSchema } from '@jbrowse/core/configuration'`

**Usage:**
```typescript
const configSchema = ConfigurationSchema('MyConfig', {
  mySetting: {
    type: 'string',
    defaultValue: 'default'
  }
})
```

### AnyConfigurationModel
Type for any configuration model instance.

**Import:** `import type { AnyConfigurationModel } from '@jbrowse/core/configuration'`

### readConfObject
Function to read configuration values safely.

**Import:** `import { readConfObject } from '@jbrowse/core/configuration'`

**Usage:**
```typescript
const value = readConfObject(config, 'mySetting')
const nestedValue = readConfObject(config, ['parent', 'child'])
```

## Data Adapters

### BaseAdapter
Base class for all data adapters.

**Import:** `import { BaseAdapter } from '@jbrowse/core/data_adapters/BaseAdapter'`

**Key Methods:**
- `getConf(path: string)` - Get configuration value
- `freeResources(region)` - Clean up resources

### BaseFeatureDataAdapter
Base class for feature data adapters.

**Import:** `import { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter'`

**Key Methods:**
- `getFeatures(region, opts?)` - Get features as Observable
- `getRefNames(opts?)` - Get reference sequence names
- `hasDataForRefName(refName, opts?)` - Check if data exists for ref

### BaseOptions
Common options for data adapter operations.

**Import:** `import type { BaseOptions } from '@jbrowse/core/data_adapters/BaseAdapter'`

**Properties:**
- `signal?: AbortSignal` - Abort signal for cancellation
- `sessionId?: string` - Session identifier
- `statusCallback?: (message: string) => void` - Progress callback

## Utility Types

### AbstractSessionModel
Core session model interface.

**Import:** `import type { AbstractSessionModel } from '@jbrowse/core/util/types'`

**Key Properties:**
- `jbrowse` - Root JBrowse model
- `assemblyManager` - Assembly manager instance
- `rpcManager` - RPC manager instance
- `tracks` - Array of track configurations

### AbstractViewModel
Base interface for view models.

**Import:** `import type { AbstractViewModel } from '@jbrowse/core/util/types'`

**Key Properties:**
- `id: string` - Unique view identifier
- `type: string` - View type name
- `width: number` - View width
- `displayName?: string` - Human-readable name

### AbstractTrackModel
Base interface for track models.

**Import:** `import type { AbstractTrackModel } from '@jbrowse/core/util/types'`

**Key Properties:**
- `id: string` - Unique track identifier
- `configuration` - Track configuration model
- `displays` - Array of display models

### Region
Represents a genomic region.

**Import:** `import type { Region } from '@jbrowse/core/util/types'`

**Properties:**
- `refName: string` - Reference sequence name
- `start: number` - Start position (0-based)
- `end: number` - End position (0-based)
- `assemblyName: string` - Assembly name
- `reversed?: boolean` - Whether region is reversed

### Feature
Interface for genomic features.

**Import:** `import type { Feature } from '@jbrowse/core/util/simpleFeature'`

**Key Methods:**
- `get(name: string)` - Get feature attribute
- `id()` - Get unique feature ID
- `parent()` - Get parent feature
- `children()` - Get child features

### ParsedLocString
Parsed location string representation.

**Import:** `import type { ParsedLocString } from '@jbrowse/core/util'`

**Properties:**
- `refName: string` - Reference name
- `start?: number` - Start position
- `end?: number` - End position
- `assemblyName?: string` - Assembly name
- `reversed?: boolean` - Whether reversed

## UI Components

### AssemblySelector
Component for selecting genome assemblies.

**Import:** `import AssemblySelector from '@jbrowse/core/ui/AssemblySelector'`

### Dialog
Base dialog component.

**Import:** `import { Dialog } from '@jbrowse/core/ui'`

### ErrorMessage
Component for displaying error messages.

**Import:** `import ErrorMessage from '@jbrowse/core/ui/ErrorMessage'`

### LoadingEllipses
Loading indicator component.

**Import:** `import LoadingEllipses from '@jbrowse/core/ui/LoadingEllipses'`

## RPC System

### RpcManager
Manages remote procedure calls.

**Import:** `import RpcManager from '@jbrowse/core/rpc/RpcManager'`

**Key Methods:**
- `call(sessionId, functionName, args)` - Make RPC call

### BaseRpcDriver
Base class for RPC drivers.

**Import:** `import BaseRpcDriver from '@jbrowse/core/rpc/BaseRpcDriver'`

## Assembly Management

### AssemblyManager
Manages genome assemblies.

**Import:** `import type { AssemblyManager } from '@jbrowse/core/util'`

**Key Methods:**
- `waitForAssembly(name)` - Get assembly instance
- `assemblyNamesList` - List of assembly names

## Text Search

### TextSearchManager
Manages text search functionality.

**Import:** `import TextSearchManager from '@jbrowse/core/TextSearch/TextSearchManager'`

**Key Methods:**
- `search(args, scope, rankFn)` - Perform text search

### SearchScope
Defines scope for text searches.

**Import:** `import type { SearchScope } from '@jbrowse/core/TextSearch/TextSearchManager'`

**Properties:**
- `assemblyName: string` - Assembly to search
- `tracks?: string[]` - Specific tracks to search
- `includeAggregateIndexes: boolean` - Include aggregate indexes

## Base Feature Widget

### BaseFeatureWidget
Base class for feature detail widgets.

**Import:** `import { stateModelFactory } from '@jbrowse/core/BaseFeatureWidget'`

## Common Patterns

### Getting Session from Model
```typescript
import { getSession } from '@jbrowse/core/util'

const session = getSession(myModel)
```

### Accessing Configuration
```typescript
import { readConfObject } from '@jbrowse/core/configuration'

const configValue = readConfObject(trackConfig, 'adapter')
```

### Working with Regions
```typescript
import type { Region } from '@jbrowse/core/util/types'

const region: Region = {
  refName: 'chr1',
  start: 1000,
  end: 2000,
  assemblyName: 'hg19'
}
```

### Feature Iteration
```typescript
import type { Feature } from '@jbrowse/core/util/simpleFeature'

features.subscribe(feature => {
  const id = feature.id()
  const start = feature.get('start')
  const end = feature.get('end')
## Additional Essential Types

### BaseViewModel
Base model for all view types.

**Import:** `import BaseViewModel from '@jbrowse/core/pluggableElementTypes/models/BaseViewModel'`

**Key Properties:**
- `id: string` - Unique view identifier
- `displayName?: string` - Human-readable name
- `width: number` - View width
- `minimized: boolean` - Whether view is minimized

### createBaseTrackModel
Factory function to create base track models.

**Import:** `import { createBaseTrackModel } from '@jbrowse/core/pluggableElementTypes/models/BaseTrackModel'`

**Usage:**
```typescript
const trackModel = createBaseTrackModel(pluginManager, 'MyTrack', configSchema)
```

### createBaseTrackConfig
Factory function to create base track configuration schemas.

**Import:** `import { createBaseTrackConfig } from '@jbrowse/core/pluggableElementTypes/models/baseTrackConfig'`

**Usage:**
```typescript
const baseConfig = createBaseTrackConfig(pluginManager)
```

### SessionWithWidgets
Session model with widget management capabilities.

**Import:** `import type { SessionWithWidgets } from '@jbrowse/core/util'`

**Key Methods:**
- `addWidget(typeName, id, initialState?)` - Add a widget
- `showWidget(widget)` - Show a widget
- `hideWidget(widget)` - Hide a widget

### isAbstractMenuManager
Type guard for menu manager interface.

**Import:** `import { isAbstractMenuManager } from '@jbrowse/core/util'`

**Usage:**
```typescript
if (isAbstractMenuManager(pluginManager.rootModel)) {
  // Can use menu management methods
}
```

### ObservableCreate
Creates RxJS observables for data streaming.

**Import:** `import { ObservableCreate } from '@jbrowse/core/util/rxjs'`

**Usage:**
```typescript
const observable = ObservableCreate<Feature>((observer) => {
  // Emit features
  observer.next(feature)
  observer.complete()
})
```

### QuickLRU
## MobX State Tree Types (External but Essential)

### types
MobX State Tree type constructors.

**Import:** `import { types } from 'mobx-state-tree'`

**Common Usage:**
```typescript
const MyModel = types.model({
  id: types.identifier,
  name: types.string,
  count: types.number
})
```

### Instance
Gets the instance type of an MST model.

**Import:** `import type { Instance } from 'mobx-state-tree'`

**Usage:**
```typescript
type MyModelInstance = Instance<typeof MyModel>
```

### addDisposer
Adds cleanup functions to MST models.

**Import:** `import { addDisposer } from 'mobx-state-tree'`

**Usage:**
```typescript
addDisposer(self, autorun(() => {
  // Reactive logic that gets cleaned up
}))
```

### cast
Type-safe casting for MST arrays and maps.

**Import:** `import { cast } from 'mobx-state-tree'`

**Usage:**
```typescript
self.items = cast(['item1', 'item2'])
```
LRU cache implementation for performance optimization.

**Import:** `import QuickLRU from '@jbrowse/core/util/QuickLRU'`
This reference covers the core type definitions used in JBrowse 2 plugin development, including types identified from the official type definitions and cross-referenced with example plugins. For complete API documentation, refer to the official JBrowse 2 documentation.

**Usage:**
```typescript
const cache = new QuickLRU({ maxSize: 200 })
cache.set('key', 'value')
```

### getParentRenderProps
Gets rendering properties from parent components.

**Import:** `import { getParentRenderProps } from '@jbrowse/core/util/tracks'`

**Usage:**
```typescript
const renderProps = getParentRenderProps(self)
```

### ConfigurationReference
Creates configuration schema references.

**Import:** `import { ConfigurationReference } from '@jbrowse/core/configuration/configurationSchema'`

**Usage:**
```typescript
const configRef = ConfigurationReference(mySchema)
```
})
```

This reference covers the core type definitions used in JBrowse 2 plugin development. For complete API documentation, refer to the official JBrowse 2 documentation.