import type { ReactNode } from 'react'
import { Collapse } from 'antd'

export interface DocFormSection {
  key: string
  header: ReactNode
  content: ReactNode
  /** Mặc định mở (true nếu không truyền) */
  defaultOpen?: boolean
}

interface DocFormAccordionProps {
  sections: DocFormSection[]
}

/** Section gập được cho thân DocForm (giữ lưới nén dày bên trong từng section). */
export default function DocFormAccordion({ sections }: DocFormAccordionProps) {
  const defaultActiveKey = sections.filter((s) => s.defaultOpen !== false).map((s) => s.key)
  return (
    <Collapse
      className="docform-accordion"
      defaultActiveKey={defaultActiveKey}
      items={sections.map((s) => ({ key: s.key, label: s.header, children: s.content }))}
    />
  )
}
