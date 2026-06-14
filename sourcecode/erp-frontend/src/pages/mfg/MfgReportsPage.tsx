import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TabComponent, TabItemDirective, TabItemsDirective } from '@syncfusion/ej2-react-navigations'
import { GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Sort, Filter } from '@syncfusion/ej2-react-grids'
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars'
import { ButtonComponent } from '@syncfusion/ej2-react-buttons'
import { apiClient } from '../../api/client'

interface ProductionCostReport {
  work_order_id: number
  doc_no: string
  product_name: string
  bom_qty: number
  produced_qty: number
  bom_cost: number
  actual_cost: number
  variance: number
  variance_percent: number
}

interface WipBalanceReport {
  work_order_id: number
  doc_no: string
  product_name: string
  wip_balance: number
  wip_cost: number
  created_at: string
}

export default function MfgReportsPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })
  const [selectedWOId] = useState<number | null>(null)

  const { data: productionCostData } = useQuery({
    queryKey: ['production-cost-report', dateRange.from, dateRange.to, selectedWOId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateRange.from) params.append('from', dateRange.from.toISOString())
      if (dateRange.to) params.append('to', dateRange.to.toISOString())
      if (selectedWOId) params.append('work_order_id', selectedWOId.toString())
      
      const res = await apiClient.get<ProductionCostReport[]>(`/mfg/reports/production-cost?${params.toString()}`)
      return res.data
    },
  })

  const { data: wipBalanceData } = useQuery({
    queryKey: ['wip-balance-report', dateRange.from, dateRange.to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateRange.from) params.append('from', dateRange.from.toISOString())
      if (dateRange.to) params.append('to', dateRange.to.toISOString())
      
      const res = await apiClient.get<WipBalanceReport[]>(`/mfg/reports/wip-balance?${params.toString()}`)
      return res.data
    },
  })

  const handleExportExcel = () => {
    alert('Tính năng export Excel đang phát triển')
  }

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'red' // Over cost
    if (variance < 0) return 'green' // Under cost
    return 'black'
  }

  const getVariancePercentColor = (percent: number) => {
    const absPercent = Math.abs(percent)
    if (absPercent > 10) return 'red'
    if (absPercent > 5) return 'orange'
    return 'green'
  }

  return (
    <div>
      <h2>Báo cáo Sản xuất</h2>
      
      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <h4> Bộ lọc</h4>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Từ ngày
            </label>
            <DatePickerComponent
              value={dateRange.from}
              change={(e) => setDateRange({ ...dateRange, from: e.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Đến ngày
            </label>
            <DatePickerComponent
              value={dateRange.to}
              change={(e) => setDateRange({ ...dateRange, to: e.value })}
            />
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ButtonComponent cssClass="e-info" onClick={handleExportExcel}>
              Export Excel
            </ButtonComponent>
          </div>
        </div>
      </div>

      <TabComponent selectedItem={activeTab} selecting={(e) => setActiveTab(e.selectingIndex as number)}>
        <TabItemsDirective>
          <TabItemDirective header={{ text: 'Chi phí sản xuất' }} />
          <TabItemDirective header={{ text: 'Số dư WIP' }} />
        </TabItemsDirective>
      </TabComponent>
      <div>
        {activeTab === 0 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3>Chi phí sản xuất theo Lệnh (Variance)</h3>
                <p style={{ color: '#666', fontSize: 14 }}>
                  So sánh chi phí thực tế với chi phí BOM chuẩn. Màu đỏ khi vượt chi phí, màu xanh khi tiết kiệm.
                </p>
              </div>
              <GridComponent
                dataSource={productionCostData || []}
                allowPaging={true}
                pageSettings={{ pageSize: 20 }}
                allowSorting={true}
                allowFiltering={true}
                height={500}
                loadingIndicator={{ indicatorType: 'Shimmer' }}
              >
                <ColumnsDirective>
                  <ColumnDirective field="doc_no" headerText="Mã lệnh" width="120" />
                  <ColumnDirective field="product_name" headerText="Tên sản phẩm" width="200" />
                  <ColumnDirective field="bom_qty" headerText="SL theo BOM" width="100" format="N2" />
                  <ColumnDirective field="produced_qty" headerText="SL thực tế" width="100" format="N2" />
                  <ColumnDirective field="bom_cost" headerText="Chi phí BOM (VNĐ)" width="150" format="N2" />
                  <ColumnDirective field="actual_cost" headerText="Chi phí thực (VNĐ)" width="150" format="N2" />
                  <ColumnDirective
                    field="variance"
                    headerText="Chênh lệch (VNĐ)"
                    width="150"
                    format="N2"
                    template={(data: ProductionCostReport) => (
                      <span style={{ color: getVarianceColor(data.variance), fontWeight: 'bold' }}>
                        {data.variance.toLocaleString('vi-VN')}
                      </span>
                    )}
                  />
                  <ColumnDirective
                    field="variance_percent"
                    headerText="Lệch %"
                    width="100"
                    format="N2"
                    template={(data: ProductionCostReport) => (
                      <span style={{ color: getVariancePercentColor(data.variance_percent), fontWeight: 'bold' }}>
                        {data.variance_percent > 0 ? '+' : ''}{data.variance_percent.toFixed(2)}%
                      </span>
                    )}
                  />
                </ColumnsDirective>
                <Inject services={[Page, Sort, Filter]} />
              </GridComponent>
              {productionCostData && productionCostData.length > 0 && (
                <div style={{ marginTop: 16, padding: 16, backgroundColor: '#e3f2fd', borderRadius: 4 }}>
                  <p><strong>Tổng chi phí BOM:</strong> {productionCostData.reduce((sum, item) => sum + item.bom_cost, 0).toLocaleString('vi-VN')} VNĐ</p>
                  <p><strong>Tổng chi phí thực tế:</strong> {productionCostData.reduce((sum, item) => sum + item.actual_cost, 0).toLocaleString('vi-VN')} VNĐ</p>
                  <p><strong>Tổng chênh lệch:</strong> {productionCostData.reduce((sum, item) => sum + item.variance, 0).toLocaleString('vi-VN')} VNĐ</p>
                  <p><strong>Trung bình lệch %:</strong> {(productionCostData.reduce((sum, item) => sum + Math.abs(item.variance_percent), 0) / productionCostData.length).toFixed(2)}%</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 1 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3>Số dư WIP theo Lệnh</h3>
                <p style={{ color: '#666', fontSize: 14 }}>
                  Theo dõi số dư công việc dang dở (Work In Progress) tại từng lệnh sản xuất.
                </p>
              </div>
              <GridComponent
                dataSource={wipBalanceData || []}
                allowPaging={true}
                pageSettings={{ pageSize: 20 }}
                allowSorting={true}
                allowFiltering={true}
                height={500}
                loadingIndicator={{ indicatorType: 'Shimmer' }}
              >
                <ColumnsDirective>
                  <ColumnDirective field="doc_no" headerText="Mã lệnh" width="120" />
                  <ColumnDirective field="product_name" headerText="Tên sản phẩm" width="200" />
                  <ColumnDirective field="wip_balance" headerText="SL WIP" width="100" format="N2" />
                  <ColumnDirective field="wip_cost" headerText="Giá trị WIP (VNĐ)" width="150" format="N2" />
                  <ColumnDirective field="created_at" headerText="Ngày tạo" width="150" format="yyyy-MM-dd HH:mm" />
                </ColumnsDirective>
                <Inject services={[Page, Sort, Filter]} />
              </GridComponent>
              {wipBalanceData && wipBalanceData.length > 0 && (
                <div style={{ marginTop: 16, padding: 16, backgroundColor: '#fff3cd', borderRadius: 4 }}>
                  <p><strong>Tổng SL WIP:</strong> {wipBalanceData.reduce((sum, item) => sum + item.wip_balance, 0).toLocaleString('vi-VN')}</p>
                  <p><strong>Tổng giá trị WIP:</strong> {wipBalanceData.reduce((sum, item) => sum + item.wip_cost, 0).toLocaleString('vi-VN')} VNĐ</p>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  )
}