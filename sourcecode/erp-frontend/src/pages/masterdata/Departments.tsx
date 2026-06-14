import ActiveTag from '../../components/ActiveTag'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { DepartmentOut } from '../../api/types'

const columns = [
  { field: 'code', headerText: 'Mã phòng ban', width: 160 },
  { field: 'name', headerText: 'Tên phòng ban' },
  {
    field: 'isActive', headerText: 'Hoạt động', width: 110,
    template: (r: DepartmentOut) => <ActiveTag active={r.isActive} />,
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
