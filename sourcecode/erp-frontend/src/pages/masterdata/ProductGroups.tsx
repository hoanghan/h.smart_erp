import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { ProductGroupOut } from '../../api/types'

const columns = [
  { field: 'code', headerText: 'Mã nhóm', width: 160 },
  { field: 'name', headerText: 'Tên nhóm' },
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
