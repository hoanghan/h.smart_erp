import { useNavigate } from 'react-router-dom'
import { ButtonComponent } from '@syncfusion/ej2-react-buttons'
import DataTable from '../../components/DataTable'

interface WorkOrder {
  id: number
  doc_no: string
  product_id: number
  product_name: string
  product_code: string
  bom_id: number
  bom_no: string
  qty: number
  produced_qty: number
  progress: number
  wip_warehouse_name: string
  fg_warehouse_name: string
  planned_start_date: string
  planned_end_date: string
  status: 'DRAFT' | 'NOT_STARTED' | 'IN_PROCESS' | 'COMPLETED' | 'STOPPED'
}

export default function WorkOrdersList() {
  const navigate = useNavigate()

  const handleViewDetail = (data: WorkOrder) => {
    navigate(`/mfg/work-orders/${data.id}`)
  }

  const columns = [
    { field: 'id', headerText: 'ID', width: 80, isPrimaryKey: true },
    { field: 'doc_no', headerText: 'Mã lệnh', width: 120 },
    { field: 'product_code', headerText: 'Mã SP', width: 100 },
    { field: 'product_name', headerText: 'Tên sản phẩm', width: 150 },
    { 
      field: 'qty', 
      headerText: 'SL lệnh', 
      width: 100,
      format: 'N2' 
    },
    { 
      field: 'produced_qty', 
      headerText: 'Đã SX', 
      width: 100,
      format: 'N2' 
    },
    {
      field: 'progress',
      headerText: '% Hoàn thành',
      width: 120,
      template: (data: WorkOrder) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            flex: 1, 
            height: 8, 
            backgroundColor: '#e0e0e0', 
            borderRadius: 4, 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              width: `${data.progress}%`, 
              height: '100%', 
              backgroundColor: data.progress === 100 ? '#52c41a' : '#1890ff',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span style={{ fontSize: 12, minWidth: 35 }}>{data.progress}%</span>
        </div>
      ),
    },
    {
      field: 'status',
      headerText: 'Trạng thái',
      width: 120,
      template: (data: WorkOrder) => {
        const statusColors: Record<string, string> = {
          DRAFT: 'gray',
          NOT_STARTED: 'orange',
          IN_PROCESS: 'blue',
          COMPLETED: 'green',
          STOPPED: 'red',
        }
        const statusLabels: Record<string, string> = {
          DRAFT: 'Nháp',
          NOT_STARTED: 'Chưa bắt đầu',
          IN_PROCESS: 'Đang SX',
          COMPLETED: 'Hoàn thành',
          STOPPED: 'Dừng',
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
    { field: 'planned_start_date', headerText: 'Ngày bắt đầu', width: 120, format: 'yyyy-MM-dd' },
    { field: 'planned_end_date', headerText: 'Ngày kết thúc', width: 120, format: 'yyyy-MM-dd' },
  ]

  return (
    <div>
      <h2>Lệnh sản xuất</h2>
      <ButtonComponent
        cssClass="e-primary"
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/mfg/work-orders/new')}
      >
        Tạo lệnh mới
      </ButtonComponent>
      <DataTable
        queryKey="work-orders"
        endpoint="/mfg/work-orders"
        columns={columns}
        onRowDoubleClick={handleViewDetail}
      />
    </div>
  )
}