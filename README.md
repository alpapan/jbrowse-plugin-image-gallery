# JBrowse Plugin Image Gallery

A JBrowse 2 plugin that provides an **ImageGalleryView** to display images directly within feature details, eliminating the need to switch between separate widget tabs when investigating hundreds of features.

## Overview

This plugin solves a critical UX problem in JBrowse 2: when users need to examine images for many features, they previously had to click separate Images widget tabs for every feature. The **ImageGalleryView** automatically appears in the view panel when features with images are selected, providing immediate visual context without additional clicks.

## Features

- **Automatic Display**: Images appear instantly when selecting features with image data
- **Lazy Loading**: Optimized performance with intersection observer-based image loading  
- **Error Handling**: Graceful fallbacks for broken or invalid image URLs
- **URL Validation**: Checks image URL formats before attempting to load
- **Material-UI Styling**: Consistent with JBrowse 2's design system
- **Expandable Gallery**: Collapsible interface with image count and error indicators
- **Click to Enlarge**: Images open in new tabs when clicked
- **Multiple Formats**: Supports various image types (JPG, PNG, GIF, SVG, etc.)

## Installation

### From NPM (when published)
```bash
jbrowse add-plugin jbrowse-plugin-image-gallery
```

### From Source
```bash
git clone https://github.com/your-repo/jbrowse-plugin-image-gallery.git
cd jbrowse-plugin-image-gallery
npm install
npm run build
jbrowse add-plugin /path/to/jbrowse-plugin-image-gallery
```

## Usage

### Automatic Mode
The ImageGalleryView automatically appears when you select features containing image data. Simply click on any feature in your tracks, and if it has images, they'll be displayed in the view panel.

### Manual Mode  
You can also manually add an ImageGalleryView:
1. Right-click in the view area
2. Select "Add" → "Image Gallery View"
3. The view will show "No Feature Selected" until you select a feature with images

## Feature Data Requirements

For images to display, features must have one of the following attributes:

### Primary Method: `images` attribute
```gff3
chr1    source    gene    1000    2000    .    +    .    ID=gene1;images=https://example.com/image1.jpg,https://example.com/image2.png
```

### With Labels and Types (Optional)
```gff3
chr1    source    gene    1000    2000    .    +    .    ID=gene1;images=https://example.com/image1.jpg,https://example.com/image2.png;image_labels=Microscopy,Western Blot;image_types=experiment,analysis
```

### Supported Formats
- **Single URL**: `images=https://example.com/image.jpg`
- **Multiple URLs**: `images=https://example.com/image1.jpg,https://example.com/image2.png`
- **Array format**: Also supports programmatic array inputs

## Configuration Options

The ImageGalleryView supports several configuration options:

| Option | Default | Description |
|--------|---------|-------------|
| `maxImages` | 50 | Maximum number of images to display |
| `maxImageHeight` | 200 | Maximum height in pixels for displayed images |
| `maxImageWidth` | 300 | Maximum width in pixels for displayed images |
| `enableLazyLoading` | true | Use intersection observer for performance |
| `validateUrls` | true | Validate image URL formats before loading |

## Technical Architecture

### ImageGalleryView Components

#### State Model (`src/ImageGalleryView/stateModel.ts`)
- **MobX State Tree** model managing feature data
- **Actions**: `updateFeature()`, `clearFeature()`  
- **Computed Properties**: `hasImages`, `displayTitle`
- **Reactive Updates**: Automatically responds to feature selection changes

#### React Component (`src/ImageGalleryView/components/ImageGalleryView.tsx`)
- **Self-contained**: All functionality merged from previous widget architecture
- **Material-UI Design**: Consistent Paper, Card, and Typography components
- **LazyImage Component**: Custom intersection observer-based lazy loading
- **Error Boundaries**: Graceful handling of loading failures

#### Plugin Registration (`src/index.ts`)
- **ViewType Registration**: Integrates with JBrowse 2's plugin system
- **Autorun Logic**: MobX autorun monitors session.selection changes
- **Menu Integration**: Adds "Image Gallery View" to the Add menu

### Image Processing Pipeline

1. **Feature Selection**: User clicks feature in track
2. **Data Extraction**: Plugin extracts `images`, `image_labels`, `image_types` attributes  
3. **URL Parsing**: Handles single strings, comma-separated lists, or arrays
4. **Validation**: Optional URL format validation (file extensions, protocols)
5. **Lazy Loading**: Images load as they enter viewport via IntersectionObserver
6. **Error Handling**: Invalid URLs show error icons with descriptive messages
7. **Display**: Images render in responsive grid with labels and type indicators

### Session Management

The plugin uses MobX autorun to monitor JBrowse session changes:
- **Reactive**: Automatically responds to `session.selection` changes
- **View Lifecycle**: Creates/updates ImageGalleryView instances as needed
- **Cleanup**: Clears view content when no feature with images is selected
- **Error Safety**: Null-safe operations prevent crashes during session state changes

## Development

### Setup Development Environment
```bash
git clone https://github.com/your-repo/jbrowse-plugin-image-gallery.git
cd jbrowse-plugin-image-gallery
npm install
npm run setup
```

### Development Workflow
```bash
# Start development server with hot reloading
npm start

# Lint and format code
npm run lint

# Build for production
npm run build

# Run tests
npm test
```

### Project Structure
```
src/
├── index.ts                 # Plugin registration and autorun logic
├── ImageGalleryView/
│   ├── index.ts            # Export view components
│   ├── stateModel.ts       # MobX state tree model
│   └── components/
│       └── ImageGalleryView.tsx  # Main React component
└── declare.d.ts            # TypeScript declarations
```

## Troubleshooting

### Images Not Displaying
1. **Check Feature Attributes**: Ensure features have `images` attribute with valid URLs
2. **URL Validation**: Verify image URLs are accessible and have valid extensions
3. **CORS Issues**: Ensure image servers allow cross-origin requests
4. **Console Errors**: Check browser developer tools for network or JavaScript errors

### Performance Issues
1. **Limit Image Count**: Use `maxImages` config to reduce initial load
2. **Enable Lazy Loading**: Ensure `enableLazyLoading` is true (default)
3. **Image Optimization**: Use appropriately sized images for web display
4. **Network Throttling**: Consider image CDN or optimization services

### View Not Appearing
1. **Plugin Loading**: Verify plugin is properly installed and loaded
2. **Feature Selection**: Ensure you're clicking on features with image data
3. **Session State**: Check that session.selection is updating properly
4. **Browser Compatibility**: Ensure IntersectionObserver is supported (modern browsers)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`  
3. Make your changes and add tests
4. Ensure linting passes: `npm run lint`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Authors

- **Alexie Papanicolaou** - *Initial work* - [alpapan@gmail.com](mailto:alpapan@gmail.com)

## Acknowledgments

- JBrowse 2 development team for the plugin architecture
- Material-UI for the component library
- MobX for reactive state management