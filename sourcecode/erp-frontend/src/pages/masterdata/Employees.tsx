import type { ColumnsType } from 'antd/es/table'
import ActiveTag from '../../components/ActiveTag'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { EmployeeOut } from '../../api/types'

const columns: ColumnsType<EmployeeOut> = [
  { title: 'Mã NV', dataIndex: 'code', key: 'code', width: 120 },
  { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
  { title: 'Điện thoại', dataIndex: 'phone', key: 'phone', width: 130 },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  {
    title: 'Hoạt động',
    dataIndex: 'isActive',
    key: 'isActive',
    width: 110,
    render: (active: boolean) => <ActiveTag active={active} />,
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
