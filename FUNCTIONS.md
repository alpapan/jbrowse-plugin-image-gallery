# JBrowse2 Plugin Function Documentation

## Description

This document provides comprehensive documentation for all functions in the JBrowse2 Rich Annotations Plugin, organized by module and functionality.

## Plugin Overview

The plugin provides four main views for genomic feature visualization:
- **SelectImageGalleryView**: Image display for selected features
- **SelectTextualDescriptionsView**: Markdown document rendering for selected features
- **FlexibleImageGalleryView**: Searchable image gallery with assembly/track selection
- **FlexibleTextualDescriptionsView**: Searchable textual descriptions with assembly/track selection

---

## Main Plugin Class

### `RichAnnotationsPlugin` (src/index.ts)

Main plugin class that manages view registration and feature selection monitoring.

#### Methods

- **`install(pluginManager: PluginManager)`**: Registers four view types with the plugin manager
- **`configure(pluginManager: PluginManager)`**: Adds menu items for manual view creation and sets up autorun for feature selection monitoring
- **`manageSelectImageGalleryView(session, featureSummary)`**: Updates SelectImageGalleryView based on current feature selection
- **`manageSelectImageGalleryViewWithoutImages(session, featureSummary)`**: Updates SelectImageGalleryView for features without images
- **`manageSelectTextualDescriptionsView(session, featureSummary)`**: Updates SelectTextualDescriptionsView based on current feature selection
- **`clearSelectImageGalleryView(session)`**: Clears the SelectImageGalleryView
- **`clearSelectTextualDescriptionsView(session)`**: Clears the SelectTextualDescriptionsView
- **`collectImagesFromFeatureAndSubfeatures(feature)`**: Extracts image data from a feature and all its subfeatures
- **`collectTextualContentFromFeatureAndSubfeatures(feature)`**: Extracts textual content from a feature and all its subfeatures

---

## View State Models

### SelectImageGalleryView (src/SelectImageGalleryView/stateModel.ts)

State model for the select image gallery view.

#### Actions

- **`updateFeature(featureId, featureType, images, labels?, types?)`**: Updates the view with feature image data
- **`clearFeature()`**: Clears the current feature data
- **`updateFeatureWithoutImages(featureId, featureType)`**: Updates the view for a feature without images

#### Views

- **`defaultDisplayName`**: Returns the default display name for the view
- **`maxItems`**: Returns the maximum number of items to display
- **`imageSize`**: Returns the image size configuration
- **`gff3AttributeNames`**: Returns the GFF3 attribute names configuration
- **`hasContent()`**: Returns whether the view has content to display
- **`deduplicatedImages()`**: Returns deduplicated list of images

---

### SelectTextualDescriptionsView (src/SelectTextualDescriptionsView/stateModel.ts)

State model for the select textual descriptions view.

#### Actions

- **`updateFeature(featureId, featureType, markdownUrls, descriptions?, contentTypes?)`**: Updates the view with feature textual data
- **`clearFeature()`**: Clears the current feature data

#### Views

- **`defaultDisplayName`**: Returns the default display name for the view
- **`maxItems`**: Returns the maximum number of items to display
- **`gff3AttributeNames`**: Returns the GFF3 attribute names configuration
- **`hasContent()`**: Returns whether the view has content to display
- **`deduplicatedMarkdownUrls()`**: Returns deduplicated list of markdown URLs

---

### FlexibleImageGalleryView (src/FlexibleImageGalleryView/stateModel.ts)

State model for the flexible image gallery view with search capabilities.

#### Actions

- **`updateFeature(featureId, featureType, images?, labels?, types?)`**: Updates the view with feature image data
- **`clearFeature()`**: Clears the current feature data
- **`setSelectedAssembly(assemblyId)`**: Sets the selected assembly
- **`setSelectedTrack(trackId)`**: Sets the selected track
- **`setSearchTerm(searchTerm)`**: Sets the search term
- **`clearSearch()`**: Clears the search
- **`selectFeature(featureId, featureType)`**: Selects a feature
- **`setSelectedFeature(featureId?, featureType?, images?, labels?, types?)`**: Sets the selected feature with data
- **`selectFeatureWithImageData(featureId?)`**: Selects a feature and fetches its image data
- **`clearFeatureSelection()`**: Clears the feature selection
- **`clearSelections()`**: Clears all selections
- **`setLoadingFeatures(loading)`**: Sets the loading state for features
- **`searchFeatures()`**: Searches for features

#### Views

- **`defaultDisplayName`**: Returns the default display name for the view
- **`hasContent()`**: Returns whether the view has content to display
- **`displayTitle`**: Returns the display title for the view
- **`canSelectFeature`**: Returns whether a feature can be selected

---

### FlexibleTextualDescriptionsView (src/FlexibleTextualDescriptionsView/stateModel.ts)

State model for the flexible textual descriptions view with search capabilities.

#### Actions

- **`updateFeature(featureId, featureType, content, descriptions?, contentTypes?)`**: Updates the view with feature textual data
- **`clearFeature()`**: Clears the current feature data
- **`setSelectedAssembly(assemblyId)`**: Sets the selected assembly
- **`setSelectedTrack(trackId)`**: Sets the selected track
- **`setSearchTerm(searchTerm)`**: Sets the search term
- **`clearSearch()`**: Clears the search
- **`selectFeature(featureId, featureType)`**: Selects a feature
- **`setSelectedFeature(featureId?, featureType?, markdownUrls?, descriptions?, contentTypes?)`**: Sets the selected feature with data
- **`clearFeatureSelection()`**: Clears the feature selection
- **`clearSelections()`**: Clears all selections
- **`setLoadingFeatures(loading)`**: Sets the loading state for features
- **`searchFeatures()`**: Searches for features

#### Views

- **`defaultDisplayName`**: Returns the default display name for the view
- **`hasContent()`**: Returns whether the view has content to display

---

## Shared Base Models

### BaseViewStateModel (src/shared/BaseViewStateModel.ts)

Base state model providing common functionality for all views.

#### Actions

- **`setWidth(newWidth)`**: Sets the width of the view panel
- **`setDisplayName(name)`**: Sets the display name for the view
- **`setMinimized(flag)`**: Sets the minimized state for the view
- **`closeView()`**: Closes the view by removing it from the session
- **`updateFeature(featureId, featureType, content, descriptions?, contentTypes?)`**: Updates the feature and content displayed in this view
- **`clearFeature()`**: Clears the current feature

#### Views

- **`pluginManager`**: Access to the JBrowse plugin manager
- **`session`**: Access to the current JBrowse session
- **`assemblyManager`**: Access to the assembly manager
- **`availableAssemblies`**: List of available assembly names
- **`trackConfigurations`**: Track configurations using proper JBrowse patterns
- **`getTracksForAssembly(assemblyName)`**: Gets track configurations filtered by assembly
- **`getAssembly(assemblyId)`**: Gets assembly object using proper async pattern
- **`config`**: Access to JBrowse configuration
- **`defaultDisplayName`**: Default display name for the view
- **`menuItems()`**: Menu items for the view
- **`hasContent()`**: Whether the view has content to display
- **`displayTitle`**: Display title for the view

---

### SearchableViewMixin (src/shared/SearchableViewMixin.ts)

Mixin providing search functionality for flexible views.

#### Views

- **`availableAssemblies`**: Available assemblies in the session
- **`availableTracks`**: Available tracks for the selected assembly
- **`assemblyName`**: Name of the selected assembly
- **`selectedAssembly`**: Selected assembly object
- **`selectedTrack`**: Selected track object
- **`hasSelectedAssembly`**: Whether an assembly is selected
- **`hasSelectedTrack`**: Whether a track is selected
- **`hasSearchResults`**: Whether there are search results
- **`hasSearchTerm`**: Whether there is a search term
- **`features`**: List of features from search results
- **`canSearch`**: Whether search is available
- **`isReady`**: Whether the view is ready for interaction
- **`isTrackReady`**: Whether the track is ready
- **`viewDisplayName`**: Display name including selected feature
- **`selectedFeature`**: Currently selected feature from search results

#### Actions

- **`setSelectedAssembly(assemblyId)`**: Sets the selected assembly
- **`setSelectedTrack(trackId)`**: Sets the selected track
- **`setSearchTerm(searchTerm)`**: Sets the search term
- **`clearSearchBase()`**: Base implementation for clearing search
- **`clearSearch()`**: Clears the search
- **`selectFeature(featureId, featureType)`**: Selects a feature
- **`clearFeatureSelection()`**: Clears the feature selection
- **`clearSelectionsBase()`**: Base implementation for clearing all selections
- **`clearSelections()`**: Clears all selections
- **`searchFeatures()`**: Searches for features

---

## Utility Functions

### FlexibleViewUtils (src/shared/flexibleViewUtils.ts)

Utility functions for flexible views and feature searching.

#### Functions

- **`searchTrackFeatures(session, trackConf, searchTerm, maxResults?)`**: Searches track features using text search adapter
- **`getBaseTrackConfigs(session)`**: Gets all track configurations from session
- **`findTrackById(trackConfs, trackId)`**: Finds a track configuration by ID
- **`safeGetAdapter(trackConf)`**: Safely gets adapter configuration from track
- **`getAssemblyDisplayName(assembly)`**: Gets display name for assembly
- **`getAllTracksForAssembly(self, requestedAssemblyName)`**: Gets all tracks for a specific assembly
- **`extractTrackInfo(trackConf)`**: Extracts track information for UI display
- **`searchFeatureRangeQueries(contentExtractor)`**: Creates a search flow for feature range queries
- **`searchFeatureTextIndex(contentExtractor)`**: Creates a search flow using text index
- **`getFeatureId(feature)`**: Gets feature ID from various possible attributes
- **`getFeatureName(feature)`**: Gets feature name from various possible attributes

---

## React Components

### SelectImageGalleryView Components

#### ImageGalleryView (src/SelectImageGalleryView/components/ImageGalleryView.tsx)
Main wrapper component for the select image gallery view.

#### SelectImageGalleryViewF (src/SelectImageGalleryView/components/Explainers.tsx)
Main observer component that renders the image gallery content.

#### ImageGalleryContent
Component that handles image grouping, lazy loading, and display.

#### LazyImage
Component for lazy loading images with error handling.

### SelectTextualDescriptionsView Components

#### TextualDescriptionsView (src/SelectTextualDescriptionsView/components/TextualDescriptionsView.tsx)
Main wrapper component for the select textual descriptions view.

#### SelectTextualDescriptionsViewF (src/SelectTextualDescriptionsView/components/Explainers.tsx)
Main observer component that renders markdown content with custom components.

#### CytoscapeDirectRender
Component for rendering Cytoscape diagrams from JSON format.

#### CytoscapeDiagram
Test component for flowchart content.

#### NewickTreeRenderer
Component for rendering phylogenetic trees from Newick format.

#### MarkdownComponents
Custom markdown components including code block handlers for visualizations.

### Flexible View Components

#### FlexibleImageGalleryViewComponent (src/FlexibleImageGalleryView/components/FlexibleImageGalleryView.tsx)
Main component for the flexible image gallery view with search interface.

#### FlexibleTextualDescriptionsViewComponent (src/FlexibleTextualDescriptionsView/components/FlexibleTextualDescriptionsView.tsx)
Main component for the flexible textual descriptions view with search interface.

### Shared Components (src/shared/components/FlexibleViewSelectors.tsx)

#### AssemblySelector
Component for selecting assemblies from available options.

#### TrackSelector
Component for selecting tracks from the selected assembly.

#### FeatureSearchAutocomplete
Component for searching and selecting features with autocomplete.

#### FlexibleViewContainer
Container component for flexible views.

#### InstructionsPanel
Component displaying contextual instructions for users.

#### ErrorDisplay
Component for displaying error messages.

#### ClearSelectionsButton
Component for clearing all current selections.

---

## Type Declarations

### declare.d.ts (src/declare.d.ts)

Type declarations for external libraries:

- **`phylojs`**: Types for phylogenetic tree parsing and manipulation
- **`cytoscape-dagre`**: Types for DAG layout extension
- **`cytoscape-cola`**: Types for force-directed layout extension
- **`cytoscape-klay`**: Types for hierarchical layout extension

---

## Dependencies Integration

### phylojs Integration
Used for parsing Newick format phylogenetic trees in textual descriptions.

### cytoscape Integration
Used for rendering interactive diagrams and phylogenetic trees.

### react-markdown Integration
Used for rendering markdown content with custom components for visualizations.

---

## Development Guidelines

1. **State Management**: All state modifications happen within MobX actions
2. **Error Handling**: Comprehensive error handling with user-friendly messages
3. **Performance**: Lazy loading, intersection observers, and dynamic imports
4. **TypeScript**: Full TypeScript support with proper type definitions
5. **JBrowse Best Practices**: Follows AGENT.md guidelines for configuration access and state management
6. **Modularity**: Clean separation between view types and shared functionality
7. **Testing**: Functions designed to be testable with clear inputs/outputs