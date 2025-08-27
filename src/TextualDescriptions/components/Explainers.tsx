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

interface TextualDescriptionsProps {
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

// Custom markdown components
const MarkdownComponents = {
  code: ({ inline, className, children, ...props }: CodeComponentProps) => {
    const match = /language-(\w+)/.exec(className ?? '')
    const language = match ? match[1] : ''
    const childrenString = String(children ?? '')

    if (!inline && (language === 'mermaid' || language === 'cytoscape')) {
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

const TextualDescriptions: React.FC<TextualDescriptionsProps> = observer(
  ({ model }) => {
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>('')

    // Fetch markdown content when URLs change
    useEffect(() => {
      const fetchContent = async () => {
        if (!model.featureMarkdownUrls) {
          setContent('')
          return
        }

        setLoading(true)
        setError('')

        try {
          const urls = model.featureMarkdownUrls
            .split(',')
            .map(url => url.trim())
          const responses = await Promise.all(
            urls.map(async url => {
              const response = await fetch(url)
              if (!response.ok) {
                throw new Error(
                  `Failed to fetch ${url}: ${response.statusText}`,
                )
              }
              return response.text()
            }),
          )

          // Combine all markdown content
          const combinedContent = responses.join('\n\n---\n\n')
          setContent(combinedContent)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
          setLoading(false)
        }
      }

      void fetchContent()
    }, [model.featureMarkdownUrls])

    if (!model.hasContent) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="info">
            No textual descriptions available for this feature.
          </Alert>
        </Box>
      )
    }

    if (loading) {
      return (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <CircularProgress size={24} sx={{ mr: 1 }} />
          <Typography variant="body2">
            Loading textual descriptions...
          </Typography>
        </Box>
      )
    }

    if (error) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">
            Failed to load textual descriptions: {error}
          </Alert>
        </Box>
      )
    }

    return (
      <Paper elevation={1} sx={{ m: 1, overflow: 'auto' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {model.displayTitle}
          </Typography>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {content}
          </ReactMarkdown>
        </Box>
      </Paper>
    )
  },
)

export default TextualDescriptions
