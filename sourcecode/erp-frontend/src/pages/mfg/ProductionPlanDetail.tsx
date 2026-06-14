import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DialogComponent } from '@syncfusion/ej2-react-popups'
import { ButtonComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons'
import { NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs'
import { TabComponent, TabItemDirective, TabItemsDirective } from '@syncfusion/ej2-react-navigations'
import { GridComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-grids'
import { apiClient } from '../../api/client'
import { DialogUtility } from '@syncfusion/ej2-react-popups'
import LookupSelect from '../../components/LookupSelect'
import LookupLabel from '../../components/LookupLabel'
import type { PageResult, SalesOrderOut } from '../../api/types'
import { SALES_ORDER_STATUS_LABELS } from '../../api/workflow'

interface SalesOrder {
  id: number
  doc_no: string
  customer_name: string
  delivery_date: string
  status: string
  checked?: boolean
}

interface ProductToManufacture {
  product_id: number
  product_code: string
  product_name: string
  bom_no: string
  required_qty: number
  from_so_ids: number[]
}

interface MaterialRequirement {
  product_id: number
  product_code: string
  product_name: string
  required_qty: number
  on_hand: number
  ordered: number
  reserved: number
  projected_qty: number
  shortage: number
  is_shortage: boolean
  suggested_supplier_id?: number
  suggested_supplier_name?: string
}

interface GeneratedWorkOrder {
  work_order_id: number
  doc_no: string
  product_name: string
  qty: number
}

interface GeneratedMaterialRequest {
  request_id: number
  doc_no: string
  product_name: string
  qty: number
  supplier_name?: string
}

interface ConsolidatedPO {
  supplier_id: number
  supplier_name: string
  total_amount: number
  items: {
    product_id: number
    product_name: string
    qty: number
    rate: number
    amount: number
  }[]
}

interface ProductionPlanDetail {
  id: number
  doc_no: string
  status: 'DRAFT' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED'
  sales_orders: SalesOrder[]
  products: ProductToManufacture[]
  materials: MaterialRequirement[]
  generated_work_orders?: GeneratedWorkOrder[]
  generated_material_requests?: GeneratedMaterialRequest[]
  consolidated_pos?: ConsolidatedPO[]
}

export default function ProductionPlanDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = id === 'new'

  const [step] = useState(1)
  const [activeTab, setActiveTab] = useState(0)
  const [selectedSOs, setSelectedSOs] = useState<number[]>([])
  const [manualDemand, setManualDemand] = useState<Array<{ product_id: number; qty: number }>>([])
  const [poDialogVisible, setPoDialogVisible] = useState(false)
  const [poConsolidation, setPoConsolidation] = useState<ConsolidatedPO[]>([])

  const { data: availableSOs, isLoading: soLoading } = useQuery({
    queryKey: ['available-sales-orders'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<SalesOrderOut>>('/sales/orders', { params: { status: 'APPROVED', size: 200 } })
      return res.data.items
    },
    enabled: isNew,
  })

  const { data: planDetail, isLoading } = useQuery({
    queryKey: ['production-plan', id],
    queryFn: async () => {
      if (isNew) return null
      const res = await apiClient.get<ProductionPlanDetail>(`/mfg/production-plans/${id}`)
      return res.data
    },
    enabled: !isNew,
  })

  const createMutation = useMutation({
    mutationFn: async (data: { so_ids: number[]; manual_demand: Array<{ product_id: number; qty: number }> }) => {
      return apiClient.post('/mfg/production-plans', data)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['production-plans'] })
      navigate(`/mfg/production-plans/${res.data.id}`)
    },
  })

  const generateWorkOrdersMutation = useMutation({
    mutationFn: async (planId: number) => {
      return apiClient.post(`/mfg/production-plans/${planId}/generate-work-orders`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-plan', id] })
      alert('Đã tạo lệnh sản xuất thành công')
    },
  })

  const generateMaterialRequestsMutation = useMutation({
    mutationFn: async (planId: number) => {
      return apiClient.post(`/mfg/production-plans/${planId}/generate-material-requests`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-plan', id] })
      alert('Đã tạo yêu cầu mua hàng thành công')
    },
  })

  const consolidateToPoMutation = useMutation({
    mutationFn: async ({ planId, supplierAssignments }: { planId: number; supplierAssignments: Record<number, number> }) => {
      return apiClient.post(`/mfg/production-plans/${planId}/consolidate-to-po`, { supplierAssignments })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['production-plan', id] })
      setPoConsolidation(res.data.consolidated_pos || [])
      setPoDialogVisible(true)
    },
  })

  const submitMutation = useMutation({
    mutationFn: async (planId: number) => {
      return apiClient.post(`/mfg/production-plans/${planId}/submit`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-plan', id] })
      queryClient.invalidateQueries({ queryKey: ['production-plans'] })
      alert('Đã gửi kế hoạch sản xuất thành công')
    },
  })

  const handleStep1Next = () => {
    if (selectedSOs.length === 0 && manualDemand.length === 0) {
      alert('Vui lòng chọn đơn hàng bán hoặc nhập nhu cầu tay')
      return
    }
    createMutation.mutate({ so_ids: selectedSOs, manual_demand: manualDemand })
  }

  const handleGenerateWorkOrders = async () => {
    const result = await DialogUtility.confirm({
      title: 'Xác nhận',
      content: 'Bạn có chắc muốn tạo lệnh sản xuất cho các thành phẩm trong kế hoạch?',
      okButton: { text: 'Tạo', cssClass: 'e-primary' },
      cancelButton: { text: 'Hủy', cssClass: 'e-flat' },
    })
    if (result) {
      generateWorkOrdersMutation.mutate(Number(id))
    }
  }

  const handleGenerateMaterialRequests = async () => {
    const result = await DialogUtility.confirm({
      title: 'Xác nhận',
      content: 'Bạn có chắc muốn tạo yêu cầu mua hàng cho các nguyên vật liệu thiếu?',
      okButton: { text: 'Tạo', cssClass: 'e-primary' },
      cancelButton: { text: 'Hủy', cssClass: 'e-flat' },
    })
    if (result) {
      generateMaterialRequestsMutation.mutate(Number(id))
    }
  }

  const handleConsolidateToPo = () => {
    const shortageMaterials = planDetail?.materials.filter(m => m.is_shortage) || []
    const supplierAssignments: Record<number, number> = {}
    
    shortageMaterials.forEach(m => {
      if (m.suggested_supplier_id) {
        supplierAssignments[m.product_id] = m.suggested_supplier_id
      }
    })
    
    consolidateToPoMutation.mutate({ planId: Number(id), supplierAssignments })
  }

  const handleSelectSO = (soId: number, checked: boolean) => {
    if (checked) {
      setSelectedSOs([...selectedSOs, soId])
    } else {
      setSelectedSOs(selectedSOs.filter(id => id !== soId))
    }
  }

  const canSubmit = planDetail?.status === 'DRAFT' && planDetail.generated_work_orders && planDetail.generated_work_orders.length > 0

  if (isNew && step === 1) {
    return (
      <div>
        <h2>Kế hoạch sản xuất mới - Bước 1: Chọn nguồn nhu cầu</h2>
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          <p><strong>Chọn đơn hàng bán:</strong></p>
          {soLoading ? (
            <p>Đang tải...</p>
          ) : (
            <GridComponent
              dataSource={availableSOs || []}
              allowPaging={true}
              pageSettings={{ pageSize: 10 }}
              height={300}
            >
              <ColumnsDirective>
                <ColumnDirective
                  headerText="Chọn"
                  width={80}
                  template={(data: SalesOrderOut) => (
                    <CheckBoxComponent
                      checked={selectedSOs.includes(data.id)}
                      change={(e) => handleSelectSO(data.id, e.checked || false)}
                    />
                  )}
                />
                <ColumnDirective field="docNo" headerText="Mã ĐH" width="120" />
                <ColumnDirective
                  headerText="Khách hàng"
                  width="200"
                  template={(data: SalesOrderOut) => <LookupLabel resource="partners" id={data.partnerId} labelField="shortName" />}
                />
                <ColumnDirective field="deliveryDatePlan" headerText="Ngày giao" width="120" format="yyyy-MM-dd" />
                <ColumnDirective
                  headerText="Trạng thái"
                  width="100"
                  template={(data: SalesOrderOut) => SALES_ORDER_STATUS_LABELS[data.status] ?? data.status}
                />
              </ColumnsDirective>
            </GridComponent>
          )}
        </div>

        <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          <p><strong>Hoặc nhập nhu cầu tay:</strong></p>
          <div style={{ padding: 16 }}>
            {manualDemand.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <LookupSelect
                    resource="products"
                    value={item.product_id || null}
                    onChange={(v) => {
                      const next = [...manualDemand]
                      next[idx] = { ...next[idx], product_id: v ?? 0 }
                      setManualDemand(next)
                    }}
                  />
                </div>
                <div style={{ width: 140 }}>
                  <NumericTextBoxComponent
                    value={item.qty}
                    min={0}
                    format="N2"
                    change={(e) => {
                      const next = [...manualDemand]
                      next[idx] = { ...next[idx], qty: e.value ?? 0 }
                      setManualDemand(next)
                    }}
                  />
                </div>
                <ButtonComponent cssClass="e-flat e-danger" onClick={() => setManualDemand(manualDemand.filter((_, i) => i !== idx))}>
                  Xóa
                </ButtonComponent>
              </div>
            ))}
            <ButtonComponent cssClass="e-flat e-primary" onClick={() => setManualDemand([...manualDemand, { product_id: 0, qty: 1 }])}>
              + Thêm dòng
            </ButtonComponent>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <ButtonComponent cssClass="e-primary" onClick={handleStep1Next}>
            Tiếp tục
          </ButtonComponent>
          <ButtonComponent cssClass="e-flat" onClick={() => navigate('/mfg/production-plans')}>
            Hủy
          </ButtonComponent>
        </div>
      </div>
    )
  }

  if (isLoading || !planDetail) {
    return <div style={{ padding: 48, textAlign: 'center' }}>Đang tải...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Kế hoạch sản xuất: {planDetail?.doc_no}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {canSubmit && (
            <ButtonComponent cssClass="e-success" onClick={() => submitMutation.mutate(Number(id))}>
              Gửi kế hoạch
            </ButtonComponent>
          )}
          <ButtonComponent cssClass="e-flat" onClick={() => navigate('/mfg/production-plans')}>
            Đóng
          </ButtonComponent>
        </div>
      </div>

      <TabComponent selectedItem={activeTab} selecting={(e) => setActiveTab(e.selectingIndex as number)}>
        <TabItemsDirective>
          <TabItemDirective header={{ text: 'Thành phẩm cần SX' }} />
          <TabItemDirective header={{ text: 'Nhu cầu NVL' }} />
          <TabItemDirective header={{ text: 'Lệnh SX đã tạo' }} />
          <TabItemDirective header={{ text: 'YC mua đã tạo' }} />
        </TabItemsDirective>
      </TabComponent>
      <div>
        {activeTab === 0 && (
          <div>
            <h3>Thành phẩm cần sản xuất</h3>
            <ButtonComponent
              cssClass="e-primary"
              style={{ marginBottom: 16 }}
              onClick={handleGenerateWorkOrders}
              disabled={!planDetail?.products || planDetail.products.length === 0}
            >
              Tạo Lệnh sản xuất
            </ButtonComponent>
            <GridComponent
              dataSource={planDetail?.products || []}
              allowPaging={true}
              pageSettings={{ pageSize: 10 }}
              height={400}
            >
              <ColumnsDirective>
                <ColumnDirective field="product_code" headerText="Mã SP" width="120" />
                <ColumnDirective field="product_name" headerText="Tên SP" width="200" />
                <ColumnDirective field="bom_no" headerText="BOM" width="120" />
                <ColumnDirective field="required_qty" headerText="SL cần" width="100" format="N2" />
              </ColumnsDirective>
            </GridComponent>
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <h3>Nhu cầu nguyên vật liệu</h3>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
              <ButtonComponent
                cssClass="e-primary"
                onClick={handleGenerateMaterialRequests}
                disabled={!planDetail?.materials || planDetail.materials.length === 0}
              >
                Tạo YC mua NVL thiếu
              </ButtonComponent>
              {planDetail?.generated_material_requests && planDetail.generated_material_requests.length > 0 && (
                <ButtonComponent
                  cssClass="e-info"
                  onClick={handleConsolidateToPo}
                >
                  Gom thành PO theo NCC
                </ButtonComponent>
              )}
            </div>
            <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#fff3cd', borderRadius: 4 }}>
              <p><strong>Chú thích:</strong></p>
              <p>Nhu cầu = Tổng nhu cầu từ các thành phẩm</p>
              <p>Tồn = Số lượng thực tế trong kho</p>
              <p>Đã đặt = Số lượng đang đặt mua</p>
              <p>Đã giữ = Số lượng bị lệnh SX giữ</p>
              <p>Dự kiến = Tồn + Đã đặt - Đã giữ</p>
              <p><strong>Thiếu = Nhu cầu - Dự kiến (màu đỏ nếu thiếu)</strong></p>
            </div>
            <GridComponent
              dataSource={planDetail?.materials || []}
              allowPaging={true}
              pageSettings={{ pageSize: 10 }}
              height={400}
            >
              <ColumnsDirective>
                <ColumnDirective field="product_code" headerText="Mã NVL" width="120" />
                <ColumnDirective field="product_name" headerText="Tên NVL" width="200" />
                <ColumnDirective field="required_qty" headerText="Nhu cầu" width="100" format="N2" />
                <ColumnDirective field="on_hand" headerText="Tồn" width="100" format="N2" />
                <ColumnDirective field="ordered" headerText="Đã đặt" width="100" format="N2" />
                <ColumnDirective field="reserved" headerText="Đã giữ" width="100" format="N2" />
                <ColumnDirective field="projected_qty" headerText="Dự kiến" width="100" format="N2" />
                <ColumnDirective 
                  field="shortage" 
                  headerText="Thiếu" 
                  width="100" 
                  format="N2"
                  template={(data: MaterialRequirement) => (
                    <span style={{ 
                      color: data.shortage > 0 ? 'red' : 'green', 
                      fontWeight: data.shortage > 0 ? 'bold' : 'normal' 
                    }}>
                      {data.shortage.toLocaleString('vi-VN')}
                    </span>
                  )}
                />
                <ColumnDirective field="suggested_supplier_name" headerText="NCC đề xuất" width="150" />
              </ColumnsDirective>
            </GridComponent>
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <h3>Lệnh sản xuất đã tạo</h3>
            <GridComponent
              dataSource={planDetail?.generated_work_orders || []}
              allowPaging={true}
              pageSettings={{ pageSize: 10 }}
              height={400}
            >
              <ColumnsDirective>
                <ColumnDirective field="doc_no" headerText="Mã lệnh" width="120" />
                <ColumnDirective field="product_name" headerText="Tên SP" width="200" />
                <ColumnDirective field="qty" headerText="SL" width="100" format="N2" />
                <ColumnDirective
                  headerText="Thao tác"
                  width="100"
                  template={(data: GeneratedWorkOrder) => (
                    <ButtonComponent
                      cssClass="e-small e-info"
                      onClick={() => navigate(`/mfg/work-orders/${data.work_order_id}`)}
                    >
                      Xem
                    </ButtonComponent>
                  )}
                />
              </ColumnsDirective>
            </GridComponent>
          </div>
        )}

        {activeTab === 3 && (
          <div>
            <h3>Yêu cầu mua hàng đã tạo</h3>
            <GridComponent
              dataSource={planDetail?.generated_material_requests || []}
              allowPaging={true}
              pageSettings={{ pageSize: 10 }}
              height={400}
            >
              <ColumnsDirective>
                <ColumnDirective field="doc_no" headerText="Mã YC" width="120" />
                <ColumnDirective field="product_name" headerText="Tên NVL" width="200" />
                <ColumnDirective field="qty" headerText="SL" width="100" format="N2" />
                <ColumnDirective field="supplier_name" headerText="NCC" width="150" />
              </ColumnsDirective>
            </GridComponent>
          </div>
        )}
      </div>

      {/* PO Consolidation Dialog */}
      <DialogComponent
        header="Gom thành Đơn hàng mua (PO) theo Nhà cung cấp"
        visible={poDialogVisible}
        isModal={true}
        showCloseIcon={true}
        target="#root"
        width="900px"
        close={() => setPoDialogVisible(false)}
      >
        <div style={{ padding: 16 }}>
          {poConsolidation.map((po, idx) => (
            <div key={idx} style={{ marginBottom: 24, padding: 16, border: '1px solid #ddd', borderRadius: 4 }}>
              <h4 style={{ marginBottom: 16 }}>{po.supplier_name} - Tổng: {po.total_amount.toLocaleString('vi-VN')} VNĐ</h4>
              <GridComponent
                dataSource={po.items}
                allowPaging={false}
                height={200}
              >
                <ColumnsDirective>
                  <ColumnDirective field="product_name" headerText="Tên NVL" width="200" />
                  <ColumnDirective field="qty" headerText="SL" width="100" format="N2" />
                  <ColumnDirective field="rate" headerText="Đơn giá" width="120" format="N2" />
                  <ColumnDirective field="amount" headerText="Thành tiền" width="120" format="N2" />
                </ColumnsDirective>
              </GridComponent>
            </div>
          ))}
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <ButtonComponent cssClass="e-primary" onClick={() => setPoDialogVisible(false)}>
              Đóng
            </ButtonComponent>
          </div>
        </div>
      </DialogComponent>
    </div>
  )
}