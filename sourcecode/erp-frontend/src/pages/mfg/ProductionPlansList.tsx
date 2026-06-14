import { useNavigate } from 'react-router-dom'
import { ButtonComponent } from '@syncfusion/ej2-react-buttons'
import DataTable from '../../components/DataTable'

interface ProductionPlan {
  id: number
  doc_no: string
  status: 'DRAFT' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED'
  created_at: string
  total_products: number
  total_materials: number
  shortage_materials: number
}

export default function ProductionPlansList() {
  const navigate = useNavigate()

  const handleViewDetail = (data: ProductionPlan) => {
    navigate(`/mfg/production-plans/${data.id}`)
  }

  const columns = [
    { field: 'id', headerText: 'ID', width: 80, isPrimaryKey: true },
    { field: 'doc_no', headerText: 'Mã kế hoạch', width: 120 },
    {
      field: 'status',
      headerText: 'Trạng thái',
      width: 120,
      template: (data: ProductionPlan) => {
        const statusColors: Record<string, string> = {
          DRAFT: 'gray',
          SUBMITTED: 'blue',
          COMPLETED: 'green',
          CANCELLED: 'red',
        }
        const statusLabels: Record<string, string> = {
          DRAFT: 'Nháp',
          SUBMITTED: 'Đã gửi',
          COMPLETED: 'Hoàn thành',
          CANCELLED: 'Hủy',
        }
        return (
          <span style={{ 
            color: statusColors[data.status] || 'black',
            fontWeight: data.status === 'COMPLETED' ? 'bold' : 'normal'
          }}>
            {statusLabels[data.status] || data.status}
          </span>
        )
      },
    },
    { 
      field: 'total_products', 
      headerText: 'Tổng thành phẩm', 
      width: 120,
      format: 'N0' 
    },
    { 
      field: 'total_materials', 
      headerText: 'Tổng NVL', 
      width: 100,
      format: 'N0' 
    },
    { 
      field: 'shortage_materials', 
      headerText: 'NVL thiếu', 
      width: 100,
      format: 'N0',
      template: (data: ProductionPlan) => (
        <span style={{ color: data.shortage_materials > 0 ? 'red' : 'green', fontWeight: 'bold' }}>
          {data.shortage_materials.toLocaleString('vi-VN')}
        </span>
      ),
    },
    { field: 'created_at', headerText: 'Ngày tạo', width: 150, format: 'yyyy-MM-dd' },
  ]

  return (
    <div>
      <h2>Kế hoạch sản xuất (MRP)</h2>
      <ButtonComponent
        cssClass="e-primary"
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/mfg/production-plans/new')}
      >
        Tạo kế hoạch mới
      </ButtonComponent>
      <DataTable
        queryKey="production-plans"
        endpoint="/mfg/production-plans"
        columns={columns}
        onRowDoubleClick={handleViewDetail}
      />
    </div>
  )
}