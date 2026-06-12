import type { ColumnsType } from 'antd/es/table'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { UomOut } from '../../api/types'

const columns: ColumnsType<UomOut> = [
  { title: 'Mã', dataIndex: 'code', key: 'code', width: 160 },
  { title: 'Tên đơn vị', dataIndex: 'name', key: 'name' },
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
