# Agent Rules Standard (AGENT.md)

Guide for JBrowse2 plugin development with correct patterns and common fixes.

If you need the jbrowse2 documentation, use the mcp file system with this path {  "path": "/projects/jbrowse-components/website/docs"}. 

If needed the source code is on github. https://github.com/GMOD/jbrowse-components/tree/main/packages/core
The models: https://github.com/GMOD/jbrowse-components/blob/main/packages/core/pluggableElementTypes/models/index.ts
for example the base track config: https://github.com/GMOD/jbrowse-components/blob/main/packages/core/pluggableElementTypes/models/baseTrackConfig.ts


# JBrowse2 Plugin Development API Reference

## Core JBrowse2 API Rules

### Configuration Access - CRITICAL

**NEVER access properties directly:**
```typescript
// ❌ WRONG - API violations
track.assemblyNames
track.adapter
assembly.name
assembly.displayName

// ✅ CORRECT - Use proper APIs
readConfObject(track, 'assemblyNames')
readConfObject(track, 'adapter') 
assembly.getConf('name')
assembly.getConf('displayName')
```

**Always use these APIs:**
- `readConfObject(config, 'propertyName')` for all configuration access
- `assembly.getConf('propertyName')` for assembly properties
- `getSession(model)` for session access

### Fallback Method Pattern

**Use multiple methods when one fails:**
```typescript
// Try readConfObject first, then getConf as fallback
let trackAssemblyId: string | undefined
try {
  const assemblyNames = readConfObject(track, 'assemblyNames')
  trackAssemblyId = Array.isArray(assemblyNames) ? assemblyNames[0] : assemblyNames
} catch (e) {
  // Fallback to getConf method
  if (typeof track.getConf === 'function') {
    const assemblyNames = track.getConf('assemblyNames')
    trackAssemblyId = Array.isArray(assemblyNames) ? assemblyNames[0] : assemblyNames
  }
}
```

### Array vs Single Value Handling

**Handle both array and single values:**
```typescript
// assemblyNames can be string[] or string
const assemblyNames = readConfObject(track, 'assemblyNames')
const trackAssemblyId = Array.isArray(assemblyNames) ? assemblyNames[0] : assemblyNames
```

### MobX-State-Tree Model Patterns

**Working MST model structure:**
```typescript
// ✅ CORRECT - Unnamed model with explicit typing
const stateModel: any = types.model({
  id: ElementId as any,
  type: types.literal('MyViewName'),
  // properties...
})
.actions(self => ({
  // actions...
}))
.views(self => ({
  // getters...
}))

export default stateModel
```

**Avoid these patterns:**
```typescript
// ❌ WRONG - Named models cause TypeScript issues
types.model('MyModel', {...})

// ❌ WRONG - Complex type exports cause inference issues
export type MyViewModel = Instance<typeof stateModel>
```

### Dependency Clearing Pattern

**Clear dependent selections when parent changes:**
```typescript
setSelectedAssembly(assemblyId: string | undefined) {
  self.selectedAssemblyId = assemblyId
  // Clear dependent selections when assembly changes
  if (self.selectedTrackId) {
    self.selectedTrackId = undefined
  }
  if (self.selectedFeatureId) {
    self.selectedFeatureId = undefined
    this.clearFeatureContent()
  }
}
```

### Loading States Management

**Proper loading state handling:**
```typescript
.model({
  isLoadingTracks: types.optional(types.boolean, false),
  isLoadingFeatures: types.optional(types.boolean, false),
})
.actions(self => ({
  setLoadingTracks(loading: boolean) {
    self.isLoadingTracks = loading
  },
  
  async loadData() {
    self.setLoadingTracks(true)
    try {
      // Load data
    } catch (error) {
      console.error('Loading failed:', error)
    } finally {
      self.setLoadingTracks(false)
    }
  }
}))
.views(self => ({
  get canSelectTrack() {
    return !!self.selectedAssemblyId && !self.isLoadingTracks
  }
}))
```

### Feature Loading with Text Search

**Use JBrowse2's text search system:**
```typescript
get features() {
  try {
    const session = getSession(self)
    if (!session?.textSearchManager || !self.selectedAssemblyId) {
      return []
    }
    // Return cached search results or empty array
    return []
  } catch (error) {
    console.error('Error accessing text search:', error)
    return []
  }
}
```

### JBrowse2 Text Search System

**Text search operates at two levels:**
1. **Per-track indexes** - track-specific search
2. **Aggregate indexes** - search across multiple tracks

**Track-level text search configuration:**
```typescript
// Tracks have text search configured like:
{
  "trackId": "mytrack",
  "textSearching": {
    "textSearchAdapter": {
      "type": "TrixTextSearchAdapter",
      "textSearchAdapterId": "mytrack-index",
      "ixFilePath": { "uri": "trix/mytrack.ix" },
      "ixxFilePath": { "uri": "trix/mytrack.ixx" },
      "metaFilePath": { "uri": "trix/mytrack_meta.json" }
    },
    "indexingAttributes": ["Name", "ID"],
    "indexingFeatureTypesToExclude": ["CDS", "exon"]
  }
}
```

**Text Search Implementation Pattern:**
```typescript
// Access track's text search adapter, not session.textSearchManager
async searchFeatures(searchTerm: string) {
  if (!searchTerm.trim() || !self.selectedTrackId) {
    return [],..
  }

  try {
    const session = getSession(self)
    const selectedTrack = session.tracks.find(t => t.trackId === self.selectedTrackId)
    
    if (!selectedTrack) {
      return []
    }

    // Check if track has text search configured
    const textSearchConfig = readConfObject(selectedTrack, 'textSearching')
    if (!textSearchConfig?.textSearchAdapter) {
      console.warn('Track has no text search adapter configured')
      return []
    }

    // Use track's text search adapter for searching
    // Implementation depends on adapter type (TrixTextSearchAdapter, etc.)
    
    return []
  } catch (error) {
    console.error('Error performing text search:', error)
    return []
  }
}
```

**Common text search adapters:**
- `TrixTextSearchAdapter` - Modern trix format (.ix, .ixx, meta.json files)  
- `JBrowse1TextSearchAdapter` - Backward compatibility with JBrowse1

**Text search configuration slots:**
- `textSearching.textSearchAdapter` - The search adapter configuration
- `textSearching.indexingAttributes` - Attributes to index (default: ['Name', 'ID'])
- `textSearching.indexingFeatureTypesToExclude` - Feature types to exclude (default: ['CDS', 'exon'])

### Assembly Display Names

**Correct assembly name handling:**
```typescript
export function getAssemblyDisplayName(assembly: any): string {
  try {
    const displayName = assembly.getConf ? assembly.getConf('displayName') : ''
    const assemblyCode = assembly.getConf ? assembly.getConf('name') : assembly.name

    if (displayName && String(displayName).trim() !== '' && displayName !== assemblyCode) {
      return String(displayName)
    }

    // Pattern matching for common assemblies
    const name = String(assemblyCode || assembly.name || '').toLowerCase()
    if (name.includes('hg19') || name === 'grch37') {
      return 'Homo sapiens (hg19)'
    } else if (name.includes('hg38') || name === 'grch38') {
      return 'Homo sapiens (hg38)'
    }

    return String(assemblyCode || assembly.name || 'Unknown Assembly')
  } catch (error) {
    console.error('Error reading assembly configuration:', error)
    return String(assembly.name || assembly.id || 'Unknown Assembly')
  }
}
```

## Session Management

**Access session and its properties:**
```typescript
const session = getSession(self)
const assemblies = session.assemblies || []
const tracks = session.tracks || []
const textSearchManager = session.textSearchManager
```

## Track Filtering

**Filter tracks by assembly and adapter compatibility:**
```typescript
const filteredTracks = session.tracks.filter((track: any) => {
  try {
    // Get assembly names using proper API
    const assemblyNames = readConfObject(track, 'assemblyNames')
    const trackAssemblyId = Array.isArray(assemblyNames) ? assemblyNames[0] : assemblyNames
    
    // Get adapter type using proper API  
    const adapter = readConfObject(track, 'adapter')
    const adapterType = adapter ? readConfObject(adapter, 'type') : undefined
    
    // Check assembly match
    if (!trackAssemblyId || trackAssemblyId !== self.selectedAssemblyId) {
      return false
    }
    
    // Check adapter compatibility
    const COMPATIBLE_TYPES = ['Gff3Adapter', 'Gff3TabixAdapter', 'GtfAdapter', 'BedAdapter', 'GeneFeaturesAdapter']
    return typeof adapterType === 'string' && COMPATIBLE_TYPES.includes(adapterType)
  } catch (error) {
    console.error('Error checking track configuration:', error)
    return false
  }
})
```

## Safe Navigation Patterns

**Always use optional chaining:**
```typescript
// ✅ CORRECT - Safe navigation
const session = getSession(self)
const tracks = session?.tracks || []
const trackName = track?.getConf?.('name') || track?.trackId

// ✅ CORRECT - Nullish coalescing for better type safety
get hasContent() {
  return !!(self.featureMarkdownUrls && self.featureMarkdownUrls.trim() !== '')
}
```

## Common API Violations to Fix

### 1. Direct Property Access
```typescript
// ❌ WRONG
console.log('Track assembly:', track.assemblyNames)
console.log('Track adapter:', track.adapter) 
console.log('Assembly name:', assembly.name)

// ✅ CORRECT
console.log('Track assembly:', readConfObject(track, 'assemblyNames'))
console.log('Track adapter:', readConfObject(track, 'adapter'))
console.log('Assembly name:', assembly.getConf('name'))
```

### 2. Manual RPC/Adapter Calls
```typescript
// ❌ WRONG - Never do manual RPC calls
rpcManager.call(...)

// ❌ WRONG - Never instantiate adapters manually
const adapter = new AdapterClass(...)

// ✅ CORRECT - Use text search system
const session = getSession(self)
const results = await session.textSearchManager.search(searchTerm, options)
```

### 3. MST Model Structure Issues
```typescript
// ❌ WRONG - Named model with export issues
export const stateModel = types.model('MyView', {...})
export type MyViewModel = Instance<typeof stateModel>

// ✅ CORRECT - Unnamed model with explicit typing
const stateModel: any = types.model({...})
export default stateModel
```

### 4. ESLint Issues
```typescript
// ❌ WRONG - Logical OR can cause issues
return !!(self.featureUrls || self.featureUrls.trim() !== '')

// ✅ CORRECT - Use nullish coalescing and proper checks
return !!(self.featureUrls && self.featureUrls.trim() !== '')

// ✅ CORRECT - Use explicit any with eslint disable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const track: any = session.tracks.find(...)
```

## Required Imports

```typescript
import { ElementId } from '@jbrowse/core/util/types/mst'
import { types } from 'mobx-state-tree'
import { getSession } from '@jbrowse/core/util'
import { readConfObject } from '@jbrowse/core/configuration'
import { MenuItem } from '@jbrowse/core/ui'
```

## Configuration Slot Types

- `string`: Text input
- `number`/`integer`: Numeric input
- `boolean`: Checkbox
- `color`: Color picker
- `stringEnum`: Dropdown selection
- `fileLocation`: File/URL input
- `frozen`: Arbitrary JSON data

## View Base Requirements

Every view must have:
```typescript
.model({
  id: ElementId as any,
  type: types.literal('YourViewType'),
  displayName: types.optional(types.string, 'Default Name'),
  minimized: types.optional(types.boolean, false),
})
.actions(self => ({
  setWidth() {},
  setDisplayName(name: string) { self.displayName = name },
  setMinimized(flag: boolean) { self.minimized = flag },
  closeView() {
    const session = getSession(self)
    if (session?.removeView) {
      session.removeView(self as unknown as Parameters<typeof session.removeView>[0])
    }
  },
}))
.views(self => ({
  menuItems(): MenuItem[] { return [] },
}))
```

## Key Points

1. **Never access JBrowse2 object properties directly**
2. **Always use `readConfObject()` and `getConf()` APIs**
3. **Use unnamed MST models with explicit `any` typing**
4. **Use text search system for feature loading**
5. **Handle errors gracefully with try/catch**
6. **Provide fallback values for all configuration access**
7. **Use optional chaining (?.) and nullish coalescing (??)**
8. **Clear dependent selections when parent selections change**
9. **Manage loading states properly**
10. **Test with `npm run lint -- --fix` and `tsc --noEmit`**