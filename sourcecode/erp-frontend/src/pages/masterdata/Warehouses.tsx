import { Tag } from 'antd'
import ActiveTag from '../../components/ActiveTag'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { WarehouseOut } from '../../api/types'

const columns = [
  { field: 'code', headerText: 'Mã kho', width: 140 },
  { field: 'name', headerText: 'Tên kho' },
  {
    field: 'isOutsourcing', headerText: 'Gia công', width: 110,
    template: (r: WarehouseOut) => (r.isOutsourcing ? <Tag color="gold">Gia công</Tag> : null),
  },
  {
    field: 'isActive', headerText: 'Hoạt động', width: 110,
    template: (r: WarehouseOut) => <ActiveTag active={r.isActive} />,
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
