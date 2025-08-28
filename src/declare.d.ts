declare module 'phylojs' {
  export class Tree {
    constructor()
    root: Node

    // Methods
    reroot(node: Node): void
    getTipLabels(): string[]
    getNodeLabels(): string[]
    toString(): string
    copy(): Tree
    applyPreOrder<T>(f: (node: Node) => T): T[]
    applyPostOrder<T>(f: (node: Node) => T): T[]
  }

  export class Node {
    constructor(id: number)
    id: number
    label?: string
    branchLength?: number
    height?: number
    parent?: Node
    children: Node[]
    annotation: Record<string, unknown>
    hybridID?: number
    rttDist?: number

    // Methods
    isLeaf(): boolean
    isRoot(): boolean
    isHybrid(): boolean
    isSingleton(): boolean
    addChild(child: Node): void
    removeChild(child: Node): void
    getAncestors(): Node[]
    isLeftOf(other: Node): boolean | undefined
    copy(): Node
    toString(): string
    applyPreOrder<T>(f: (node: Node) => T): T[]
    applyPostOrder<T>(f: (node: Node) => T): T[]
  }

  export function readNewick(newickString: string): Tree
  export function readTreesFromNewick(newickString: string): Tree[]
}

declare module 'cytoscape-dagre' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dagreExtension: any
  export default dagreExtension
}

declare module 'cytoscape-cola' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colaExtension: any
  export default colaExtension
}

declare module 'cytoscape-klay' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const klayExtension: any
  export default klayExtension
}
