import React from 'react'
import { observer } from 'mobx-react'
import SelectTextualDescriptionsViewF from './Explainers'

interface TextualDescriptionsViewProps {
  model: {
    selectedFeatureId?: string
    featureMarkdownUrls?: string
    hasContent: boolean
    displayTitle: string
    minimized: boolean
    setMinimized: (flag: boolean) => void
  }
}

const SelectTextualDescriptionsView = observer(
  function SelectTextualDescriptionsView({
    model,
  }: TextualDescriptionsViewProps) {
    return <SelectTextualDescriptionsViewF model={model} />
  },
)

export default SelectTextualDescriptionsView
