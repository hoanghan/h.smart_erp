import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DialogComponent } from '@syncfusion/ej2-react-popups'
import { ButtonComponent } from '@syncfusion/ej2-react-buttons'
import { TextBoxComponent, NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs'
import { TabComponent, TabItemDirective, TabItemsDirective } from '@syncfusion/ej2-react-navigations'
import { GridComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-grids'
import { apiClient } from '../../api/client'
import { DialogUtility } from '@syncfusion/ej2-react-popups'

interface WorkOrderItem {
  product_id: number
  product_code: string
  product_name: string
  quantity: number
  transferred_qty: number
  rate: number
  amount: number
}

interface WorkOrderOperation {
  id: number
  operation_name: string
  workstation_name: string
  total_minutes: number
  completed_qty: number
  actual_cost: number
}

interface FinishBatch {
  id: number
  qty: number
  completed_at: string
  cost: number
}

interface WorkOrderDetail {
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
  wip_warehouse_id: number
  wip_warehouse_name: string
  fg_warehouse_id: number
  fg_warehouse_name: string
  planned_start_date: string
  planned_end_date: string
  status: 'DRAFT' | 'NOT_STARTED' | 'IN_PROCESS' | 'COMPLETED' | 'STOPPED'
  items: WorkOrderItem[]
  operations: WorkOrderOperation[]
  finish_batches: FinishBatch[]
  stock_docs: any[]
}

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = id === 'new'

  const [formData, setFormData] = useState({
    product_id: 0,
    product_name: '',
    product_code: '',
    bom_id: 0,
    bom_no: '',
    qty: 0,
    wip_warehouse_id: 0,
    wip_warehouse_name: '',
    fg_warehouse_id: 0,
    fg_warehouse_name: '',
    planned_start_date: '',
    planned_end_date: '',
  })

  const [activeTab, setActiveTab] = useState(0)
  const [finishDialogVisible, setFinishDialogVisible] = useState(false)
  const [finishQty, setFinishQty] = useState(0)
  const [stopDialogVisible, setStopDialogVisible] = useState(false)
  const [stopReason, setStopReason] = useState('')
  const [jobCardDialogVisible, setJobCardDialogVisible] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<WorkOrderOperation | null>(null)
  const [jobCardData, setJobCardData] = useState({
    from_time: '',
    to_time: '',
    completed_qty: 0,
  })

  const { data: woDetail, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: async () => {
      if (isNew) return null
      const res = await apiClient.get<WorkOrderDetail>(`/mfg/work-orders/${id}`)
      return res.data
    },
    enabled: !isNew,
  })

  useEffect(() => {
    if (woDetail) {
      setFormData({
        product_id: woDetail.product_id,
        product_name: woDetail.product_name,
        product_code: woDetail.product_code,
        bom_id: woDetail.bom_id,
        bom_no: woDetail.bom_no,
        qty: woDetail.qty,
        wip_warehouse_id: woDetail.wip_warehouse_id,
        wip_warehouse_name: woDetail.wip_warehouse_name,
        fg_warehouse_id: woDetail.fg_warehouse_id,
        fg_warehouse_name: woDetail.fg_warehouse_name,
        planned_start_date: woDetail.planned_start_date?.split('T')[0] || '',
        planned_end_date: woDetail.planned_end_date?.split('T')[0] || '',
      })
    }
  }, [woDetail])

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiClient.post('/mfg/work-orders', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      alert('Đã tạo lệnh sản xuất thành công')
      navigate('/mfg/work-orders')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return apiClient.put(`/mfg/work-orders/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      alert('Đã cập nhật lệnh sản xuất thành công')
    },
  })

  const submitMutation = useMutation({
    mutationFn: async (woId: number) => {
      return apiClient.post(`/mfg/work-orders/${woId}/submit`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      alert('Đã gửi lệnh sản xuất thành công')
    },
  })

  const startMutation = useMutation({
    mutationFn: async (woId: number) => {
      return apiClient.post(`/mfg/work-orders/${woId}/start`)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      alert(`Đã bắt đầu lệnh sản xuất. Đã tạo phiếu chuyển NVL vào WIP: ${res.data.stock_doc_no}`)
    },
  })

  const finishMutation = useMutation({
    mutationFn: async ({ woId, qty }: { woId: number; qty: number }) => {
      return apiClient.post(`/mfg/work-orders/${woId}/finish`, { qty })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      setFinishDialogVisible(false)
      setFinishQty(0)
      alert('Đã hoàn thành đợt sản xuất')
    },
  })

  const stopMutation = useMutation({
    mutationFn: async ({ woId, reason }: { woId: number; reason: string }) => {
      return apiClient.post(`/mfg/work-orders/${woId}/stop`, { reason })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      setStopDialogVisible(false)
      setStopReason('')
      alert('Đã dừng lệnh sản xuất')
    },
  })

  const jobCardMutation = useMutation({
    mutationFn: async ({ woId, operationId, data }: { woId: number; operationId: number; data: any }) => {
      return apiClient.post(`/mfg/work-orders/${woId}/operations/${operationId}/job-card`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      setJobCardDialogVisible(false)
      setJobCardData({ from_time: '', to_time: '', completed_qty: 0 })
      setSelectedOperation(null)
      alert('Đã cập nhật job card')
    },
  })

  const handleStart = async () => {
    const result = await DialogUtility.confirm({
      title: 'Xác nhận bắt đầu',
      content: 'Bắt đầu lệnh sản xuất sẽ tự động tạo phiếu chuyển nguyên vật liệu vào kho WIP. Bạn có chắc chắn?',
      okButton: { text: 'Bắt đầu', cssClass: 'e-primary' },
      cancelButton: { text: 'Hủy', cssClass: 'e-flat' },
    })
    if (result) {
      startMutation.mutate(Number(id))
    }
  }

  const handleFinish = () => {
    const remaining = (woDetail?.qty ?? 0) - (woDetail?.produced_qty ?? 0)
    setFinishQty(remaining || 0)
    setFinishDialogVisible(true)
  }

  const handleStop = () => {
    setStopReason('')
    setStopDialogVisible(true)
  }

  const handleJobCard = (operation: WorkOrderOperation) => {
    setSelectedOperation(operation)
    setJobCardData({
      from_time: '',
      to_time: '',
      completed_qty: 0,
    })
    setJobCardDialogVisible(true)
  }

  const canSubmit = woDetail?.status === 'DRAFT'
  const canStart = woDetail?.status === 'NOT_STARTED'
  const canFinish = woDetail?.status === 'IN_PROCESS'
  const canStop = woDetail?.status === 'IN_PROCESS'
  const canEdit = woDetail?.status === 'DRAFT'

  if (!isNew && (isLoading || !woDetail)) {
    return <div style={{ padding: 48, textAlign: 'center' }}>Đang tải...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>{isNew ? 'Tạo lệnh sản xuất mới' : `Lệnh sản xuất: ${woDetail?.doc_no}`}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && (
            <>
              {canEdit && (
                <ButtonComponent cssClass="e-primary" onClick={() => updateMutation.mutate({ id: Number(id), data: formData })}>
                  Lưu
                </ButtonComponent>
              )}
              {canSubmit && (
                <ButtonComponent cssClass="e-success" onClick={() => submitMutation.mutate(Number(id))}>
                  Gửi
                </ButtonComponent>
              )}
              {canStart && (
                <ButtonComponent cssClass="e-info" onClick={handleStart}>
                  Bắt đầu
                </ButtonComponent>
              )}
              {canFinish && (
                <ButtonComponent cssClass="e-success" onClick={handleFinish}>
                  Hoàn thành
                </ButtonComponent>
              )}
              {canStop && (
                <ButtonComponent cssClass="e-danger" onClick={handleStop}>
                  Dừng
                </ButtonComponent>
              )}
            </>
          )}
          {isNew && (
            <>
              <ButtonComponent cssClass="e-primary" onClick={() => createMutation.mutate(formData)}>
                Tạo mới
              </ButtonComponent>
              <ButtonComponent cssClass="e-flat" onClick={() => navigate('/mfg/work-orders')}>
                Hủy
              </ButtonComponent>
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Mã sản phẩm
            </label>
            <TextBoxComponent
              value={formData.product_code}
              disabled={!canEdit && !isNew}
              change={(e) => setFormData({ ...formData, product_code: e.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Tên sản phẩm
            </label>
            <TextBoxComponent
              value={formData.product_name}
              disabled={!canEdit && !isNew}
              change={(e) => setFormData({ ...formData, product_name: e.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              BOM
            </label>
            <TextBoxComponent
              value={formData.bom_no}
              disabled={!canEdit && !isNew}
              change={(e) => setFormData({ ...formData, bom_no: e.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Số lượng lệnh
            </label>
            <NumericTextBoxComponent
              value={formData.qty}
              format="N2"
              disabled={!canEdit && !isNew}
              change={(e) => setFormData({ ...formData, qty: e.value })}
              min={0}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Kho WIP
            </label>
            <TextBoxComponent
              value={formData.wip_warehouse_name}
              disabled={!canEdit && !isNew}
              change={(e) => setFormData({ ...formData, wip_warehouse_name: e.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Kho thành phẩm
            </label>
            <TextBoxComponent
              value={formData.fg_warehouse_name}
              disabled={!canEdit && !isNew}
              change={(e) => setFormData({ ...formData, fg_warehouse_name: e.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Ngày bắt đầu dự kiến
            </label>
            <input
              type="date"
              value={formData.planned_start_date}
              disabled={!canEdit && !isNew}
              onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
              style={{ padding: 8, width: '100%', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Ngày kết thúc dự kiến
            </label>
            <input
              type="date"
              value={formData.planned_end_date}
              disabled={!canEdit && !isNew}
              onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
              style={{ padding: 8, width: '100%', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
        </div>
        {woDetail && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#e3f2fd', borderRadius: 4 }}>
            <p><strong>Đã sản xuất:</strong> {woDetail.produced_qty.toLocaleString('vi-VN')} / {woDetail.qty.toLocaleString('vi-VN')}</p>
            <p><strong>Tiến độ:</strong> {woDetail.progress}%</p>
          </div>
        )}
      </div>

      <TabComponent selectedItem={activeTab} selecting={(e) => setActiveTab(e.selectingIndex as number)}>
        <TabItemsDirective>
          <TabItemDirective header={{ text: 'Nguyên vật liệu' }} />
          <TabItemDirective header={{ text: 'Công đoạn / Job Cards' }} />
          <TabItemDirective header={{ text: 'Lịch sử hoàn thành' }} />
          <TabItemDirective header={{ text: 'Phiếu kho liên quan' }} />
        </TabItemsDirective>
      </TabComponent>
      <div>
        {activeTab === 0 && woDetail?.items && (
          <GridComponent
            dataSource={woDetail.items}
            allowPaging={true}
            pageSettings={{ pageSize: 10 }}
            height={400}
          >
            <ColumnsDirective>
              <ColumnDirective field="product_code" headerText="Mã NVL" width="120" />
              <ColumnDirective field="product_name" headerText="Tên NVL" width="200" />
              <ColumnDirective field="quantity" headerText="SL cần" width="100" format="N2" />
              <ColumnDirective field="transferred_qty" headerText="Đã chuyển WIP" width="120" format="N2" />
              <ColumnDirective field="rate" headerText="Đơn giá" width="120" format="N2" />
              <ColumnDirective field="amount" headerText="Thành tiền" width="120" format="N2" />
            </ColumnsDirective>
          </GridComponent>
        )}

        {activeTab === 1 && woDetail?.operations && (
          <GridComponent
            dataSource={woDetail.operations}
            allowPaging={true}
            pageSettings={{ pageSize: 10 }}
            height={400}
          >
            <ColumnsDirective>
              <ColumnDirective field="operation_name" headerText="Công đoạn" width="150" />
              <ColumnDirective field="workstation_name" headerText="Trạm" width="150" />
              <ColumnDirective field="total_minutes" headerText="Tổng phút" width="100" format="N0" />
              <ColumnDirective field="completed_qty" headerText="SL hoàn thành" width="120" format="N2" />
              <ColumnDirective field="actual_cost" headerText="Chi phí thực tế" width="150" format="N2" />
              <ColumnDirective
                headerText="Thao tác"
                width="100"
                template={(data: WorkOrderOperation) => (
                  <ButtonComponent
                    cssClass="e-small e-info"
                    disabled={woDetail.status !== 'IN_PROCESS'}
                    onClick={() => handleJobCard(data)}
                  >
                    Chấm công
                  </ButtonComponent>
                )}
              />
            </ColumnsDirective>
          </GridComponent>
        )}

        {activeTab === 2 && woDetail?.finish_batches && (
          <GridComponent
            dataSource={woDetail.finish_batches}
            allowPaging={true}
            pageSettings={{ pageSize: 10 }}
            height={400}
          >
            <ColumnsDirective>
              <ColumnDirective field="id" headerText="ID" width="80" />
              <ColumnDirective field="qty" headerText="SL hoàn thành" width="120" format="N2" />
              <ColumnDirective field="cost" headerText="Giá vốn" width="150" format="N2" />
              <ColumnDirective field="completed_at" headerText="Ngày hoàn thành" width="150" format="yyyy-MM-dd HH:mm" />
            </ColumnsDirective>
          </GridComponent>
        )}

        {activeTab === 3 && woDetail?.stock_docs && (
          <GridComponent
            dataSource={woDetail.stock_docs}
            allowPaging={true}
            pageSettings={{ pageSize: 10 }}
            height={400}
          >
            <ColumnsDirective>
              <ColumnDirective field="doc_no" headerText="Mã phiếu" width="150" />
              <ColumnDirective field="purpose" headerText="Mục đích" width="200" />
              <ColumnDirective field="created_at" headerText="Ngày tạo" width="150" format="yyyy-MM-dd" />
              <ColumnDirective
                headerText="Thao tác"
                width="100"
                template={(data: any) => (
                  <ButtonComponent
                    cssClass="e-small e-info"
                    onClick={() => window.open(`/inventory/docs/${data.id}`, '_blank')}
                  >
                    Xem
                  </ButtonComponent>
                )}
              />
            </ColumnsDirective>
          </GridComponent>
        )}
      </div>

      {/* Finish Dialog */}
      <DialogComponent
        header="Hoàn thành đợt sản xuất"
        visible={finishDialogVisible}
        isModal={true}
        showCloseIcon={true}
        target="#root"
        width="500px"
        close={() => setFinishDialogVisible(false)}
        footerTemplate={() => (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <ButtonComponent cssClass="e-flat" onClick={() => setFinishDialogVisible(false)}>
              Hủy
            </ButtonComponent>
            <ButtonComponent
              cssClass="e-primary"
              onClick={() => finishMutation.mutate({ woId: Number(id), qty: finishQty })}
              disabled={!finishQty || finishQty <= 0}
            >
              Hoàn thành
            </ButtonComponent>
          </div>
        )}
      >
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Số lượng hoàn thành <span style={{ color: 'red' }}>*</span>
            </label>
            <NumericTextBoxComponent
              value={finishQty}
              format="N2"
              change={(e) => setFinishQty(e.value)}
              min={0}
              max={(woDetail?.qty ?? 0) - (woDetail?.produced_qty ?? 0)}
            />
            <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              Còn lại: {((woDetail?.qty ?? 0) - (woDetail?.produced_qty ?? 0)).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>
      </DialogComponent>

      {/* Stop Dialog */}
      <DialogComponent
        header="Dừng lệnh sản xuất"
        visible={stopDialogVisible}
        isModal={true}
        showCloseIcon={true}
        target="#root"
        width="500px"
        close={() => setStopDialogVisible(false)}
        footerTemplate={() => (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <ButtonComponent cssClass="e-flat" onClick={() => setStopDialogVisible(false)}>
              Hủy
            </ButtonComponent>
            <ButtonComponent
              cssClass="e-danger"
              onClick={() => stopMutation.mutate({ woId: Number(id), reason: stopReason })}
              disabled={!stopReason}
            >
              Dừng
            </ButtonComponent>
          </div>
        )}
      >
        <div style={{ padding: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Lý do dừng <span style={{ color: 'red' }}>*</span>
            </label>
            <TextBoxComponent
              placeholder="Nhập lý do dừng"
              value={stopReason}
              change={(e) => setStopReason(e.value)}
              multiline={true}
            />
          </div>
        </div>
      </DialogComponent>

      {/* Job Card Dialog */}
      <DialogComponent
        header={`Job Card: ${selectedOperation?.operation_name}`}
        visible={jobCardDialogVisible}
        isModal={true}
        showCloseIcon={true}
        target="#root"
        width="500px"
        close={() => {
          setJobCardDialogVisible(false)
          setJobCardData({ from_time: '', to_time: '', completed_qty: 0 })
          setSelectedOperation(null)
        }}
        footerTemplate={() => (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <ButtonComponent cssClass="e-flat" onClick={() => setJobCardDialogVisible(false)}>
              Hủy
            </ButtonComponent>
            <ButtonComponent
              cssClass="e-primary"
              onClick={() => jobCardMutation.mutate({
                woId: Number(id),
                operationId: selectedOperation!.id,
                data: jobCardData
              })}
              disabled={!jobCardData.from_time || !jobCardData.to_time || jobCardData.completed_qty <= 0}
            >
              Lưu
            </ButtonComponent>
          </div>
        )}
      >
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Thời gian bắt đầu <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={jobCardData.from_time}
              onChange={(e) => setJobCardData({ ...jobCardData, from_time: e.target.value })}
              style={{ padding: 8, width: '100%', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Thời gian kết thúc <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={jobCardData.to_time}
              onChange={(e) => setJobCardData({ ...jobCardData, to_time: e.target.value })}
              style={{ padding: 8, width: '100%', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Số lượng hoàn thành <span style={{ color: 'red' }}>*</span>
            </label>
            <NumericTextBoxComponent
              value={jobCardData.completed_qty}
              format="N2"
              change={(e) => setJobCardData({ ...jobCardData, completed_qty: e.value })}
              min={0}
            />
          </div>
        </div>
      </DialogComponent>
    </div>
  )
}