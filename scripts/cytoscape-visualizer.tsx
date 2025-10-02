import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import cytoscape from 'cytoscape'
import klay from 'cytoscape-klay'
import dagre from 'cytoscape-dagre' // Re-add dagre import


// Register extensions
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
cytoscape.use(klay)
cytoscape.use(dagre) // Re-add dagre registration

declare global {
  interface Window {
    React: typeof React
    ReactDOM: typeof import('react-dom')
    MaterialUI: typeof import('@mui/material')
  }
}

const {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  CssBaseline,
  Container,
} = window.MaterialUI
const { ThemeProvider, createTheme } = window.MaterialUI

// Define the interfaces needed for CytoscapeData and CytoscapeElement
interface NodeData {
  id: string;
  label?: string;
  parent?: string; // For compound nodes
  is_compound?: boolean; // For styling
 is_target?: boolean; // For styling
  is_slim?: boolean; // For styling
  namespace?: string; // For styling
  [key: string]: unknown; // Allow other properties
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown; // Allow other properties
}

interface CytoscapeElement {
  data: NodeData | EdgeData;
  classes?: string;
}

interface CytoscapeData {
  elements?: {
    nodes?: CytoscapeElement[];
    edges?: CytoscapeElement[];
  };
  style?: {
    selector: string;
    style: Record<string, string | number>;
  }[];
  layout?: {
    name: string;
    [key: string]: unknown; // Allow other layout properties
 }
}

// Adapted CytoscapeDirectRender component
const CytoscapeDirectRender: React.FC<{ data: CytoscapeData }> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [info, setInfo] = useState<string>('Loading cytoscape...')

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current
      setInfo('Container available, initializing cytoscape...')

      // Clear container
      container.innerHTML = ''

      console.log('Incoming Cytoscape data:', JSON.stringify(data, null, 2)); // Log the entire data object
      const elements = data.elements
      const style = data.style ?? []
      const layout = data.layout // Use provided layout, no default name here
      console.log('Cytoscape elements:', JSON.stringify(elements, null, 2));
      console.log('Cytoscape style:', JSON.stringify(style, null, 2));
      console.log('Cytoscape layout:', JSON.stringify(layout, null, 2));

      if (!elements || (elements.nodes?.length === 0 && elements.edges?.length === 0)) {
        setInfo('No elements to render')
        return
      }

      const processedNodes: CytoscapeElement[] = []
      const processedEdges: CytoscapeElement[] = [...(elements.edges ?? [])]
      const parentNodes = new Set<string>()

      // First pass: identify all potential parent nodes and process children
      for (const node of elements.nodes ?? []) {
        const newNodeData = { ...node.data }
        const parentId = newNodeData.parent as string | undefined // Ensure parentId is treated as string or undefined

        if (newNodeData.is_compound) {
          parentNodes.add(newNodeData.id)
          delete newNodeData.is_compound // Remove is_compound
        }
        if (parentId) {
          parentNodes.add(parentId) // Add parent to set if it's not already there
          // Create a new edge for the parent-child relationship
          processedEdges.push({
            data: {
              id: `edge_${newNodeData.id}_to_${parentId}`,
              source: newNodeData.id,
              target: parentId,
            },
          })
          delete newNodeData.parent // Remove parent property for explicit edge
        }
        processedNodes.push({ ...node, data: newNodeData })
      }

      // Second pass: add is_hierarchy_parent flag to former compound nodes
      const finalNodes = processedNodes.map(node => {
        if (parentNodes.has(node.data.id)) {
          return { ...node, data: { ...node.data, is_hierarchy_parent: true } }
        }
        return node
      })

      // Combine processed nodes and edges into a flat array for Cytoscape
      const flatElements = [...finalNodes, ...processedEdges]

      // Filter out problematic styles from the markdown
      const filteredStyle = (style ?? [])
        .map(s => {
          const newStyle = { ...s }

          // Remove width/height mappers using non-numeric data
          if (
            typeof newStyle.style.width === 'string' &&
            newStyle.style.width.includes('mapData(label')
          ) {
            delete newStyle.style.width
          }
          if (
            typeof newStyle.style.height === 'string' &&
            newStyle.style.height.includes('mapData(label')
          ) {
            delete newStyle.style.height
          }
          // Also remove other problematic mapData functions that might cause issues
          if (
            typeof newStyle.style['font-size'] === 'string' &&
            newStyle.style['font-size'].includes('mapData(label')
          ) {
            delete newStyle.style['font-size']
          }
          // Fix selector syntax - convert boolean attribute selectors from [attr=true] to [?attr]
          if (newStyle.selector) {
            newStyle.selector = newStyle.selector
              .replace(/\[is_compound=true\]/g, '[?is_compound]')
              .replace(/\[is_target=true\]/g, '[?is_target]')
              .replace(/\[is_slim=true\]/g, '[?is_slim]')
          }
          // Remove background-color and color properties to ensure consistent styling
          delete newStyle.style['background-color']
          delete newStyle.style.color
          return newStyle
        })
        .filter(Boolean) as {
        selector: string
        style: Record<string, string | number>
      }[] // Using proper type

      try {
        const cy = cytoscape({
          container,
          elements: flatElements,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#c0c0c0', // Slightly darker grey for better visibility
                label: 'data(label)',
                'font-size': '14px', // Increased font size for better readability
                shape: 'roundrectangle',
                'text-wrap': 'wrap',
                'text-max-width': '120px',
                width: '100px', // Increased default width
                height: '60px', // Increased default height
                'min-width': '80px',
                'min-height': '40px',
                padding: '10px',
                color: '#000000', // Black text for better contrast (fixed to 6-digit hex)
                'text-valign': 'center',
                'text-halign': 'center',
                'border-width': '2px', // Slightly thicker border for better definition
                'border-color': '#777777', // Darker border color (fixed from #77 to #77777)
                'font-weight': 'bold', // Bold text for better readability
                'font-family': 'Arial, sans-serif',
                'text-outline-width': '0px', // No text outline
              },
            },
            {
              selector: 'edge',
              style: {
                width: 2, // Slightly thinner lines
                'line-color': '#aaaaaa', // Darker line color
                'target-arrow-color': '#aaaaaa', // Consistent color
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
              },
            },
            // Styling for former compound nodes (now regular nodes with is_hierarchy_parent)
            {
              selector: 'node[?is_hierarchy_parent]',
              style: {
                'background-color': '#e0e0e0', // Light grey for hierarchy parents
                'border-color': '#999',
                'border-width': '2px',
                'text-valign': 'top',
                'text-halign': 'center',
                'font-size': '12px',
                color: '#333',
                'text-transform': 'uppercase',
                'padding': '10px'
              }
            },
            {
              selector: 'node[?is_target]',
              style: {
                'background-color': '#9b59b6', // Purple for target nodes
                'border-width': '3px',
                'border-color': '#8e44ad',
                'font-weight': 'bold',
                color: '#000000' // Black text for contrast (fixed to 6-digit hex)
              }
            },
            {
              selector: 'node[?is_slim]',
              style: {
                shape: 'ellipse',
                'background-color': '#d0d0d0', // Distinct background for slim nodes
                'border-width': '2px',
                'border-color': '#7f8c8d'
              }
            },
            {
              selector: 'node[namespace="biological_process"]',
              style: {
                'background-color': '#e74c3c' // Red for biological process
              }
            },
            {
              selector: 'node[namespace="molecular_function"]',
              style: {
                'background-color': '#2ecc71' // Green for molecular function
              }
            },
            {
              selector: 'node[namespace="cellular_component"]',
              style: {
                'background-color': '#f1c40f' // Yellow for cellular component
              }
            },
            ...filteredStyle, // Use filtered styles
          ],
          layout: {
            name: 'klay', // Explicitly set klay layout
            fit: true,
            padding: 20,
            direction: 'DOWN',
            layoutHierarchy: true, // Enforce hierarchical layout
            spacing: 40,
            nodeNodeBetweenLayers: 80, // Increased vertical spacing for clearer tree levels
            edgeRouting: 'SPLINES', // Curved edges for a more organic, diagram-like look
            nodePlacement: 'BRANDES_KOEPF', // Encourages hierarchical placement
            nodeDimensionsIncludeLabels: true,
            ...(layout ?? {}), // Merge with any provided layout properties
          } as cytoscape.LayoutOptions,
          userZoomingEnabled: true,
          userPanningEnabled: true,
          boxSelectionEnabled: false,
        })


        setInfo(
          `Cytoscape rendered successfully! (${
            flatElements?.length ?? 0
          } elements)`,
        )
      } catch (err: unknown) {
        setInfo(`Cytoscape error: ${(err as Error).message ?? 'Unknown error'}`) // Improved error message
      }
    } else {
      setInfo('Container ref is null')
    }
  }, [data])

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
        Status: {info}
      </Typography>
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '400px',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          backgroundColor: '#fff',
          '& > div': {
            width: '100% !important',
            height: '100% !important',
          },
        }}
      />
    </Box>
  )
}

interface MarkdownVisualizerProps {
  filePath: string // Changed to filePath
}

const MarkdownVisualizer: React.FC<MarkdownVisualizerProps> = ({
  filePath,
}) => {
  const [markdownContent, setMarkdownContent] = useState<string>(
    'Loading markdown...',
  )
  const [cytoscapeDataList, setCytoscapeDataList] = useState<CytoscapeData[]>(
    [],
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        const response = await fetch(filePath)
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`)
        }
        const content = await response.text()
        setMarkdownContent(content)

        const extractAllCytoscape = (md: string) => {
          const regex = /```cytoscape\n([\s\S]*?)\n```/g
          const matches = [...md.matchAll(regex)]
          const extractedData: CytoscapeData[] = []

          if (matches.length === 0) {
            setCytoscapeDataList([])
            setError('No Cytoscape block found in the markdown.')
            return
          }

          for (const match of matches) {
            const cytoscapeBlock = match[1]
            if (cytoscapeBlock) {
              try {
                const data = JSON.parse(cytoscapeBlock) as CytoscapeData
                extractedData.push(data)
              } catch (e: unknown) {
                setError(
                  `Invalid Cytoscape JSON in one of the blocks: ${
                    (e as Error).message
                  }`,
                )
                // Continue processing other blocks even if one fails
              }
            }
          }

          setCytoscapeDataList(extractedData)
          if (extractedData.length > 0 && !error) {
            setError(null)
          } else if (extractedData.length === 0 && !error) {
            setError('No valid Cytoscape JSON content found.')
          }
        }

        extractAllCytoscape(content)
      } catch (err: unknown) {
        setError(`Error loading markdown file: ${(err as Error).message}`)
        setMarkdownContent('')
        setCytoscapeDataList([])
      }
    }

    if (filePath) {
      void fetchMarkdown()
    }
  }, [filePath, error]) // Depend on filePath and error to re-evaluate error state

  const defaultTheme = createTheme()

  return (
    <ThemeProvider theme={defaultTheme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Cytoscape Markdown Visualizer
          </Typography>
          <Typography variant="h6" gutterBottom>
            Original Markdown:
          </Typography>
          <Box
            sx={{
              bgcolor: '#f5f5f5',
              p: 2,
              borderRadius: 1,
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdownContent}
            </ReactMarkdown>
          </Box>

          <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
            Visualized Cytoscape Diagrams:
          </Typography>
          {error && (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          )}
          {cytoscapeDataList.length > 0
            ? cytoscapeDataList.map((data, index) => (
                <CytoscapeDirectRender key={index} data={data} />
              ))
            : !error && (
                <Alert severity="info" sx={{ my: 2 }}>
                  No Cytoscape diagrams to display.
                </Alert>
              )}
        </Paper>
      </Container>
    </ThemeProvider>
  )
}

// Example usage (replace with actual file path)
const filePath = 'test_cyto.md' // Relative path to the markdown file from the root of the server

const container = document.getElementById('root')
if (container) {
  if (typeof createRoot === 'function') {
    // React 18+
    createRoot(container).render(<MarkdownVisualizer filePath={filePath} />)
  } else if (window.ReactDOM && typeof window.ReactDOM.render === 'function') {
    // Fallback for older React versions
    window.ReactDOM.render(<MarkdownVisualizer filePath={filePath} />, container)
  }
}
