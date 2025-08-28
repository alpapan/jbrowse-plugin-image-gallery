# JBrowse2 Plugin Development Guide for AI Agents

This comprehensive guide provides AI agents with detailed information about developing plugins for JBrowse2, covering all major APIs, concepts, and best practices.

## Table of Contents

1. [JBrowse2 Architecture Overview](#jbrowse2-architecture-overview)
2. [Plugin Development Fundamentals](#plugin-development-fundamentals)
3. [Pluggable Elements](#pluggable-elements)
4. [View Types](#view-types)
5. [Track Types](#track-types)
6. [Display Types](#display-types)
7. [Adapter Types](#adapter-types)
8. [Renderer Types](#renderer-types)
9. [Widget Types](#widget-types)
10. [Session Management](#session-management)
11. [Configuration System](#configuration-system)
12. [Extension Points](#extension-points)
13. [Jexl Expressions](#jexl-expressions)
14. [Development Workflow](#development-workflow)
15. [Best Practices](#best-practices)

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
  }

  configure(pluginManager: PluginManager) {
    // Set up autoruns, Jexl functions, extension points
  }
}
```

### Plugin Template

Use the [jbrowse-plugin-template](https://github.com/GMOD/jbrowse-plugin-template) for new plugins:

```bash
git clone https://github.com/GMOD/jbrowse-plugin-template.git my-plugin
cd my-plugin
yarn install
yarn setup  # Sets up local JBrowse instance
yarn start  # Runs plugin in development mode
yarn browse # Runs JBrowse with plugin loaded
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

## View Types

Views are high-level containers that can display arbitrary content. They extend the base view functionality.

### Creating a Custom View

```typescript
// src/MyCustomView/index.ts
import { ConfigurationSchema } from '@jbrowse/core/configuration'
import PluginManager from '@jbrowse/core/PluginManager'
import { ViewType } from '@jbrowse/core/pluggableElementTypes'
import { types } from 'mobx-state-tree'

export const configSchema = ConfigurationSchema('MyCustomView', {
  // Configuration slots
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

## Track Types

Tracks are high-level concepts that control what data to display and how. They combine adapters, displays, and renderers.

### Creating a Custom Track

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

## Display Types

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
})
```

## Adapter Types

Adapters parse data from various formats and sources.

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

## Renderer Types

Renderers handle the actual drawing of features. They can run in the main thread, web workers, or server-side.

### Renderer Architecture

- **Feature Renderers**: Draw individual features
- **Pileup Renderers**: Draw stacked alignments
- **Quantitative Renderers**: Draw wiggle plots
- **Comparative Renderers**: Draw synteny/contact data

### Creating a Renderer

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
})
```

## Widget Types

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
    // Widget state
  })
  .actions(self => ({
    // Widget actions
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
})
```

## Session Management

Sessions manage the user's working environment, including views, tracks, and global state.

### Session Model Structure

```typescript
interface BaseSessionModel {
  id: string
  name: string
  margin: number

  // Core functionality
  setSelection(thing: unknown): void
  clearSelection(): void
  setHovered(thing: unknown): void

  // Views management
  addView(viewType: string, config: any): AbstractViewModel
  removeView(view: AbstractViewModel): void
  views: AbstractViewModel[]

  // Tracks management
  addTrack(trackConfig: any): TrackModel
  removeTrack(track: TrackModel): void
  tracks: TrackModel[]

  // Widgets
  addWidget(widgetType: string, id: string, config: any): WidgetModel
  removeWidget(widget: WidgetModel): void
  showWidget(widget: WidgetModel): void

  // Configuration
  configuration: JBrowseConfigModel
  assemblies: AssemblyModel[]
}
```

### Working with Sessions

```typescript
// Get current session
const session = getSession(model)

// Add a view
const view = session.addView('LinearGenomeView', {
  assembly: 'hg38',
  loc: 'chr1:1-100000'
})

// Add a track
const track = session.addTrack({
  type: 'VariantTrack',
  trackId: 'my-vcf',
  name: 'My VCF',
  assemblyNames: ['hg38'],
  adapter: {
    type: 'VcfAdapter',
    vcfLocation: { uri: 'data.vcf.gz', locationType: 'UriLocation' }
  }
})

// Show a widget
const widget = session.addWidget('FeatureDetailWidget', 'feature-detail', {
  feature: selectedFeature
})
session.showWidget(widget)
```

## Configuration System

JBrowse2 uses a typed configuration system with slots and schemas.

### Configuration Slot Types

- `string`: Text input
- `number`/`integer`: Numeric input
- `boolean`: Checkbox
- `color`: Color picker
- `stringEnum`: Dropdown selection
- `fileLocation`: File/URL input
- `frozen`: Arbitrary JSON
- `text`: Multi-line text
- `stringArray`: List of strings
- `stringArrayMap`: Key-value pairs

### Creating Configuration Schemas

```typescript
import { ConfigurationSchema } from '@jbrowse/core/configuration'

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

  // Sub-schema
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

```typescript
import { readConfObject } from '@jbrowse/core/configuration'

// Read simple value
const name = readConfObject(config, 'name')

// Read nested value
const threshold = readConfObject(config, ['advanced', 'threshold'])

// Read with context variables (for Jexl callbacks)
const color = readConfObject(config, 'color', { feature })
```

## Extension Points

Extension points allow plugins to register callbacks that are executed at specific times.

### Using Extension Points

```typescript
// Producer: Evaluate extension point
const result = pluginManager.evaluateExtensionPoint(
  'MyExtensionPoint',
  initialValue,
  context
)

// Consumer: Register callback
pluginManager.addToExtensionPoint(
  'MyExtensionPoint',
  (value, context) => {
    // Process value
    return modifiedValue
  }
)
```

### Common Extension Points

- `Core-extendPluggableElement`: Extend pluggable element models
- `Core-guessAdapterForLocation`: Infer adapter from file location
- `Core-guessTrackTypeForLocation`: Infer track type from file location
- `Core-replaceAbout`: Replace about dialog
- `Core-extraAboutPanel`: Add about dialog panels
- `Core-replaceWidget`: Replace widget components
- `Core-extraFeaturePanel`: Add feature detail panels
- `LaunchView-LinearGenomeView`: Launch linear genome view
- `Core-preProcessTrackConfig`: Pre-process track configuration

## Jexl Expressions

JBrowse2 uses Jexl (JavaScript Expression Language) for dynamic configuration.

### Jexl in Configuration

```json
{
  "type": "VariantTrack",
  "displays": [
    {
      "type": "LinearVariantDisplay",
      "renderer": {
        "type": "SvgFeatureRenderer",
        "color": "jexl:get(feature, 'type') === 'SNV' ? 'green' : 'red'"
      }
    }
  ]
}
```

### Adding Custom Jexl Functions

```typescript
// In plugin configure() method
pluginManager.jexl.addFunction('myFunction', (feature, track) => {
  // Custom logic
  return feature.name.toUpperCase()
})

// Use in configuration
{
  "color": "jexl:myFunction(feature, track)"
}
```

## Development Workflow

### Setting Up Development Environment

1. **Clone plugin template**
   ```bash
   git clone https://github.com/GMOD/jbrowse-plugin-template.git my-plugin
   cd my-plugin
   yarn install
   ```

2. **Set up JBrowse**
   ```bash
   yarn setup
   ```

3. **Start development**
   ```bash
   yarn start  # Plugin development server
   yarn browse # JBrowse with plugin
   ```

### Testing

- **Integration Tests**: Use Cypress for end-to-end testing
- **Unit Tests**: Use Jest for component testing
- **Manual Testing**: Test in browser with development server

### Building for Production

```bash
yarn build
```

### Publishing to NPM

```bash
yarn publish
```

### Adding to Plugin Store

1. Fork [jbrowse-plugin-list](https://github.com/GMOD/jbrowse-plugin-list)
2. Add plugin to `plugins.json`
3. Submit pull request

## Best Practices

### Code Organization

- **Separate concerns**: Keep state models, React components, and configuration separate
- **Use TypeScript**: Leverage type safety
- **Follow naming conventions**: Use consistent naming for pluggable elements
- **Document APIs**: Add JSDoc comments for public APIs

### Performance

- **Use web workers**: For computationally intensive renderers
- **Implement virtualization**: For large datasets
- **Optimize re-renders**: Use MobX observers appropriately
- **Lazy load**: Load heavy components only when needed

### Configuration

- **Provide sensible defaults**: Make plugins work out-of-the-box
- **Use Jexl callbacks**: For dynamic configuration
- **Validate inputs**: Use configuration schema validation
- **Document options**: Clear descriptions for all config slots

### Error Handling

- **Graceful degradation**: Handle missing data gracefully
- **User feedback**: Show loading states and error messages
- **Logging**: Use console for debugging (remove in production)
- **Type safety**: Use TypeScript to catch errors at compile time

### Testing

- **Write integration tests**: Test complete user workflows
- **Mock external APIs**: For reliable testing
- **Test configuration**: Verify config schemas work correctly
- **Cross-browser testing**: Test in supported browsers

### Documentation

- **README**: Include setup and usage instructions
- **Code comments**: Document complex logic
- **Configuration examples**: Show common use cases
- **API documentation**: Document public methods

This guide covers the essential concepts and APIs for developing JBrowse2 plugins. For more detailed examples, refer to the [JBrowse2 developer documentation](https://jbrowse.org/jb2/docs/) and existing plugin repositories.</content>
</details>
</use_mcp_tool>