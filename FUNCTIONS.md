// JBrowse2 Plugin Function Documentation

## Description

This document provides comprehensive documentation for all functions in the JBrowse2 Rich Annotations Plugin, organized by view type and functionality.

## Plugin Overview

The plugin provides two main views for genomic feature visualization:
- **ImageGalleryView**: Image display and organization
- **TextualDescriptionsView**: Markdown document rendering with interactive diagrams

---

## ImageGalleryView Functions

### `updateFeature()`
**File**: `src/ImageGalleryView/stateModel.ts`
**Purpose**: Updates the selected feature and associated images
**Parameters**: 
- `featureId` (string): Unique identifier for the feature
- `featureType` (FeatureType): Gene or non-gene classification
- `images` (string): Comma-separated list of image URLs
- `labels` (string): Comma-separated list of image labels
- `types` (string): Comma-separated list of image types

---

## TextualDescriptionsView Functions

### `fetchContent()`
**File**: `src/TextualDescriptionsView/components/Explainers.tsx`
**Purpose**: Async loading of markdown documents from URLs
**Parameters**: 
- `urls` (string[]): Array of markdown document URLs
**Returns**: Combined markdown content with separators

### `loadContent()`
**File**: `src/TextualDescriptionsView/components/Explainers.tsx` (lines 536-572)
**Purpose**: Effect hook for loading and combining markdown content from multiple URLs
**Dependencies**: Triggered by changes in `model.featureMarkdownUrls` or `model.selectedFeatureId`

---

## Cytoscape Integration Functions

### `NewickTreeRenderer`
**File**: `src/TextualDescriptionsView/components/Explainers.tsx` (lines 196-438)
**Purpose**: Main React component for rendering Newick format phylogenetic trees
**Features**:
- Parses square bracket comments for titles and descriptions
- Converts phylojs tree structures to cytoscape elements
- Uses Klay layout algorithm for optimal tree positioning
- Supports interactive zooming and panning

### `convertNode()`
**File**: `src/TextualDescriptionsView/components/Explainers.tsx` (lines 269-300)
**Purpose**: Recursively converts phylojs tree nodes to cytoscape elements
**Parameters**:
- `node` (phylojs.Node): Source tree node
- `parentId` (string | null): Parent node identifier for edge creation
**Returns**: Current node ID for edge linking

### `renderTree()`
**File**: `src/TextualDescriptionsView/components/Explainers.tsx` (lines 204-391)
**Purpose**: Main async function for tree rendering workflow
**Steps**:
1. Parse title/description from square bracket comments
2. Clean newick data for phylojs parsing
3. Convert tree structure to cytoscape format
4. Initialize cytoscape with Klay layout
5. Apply styling and enable interactions

---

## Cytoscape Visualization Components

### `CytoscapeDirectRender`
**File**: `src/TextualDescriptionsView/components/Explainers.tsx` (lines 51-150)
**Purpose**: Interactive cytoscape diagram renderer for JSON format
**Features**:
- Direct JSON format processing
- Breadthfirst layout algorithm
- Custom node and edge styling
- Container management and error handling

### `CytoscapeDiagram`
**File**: `src/TextualDescriptionsView/components/Explainers.tsx` (lines 152-193)
**Purpose**: Simple test/debug component for flowchart content
**Usage**: Development and debugging of container references

---

## Markdown Processing

### `MarkdownComponents.code`
**File**: `src/TextualDescriptionsView/components/Explainers.tsx` (lines 441-500)
**Purpose**: Custom code block renderer that handles special visualization formats
**Supported Languages**:
- `cytoscape`: JSON format diagrams
- `newick`: Phylogenetic tree format
- Standard syntax highlighting for other languages

---

## Main Plugin Functions

### `TextualDescriptionsViewF`
**File**: `src/TextualDescriptionsView/components/Explainers.tsx` (lines 533-603)
**Purpose**: Main observer component for textual descriptions view
**Features**:
- MobX state observation
- Async content loading
- Error handling and loading states
- Conditional rendering based on content availability

---

## Styling and Layout

### Phylogenetic Tree Styling
**File**: `src/TextualDescriptionsView/components/Explainers.tsx` (lines 318-354)
**Purpose**: Defines visual styling for phylogenetic trees
**Features**:
- Pastel color scheme for nodes
- Differentiated styling for leaf vs internal nodes
- Text wrapping and label management

### Cytoscape Layout Configuration
**File**: `src/TextualDescriptionsView/components/Explainers.tsx` (lines 362-373)
**Purpose**: Klay layout settings for phylogenetic trees
**Settings**:
- Right-directed tree flow
- Orthogonal edge routing
- Optimized spacing and padding

---

## Plugin Registration and Management

### Plugin Class (`RichAnnotationsPlugin`)
**File**: `src/index.ts`
**Purpose**: Main plugin class with view registration and management
**Key Methods**:
- `install()`: Registers both view types with plugin manager
- `configure()`: Adds menu items for manual view creation

### View Type Registration
**File**: `src/index.ts`
**Registration**:
- `ImageGalleryViewType` - Registers ImageGalleryView
- `TextualDescriptionsViewType` - Registers TextualDescriptionsView
**Auto-activation**: Uses autorun to monitor feature selection and automatically open appropriate views

### State Models
**Files**: 
- `src/ImageGalleryView/stateModel.ts`
- `src/TextualDescriptionsView/stateModel.ts`
**Purpose**: MobX state tree models for view state management
**Features**: Feature tracking, content management, view lifecycle methods

## Dependencies Integration

### phylojs Integration
**Purpose**: Parses Newick format phylogenetic trees
**Usage**: `phylojs.readNewick(cleanedData)` returns parsed tree structure
**Features**: Supports standard Newick format with branch lengths and node labels

### cytoscape-klay Integration  
**Purpose**: Advanced graph layout for phylogenetic trees
**Usage**: Professional left-to-right tree layout with orthogonal edge routing
**Benefits**: Clean, publication-ready tree visualizations

### react-markdown Integration
**Purpose**: Renders markdown with custom components
**Extensions**: GitHub Flavored Markdown (remark-gfm)
**Custom Components**: Tables, code blocks, phylogenetic trees, cytoscape diagrams

## Development Guidelines

1. **Function Documentation**: All functions include TypeScript types and JSDoc comments
2. **Error Handling**: Comprehensive error handling with user-friendly messages  
3. **Performance**: Lazy loading, intersection observers, and dynamic imports
4. **Accessibility**: Proper ARIA labels and semantic HTML structure
5. **Testing**: All functions designed to be testable with clear inputs/outputs

## Adding New Visualization Types

To add a new visualization type (e.g., `protein-structure`):

1. Create renderer component following `NewickTreeRenderer` pattern
2. Add language detection in `MarkdownComponents.code`
3. Route to new renderer in the language switch statement
4. Update README.md with usage documentation
5. Add tests in `/tests/` directory