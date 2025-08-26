(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@jbrowse/core/Plugin'), require('@jbrowse/core/pluggableElementTypes/ViewType'), require('@jbrowse/core/util'), require('mobx'), require('react'), require('mobx-react'), require('@mui/material'), require('react/jsx-runtime'), require('@mui/material/utils'), require('@jbrowse/core/util/types/mst'), require('mobx-state-tree')) :
  typeof define === 'function' && define.amd ? define(['exports', '@jbrowse/core/Plugin', '@jbrowse/core/pluggableElementTypes/ViewType', '@jbrowse/core/util', 'mobx', 'react', 'mobx-react', '@mui/material', 'react/jsx-runtime', '@mui/material/utils', '@jbrowse/core/util/types/mst', 'mobx-state-tree'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.JBrowsePluginImageGallery = {}, global.JBrowseExports["@jbrowse/core/Plugin"], global.JBrowseExports["@jbrowse/core/pluggableElementTypes/ViewType"], global.JBrowseExports["@jbrowse/core/util"], global.JBrowseExports.mobx, global.JBrowseExports.react, global.JBrowseExports["mobx-react"], global.JBrowseExports["@mui/material"], global.JBrowseExports["react/jsx-runtime"], global.JBrowseExports["@mui/material/utils"], global.JBrowseExports["@jbrowse/core/util/types/mst"], global.JBrowseExports["mobx-state-tree"]));
})(this, (function (exports, Plugin, ViewType, util, mobx, React, mobxReact, material, jsxRuntime, utils, mst, mobxStateTree) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var Plugin__default = /*#__PURE__*/_interopDefaultLegacy(Plugin);
  var ViewType__default = /*#__PURE__*/_interopDefaultLegacy(ViewType);
  var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

  var version = "0.0.1";

  var ExpandMore = utils.createSvgIcon(/*#__PURE__*/jsxRuntime.jsx("path", {
    d: "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"
  }), 'ExpandMore');

  var ExpandLess = utils.createSvgIcon(/*#__PURE__*/jsxRuntime.jsx("path", {
    d: "m12 8-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"
  }), 'ExpandLess');

  // Utility function to validate if a URL is likely an image
  const isValidImageUrl = (url) => {
      if (!url || typeof url !== 'string')
          return false;
      // Basic URL validation
      try {
          new URL(url);
      }
      catch {
          return false;
      }
      // Check for common image extensions
      const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|ico)(\?.*)?$/i;
      return imageExtensions.test(url);
  };
  // Utility function to extract basename from URL
  const getUrlBasename = (url) => {
      try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          const basename = pathname.split('/').pop() ?? 'image';
          // Remove query parameters from basename
          return basename.split('?')[0];
      }
      catch {
          return 'image';
      }
  };
  // Lazy loading image component
  const LazyImage = ({ src, alt, maxHeight, onError, onLoad }) => {
      const [isLoading, setIsLoading] = React.useState(true);
      const [hasError, setHasError] = React.useState(false);
      const imgRef = React.useRef(null);
      React.useEffect(() => {
          const img = imgRef.current;
          if (!img)
              return;
          // Set src immediately for now to debug loading issues
          if (img.dataset.src && !img.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              return;
          }
          const observer = new IntersectionObserver(entries => {
              entries.forEach(entry => {
                  if (entry.isIntersecting) {
                      const image = entry.target;
                      if (image.dataset.src && !image.src) {
                          image.src = image.dataset.src;
                          image.removeAttribute('data-src');
                          observer.unobserve(image);
                      }
                  }
              });
          }, { threshold: 0.1 });
          observer.observe(img);
          return () => observer.disconnect();
      }, [src]);
      const handleLoad = () => {
          setIsLoading(false);
          onLoad();
      };
      const handleError = () => {
          setIsLoading(false);
          setHasError(true);
          onError('Failed to load image');
      };
      if (hasError) {
          return (React__default["default"].createElement("img", { src: "https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg", alt: "Failed to load image", style: {
                  maxHeight,
                  width: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
              }, onClick: () => window.open(src, '_blank') }));
      }
      return (React__default["default"].createElement(material.Box, { sx: { position: 'relative' } },
          isLoading && (React__default["default"].createElement(material.Skeleton, { variant: "rectangular", width: "100%", height: maxHeight, sx: { position: 'absolute', top: 0, left: 0 } })),
          React__default["default"].createElement("img", { ref: imgRef, "data-src": src, alt: alt, style: {
                  maxHeight,
                  width: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
                  display: isLoading ? 'none' : 'block',
              }, onLoad: handleLoad, onError: handleError, onClick: () => window.open(src, '_blank') })));
  };
  // Internal ImageGallery component with all functionality
  const ImageGalleryContent = mobxReact.observer(function ImageGalleryContent({ featureImages, featureImageLabels, feature, config, }) {
      const actualConfig = config ?? {};
      const [expandedGroups, setExpandedGroups] = React.useState(new Map());
      const [imageStates, setImageStates] = React.useState(new Map());
      // Configuration with better defaults
      const maxWidth = actualConfig?.maxImageWidth ?? 300;
      const maxHeight = actualConfig?.maxImageHeight ?? 200;
      const enableLazyLoading = actualConfig?.enableLazyLoading ?? true;
      const validateUrls = actualConfig?.validateUrls ?? true;
      const maxImages = actualConfig?.maxImages ?? 50;
      // Parse images from feature attributes (simple, lint-friendly)
      const parseImages = React.useCallback(() => {
          // First try to use featureImages prop as primary source
          let imageUrls = [];
          if (featureImages) {
              if (typeof featureImages === 'string') {
                  // Handle single string - could be single URL or comma-separated URLs
                  imageUrls = featureImages
                      .split(',')
                      .map((url) => url.trim())
                      .filter((url) => url.length > 0);
              }
              else if (Array.isArray(featureImages)) {
                  // Handle array of URLs
                  imageUrls = featureImages
                      .filter((url) => url && typeof url === 'string')
                      .map((url) => url.trim())
                      .filter((url) => url.length > 0);
              }
          }
          // Fallback to feature.get('images') for backward compatibility
          if (imageUrls.length === 0 && feature) {
              const images = feature.get('images');
              // console.debug('Fallback to feature.get("images"):', images)
              if (images && typeof images === 'string' && images.trim() !== '') {
                  imageUrls = images
                      .split(',')
                      .map((url) => url.trim())
                      .filter((url) => url.length > 0);
                  // console.debug('Got images from feature fallback:', imageUrls)
              }
          }
          // Get labels and types from model props first, then feature attributes as fallback
          const imageLabels = featureImageLabels ?? feature?.get('image_labels');
          const imageTypes = feature?.get('image_types');
          if (imageUrls.length === 0) {
              return [];
          }
          // Limit number of images
          const limitedUrls = imageUrls.slice(0, maxImages);
          const labels = imageLabels
              ? imageLabels.split(',').map((label) => label.trim())
              : [];
          const types = imageTypes
              ? imageTypes.split(',').map((type) => type.trim())
              : [];
          // console.debug('Final parsing:', {
          //   limitedUrls,
          //   labels,
          //   types,
          //   imageLabels,
          //   imageTypes,
          // })
          return limitedUrls.map((url, index) => {
              const imageData = {
                  url,
                  label: labels[index] || `Image ${index + 1}`,
                  type: types[index] || 'general',
                  isLoading: true,
                  hasError: false,
                  displayName: getUrlBasename(url),
              };
              // Validate URL if validation is enabled
              if (validateUrls) {
                  imageData.isValid = isValidImageUrl(url);
                  if (!imageData.isValid) {
                      imageData.hasError = true;
                      imageData.isLoading = false;
                      imageData.errorMessage = 'Invalid image URL format';
                  }
              }
              else {
                  imageData.isValid = true;
              }
              return imageData;
          });
      }, [feature, featureImages, featureImageLabels, maxImages, validateUrls]);
      const images = parseImages();
      // Group images by their labels
      const groupImagesByLabel = React.useCallback((imageList) => {
          const groups = new Map();
          imageList.forEach(image => {
              const label = image.label;
              if (!groups.has(label)) {
                  groups.set(label, []);
              }
              groups.get(label).push(image);
          });
          return Array.from(groups.entries()).map(([label, groupImages]) => {
              const errorCount = groupImages.filter(img => img.hasError).length;
              const validCount = groupImages.length - errorCount;
              return {
                  label,
                  images: groupImages,
                  errorCount,
                  validCount,
              };
          });
      }, []);
      const imageGroups = groupImagesByLabel(images);
      // Helper function to get expanded state for a group
      const isGroupExpanded = (groupLabel) => {
          return expandedGroups.get(groupLabel) ?? true; // Default to expanded
      };
      // Helper function to toggle expanded state for a group
      const toggleGroupExpanded = (groupLabel) => {
          setExpandedGroups(prev => {
              const newMap = new Map(prev);
              newMap.set(groupLabel, !isGroupExpanded(groupLabel));
              return newMap;
          });
      };
      // Handle image loading state updates
      const handleImageLoad = React.useCallback((index) => {
          setImageStates(prev => {
              const newStates = new Map(prev);
              const currentState = newStates.get(index) ?? images[index];
              newStates.set(index, {
                  ...currentState,
                  isLoading: false,
                  hasError: false,
              });
              return newStates;
          });
      }, [images]);
      const handleImageError = React.useCallback((index, error) => {
          setImageStates(prev => {
              const newStates = new Map(prev);
              const currentState = newStates.get(index) ?? images[index];
              newStates.set(index, {
                  ...currentState,
                  isLoading: false,
                  hasError: true,
                  errorMessage: error,
              });
              return newStates;
          });
      }, [images]);
      // Don't render widget if no images
      if (images.length === 0) {
          return (React__default["default"].createElement(material.Alert, { severity: "info", sx: { mt: 2 } }, "No images found for this feature. Make sure the feature has an 'images' attribute with comma-separated URLs."));
      }
      return (React__default["default"].createElement(material.Box, { sx: { mt: 2 } }, imageGroups.map((group, groupIndex) => (React__default["default"].createElement(material.Box, { key: groupIndex, sx: { mb: 2, border: '1px solid #e0e0e0', borderRadius: 1 } },
          React__default["default"].createElement(material.Box, { sx: {
                  display: 'flex',
                  alignItems: 'center',
                  p: 1,
                  bgcolor: 'grey.50',
                  cursor: 'pointer',
              }, onClick: () => toggleGroupExpanded(group.label) },
              React__default["default"].createElement(material.Typography, { variant: "subtitle1", sx: { flexGrow: 1 } },
                  group.label,
                  " (",
                  group.images.length,
                  ")",
                  group.errorCount > 0 && (React__default["default"].createElement(material.Chip, { label: `${group.errorCount} failed`, size: "small", color: "error", sx: { ml: 1 } }))),
              React__default["default"].createElement(material.IconButton, { size: "small" }, isGroupExpanded(group.label) ? React__default["default"].createElement(ExpandLess, null) : React__default["default"].createElement(ExpandMore, null))),
          React__default["default"].createElement(material.Collapse, { in: isGroupExpanded(group.label) },
              React__default["default"].createElement(material.Box, { sx: { p: 2 } },
                  group.errorCount > 0 && (React__default["default"].createElement(material.Alert, { severity: "warning", sx: { mb: 2 } },
                      group.errorCount,
                      " image",
                      group.errorCount > 1 ? 's' : '',
                      ' ',
                      "failed to load. Check the URLs and try again.")),
                  React__default["default"].createElement(material.Grid, { container: true, spacing: 2 }, group.images.map((image, imageIndex) => {
                      // Calculate global index for state management
                      const globalIndex = images.findIndex(img => img.url === image.url);
                      const currentState = imageStates.get(globalIndex) ?? image;
                      return (React__default["default"].createElement(material.Grid, { size: { xs: 12, sm: 6 }, key: imageIndex },
                          React__default["default"].createElement(material.Card, { sx: { maxWidth: maxWidth } },
                              currentState.hasError ? (React__default["default"].createElement("img", { src: "https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg", alt: "Failed to load image", style: {
                                      maxHeight,
                                      width: '100%',
                                      objectFit: 'contain',
                                      backgroundColor: '#f5f5f5',
                                      cursor: 'pointer',
                                  }, onClick: () => window.open(image.url, '_blank') })) : enableLazyLoading ? (React__default["default"].createElement(LazyImage, { src: image.url, alt: image.displayName, maxHeight: maxHeight, onLoad: () => handleImageLoad(globalIndex), onError: error => handleImageError(globalIndex, error) })) : (React__default["default"].createElement(material.CardMedia, { component: "img", sx: {
                                      maxHeight: maxHeight,
                                      objectFit: 'contain',
                                      bgcolor: 'grey.100',
                                      cursor: 'pointer',
                                  }, image: image.url, alt: image.displayName, onClick: () => window.open(image.url, '_blank'), onLoad: () => handleImageLoad(globalIndex), onError: () => handleImageError(globalIndex, 'Failed to load image') })),
                              React__default["default"].createElement(material.CardContent, { sx: { p: 1 } },
                                  React__default["default"].createElement(material.Typography, { variant: "body2", noWrap: true }, image.displayName),
                                  image.type !== 'general' && (React__default["default"].createElement(material.Chip, { label: image.type, size: "small", sx: { mt: 0.5 } }))))));
                  })))))))));
  });
  const ImageGalleryView = mobxReact.observer(function ImageGalleryView({ model, }) {
      if (!model.hasImages) {
          return (React__default["default"].createElement(material.Paper, { elevation: 12, sx: {
                  padding: 2,
                  margin: 1,
                  minHeight: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
              }, className: "MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation12 css-4h24oc-MuiPaper-root-viewContainer-unfocusedView" },
              React__default["default"].createElement(material.Typography, { variant: "h6", color: "textSecondary" }, "No feature with images selected"),
              React__default["default"].createElement(material.Typography, { variant: "body2", color: "textSecondary", sx: { mt: 1 } }, "When you select a feature with images, they will appear here")));
      }
      return (React__default["default"].createElement(material.Paper, { elevation: 12, sx: {
              padding: 1,
              margin: 1,
              minHeight: 200,
          }, className: "MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation12 css-4h24oc-MuiPaper-root-viewContainer-unfocusedView" },
          React__default["default"].createElement(material.Box, { sx: { mb: 1 } },
              React__default["default"].createElement(material.Typography, { variant: "h6", sx: { fontSize: '1rem', fontWeight: 'bold' } }, model.displayTitle)),
          React__default["default"].createElement(ImageGalleryContent, { featureImages: model.featureImages, featureImageLabels: model.featureImageLabels, config: {
                  maxImages: 10,
                  maxImageHeight: 200,
                  validateUrls: true,
              } })));
  });

  const stateModel = mobxStateTree.types
      .model({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: mst.ElementId,
      type: mobxStateTree.types.literal('ImageGalleryView'),
      // Store the selected feature and images for this view
      selectedFeatureId: mobxStateTree.types.maybe(mobxStateTree.types.string),
      featureImages: mobxStateTree.types.maybe(mobxStateTree.types.string),
      featureImageLabels: mobxStateTree.types.maybe(mobxStateTree.types.string),
  })
      .actions(self => ({
      // unused by this view but it is updated with the current width in pixels of
      // the view panel
      setWidth() { },
      // Update the feature and images displayed in this view
      updateFeature(featureId, images, imageLabels) {
          self.selectedFeatureId = featureId;
          self.featureImages = images;
          self.featureImageLabels = imageLabels ?? '';
      },
      // Clear the current feature
      clearFeature() {
          self.selectedFeatureId = undefined;
          self.featureImages = undefined;
          self.featureImageLabels = undefined;
      },
  }))
      .views(self => ({
      // unused by this view, but represents of 'view level' menu items
      menuItems() {
          return [];
      },
      // Computed properties for easy access
      get hasImages() {
          return !!(self.featureImages && self.featureImages.trim() !== '');
      },
      get displayTitle() {
          return self.selectedFeatureId
              ? `Images for ${String(self.selectedFeatureId)}`
              : 'Image Gallery';
      },
  }));

  class ImageGalleryPlugin extends Plugin__default["default"] {
      name = 'ImageGalleryPlugin';
      version = version;
      install(pluginManager) {
          pluginManager.addViewType(() => {
              return new ViewType__default["default"]({
                  name: 'ImageGalleryView',
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  stateModel: stateModel,
                  ReactComponent: ImageGalleryView,
              });
          });
          // autorun to log session selection changes (prints both to browser console and to server)
          try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-console
              mobx.autorun(() => {
                  try {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const session = pluginManager.rootModel?.session;
                      // eslint-disable-next-line no-console
                      // console.debug('Session debug:', {
                      //   hasRootModel: !!pluginManager.rootModel,
                      //   hasSession: !!session,
                      //   sessionKeys: session
                      //     ? Object.keys(session as Record<string, unknown>)
                      //     : [],
                      //   selectionValue: session?.selection,
                      //   selectionType: typeof session?.selection,
                      // })
                      const sel = session?.selection;
                      let featureSummary = undefined;
                      let selectedFeature = undefined;
                      if (sel) {
                          // try common shapes
                          const f = sel.feature ?? sel;
                          selectedFeature = f;
                          if (f && typeof f.get === 'function') {
                              featureSummary = {
                                  id: f.get('id'),
                                  images: f.get('images'),
                                  image_labels: f.get('image_labels'),
                              };
                          }
                          else {
                              featureSummary = String(f);
                          }
                      }
                      // eslint-disable-next-line no-console
                      // console.debug('Autorun selection change:', {
                      //   sel: !!sel,
                      //   featureSummary,
                      // })
                      // Show ImageGallery view for features with images
                      if (featureSummary &&
                          typeof featureSummary === 'object' &&
                          featureSummary.images &&
                          featureSummary.images !== 'none' &&
                          selectedFeature) {
                          try {
                              const viewId = 'imageGalleryView';
                              // eslint-disable-next-line no-console
                              // console.debug('Managing ImageGalleryView for feature:', {
                              //   featureId: featureSummary.id,
                              //   featureImages: featureSummary.images,
                              //   featureImageLabels: featureSummary.image_labels,
                              //   viewId: viewId,
                              // })
                              // Check if ImageGalleryView already exists
                              let imageGalleryView = session?.views
                                  ? session.views.find(
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  (view) => view.type === 'ImageGalleryView' && view.id === viewId)
                                  : null;
                              if (!imageGalleryView && session) {
                                  // Create new ImageGalleryView if it doesn't exist
                                  imageGalleryView = session.addView('ImageGalleryView', {
                                      id: viewId,
                                  });
                                  // eslint-disable-next-line no-console
                                  // console.debug('Created new ImageGalleryView:', viewId)
                              }
                              // Update the view with the current feature data
                              if (imageGalleryView?.updateFeature) {
                                  // Convert images array to comma-separated string if needed
                                  const imagesString = Array.isArray(featureSummary.images)
                                      ? featureSummary.images.join(',')
                                      : featureSummary.images;
                                  const labelsString = Array.isArray(featureSummary.image_labels)
                                      ? featureSummary.image_labels.join(',')
                                      : featureSummary.image_labels;
                                  imageGalleryView.updateFeature(featureSummary.id || 'unknown', imagesString, labelsString);
                                  // eslint-disable-next-line no-console
                                  // console.debug('Updated ImageGalleryView with feature data:', {
                                  //   featureId: featureSummary.id,
                                  //   images: featureSummary.images,
                                  //   imagesString,
                                  //   imageLabels: featureSummary.image_labels,
                                  //   labelsString,
                                  // })
                              }
                          }
                          catch (e) {
                              // eslint-disable-next-line no-console
                              // console.debug('Error managing ImageGalleryView:', e)
                          }
                      }
                      else {
                          // Clear the ImageGalleryView if no feature with images is selected
                          try {
                              const viewId = 'imageGalleryView';
                              if (session?.views) {
                                  const imageGalleryView = session.views.find(
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  (view) => view.type === 'ImageGalleryView' && view.id === viewId);
                                  if (imageGalleryView?.clearFeature) {
                                      imageGalleryView.clearFeature();
                                      // eslint-disable-next-line no-console
                                      // console.debug('Cleared ImageGalleryView feature data')
                                  }
                              }
                          }
                          catch (e) {
                              // eslint-disable-next-line no-console
                              // console.debug('Error clearing ImageGalleryView:', e)
                          }
                      }
                  }
                  catch (e) {
                      // eslint-disable-next-line no-console
                      // console.debug('Error in autorun logging', e)
                  }
              });
          }
          catch (e) {
              // eslint-disable-next-line no-console
              // console.debug('Failed to set autorun for selection logging', e)
          }
      } // Closing brace for install method
      configure(pluginManager) {
          if (util.isAbstractMenuManager(pluginManager.rootModel)) {
              pluginManager.rootModel.appendToMenu('Add', {
                  label: 'Image Gallery View',
                  onClick: (session) => {
                      session.addView('ImageGalleryView', {});
                  },
              });
          }
      }
  }

  exports["default"] = ImageGalleryPlugin;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=jbrowse-plugin-image-gallery.umd.development.js.map
