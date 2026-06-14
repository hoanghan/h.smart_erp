import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { PaymentMethodOut } from '../../api/types'

const columns = [
  { field: 'code', headerText: 'Mã', width: 160 },
  { field: 'name', headerText: 'Tên' },
  { field: 'dueDays', headerText: 'Số ngày công nợ', width: 150, textAlign: 'Right' },
]

const formFields: CrudFormField[] = [
  { name: 'code', label: 'Mã', type: 'text', required: true },
  { name: 'name', label: 'Tên', type: 'text', required: true },
  { name: 'dueDays', label: 'Số ngày công nợ', type: 'number', min: 0 },
]

export default function PaymentMethodsPage() {
  return (
    <CrudPage<PaymentMethodOut>
      resource="payment-methods"
      title="Phương thức thanh toán"
      columns={columns}
      formFields={formFields}
      searchPlaceholder="Tìm theo mã, tên..."
      initialValues={{ dueDays: 0 }}
    />
  )
}
