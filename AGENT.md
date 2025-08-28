# JBrowse2 Plugin Development Guide for AI Agents

if you need the jbrowse2 documentation, use the mcp file system with this path {"path": "/projects/jbrowse-components/website/docs"}

## Overview

JBrowse2 is a modular genome browser built on **MST (mobx-state-tree)** architecture. Understanding MST tree connectivity is crucial for plugin development.

## Core Architecture Concepts

### 1. MST (Mobx-State-Tree) Fundamentals

JBrowse2 uses MST for state management, creating a **tree hierarchy** where:
- **Root Model**: Top-level application state
- **Session Model**: Contains views, tracks, assemblies 
- **View Models**: Individual view instances (LinearGenomeView, etc.)

**Critical MST Tree Methods:**
- `getRoot()`: Access root model (contains session)
- `getParent()`: Access immediate parent node
- `getEnv()`: Access environment/context
- `hasParent()`: Check if node has parent connection

### 2. Session Access Patterns

**CORRECT Session Access:**
```typescript
// From any MST node connected to session tree
const session = getRoot(self).session
const session = getSession(self) // utility function

// Access assemblies
session.assemblies         // Array of assembly configurations
session.assemblyManager   // AssemblyManager instance (if exists)
```

**WRONG Session Access:**
```typescript
// These will fail if MST tree not properly connected
(self as any).getRoot?.()?.session  // Returns undefined if isolated
self.session                        // Direct access doesn't exist
```

## Plugin Architecture

### 3. View Type Registration

Views consist of three components:

```typescript
// In plugin's install() method
pluginManager.addViewType(() => {
  return new ViewType({
    name: 'MyCustomView',
    stateModel: myStateModel,        // MST state model
    ReactComponent: MyReactComponent // React UI component
  })
})
```

### 4. State Model Patterns

**BaseViewModel Extension (Recommended):**
```typescript
import { types } from 'mobx-state-tree'
import { BaseViewModel } from '@jbrowse/core/pluggableElementTypes/models/BaseViewModel'

const MyViewModel = BaseViewModel
  .named('MyCustomView')
  .props({
    type: types.literal('MyCustomView'),
    // Custom properties
  })
  .views(self => ({
    // Getters - access session here
    get availableAssemblies() {
      const session = getSession(self)
      return session?.assemblies || []
    }
  }))
  .actions(self => ({
    // Actions/mutations
  }))
```

**Manual MST Model:**
```typescript
const MyViewModel = types
  .model('MyCustomView', {
    id: ElementId,
    type: types.literal('MyCustomView'),
    // other props
  })
  .views(self => ({
    get availableAssemblies() {
      try {
        const session = getRoot(self)?.session
        return session?.assemblies || []
      } catch {
        return []
      }
    }
  }))
```

## Common Issues and Solutions

### 5. MST Tree Connection Problems

**Problem:** `getRoot()` returns `undefined`
**Cause:** View not properly connected to session MST tree
**Debug Signs:**
- `getRoot()` → `undefined`
- `getParent()` → `undefined` 
- `getEnv()` → `undefined`
- View exists as isolated MST node

**Solution:** Views must be added to session via `session.addView()` with proper MST composition

### 6. View Creation Methods

**Automatic Creation (autorun):**
```typescript
// In plugin install() - autoruns when features selected
autorun(() => {
  // Runs automatically, creates connected views
  session.addView('MyView', viewSnapshot)
})
```

**Manual Creation (Add Menu):**
```typescript
// In plugin configure() - triggered by user
pluginManager.rootModel.appendToMenu('Add', {
  label: 'My Custom View',
  onClick: (session: AbstractSessionModel) => {
    session.addView('MyView', {})  // Must ensure MST tree connection
  }
})
```

## Assembly and Track Access

### 7. Assembly Information

```typescript
// From connected view state model
get availableAssemblies() {
  const session = getSession(self)
  if (!session) return []
  
  // Session assemblies (user-added)
  const sessionAssemblies = session.sessionAssemblies || []
  
  // Configuration assemblies
  const configAssemblies = session.assemblies || []
  
  return [...sessionAssemblies, ...configAssemblies]
}
```

### 8. Track Information

```typescript
get availableTracks() {
  const session = getSession(self)
  if (!session?.assemblyManager) return []
  
  const assembly = session.assemblyManager.get(self.selectedAssemblyId)
  if (!assembly) return []
  
  // Get tracks for selected assembly
  return session.tracks.filter(track => 
    track.assemblyNames.includes(assembly.name)
  )
}
```

## Best Practices

### 9. Error Handling

Always wrap session access in try-catch:
```typescript
get availableAssemblies() {
  try {
    const session = getSession(self)
    return session?.assemblies || []
  } catch (error) {
    console.warn('Failed to access session:', error)
    return []
  }
}
```

### 10. Debugging MST Connection

Add temporary debug logging:
```typescript
get availableAssemblies() {
  console.log('=== DEBUG: Session access ===')
  console.log('getRoot():', getRoot(self))
  console.log('getParent():', getParent(self))
  console.log('hasParent():', hasParent(self))
  
  const session = getSession(self)
  console.log('session:', session)
  console.log('assemblies:', session?.assemblies)
  
  return session?.assemblies || []
}
```

### 11. Plugin Structure

```
src/
├── index.ts                 # Plugin registration
├── MyView/
│   ├── stateModel.ts       # MST state model
│   ├── component.tsx       # React component  
│   └── index.ts           # Exports
```

### 12. Essential Imports

```typescript
// Core JBrowse imports
import { types } from 'mobx-state-tree'
import { ViewType } from '@jbrowse/core/pluggableElementTypes'
import { getSession } from '@jbrowse/core/util'
import { BaseViewModel } from '@jbrowse/core/pluggableElementTypes/models/BaseViewModel'
import { ElementId } from '@jbrowse/core/util/types/mst'

// Session types
import { AbstractSessionModel } from '@jbrowse/core/util'
```

## Key Takeaways

1. **MST Tree Connection is Critical**: Views must be properly connected to session tree to access assemblies/tracks
2. **Use getSession() or getRoot().session**: Never access session directly on self
3. **Extend BaseViewModel when possible**: Provides standard view functionality
4. **Handle connection failures gracefully**: Always check if session exists before accessing
5. **Debug MST tree state**: Use getRoot(), getParent(), hasParent() to verify connectivity
6. **Session contains assemblies**: Access via `session.assemblies` array
7. **AssemblyManager provides assembly details**: Use `session.assemblyManager.get(id)`

## Common Session Properties

```typescript
interface Session {
  assemblies: Assembly[]           // Configuration assemblies
  sessionAssemblies: Assembly[]    // Runtime assemblies  
  tracks: Track[]                  // Available tracks
  views: View[]                    // Active views
  assemblyManager: AssemblyManager // Assembly utilities
  addView(type: string, snapshot: any): View
}
```