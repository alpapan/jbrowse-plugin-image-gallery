import React, { useEffect, useRef, useState } from 'react'
import { observer } from 'mobx-react'
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CytoscapeElement {
  data: {
    id: string
    label?: string
    source?: string
    target?: string
    type?: string
  }
}

interface CytoscapeData {
  elements?: CytoscapeElement[]
  style?: {
    selector: string
    style: Record<string, string | number>
  }[]
}

interface TextualDescriptionsViewProps {
  model: {
    hasContent: boolean
    displayTitle: string
    featureMarkdownUrls?: string
    selectedFeatureId?: string
  }
}

interface CodeComponentProps {
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

interface TableComponentProps {
  children?: React.ReactNode
}

interface CellComponentProps {
  children?: React.ReactNode
}

// Direct cytoscape renderer for JSON format
const CytoscapeDirectRender: React.FC<{ data: CytoscapeData }> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [info, setInfo] = useState<string>('Loading cytoscape...')

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current
      setInfo('Container available, initializing cytoscape...')

      // Clear container
      container.innerHTML = ''

      import('cytoscape')
        .then(cytoscape => {
          const elements = data.elements ?? []
          const style = data.style ?? []

          if (elements.length === 0) {
            setInfo('No elements to render')
            return
          }

          const cy = cytoscape.default({
            container,
            elements,
            style: [
              {
                selector: 'node',
                style: {
                  'background-color': '#3498db',
                  label: 'data(label)',
                  color: '#2c3e50',
                  'text-valign': 'center',
                  'text-halign': 'center',
                  'font-size': '12px',
                  width: '80px',
                  height: '40px',
                  shape: 'roundrectangle',
                },
              },
              {
                selector: 'edge',
                style: {
                  width: 2,
                  'line-color': '#7f8c8d',
                  'target-arrow-color': '#7f8c8d',
                  'target-arrow-shape': 'triangle',
                  'curve-style': 'bezier',
                },
              },
              ...style,
            ],
            layout: {
              name: 'breadthfirst',
              directed: true,
              padding: 30,
              spacingFactor: 1.2,
            },
            userZoomingEnabled: false,
            userPanningEnabled: false,
            boxSelectionEnabled: false,
          })

          // cy is used for initialization and rendering
          void cy

          setInfo(
            `Cytoscape rendered successfully! (${elements.length} elements)`,
          )
        })
        .catch(err => {
          setInfo(`Cytoscape error: ${err.message}`)
        })
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

// Simple test for flowchart
const CytoscapeDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [info, setInfo] = useState<string>('Initializing...')

  useEffect(() => {
    if (containerRef.current) {
      setInfo('Container available!')
      containerRef.current.innerHTML = `
        <div style="padding: 20px; border: 2px solid blue; background: #f0f0f8;">
          <h3>Flowchart Container Test Success!</h3>
          <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 10px;">${chart}</pre>
        </div>
      `
    } else {
      setInfo('Container ref is null')
    }
  }, [chart])

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
        Debug Info: {info}
      </Typography>
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          minHeight: '200px',
          border: '2px solid blue',
          borderRadius: 1,
          backgroundColor: '#f8f8ff',
          p: 2,
        }}
      >
        <Typography variant="body2" color="primary">
          This should be replaced if container ref works
        </Typography>
      </Box>
    </Box>
  )
}

// Newick phylogenetic tree renderer
const NewickTreeRenderer: React.FC<{ data: string }> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const renderTree = async () => {
      try {
        setLoading(true)

        let currentTitle: string | null = null
        let currentDescription: string | null = null
        let cleanedData = data

        // Parse for square bracket comments at the end of the tree line
        const lines = data.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.includes('[') && line.includes(']') && line.includes(';')) {
            // This line has tree with comment at the end
            const openBracket = line.lastIndexOf('[')
            const closeBracket = line.lastIndexOf(']')

            if (openBracket > -1 && closeBracket > openBracket) {
              const commentText = line
                .substring(openBracket + 1, closeBracket)
                .trim()
              if (commentText.includes(' - ')) {
                // Title - Description format
                const [titlePart, descPart] = commentText.split(' - ', 2)
                currentTitle = titlePart.trim()
                currentDescription = descPart.trim()
              } else {
                // Just a title
                currentTitle = commentText.trim()
              }

              // Remove the comment from the line for clean parsing
              const cleanLine = line.substring(0, openBracket).trim()
              lines[i] = cleanLine
              cleanedData = lines.join('\n').trim()
              break
            }
          }
        }

        setTitle(currentTitle)
        setDescription(currentDescription)

        if (!containerRef.current || !cleanedData.includes('(')) {
          setError('Invalid newick format - no tree structure found')
          setLoading(false)
          return
        }

        // Dynamically import phylojs to parse Newick
        const phylojs = await import('phylojs')
        const tree = phylojs.readNewick(cleanedData)

        if (!tree) {
          setError('Failed to parse newick tree')
          setLoading(false)
          return
        }

        // Convert phylojs tree to cytoscape elements
        const elements: {
          data: { id: string; label?: string; source?: string; target?: string }
        }[] = []
        let nodeId = 0

        const convertNode = (
          node: import('phylojs').Node,
          parentId: string | null = null,
        ): string => {
          const currentNodeId = `node_${nodeId++}`

          // Add node
          elements.push({
            data: {
              id: currentNodeId,
              label: node.label ?? (node.isLeaf() ? `Leaf_${node.id}` : ''),
            },
          })

          // Add edge from parent if exists
          if (parentId) {
            elements.push({
              data: {
                id: `edge_${parentId}_${currentNodeId}`,
                source: parentId,
                target: currentNodeId,
              },
            })
          }

          // Process children
          node.children.forEach((child: import('phylojs').Node) => {
            convertNode(child, currentNodeId)
          })

          return currentNodeId
        }

        convertNode(tree.root)

        // Clear container and initialize cytoscape with Klay layout
        const container = containerRef.current
        container.innerHTML = ''

        // Import cytoscape and Klay extension
        const cytoscape = await import('cytoscape')
        const klay = await import('cytoscape-klay')

        // Register Klay extension
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        cytoscape.default.use(klay.default)

        // Phylogenetic tree styling with pastel colors
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const style: any = [
          {
            selector: 'node',
            style: {
              'background-color': '#a8dadc', // Pastel blue for species
              label: 'data(label)',
              color: '#2c3e50',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': '11px',
              'font-weight': 'bold',
              width: '60px',
              height: '30px',
              shape: 'roundrectangle',
              'text-wrap': 'wrap',
              'text-max-width': '50px',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 2,
              'line-color': '#7f8c8d',
              'curve-style': 'straight',
              'target-arrow-shape': 'none',
            },
          },
          {
            selector: 'node[label = ""]',
            style: {
              'background-color': '#f8d7da', // Pastel pink for internal nodes
              width: '8px',
              height: '8px',
              shape: 'ellipse',
            },
          },
        ]

        // Create cytoscape instance with Klay layout
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cy = cytoscape.default({
          container,
          elements,
          style,
          layout: {
            name: 'klay',
            nodeDimensionsIncludeLabels: true,
            fit: true,
            padding: 30,
            spacingFactor: 1.4,
            direction: 'RIGHT', // Tree flows left to right
            edgeRouting: 'ORTHOGONAL',
            cycleBreaking: 'GREEDY',
            thoroughness: 7,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          userZoomingEnabled: true,
          userPanningEnabled: true,
          boxSelectionEnabled: false,
        })

        // Fit the view
        cy.fit()
        setLoading(false)
      } catch (err) {
        console.error('Newick rendering error:', err)
        setError(
          `Failed to render tree: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
        setLoading(false)
      }
    }

    void renderTree()
  }, [data])

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box sx={{ my: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="body1" sx={{ mb: 1, fontWeight: 'bold' }}>
          {description}
        </Typography>
      )}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      )}
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '450px',
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

// Custom markdown components
const MarkdownComponents = {
  code: ({ inline, className, children, ...props }: CodeComponentProps) => {
    const match = /language-(\w+)/.exec(className ?? '')
    const language = match ? match[1] : ''
    const childrenString = String(children ?? '')

    if (!inline && (language === 'cytoscape' || language === 'newick')) {
      // Handle both cytoscape JSON format and flowchart format
      const chartData = childrenString.replace(/\n$/, '')

      // If it's JSON format (cytoscape), parse and render directly
      if (language === 'cytoscape') {
        try {
          const cytoscapeData = JSON.parse(chartData)
          return <CytoscapeDirectRender data={cytoscapeData} {...props} />
        } catch (e) {
          return (
            <Alert severity="error" sx={{ my: 2 }}>
              Invalid cytoscape JSON format: {String(e)}
            </Alert>
          )
        }
      }

      // Handle newick format
      if (language === 'newick') {
        try {
          return <NewickTreeRenderer data={chartData} {...props} />
        } catch (e) {
          return (
            <Alert severity="error" sx={{ my: 2 }}>
              Invalid newick format: {String(e)}
            </Alert>
          )
        }
      }

      // Otherwise, use flowchart parser for backwards compatibility
      return <CytoscapeDiagram chart={chartData} {...props} />
    }

    return !inline && match ? (
      <SyntaxHighlighter
        style={tomorrow}
        language={language}
        PreTag="div"
        customStyle={{
          margin: '1em 0',
          borderRadius: '4px',
        }}
        {...props}
      >
        {childrenString.replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
  table: ({ children }: TableComponentProps) => (
    <Box sx={{ overflowX: 'auto', my: 2 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        {children}
      </table>
    </Box>
  ),
  th: ({ children }: CellComponentProps) => (
    <th
      style={{
        border: '1px solid #ddd',
        padding: '8px 12px',
        backgroundColor: '#f5f5f5',
        fontWeight: 'bold',
        textAlign: 'left',
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }: CellComponentProps) => (
    <td
      style={{
        border: '1px solid #ddd',
        padding: '8px 12px',
      }}
    >
      {children}
    </td>
  ),
}

export const SelectTextualDescriptionsViewF: React.FC<TextualDescriptionsViewProps> =
  observer(({ model }: TextualDescriptionsViewProps) => {
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
      const loadContent = async () => {
        if (!model.featureMarkdownUrls) {
          setContent('')
          setLoading(false)
          return
        }

        setLoading(true)

        try {
          const urls = model.featureMarkdownUrls
            .split(',')
            .map((url: string) => url.trim())

          const responses = await Promise.all(
            urls.map(async (url: string) => {
              const response = await fetch(url)
              if (!response.ok) {
                throw new Error(
                  `Failed to fetch ${url}: ${response.statusText}`,
                )
              }
              return response.text()
            }),
          )

          const combinedContent = responses.join('\n\n---\n\n')
          setContent(combinedContent)
        } catch (error) {
          console.error(
            'TextualDescriptionsViewF: Error loading content:',
            error,
          )
          setContent(`Error loading content: ${String(error)}`)
        } finally {
          setLoading(false)
        }
      }

      void loadContent()
    }, [model.featureMarkdownUrls, model.selectedFeatureId])

    // Show placeholder message when no feature is selected
    if (!model.selectedFeatureId) {
      return (
        <Paper
          elevation={12}
          sx={{
            padding: 2,
            margin: 1,
            minHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
          className="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation12 css-4h24oc-MuiPaper-root-viewContainer-unfocusedView"
        >
          <Typography variant="h6" color="textSecondary">
            No selected feature with text descriptions
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            When you select a feature with stored text content, it will appear
            here
          </Typography>
        </Paper>
      )
    }

    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      )
    }

    // Show placeholder message when feature is selected but has no textual descriptions
    if (!model.featureMarkdownUrls || !content) {
      return (
        <Paper sx={{ p: 2, m: 1 }} elevation={1}>
          <Typography variant="h6" gutterBottom>
            {model.displayTitle}
          </Typography>
          <Box
            sx={{
              mt: 2,
              p: 3,
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body1" gutterBottom>
              Feature has no textual descriptions
            </Typography>
            <Typography variant="body2">
              You can provide text via markdown_urls in the GFF file
            </Typography>
          </Box>
        </Paper>
      )
    }

    return (
      <Paper sx={{ p: 2, m: 1 }} elevation={1}>
        <Typography variant="h6" gutterBottom>
          {model.displayTitle}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {content}
          </ReactMarkdown>
        </Box>
      </Paper>
    )
  })

export default SelectTextualDescriptionsViewF
