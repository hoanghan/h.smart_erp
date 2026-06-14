import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { UomOut } from '../../api/types'

const columns = [
  { field: 'code', headerText: 'Mã', width: 160 },
  { field: 'name', headerText: 'Tên đơn vị' },
]

const formFields: CrudFormField[] = [
  { name: 'code', label: 'Mã', type: 'text', required: true },
  { name: 'name', label: 'Tên đơn vị', type: 'text', required: true },
]

export default function UomsPage() {
  return (
    <CrudPage<UomOut>
      resource="uoms"
      title="Đơn vị tính"
      columns={columns}
      formFields={formFields}
      searchPlaceholder="Tìm theo mã, tên..."
    />
  )
}
