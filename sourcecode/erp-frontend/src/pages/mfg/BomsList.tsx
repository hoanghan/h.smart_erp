import { useNavigate } from 'react-router-dom'
import { ButtonComponent } from '@syncfusion/ej2-react-buttons'
import DataTable from '../../components/DataTable'

interface Bom {
  id: number
  doc_no: string
  product_id: number
  product_name: string
  product_code: string
  quantity: number
  is_default: boolean
  with_operations: boolean
  status: 'DRAFT' | 'SUBMITTED' | 'CANCELLED'
  created_at: string
}

export default function BomsList() {
  const navigate = useNavigate()

  const handleViewDetail = (data: Bom) => {
    navigate(`/mfg/boms/${data.id}`)
  }

  const columns = [
    { field: 'id', headerText: 'ID', width: 80, isPrimaryKey: true },
    { field: 'doc_no', headerText: 'Mã BOM', width: 120 },
    { field: 'product_code', headerText: 'Mã sản phẩm', width: 120 },
    { field: 'product_name', headerText: 'Tên sản phẩm', width: 200 },
    { 
      field: 'quantity', 
      headerText: 'SL mẻ', 
      width: 100,
      format: 'N2' 
    },
    {
      field: 'is_default',
      headerText: 'Mặc định',
      width: 100,
      template: (data: Bom) => (
        <span style={{ color: data.is_default ? 'green' : 'gray' }}>
          {data.is_default ? '✓' : '-'}
        </span>
      ),
    },
    {
      field: 'with_operations',
      headerText: 'Có công đoạn',
      width: 120,
      template: (data: Bom) => (
        <span style={{ color: data.with_operations ? 'green' : 'gray' }}>
          {data.with_operations ? 'Có' : 'Không'}
        </span>
      ),
    },
    {
      field: 'status',
      headerText: 'Trạng thái',
      width: 120,
      template: (data: Bom) => {
        const statusColors: Record<string, string> = {
          DRAFT: 'gray',
          SUBMITTED: 'green',
          CANCELLED: 'red',
        }
        const statusLabels: Record<string, string> = {
          DRAFT: 'Nháp',
          SUBMITTED: 'Đã gửi',
          CANCELLED: 'Hủy',
        }
        return (
          <span style={{ 
            color: statusColors[data.status] || 'black',
            fontWeight: data.status === 'SUBMITTED' ? 'bold' : 'normal'
          }}>
            {statusLabels[data.status] || data.status}
          </span>
        )
      },
    },
  ]

  return (
    <div>
      <h2>Bill of Materials (BOM)</h2>
      <ButtonComponent
        cssClass="e-primary"
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/mfg/boms/new')}
      >
        Tạo BOM mới
      </ButtonComponent>
      <DataTable
        queryKey="boms"
        endpoint="/mfg/boms"
        columns={columns}
        onRowDoubleClick={handleViewDetail}
      />
    </div>
  )
}