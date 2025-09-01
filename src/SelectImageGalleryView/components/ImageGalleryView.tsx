import React from 'react'
import { observer } from 'mobx-react'
import SelectImageGalleryViewF from './Explainers'

interface ImageGalleryViewProps {
  model: {
    selectedFeatureId?: string
    featureImages?: string
    featureLabels?: string
    featureTypes?: string
    hasContent: boolean
    displayTitle: string
    minimized: boolean
    setMinimized: (flag: boolean) => void
  }
}

const SelectImageGalleryView = observer(function SelectImageGalleryView({
  model,
}: ImageGalleryViewProps) {
  return <SelectImageGalleryViewF model={model} />
})

export default SelectImageGalleryView
