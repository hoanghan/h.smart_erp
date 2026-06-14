import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  DialogComponent,
} from '@syncfusion/ej2-react-popups'
import { 
  ButtonComponent,
  CheckBoxComponent,
} from '@syncfusion/ej2-react-buttons'
import { 
  TextBoxComponent,
  NumericTextBoxComponent,
} from '@syncfusion/ej2-react-inputs'
import {
  TreeGridComponent,
  ColumnsDirective,
  ColumnDirective,
  Inject,
  Page,
  Sort,
  Filter,
} from '@syncfusion/ej2-react-treegrid'
import { TabComponent, TabItemDirective, TabItemsDirective } from '@syncfusion/ej2-react-navigations'
import { apiClient } from '../../api/client'

interface BomItem {
  id: number
  product_id: number
  product_code: string
  product_name: string
  quantity: number
  rate: number
  amount: number
  bom_id?: number
  bom_name?: string
  level: number
  parent_id?: number
}

interface BomOperation {
  id: number
  operation_id: number
  operation_name: string
  workstation_id: number
  workstation_name: string
  time_minutes: number
  cost: number
}

interface BomScrap {
  id: number
  product_id: number
  product_name: string
  quantity: number
  rate: number
  amount: number
}

interface BomDetail {
  id: number
  doc_no: string
  product_id: number
  product_name: string
  product_code: string
  quantity: number
  is_default: boolean
  with_operations: boolean
  status: 'DRAFT' | 'SUBMITTED' | 'CANCELLED'
  items: BomItem[]
  operations: BomOperation[]
  scraps: BomScrap[]
}

interface ExplodeResult {
  items: {
    product_id: number
    product_code: string
    product_name: string
    quantity: number
    rate: number
    amount: number
  }[]
  total_cost: number
  unit_cost: number
}

export default function BomDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = id === 'new'

  const [formData, setFormData] = useState({
    product_id: 0,
    product_name: '',
    product_code: '',
    quantity: 1,
    is_default: false,
    with_operations: false,
    items: [] as BomItem[],
    operations: [] as BomOperation[],
    scraps: [] as BomScrap[],
  })

  const [activeTab, setActiveTab] = useState(0)
  const [explodeDialogVisible, setExplodeDialogVisible] = useState(false)
  const [explodeQty, setExplodeQty] = useState(0)
  const [explodeResult, setExplodeResult] = useState<ExplodeResult | null>(null)

  const { data: bomDetail, isLoading } = useQuery({
    queryKey: ['bom', id],
    queryFn: async () => {
      if (isNew) return null
      const res = await apiClient.get<BomDetail>(`/mfg/boms/${id}`)
      return res.data
    },
    enabled: !isNew,
  })

  useEffect(() => {
    if (bomDetail) {
      setFormData(bomDetail)
    }
  }, [bomDetail])

  const itemsGridRef = useRef<TreeGridComponent>(null)
  const opsGridRef = useRef<TreeGridComponent>(null)
  const scrapsGridRef = useRef<TreeGridComponent>(null)

  useEffect(() => {
    if (bomDetail && activeTab === 0 && itemsGridRef.current) {
      itemsGridRef.current.dataSource = bomDetail.items
      itemsGridRef.current.refresh()
    }
  }, [bomDetail, activeTab])

  useEffect(() => {
    if (bomDetail && activeTab === 1 && opsGridRef.current) {
      opsGridRef.current.dataSource = bomDetail.operations
      opsGridRef.current.refresh()
    }
  }, [bomDetail, activeTab])

  useEffect(() => {
    if (bomDetail && activeTab === 2 && scrapsGridRef.current) {
      scrapsGridRef.current.dataSource = bomDetail.scraps
      scrapsGridRef.current.refresh()
    }
  }, [bomDetail, activeTab])

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiClient.post('/mfg/boms', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] })
      alert('Đã tạo BOM thành công')
      navigate('/mfg/boms')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return apiClient.put(`/mfg/boms/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom', id] })
      queryClient.invalidateQueries({ queryKey: ['boms'] })
      alert('Đã cập nhật BOM thành công')
    },
  })

  const submitMutation = useMutation({
    mutationFn: async (bomId: number) => {
      return apiClient.post(`/mfg/boms/${bomId}/submit`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom', id] })
      queryClient.invalidateQueries({ queryKey: ['boms'] })
      alert('Đã gửi BOM thành công')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (bomId: number) => {
      return apiClient.post(`/mfg/boms/${bomId}/cancel`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom', id] })
      queryClient.invalidateQueries({ queryKey: ['boms'] })
      alert('Đã hủy BOM')
    },
  })

  const handleExplode = async () => {
    try {
      const res = await apiClient.get<ExplodeResult>(`/mfg/boms/${id}/explode?qty=${explodeQty}`)
      setExplodeResult(res.data)
    } catch (error) {
      alert('Lỗi khi phá BOM')
    }
  }

  const handleExportExcel = () => {
    // Export exploded result to Excel
    alert('Tính năng export Excel đang phát triển')
  }

  const handleSubmit = () => {
    if (isNew) {
      createMutation.mutate(formData)
    } else {
      updateMutation.mutate({ id: Number(id), data: formData })
    }
  }

  const canSubmit = bomDetail?.status === 'DRAFT'
  const canCancel = bomDetail?.status === 'SUBMITTED'
  const canEdit = bomDetail?.status === 'DRAFT'

  if (!isNew && (isLoading || !bomDetail)) {
    return <div style={{ padding: 48, textAlign: 'center' }}>Đang tải...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>{isNew ? 'Tạo BOM mới' : `BOM: ${bomDetail?.doc_no}`}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && canEdit && (
            <>
              <ButtonComponent cssClass="e-primary" onClick={handleSubmit}>
                Lưu
              </ButtonComponent>
              {canSubmit && (
                <ButtonComponent cssClass="e-success" onClick={() => submitMutation.mutate(Number(id))}>
                  Gửi
                </ButtonComponent>
              )}
              {canCancel && (
                <ButtonComponent cssClass="e-danger" onClick={() => cancelMutation.mutate(Number(id))}>
                  Hủy
                </ButtonComponent>
              )}
              <ButtonComponent cssClass="e-info" onClick={() => setExplodeDialogVisible(true)}>
                Phá BOM
              </ButtonComponent>
            </>
          )}
          {isNew && (
            <>
              <ButtonComponent cssClass="e-primary" onClick={handleSubmit}>
                Tạo mới
              </ButtonComponent>
              <ButtonComponent cssClass="e-flat" onClick={() => navigate('/mfg/boms')}>
                Hủy
              </ButtonComponent>
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Mã sản phẩm <span style={{ color: 'red' }}>*</span>
            </label>
            <TextBoxComponent
              placeholder="Nhập mã sản phẩm"
              value={formData.product_code}
              change={(e) => setFormData({ ...formData, product_code: e.value })}
              disabled={!canEdit && !isNew}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Tên sản phẩm <span style={{ color: 'red' }}>*</span>
            </label>
            <TextBoxComponent
              placeholder="Nhập tên sản phẩm"
              value={formData.product_name}
              change={(e) => setFormData({ ...formData, product_name: e.value })}
              disabled={!canEdit && !isNew}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Số lượng mẻ <span style={{ color: 'red' }}>*</span>
            </label>
            <NumericTextBoxComponent
              placeholder="Nhập số lượng"
              value={formData.quantity}
              format="N2"
              change={(e) => setFormData({ ...formData, quantity: e.value })}
              disabled={!canEdit && !isNew}
              min={0}
            />
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div>
              <CheckBoxComponent
                label="BOM mặc định"
                checked={formData.is_default}
                change={(e) => setFormData({ ...formData, is_default: e.checked })}
                disabled={!canEdit && !isNew}
              />
            </div>
            <div>
              <CheckBoxComponent
                label="Có công đoạn"
                checked={formData.with_operations}
                change={(e) => setFormData({ ...formData, with_operations: e.checked })}
                disabled={!canEdit && !isNew}
              />
            </div>
          </div>
        </div>
      </div>

      <TabComponent selectedItem={activeTab} selecting={(e) => setActiveTab(e.selectingIndex as number)}>
        <TabItemsDirective>
          <TabItemDirective header={{ text: 'Nguyên vật liệu' }} />
          <TabItemDirective header={{ text: 'Công đoạn' }} />
          <TabItemDirective header={{ text: 'Phế phẩm' }} />
        </TabItemsDirective>
      </TabComponent>
      <div>
        {activeTab === 0 && (
            <div>
              <TreeGridComponent
                ref={itemsGridRef}
                dataSource={bomDetail?.items ?? formData.items}
                treeColumnIndex={1}
                idMapping="id"
                parentIdMapping="parent_id"
                allowPaging={true}
                pageSettings={{ pageSize: 10 }}
                allowSorting={true}
                allowFiltering={true}
                editSettings={{ allowEditing: false }}
                height={400}
              >
                <ColumnsDirective>
                  <ColumnDirective field="product_code" headerText="Mã NVL" width="120" />
                  <ColumnDirective field="product_name" headerText="Tên NVL" width="200" />
                  <ColumnDirective field="quantity" headerText="SL" width="100" format="N2" />
                  <ColumnDirective field="rate" headerText="Đơn giá" width="120" format="N2" />
                  <ColumnDirective field="amount" headerText="Thành tiền" width="120" format="N2" />
                  <ColumnDirective field="bom_name" headerText="BOM con" width="150" />
                </ColumnsDirective>
                <Inject services={[Page, Sort, Filter]} />
              </TreeGridComponent>
            </div>
          )}
          {activeTab === 1 && (
            <div>
              <TreeGridComponent
                ref={opsGridRef}
                dataSource={bomDetail?.operations ?? formData.operations}
                allowPaging={true}
                pageSettings={{ pageSize: 10 }}
                allowSorting={true}
                allowFiltering={true}
                editSettings={{ allowEditing: false }}
                height={400}
              >
                <ColumnsDirective>
                  <ColumnDirective field="operation_name" headerText="Công đoạn" width="150" />
                  <ColumnDirective field="workstation_name" headerText="Trạm" width="150" />
                  <ColumnDirective field="time_minutes" headerText="Phút" width="100" format="N0" />
                  <ColumnDirective field="cost" headerText="Chi phí" width="120" format="N2" />
                </ColumnsDirective>
                <Inject services={[Page, Sort, Filter]} />
              </TreeGridComponent>
            </div>
          )}
          {activeTab === 2 && (
            <div>
              <TreeGridComponent
                ref={scrapsGridRef}
                dataSource={bomDetail?.scraps ?? formData.scraps}
                allowPaging={true}
                pageSettings={{ pageSize: 10 }}
                allowSorting={true}
                allowFiltering={true}
                editSettings={{ allowEditing: false }}
                height={400}
              >
                <ColumnsDirective>
                  <ColumnDirective field="product_name" headerText="Phế phẩm" width="200" />
                  <ColumnDirective field="quantity" headerText="SL" width="100" format="N2" />
                  <ColumnDirective field="rate" headerText="Đơn giá" width="120" format="N2" />
                  <ColumnDirective field="amount" headerText="Thành tiền" width="120" format="N2" />
                </ColumnsDirective>
                <Inject services={[Page, Sort, Filter]} />
              </TreeGridComponent>
            </div>
          )}
      </div>

      {/* Explode Dialog */}
      <DialogComponent
        header="Phá BOM"
        visible={explodeDialogVisible}
        isModal={true}
        showCloseIcon={true}
        target="#root"
        width="800px"
        close={() => {
          setExplodeDialogVisible(false)
          setExplodeResult(null)
          setExplodeQty(0)
        }}
      >
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Số lượng cần sản xuất <span style={{ color: 'red' }}>*</span>
            </label>
            <NumericTextBoxComponent
              placeholder="Nhập số lượng"
              value={explodeQty}
              format="N2"
              change={(e) => setExplodeQty(e.value)}
              min={0}
            />
            <ButtonComponent
              cssClass="e-primary"
              style={{ marginLeft: 8 }}
              onClick={handleExplode}
              disabled={!explodeQty || explodeQty <= 0}
            >
              Phá BOM
            </ButtonComponent>
          </div>

          {explodeResult && (
            <>
              <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#e3f2fd', borderRadius: 4 }}>
                <p><strong>Tổng chi phí:</strong> {explodeResult.total_cost.toLocaleString('vi-VN')} VNĐ</p>
                <p><strong>Giá vốn dự kiến:</strong> {explodeResult.unit_cost.toLocaleString('vi-VN')} VNĐ/{formData.quantity}</p>
              </div>

              <TreeGridComponent
                dataSource={explodeResult.items}
                idMapping="product_id"
                parentIdMapping="parent_id"
                allowPaging={true}
                pageSettings={{ pageSize: 10 }}
                allowSorting={true}
                height={300}
              >
                <ColumnsDirective>
                  <ColumnDirective field="product_code" headerText="Mã NVL" width="120" />
                  <ColumnDirective field="product_name" headerText="Tên NVL" width="200" />
                  <ColumnDirective field="quantity" headerText="SL" width="100" format="N2" />
                  <ColumnDirective field="rate" headerText="Đơn giá" width="120" format="N2" />
                  <ColumnDirective field="amount" headerText="Thành tiền" width="120" format="N2" />
                </ColumnsDirective>
                <Inject services={[Page, Sort]} />
              </TreeGridComponent>

              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <ButtonComponent
                  cssClass="e-success"
                  onClick={handleExportExcel}
                >
                  Export Excel
                </ButtonComponent>
              </div>
            </>
          )}
        </div>
      </DialogComponent>
    </div>
  )
}