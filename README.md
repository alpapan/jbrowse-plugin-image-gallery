# JBrowse Plugin Image Gallery

A JBrowse 2 plugin that displays images within feature details. Images appear automatically when selecting features with image data.

<img width="1149" height="1069" alt="image" src="https://github.com/user-attachments/assets/d143551d-769e-448e-8ca4-5f8cec414a34" />

## Installation

### Method 1: Add Plugin via JBrowse plugin store (not yet)

### Method 2: Manual Installation
```bash
git clone https://github.com/alpapan/jbrowse-plugin-image-gallery.git
cd jbrowse-plugin-image-gallery
npm install
# this works on windows too:
npx cross-env NODE_ENV=production npm run build
```

Add to your JBrowse 2 config.json:
```json
{
  "plugins": [
    {
      "name": "ImageGalleryPlugin",
      "url": "/path/to/jbrowse-plugin-image-gallery/dist/jbrowse-plugin-image-gallery.umd.production.min.js"
    }
  ]
}
```

## Example Configuration


```json
{
  "plugins": [
    {
      "name": "ImageGalleryPlugin", 
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
      "trackId": "genes_with_images", 
      "name": "Genes with Images",
      "assemblyNames": ["hg38"],
      "adapter": {
        "type": "Gff3Adapter",
        "gffLocation": { "uri": "genes_with_images.gff3" }
      }
    }
  ]
}
```

## Creating GFF Files

### Required Attributes
- `image` or `images`: Comma-separated list of image URLs (use one or the other)

### Optional Attributes
- `image_group`: Comma-separated labels for each image (used as container titles)
- `image_tag`: Comma-separated types for each image (displayed as chips below images)

### GFF3 Format
```gff3
##gff-version 3
##sequence-region chr1 1 248956422

# Single image (recommended)
chr1	source	gene	1000	2000	.	+	.	ID=gene1;image=https://example.com/image.jpg

# Multiple images with labels and types (recommended)
chr1	source	gene	3000	4000	.	+	.	ID=gene2;image=https://example.com/img1.jpg,https://example.com/img2.png;image_group=Microscopy,Western;image_tag=experimental,analysis

# Real example
chr1	MyLab	gene	1000	2000	.	+	.	ID=LOC100130531;image=https://upload.wikimedia.org/wikipedia/commons/c/ce/Example_image.png;image_group=test_example2;image_tag=general

# Legacy format (still supported)
chr1	source	gene	5000	6000	.	+	.	ID=gene3;images=https://example.com/legacy.jpg
```

### Image Requirements
- Supported formats: JPG, PNG, GIF, SVG, BMP, WEBP, TIFF, ICO
- URLs must be accessible from the browser
- CORS headers required for cross-domain images

## Usage

### Automatic Mode
Select any feature with image data. The ImageGalleryView appears automatically.

### Manual Mode
1. Right-click in view area
2. Select "Add" → "Image Gallery View"

## Features

- Automatic image display on feature selection
- Lazy loading with intersection observer
- Images grouped by labels in collapsible containers
- Type chips displayed for non-"general" image types
- Fallback placeholder for failed image loads
- Click images to open in new tab

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxImages` | 50 | Maximum images to display |
| `maxImageHeight` | 200 | Maximum image height (px) |
| `maxImageWidth` | 300 | Maximum image width (px) |
| `enableLazyLoading` | true | Use intersection observer |
| `validateUrls` | true | Validate image URL formats |

## Technical Architecture

### Components
- **State Model** (`stateModel.ts`): MobX state tree with `updateFeature()` and `clearFeature()` actions
- **React Component** (`ImageGalleryView.tsx`): Material-UI components with lazy loading
- **Plugin Registration** (`index.ts`): ViewType registration and autorun session monitoring

### Data Flow
1. Feature selection triggers autorun in `index.ts`
2. Image data extracted from feature attributes (`images`, `image_group`, `image_tag`)
3. Arrays converted to comma-separated strings for state model compatibility
4. View updates via `updateFeature()` action
5. React component parses strings back to arrays for display
6. Images grouped by labels, types displayed as chips

### Key Functions
- `parseImages()`: Handles both prop and feature attribute sources
- `groupImagesByLabel()`: Creates collapsible containers per label
- `LazyImage`: Intersection observer-based loading component

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

### Images Not Displaying
- Verify `images` attribute exists in GFF features
- Check image URLs are accessible
- Ensure CORS headers for cross-domain images
- Check browser console for errors

### Performance Issues
- Reduce `maxImages` value
- Enable `enableLazyLoading` (default: true)
- Optimize image sizes

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

Alexie Papanicolaou - alpapan@gmail.com
