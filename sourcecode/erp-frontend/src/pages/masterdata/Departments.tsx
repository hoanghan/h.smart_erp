import type { ColumnsType } from 'antd/es/table'
import ActiveTag from '../../components/ActiveTag'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { DepartmentOut } from '../../api/types'

const columns: ColumnsType<DepartmentOut> = [
  { title: 'Mã phòng ban', dataIndex: 'code', key: 'code', width: 160 },
  { title: 'Tên phòng ban', dataIndex: 'name', key: 'name' },
  {
    title: 'Hoạt động',
    dataIndex: 'isActive',
    key: 'isActive',
    width: 110,
    render: (active: boolean) => <ActiveTag active={active} />,
  },
]

const formFields: CrudFormField[] = [
  { name: 'code', label: 'Mã phòng ban', type: 'text', required: true },
  { name: 'name', label: 'Tên phòng ban', type: 'text', required: true },
  { name: 'parentId', label: 'Phòng ban cha', type: 'lookup', lookupResource: 'departments', excludeSelf: true },
  { name: 'isActive', label: 'Hoạt động', type: 'switch', editOnly: true },
]

export default function DepartmentsPage() {
  return (
    <CrudPage<DepartmentOut>
      resource="departments"
      title="Phòng ban"
      columns={columns}
      formFields={formFields}
      searchPlaceholder="Tìm theo mã, tên phòng ban..."
    />
  )
}
