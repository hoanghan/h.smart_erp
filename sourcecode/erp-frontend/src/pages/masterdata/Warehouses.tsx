import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ActiveTag from '../../components/ActiveTag'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { WarehouseOut } from '../../api/types'

const columns: ColumnsType<WarehouseOut> = [
  { title: 'Mã kho', dataIndex: 'code', key: 'code', width: 140 },
  { title: 'Tên kho', dataIndex: 'name', key: 'name' },
  {
    title: 'Gia công',
    dataIndex: 'isOutsourcing',
    key: 'isOutsourcing',
    width: 110,
    render: (v: boolean) => (v ? <Tag color="gold">Gia công</Tag> : null),
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
  { name: 'code', label: 'Mã kho', type: 'text', required: true },
  { name: 'name', label: 'Tên kho', type: 'text', required: true },
  { name: 'isOutsourcing', label: 'Kho gia công', type: 'switch' },
  { name: 'isActive', label: 'Hoạt động', type: 'switch', editOnly: true },
]

export default function WarehousesPage() {
  return (
    <CrudPage<WarehouseOut>
      resource="warehouses"
      title="Kho"
      columns={columns}
      formFields={formFields}
      searchPlaceholder="Tìm theo mã, tên kho..."
    />
  )
}
