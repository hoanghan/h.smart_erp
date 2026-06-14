import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Col, Radio, Row, Space, Tag, Typography } from 'antd'
import { AppstoreOutlined, BarsOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import DataTable from '../../components/DataTable'
import type { PageResult } from '../../api/types'

interface Opportunity {
  id: number
  docNo: string
  leadId: number | null
  leadName: string | null
  partnerId: number | null
  partnerName: string | null
  opportunityType: string
  salesStageId: number | null
  salesStageName: string | null
  probabilityPct: number
  expectedValue: number
  expectedClosingDate: string
  currency: string
  status: string
  quotationId: number | null
  quotationNo: string | null
  salespersonId: number | null
  salespersonName: string | null
  createdAt: string
}

export default function OpportunitiesListPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid')

  const { data: salesStages } = useQuery({
    queryKey: ['md-sales-stages'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<{ id: number; name: string; probabilityPct: number }>>('/md/sales-stages', { params: { size: 100 } })
      return res.data.items
    },
  })

  const { data: opportunities } = useQuery({
    queryKey: ['crm-opportunities-all'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<Opportunity>>('/crm/opportunities', { params: { size: 500 } })
      return res.data.items
    },
  })

  const columns = [
    { field: 'docNo', headerText: 'Số chứng từ', width: 150 },
    {
      field: 'partner', headerText: 'Khách hàng',
      template: (r: Opportunity) => r.partnerName || r.leadName || '-',
    },
    { field: 'opportunityType', headerText: 'Loại', width: 100 },
    {
      field: 'salesStageName', headerText: 'Giai đoạn', width: 150,
      template: (r: Opportunity) => <Tag color="blue">{r.salesStageName} ({r.probabilityPct}%)</Tag>,
    },
    {
      field: 'expectedValue', headerText: 'Giá trị', width: 120,
      template: (r: Opportunity) => `${r.expectedValue.toLocaleString('vi-VN')} ${r.currency}`,
    },
    {
      field: 'expectedClosingDate', headerText: 'Ngày chốt', width: 120,
      template: (r: Opportunity) => new Date(r.expectedClosingDate).toLocaleDateString('vi-VN'),
    },
    {
      field: 'status', headerText: 'Trạng thái', width: 120,
      template: (r: Opportunity) => {
        const color = r.status === 'OPEN' ? 'blue' : r.status === 'WON' ? 'green' : r.status === 'LOST' ? 'red' : 'orange'
        return <Tag color={color}>{r.status}</Tag>
      },
    },
    { field: 'quotationNo', headerText: 'Báo giá', width: 120 },
    { field: 'salespersonName', headerText: 'NV phụ trách', width: 150 },
  ]

  const groupedOpportunities: Record<number, Opportunity[]> = salesStages?.reduce((acc, stage) => {
    const stageOpps = opportunities?.filter((o) => o.salesStageId === stage.id) || []
    return { ...acc, [stage.id]: stageOpps }
  }, {} as Record<number, Opportunity[]>) || {}

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Opportunities
        </Typography.Title>
        <Space>
          <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <Radio.Button value="grid"><BarsOutlined /> Lưới</Radio.Button>
            <Radio.Button value="kanban"><AppstoreOutlined /> Kanban</Radio.Button>
          </Radio.Group>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/crm/opportunities/new')}>
            Tạo Opportunity
          </Button>
        </Space>
      </div>

      {viewMode === 'grid' ? (
        <DataTable<Opportunity>
          queryKey="crm-opportunities"
          endpoint="/crm/opportunities"
          columns={columns}
          searchPlaceholder="Tìm kiếm opportunity..."
        />
      ) : (
        <Row gutter={[16, 16]}>
          {salesStages?.map((stage) => (
            <Col span={6} key={stage.id}>
              <Card
                title={`${stage.name} (${groupedOpportunities[stage.id]?.length || 0})`}
                size="small"
                style={{ minHeight: 500, maxHeight: 500, overflowY: 'auto' }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {groupedOpportunities[stage.id]?.map((opp) => (
                    <Card
                      key={opp.id}
                      size="small"
                      hoverable
                      onClick={() => navigate(`/crm/opportunities/${opp.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                          {opp.partnerName || opp.leadName}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>{opp.docNo}</div>
                        <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 4 }}>
                          {opp.expectedValue.toLocaleString('vi-VN')} {opp.currency}
                        </div>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                          Chốt: {new Date(opp.expectedClosingDate).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {(!groupedOpportunities[stage.id] || groupedOpportunities[stage.id].length === 0) && (
                    <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>Trống</div>
                  )}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}