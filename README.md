# JBrowse Plugin Rich Annotations

A comprehensive JBrowse 2 plugin that provides two complementary views for displaying feature-associated content:

- **SelectImageGalleryView**: Displays images within feature details with automatic loading and organization
- **SelectTextualDescriptionsView**: Renders markdown documents for genomic features with cytoscape diagram support

Both views appear automatically when selecting features with the appropriate data attributes.

![Example](https://github.com/user-attachments/assets/d143551d-769e-448e-8ca4-5f8cec414a34) --


## Testing

If you're testing with the jbrowse plugin suite, this would be the right url to visit after you have
`yarn start` for jbrowse-web, `npm run start` and `npm run browser` for this plugin.

`http://localhost:3000/?config=http%3A%2F%2Flocalhost%3A9000%2Fjbrowse_config.json`

Please make sure you run `jbrowse text-index --perTrack --force` in the .jbrowse directory after you launch your dev environment.

## Installation

### Method 1: Add Plugin via JBrowse plugin store (not yet)

### Method 2: Manual Installation

Option 1:
Go to https://github.com/alpapan/jbrowse-plugin-image-gallery/releases
download the jbrowse-plugin-image-gallery.umd.production.min.js

Option 2:


```bash
git clone https://github.com/alpapan/jbrowse-plugin-image-gallery.git
cd jbrowse-plugin-image-gallery
npm install
# this works on windows too:
npx cross-env NODE_ENV=production npm run build
ls -l dist/jbrowse-plugin-image-gallery.umd.production.min.js
# copy to your jb2 directory
```

Add to your JBrowse 2 config.json:
```json
{
  "plugins": [
    {
      "name": "RichAnnotationsPlugin",
      "url": "./jbrowse-plugin-image-gallery.umd.production.min.js"
    }
  ]
}
```

## Dependencies

This plugin includes the following key dependencies for enhanced functionality:

- `@mui/material` & `@mui/icons-material`: Material-UI components and icons
- `react-markdown` & `remark-gfm`: Markdown rendering with GitHub Flavored Markdown
- `react-syntax-highlighter`: Syntax highlighting for code blocks
- `cytoscape`: Interactive network visualization and diagrams
- `cytoscape-klay`: Advanced graph layout algorithms for phylogenetic trees
- `phylojs`: Lightweight phylogenetic tree parsing and visualization
- `mobx` & `mobx-state-tree`: State management

## Example Configuration


```json
{
  "plugins": [
    {
      "name": "RichAnnotationsPlugin", 
      "url": "/path/to/plugin.js"
    }
  ],

  "assemblies": [
    {
      "name": "hg38",
      "sequence": {
        "type": "ReferenceSequenceTrack",
        "trackId": "hg38_sequence",
        "adapter": {
          "type": "BgzipFastaAdapter",
          "fastaLocation": { "uri": "hg38.fa.gz" },
          "faiLocation": { "uri": "hg38.fa.gz.fai" },
          "gziLocation": { "uri": "hg38.fa.gz.gzi" }
        }
      }
    }
  ],
  "tracks": [
    {
      "type": "FeatureTrack",
      "trackId": "genes_with_content", 
      "name": "Genes with Images and Docs",
      "assemblyNames": ["hg38"],
      "adapter": {
        "type": "Gff3Adapter",
        "gffLocation": { "uri": "genes_with_content.gff3" }        
      }
    }
  ]
}
```

## Creating GFF Files

### SelectImageGalleryView Attributes

#### Required Attributes
- `image` or `images`: comma-separated list of image URLs (use one or the other)

#### Optional Attributes
- `image_group`: comma-separated labels for each image (used as container titles)
- `image_tag`: comma-separated types for each image (displayed as chips below images)

### SelectTextualDescriptionsView Attributes

#### Required Attributes
- `markdown_urls` or `markdown_url`: comma-separated list of markdown document URLs

#### Optional Attributes
- `descriptions` or `description`: comma-separated descriptions for each markdown document
- `content_type` or `content_types`: comma-separated content types (e.g., "tutorial", "analysis", "documentation")

### GFF3 Format Examples

```gff3
##gff-version 3
##sequence-region chr1 1 248956422

# Single image (SelectImageGalleryView)
chr1	source	gene	1000	2000	.	+	.	ID=gene1;image=https://example.com/image.jpg

# Multiple images with labels and types (SelectImageGalleryView)
chr1	source	gene	3000	4000	.	+	.	ID=gene2;image=https://example.com/img1.jpg,https://example.com/img2.png;image_group=Microscopy,Western;image_tag=experimental,analysis

# Single markdown document (SelectTextualDescriptionsView)
chr1	source	gene	5000	6000	.	+	.	ID=gene3;markdown_urls=https://example.com/gene3_docs.md

# Multiple markdown documents with descriptions (SelectTextualDescriptionsView)
chr1	source	gene	7000	8000	.	+	.	ID=gene4;markdown_urls=https://example.com/tutorial.md,https://example.com/analysis.md;descriptions=Tutorial Guide,Functional Analysis;content_type=tutorial,analysis

# Combined: Both images and markdown for the same feature
chr1	source	gene	9000	10000	.	+	.	ID=gene5;image=https://example.com/structure.png;image_group=Structure;markdown_urls=https://example.com/gene5_details.md;descriptions=Detailed Analysis

# Real example with images
chr1	MyLab	gene	1000	2000	.	+	.	ID=LOC100130531;image=https://upload.wikimedia.org/wikipedia/commons/c/ce/Example_image.png;image_group=test_example2;image_tag=general

# Legacy format for images (still supported)
chr1	source	gene	11000	12000	.	+	.	ID=gene6;images=https://example.com/legacy.jpg
```

### Content Requirements

#### Images (SelectImageGalleryView)
- Supported formats: JPG, PNG, GIF, SVG, BMP, WEBP, TIFF, ICO
- URLs must be accessible from the browser
- CORS headers required for cross-domain images

#### Markdown Documents (SelectTextualDescriptionsView)
- Standard markdown format with GitHub Flavored Markdown (GFM) extensions
- URLs must be accessible from the browser
- CORS headers required for cross-domain documents
- Supports tables, code blocks, headings, lists, links, etc.

## Usage

### Automatic Mode (Both Views)
Select any feature with image or markdown data. The appropriate views appear automatically.

### Manual Mode
1. Right-click in view area
2. Select "Add" → "Select Image Gallery View" or "Add" → "Select Textual Descriptions View"

## SelectImageGalleryView Features

- Automatic image display on feature selection
- Lazy loading with intersection observer
- Images grouped by labels in collapsible containers
- Type chips displayed for non-"general" image types
- Fallback placeholder for failed image loads
- Click images to open in new tab

## SelectTextualDescriptionsView Features

- **Markdown Rendering**: Full GitHub Flavored Markdown (GFM) support
- **Syntax Highlighting**: Code blocks with language-specific highlighting
- **Tables**: Responsive table rendering with proper styling
- **Cytoscape Diagrams**: Interactive network diagrams embedded in markdown
- **Phylogenetic Trees**: Interactive evolutionary tree visualization from Newick format
- **Multi-document Support**: Combines multiple markdown files with separators
- **Error Handling**: Clear error messages for failed content loading
- **Responsive Design**: Adapts to different screen sizes

### Markdown Features Supported

- **Headers**: `# ## ### #### ##### ######`
- **Text Formatting**: *italic*, **bold**, ~~strikethrough~~
- **Lists**: Ordered and unordered lists with nesting
- **Links**: `[text](url)` format
- **Images**: `![alt](url)` format (embedded within markdown)
- **Code**: Inline `code` and fenced code blocks with syntax highlighting
- **Tables**: Pipe-delimited tables with alignment
- **Blockquotes**: `> quoted text`
- **Horizontal Rules**: `---` or `***`
- **Task Lists**: `- [ ]` and `- [x]` checkboxes

### Cytoscape Diagrams

SelectTextualDescriptionsView supports interactive cytoscape diagrams embedded in markdown using fenced code blocks:


````markdown
```cytoscape
{
  "elements": [
    { "data": { "id": "gene1", "label": "Gene A"} },
    { "data": { "id": "gene2", "label": "Gene B" } },
    { "data": { "id": "protein1", "label": "Protein X" } },
    { "data": { "source": "gene1", "target": "protein1", "id": "edge1" } },
    { "data": { "source": "gene2", "target": "protein1", "id": "edge2" } }
  ],
  "style": [
    {
      "selector": "node[label*='Gene']",
      "style": { "background-color": "#e74c3c", "shape": "ellipse" }	
    },
    {
      "selector": "node[label*='protein']", 
      "style": { "background-color": "#2ecc71", "shape": "rectangle" }	
    }	
  ]	
}
````

#### Cytoscape Diagram Format

Cytoscape diagrams use JSON format with two main sections:

**Elements Array**: Defines nodes and edges.

- **Nodes**: `{ "data": { "id": "unique_id", "label": "Display Name" } }`
- **Edges**: `{ "data": { "source": "node1_id", "target": "node2_id", "id": "edge_id" } }`

**Style Array** (optional): Defines visual styling

- **Selectors**: CSS-like selectors to target elements
- **Style Objects**: Properties like `background-color`, `shape`, `width`, etc.

#### Example Cytoscape Markdown Content

```markdown
# Gene Pathway Analysis

This pathway shows the relationship between genes and their protein products:

```cytoscape
{
{
  "elements": [
    { "data": { "id": "brca1", "label": "BRCA1" } },
    { "data": { "id": "brca2", "label": "BRCA2" } },
    { "data": { "id": "p53", "label": "P53" } },
    { "data": { "id": "dna_repair", "label": "DNA Repair Complex" } },  
    { "data": { "source": "brca1", "target": "dna_repair", "id": "edge1" } },
    { "data": { "source": "brca2", "target": "dna_repair", "id": "edge2" } },
    { "data": { "source": "p53", "target": "dna_repair", "id": "edge3" } }
  ],
  "style": [
    {
      "selector": "node", 
      "style": {
        "background-color": "#3498db", 
        "label": "data(label)", 
        "text-valign": "center", 
        "color": "#2c3e50", 
        "shape": "roundrectangle", 
        "width": "80px", 
        "height": "40px" 
      }	
    },
    {
      "selector": "node[label='DNA Repair Complex']", 
      "style": { "background-color": "#e74c3c", "shape": "ellipse", "width": "120px" }	
    },
    {
      "selector": "edge", 
      "style": { "width": 3, "line-color": "#7f8c8d", "target-arrow-color": "#7f8c8d", "target-arrow-shape": "triangle" }	
    }	
  ]	
}
```

### Phylogenetic Trees

SelectTextualDescriptionsView supports interactive phylogenetic tree visualization from Newick format embedded in markdown using fenced code blocks:


````markdown
```newick
((Human:0.1,Chimp:0.2):0.3,(Mouse:0.4,Rat:0.5):0.6); [DR1 Gene Evolution - Phylogenetic relationships across species]
```

#### Newick Format Specifications

**Basic Newick Syntax**: 
- Parentheses define internal nodes and groupings
- Commas separate sibling nodes
- Semicolon terminates the tree
- Colons precede branch lengths (optional)
- Node labels can be included

**Examples of Valid Newick Formats**:
```
Simple tree:           (A,B,C);\n
With branch lengths:   (A:0.1,B:0.2,C:0.3);  
Nested groups:         ((A:0.1,B:0.2):0.5,(C:0.3,D:0.4):0.6);
With internal labels:  ((A,B)AB,(C,D)CD)Root;
```

#### Metadata Comments

You can add titles and descriptions using square bracket comments at the end of your Newick string:

**Format Options**:
- `[Title Only]` - Displays just a title
- `[Title - Description]` - Displays title and description separately

**Examples**:
````markdown
```newick
((Human:0.1,Chimp:0.2):0.3,(Mouse:0.4,Rat:0.5):0.6); [Mammalian Evolution]
```

````markdown
```newick  
(((A:0.1,B:0.2):0.3,C:0.4):0.5,D:0.6); [Gene Family Tree - Evolutionary relationships of orthologous genes]
```

#### Tree Visualization Features

**Layout and Styling**:
- **Direction**: Left-to-right horizontal layout for easy reading
- **Edge Routing**: Orthogonal (right-angled) connections for clarity
- **Color Scheme**:
  - Species/leaf nodes: Pastel blue (`#A8DADC`)
  - Internal nodes: Pastel pink (`#F8D7DA`)
  - Edges: Gray (`#7F8C8D`)
- **Interactive**: Zoom and pan enabled for large trees
- **Responsive**: Adapts to container size

**Node Display**:
- Leaf nodes show species/sequence names
- Internal nodes appear as small circles
- Branch lengths reflected in layout when provided
- Automatic label wrapping for long names

#### Complete Phylogenetic Tree Example

````markdown
# Evolutionary Analysis

The evolutionary relationships of key model organisms:

```newick
(((Human:0.033,Chimp:0.033):0.014,(Gorilla:0.017,Orangutan:0.022):0.030):0.040,((Mouse:0.084,Rat:0.091):0.271,Rabbit:0.206):0.024); [Model Organisms Phylogeny - Evolutionary distances based on molecular clock analysis]
```

This tree demonstrates:
- **Primate clade**: Close relationship between great apes
- **Rodent clade**: Mouse and rat clustering
- **Branch lengths**: Proportional to evolutionary time
- **Outgroup**: Rabbit as more distant mammalian relative

````

#### Advanced Newick Features

**Complex Trees with Multiple Levels**:

````markdown
```newick
((((A1:0.1,A2:0.15)A:0.2,(B1:0.12,B2:0.08)B:0.25)AB:0.3,((C1:0.09,C2:0.11)C:0.18,(D1:0.13,D2:0.07)D:0.22)CD:0.35)ABCD:0.4,E:0.8); [Complex Gene Family - Multi-level phylogenetic analysis with named internal nodes]
```

````

**Tips for Creating Newick Trees**:
1. **Validate format**: Use online Newick validators before embedding
2. **Branch lengths**: Include if available for accurate proportions
3. **Node names**: Keep species names concise for better display
4. **Metadata**: Use descriptive titles and explanations
5. **Testing**: Preview trees before deployment to check layout

## Configuration Options

### SelectImageGalleryView Options 

| Option              | Default | Description                |
| ------------------- | ------- | -------------------------- |
| `maxImages`         | 50      | Maximum images to display  |
| `maxImageHeight`    | 200     | Maximum image height (px)  |
| `maxImageWidth`     | 300     | Maximum image width (px)   |
| `enableLazyLoading` | true    | Use intersection observer  |
| `validateUrls`      | true    | Validate image URL formats |

### SelectTextualDescriptionsView Options

| Option              | Default | Description                     |
| ------------------- | ------- | ------------------------------- |
| `enableGfm`         | true    | GitHub Flavored Markdown       |
| `enableCytoscape`   | true    | Cytoscape diagram support       |
| `maxDocumentSize`   | 1MB     | Maximum document size to load   |
| `enableSyntaxHighlighting` | true | Code block syntax highlighting |

## Technical Architecture

### Components

#### SelectImageGalleryView
- **State Model** (`SelectImageGalleryView/stateModel.ts`): MobX state tree with `updateFeature()` and `clearFeature()` actions
- **React Component** (`SelectImageGalleryView/SelectImageGalleryView.tsx`): Material-UI components with lazy loading
- **Plugin Registration** (`index.ts`): ViewType registration and autorun session monitoring

#### SelectTextualDescriptionsView
- **State Model** (`SelectTextualDescriptionsView/stateModel.ts`): MobX state tree with feature and content management
- **React Component** (`SelectTextualDescriptionsView/components/TextualDescriptionsView.tsx`): Markdown rendering with cytoscape integration
- **Plugin Registration** (`index.ts`: ViewType registration and automatic view management

### Data Flow

#### SelectImageGalleryView Flow
1. Feature selection triggers autorun in `index.ts`
2. Image data extracted from feature attributes (`images`, `image_group`, `image_tag`)
3. Arrays converted to comma-separated strings for state model compatibility
4. View updates via `updateFeature()` action
5. React component parses strings back to arrays for display
6. Images grouped by labels, types displayed as chips

#### SelectTextualDescriptionsView Flow
1. Feature selection triggers autorun in `index.ts`
2. Markdown data extracted from feature attributes (`markdown_urls`, `descriptions`, `content_type`)
3. State model stores comma-separated URL strings
4. React component fetches markdown content from URLs
5. ReactMarkdown renders content with custom components
6. Cytoscape diagrams rendered interactively when encountered

### Key Functions

#### SelectImageGalleryView Functions
- `parseImages()`: Handles both prop and feature attribute sources
- `groupImagesByLabel()`: Creates collapsible containers per label
- `LazyImage`: Intersection observer-based loading component

#### SelectTextualDescriptionsView Functions
- `fetchContent()`: Async loading of markdown documents
- `CytoscapeDirectRender`: Interactive cytoscape diagram renderer
- `MarkdownComponents`: Custom renderers for tables, code blocks, and diagrams

## image_tag Attribute

The `image_tag` attribute provides type labels for images:
- **No predefined values**: Any text can be used as image types
- Values are comma-separated strings matching image order
- Types appear as small rounded labels (Material-UI "chips") below each image filename
- Default type is "general" (no chip displayed)
- **Chips are small gray rounded labels** - look below the image filenames for small tags
- Common examples: "experimental", "analysis", "structure", "diagram", "microscopy", "western", "gel", "chart"
- Custom types: Users can specify any descriptive text (e.g., "before_treatment", "patient_sample", "control_group")

### Example of Chips Display

```
[Image]
filename.jpg
[experimental]  ← This gray rounded tag is a "chip"
```

## Troubleshooting

### Images Not Displaying (SelectImageGalleryView)
- Verify `image` or `images` attribute exists in GFF features
- Check image URLs are accessible
- Ensure CORS headers for cross-domain images
- Check browser console for errors

### Markdown Not Loading (SelectTextualDescriptionsView)
- Verify `markdown_urls` or `markdown_url` attribute exists in GFF features
- Check markdown document URLs are accessible
- Ensure CORS headers for cross-domain documents
- Check browser console for network errors
- Verify markdown syntax is valid

### Cytoscape Diagrams Not Rendering
- Ensure JSON format is valid in cytoscape code blocks
- Check browser console for cytoscape-specific errors
- Verify all node IDs are unique
- Ensure edge source/target IDs match existing nodes

### Phylogenetic Trees Not Rendering
- Ensure Newick format is valid in `newick` code blocks
- Check browser console for phylo.js-specific errors
- Verify tree structure is well-formed (balanced parentheses)
- Ensure semicolon terminates the tree string
- Check for invalid characters in species names

### Performance Issues
- Reduce `maxImages` value for SelectImageGalleryView
- Enable `enableLazyLoading` (default: true) for images
- Optimize image and document sizes
- Limit number of markdown documents per feature
- Use simpler cytoscape diagrams for better performance

## Development

```bash
npm install
npm start          # Development server
npm run lint       # ESLint
npm run build      # Production build
```

## License

MIT License

## Author

Alexie Papanicolaou - alpapan@gmail.com.
