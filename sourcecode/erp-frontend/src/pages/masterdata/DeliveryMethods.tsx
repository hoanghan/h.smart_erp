import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { DeliveryMethodOut } from '../../api/types'

const columns = [
  { field: 'code', headerText: 'Mã', width: 160 },
  { field: 'name', headerText: 'Tên' },
]

const formFields: CrudFormField[] = [
  { name: 'code', label: 'Mã', type: 'text', required: true },
  { name: 'name', label: 'Tên', type: 'text', required: true },
]

export default function DeliveryMethodsPage() {
  return (
    <CrudPage<DeliveryMethodOut>
      resource="delivery-methods"
      title="Phương thức giao hàng"
      columns={columns}
      formFields={formFields}
      searchPlaceholder="Tìm theo mã, tên..."
    />
  )
}
