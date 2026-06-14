import ActiveTag from '../../components/ActiveTag'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { EmployeeOut } from '../../api/types'

const columns = [
  { field: 'code', headerText: 'Mã NV', width: 120 },
  { field: 'fullName', headerText: 'Họ tên' },
  { field: 'phone', headerText: 'Điện thoại', width: 130 },
  { field: 'email', headerText: 'Email' },
  {
    field: 'isActive', headerText: 'Hoạt động', width: 110,
    template: (r: EmployeeOut) => <ActiveTag active={r.isActive} />,
  },
]

const formFields: CrudFormField[] = [
  { name: 'code', label: 'Mã nhân viên', type: 'text', required: true },
  { name: 'fullName', label: 'Họ tên', type: 'text', required: true },
  { name: 'departmentId', label: 'Phòng ban', type: 'lookup', lookupResource: 'departments' },
  { name: 'phone', label: 'Điện thoại', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'isActive', label: 'Hoạt động', type: 'switch', editOnly: true },
]

export default function EmployeesPage() {
  return (
    <CrudPage<EmployeeOut>
      resource="employees"
      title="Nhân viên"
      columns={columns}
      formFields={formFields}
      searchPlaceholder="Tìm theo mã, họ tên..."
    />
  )
}
