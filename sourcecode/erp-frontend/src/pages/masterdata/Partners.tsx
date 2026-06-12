import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ActiveTag from '../../components/ActiveTag'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { PartnerOut } from '../../api/types'
import { formatNumberVN } from '../../utils/format'

const columns: ColumnsType<PartnerOut> = [
  { title: 'Mã', dataIndex: 'code', key: 'code', width: 120 },
  { title: 'Tên', dataIndex: 'shortName', key: 'shortName' },
  { title: 'Tên đầy đủ', dataIndex: 'fullName', key: 'fullName' },
  { title: 'Điện thoại', dataIndex: 'phone', key: 'phone', width: 130 },
  {
    title: 'Loại',
    key: 'type',
    width: 140,
    render: (_, record) => (
      <>
        {record.isCustomer && <Tag color="blue">Khách hàng</Tag>}
        {record.isSupplier && <Tag color="purple">Nhà cung cấp</Tag>}
      </>
    ),
  },
  {
    title: 'Hạn mức công nợ',
    dataIndex: 'creditLimit',
    key: 'creditLimit',
    width: 150,
    align: 'right',
    render: (v: number | null) => formatNumberVN(v),
  },
  {
    title: 'Hoạt động',
    dataIndex: 'isActive',
    key: 'isActive',
    width: 110,
    render: (active: boolean) => <ActiveTag active={active} />,
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
