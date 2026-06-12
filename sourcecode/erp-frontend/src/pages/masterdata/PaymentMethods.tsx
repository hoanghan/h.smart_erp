import type { ColumnsType } from 'antd/es/table'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { PaymentMethodOut } from '../../api/types'

const columns: ColumnsType<PaymentMethodOut> = [
  { title: 'Mã', dataIndex: 'code', key: 'code', width: 160 },
  { title: 'Tên', dataIndex: 'name', key: 'name' },
  { title: 'Số ngày công nợ', dataIndex: 'dueDays', key: 'dueDays', width: 150, align: 'right' },
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
