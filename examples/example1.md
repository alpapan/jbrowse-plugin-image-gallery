# LOC100130531 Gene Analysis

## Overview
This pseudogene LOC100130531 is a ribosomal protein L39 pseudogene located on chromosome 1. It represents a non-functional copy of the ribosomal protein L39 gene.

## Expression Profile
- **Expression Level**: Very low (pseudogene)
- **Tissue Specificity**: Ubiquitous but non-functional
- **Developmental Stage**: Present throughout development

## Functional Analysis
Since this is a pseudogene, it lacks protein-coding capacity. However, it may have regulatory functions:

1. **Transcriptional regulation**
2. **microRNA target site**
3. **Chromatin organization**

## Pathway Analysis
```cytoscape
{
  "elements": [
    {"data": {"id": "ribosomal", "label": "Ribosomal Proteins"}},
    {"data": {"id": "synthesis", "label": "Protein Synthesis"}},
    {"data": {"id": "pseudogene", "label": "LOC100130531 Pseudogene"}},
    {"data": {"id": "regulatory", "label": "Regulatory Functions"}},
    {"data": {"id": "expression", "label": "Gene Expression Control"}},
    {"data": {"source": "ribosomal", "target": "synthesis"}},
    {"data": {"source": "pseudogene", "target": "regulatory", "type": "dotted"}},
    {"data": {"source": "regulatory", "target": "expression"}}
  ],
  "style": [
    {"selector": "edge[type='dotted']", "style": {"line-style": "dotted"}}
  ]
}
```

## Key Features
- **Length**: 419 bp
- **Strand**: Negative (-)
- **Biotype**: Pseudogene
- **Status**: Non-coding

## References
- Genomic location: NC_000001.10:93744325-93744743
- Gene ID: 100130531
- Related functional gene: RPL39 (Ribosomal Protein L39)