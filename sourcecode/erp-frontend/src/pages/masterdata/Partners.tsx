import { Tag } from 'antd'
import ActiveTag from '../../components/ActiveTag'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { PartnerOut } from '../../api/types'
import { formatNumberVN } from '../../utils/format'

const columns = [
  { field: 'code', headerText: 'Mã', width: 120 },
  { field: 'shortName', headerText: 'Tên' },
  { field: 'fullName', headerText: 'Tên đầy đủ' },
  { field: 'phone', headerText: 'Điện thoại', width: 130 },
  {
    field: 'type', headerText: 'Loại', width: 140,
    template: (r: PartnerOut) => (
      <>
        {r.isCustomer && <Tag color="blue">Khách hàng</Tag>}
        {r.isSupplier && <Tag color="purple">Nhà cung cấp</Tag>}
      </>
    ),
  },
  {
    field: 'creditLimit', headerText: 'Hạn mức công nợ', width: 150, textAlign: 'Right',
    template: (r: PartnerOut) => formatNumberVN(r.creditLimit),
  },
  {
    field: 'isActive', headerText: 'Hoạt động', width: 110,
    template: (r: PartnerOut) => <ActiveTag active={r.isActive} />,
  },
]

const formFields: CrudFormField[] = [
  { name: 'code', label: 'Mã đối tác', type: 'text', required: true },
  { name: 'shortName', label: 'Tên', type: 'text', required: true },
  { name: 'fullName', label: 'Tên đầy đủ', type: 'text' },
  { name: 'taxCode', label: 'Mã số thuế', type: 'text' },
  { name: 'isCustomer', label: 'Là khách hàng', type: 'switch' },
  { name: 'isSupplier', label: 'Là nhà cung cấp', type: 'switch' },
  { name: 'phone', label: 'Điện thoại', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'address', label: 'Địa chỉ', type: 'textarea' },
  { name: 'paymentMethodId', label: 'Phương thức thanh toán', type: 'lookup', lookupResource: 'payment-methods' },
  { name: 'deliveryMethodId', label: 'Phương thức giao hàng', type: 'lookup', lookupResource: 'delivery-methods' },
  {
    name: 'salespersonId',
    label: 'Nhân viên phụ trách',
    type: 'lookup',
    lookupResource: 'employees',
    lookupLabelField: 'fullName',
  },
  { name: 'creditLimit', label: 'Hạn mức công nợ', type: 'number', min: 0 },
  { name: 'creditDays', label: 'Số ngày công nợ', type: 'number', min: 0 },
  { name: 'isActive', label: 'Hoạt động', type: 'switch', editOnly: true },
]

export default function PartnersPage() {
  return (
    <CrudPage<PartnerOut>
      resource="partners"
      title="Đối tác"
      columns={columns}
      formFields={formFields}
      searchPlaceholder="Tìm theo mã, tên, mã số thuế..."
      initialValues={{ isCustomer: true, isSupplier: false }}
    />
  )
}
