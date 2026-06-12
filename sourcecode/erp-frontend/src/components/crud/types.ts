import type { ColumnsType } from 'antd/es/table'
import type { Rule } from 'antd/es/form'

export type CrudFieldType = 'text' | 'number' | 'switch' | 'select' | 'lookup' | 'textarea'

export interface CrudFormField {
  name: string
  label: string
  type: CrudFieldType
  required?: boolean
  rules?: Rule[]
  /** Cho type 'select' */
  options?: { label: string; value: string }[]
  /** Cho type 'lookup': tên resource danh mục, vd "uoms" */
  lookupResource?: string
  lookupLabelField?: 'name' | 'fullName' | 'shortName'
  /** Loại bỏ chính bản ghi đang sửa khỏi danh sách lookup (dùng cho select cha) */
  excludeSelf?: boolean
  min?: number
  precision?: number
  /** Chỉ hiển thị khi đang sửa (vd Hoạt động) */
  editOnly?: boolean
}

export interface CrudPageConfig<TOut extends { id: number }> {
  resource: string
  title: string
  columns: ColumnsType<TOut>
  formFields: CrudFormField[]
  searchPlaceholder?: string
  initialValues?: Record<string, unknown>
}
