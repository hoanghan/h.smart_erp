import type { ColumnsType } from 'antd/es/table'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { ProductGroupOut } from '../../api/types'

const columns: ColumnsType<ProductGroupOut> = [
  { title: 'Mã nhóm', dataIndex: 'code', key: 'code', width: 160 },
  { title: 'Tên nhóm', dataIndex: 'name', key: 'name' },
]

const formFields: CrudFormField[] = [
  { name: 'code', label: 'Mã nhóm', type: 'text', required: true },
  { name: 'name', label: 'Tên nhóm', type: 'text', required: true },
  { name: 'parentId', label: 'Nhóm cha', type: 'lookup', lookupResource: 'product-groups', excludeSelf: true },
]

export default function ProductGroupsPage() {
  return (
    <CrudPage<ProductGroupOut>
      resource="product-groups"
      title="Nhóm hàng"
      columns={columns}
      formFields={formFields}
      searchPlaceholder="Tìm theo mã, tên nhóm..."
    />
  )
}
