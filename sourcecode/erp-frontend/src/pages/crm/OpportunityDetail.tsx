import { useParams, useNavigate } from 'react-router-dom'
import { App as AntApp, Button, Card, Col, Descriptions, Row, Space, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import Timeline from '../../components/Timeline'

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
  competitor: string | null
  createdAt: string
}

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const { data: opportunity, isLoading } = useQuery({
    queryKey: ['crm-opportunities', id],
    queryFn: () => apiClient.get<Opportunity>(`/crm/opportunities/${id}`),
    enabled: !!id,
  })

  const { data: timeline } = useQuery({
    queryKey: ['crm-timeline', 'opportunity', id],
    queryFn: () => apiClient.get<any[]>(`/crm/opportunity/${id}/timeline`),
    enabled: !!id,
  })

  const makeQuotationMutation = useMutation({
    mutationFn: () => apiClient.post(`/crm/opportunities/${id}/make-quotation`, {}),
    onSuccess: (res) => {
      message.success('Đã tạo báo giá')
      navigate(`/sales/quotations/${res.data.id}`)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => apiClient.put(`/crm/opportunities/${id}`, { status }),
    onSuccess: () => {
      message.success('Cập nhật trạng thái thành công')
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities', id] })
    },
  })

  if (isLoading || !opportunity?.data) {
    return <div>Đang tải...</div>
  }

  const o = opportunity.data

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/crm/opportunities')}>
          Quay lại
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Opportunity: {o.docNo}
        </Typography.Title>
      </Space>

      <Row gutter={16}>
        <Col span={18}>
          <Card title="Thông tin Opportunity">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Số chứng từ">{o.docNo}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={o.status === 'OPEN' ? 'blue' : o.status === 'WON' ? 'green' : o.status === 'LOST' ? 'red' : 'orange'}>
                  {o.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{o.partnerName || o.leadName}</Descriptions.Item>
              <Descriptions.Item label="Loại">{o.opportunityType}</Descriptions.Item>
              <Descriptions.Item label="Giai đoạn">{o.salesStageName}</Descriptions.Item>
              <Descriptions.Item label="Xác suất">{o.probabilityPct}%</Descriptions.Item>
              <Descriptions.Item label="Giá trị">{o.expectedValue.toLocaleString('vi-VN')} {o.currency}</Descriptions.Item>
              <Descriptions.Item label="Ngày chốt">{new Date(o.expectedClosingDate).toLocaleDateString('vi-VN')}</Descriptions.Item>
              <Descriptions.Item label="Báo giá">{o.quotationNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="Đối thủ">{o.competitor || '-'}</Descriptions.Item>
              <Descriptions.Item label="NV phụ trách">{o.salespersonName || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Hành động" style={{ marginTop: 16 }}>
            <Space wrap>
              {o.status === 'OPEN' && (
                <>
                  <Button type="primary" onClick={() => makeQuotationMutation.mutate()}>
                    Tạo báo giá
                  </Button>
                  <Button icon={<CheckCircleOutlined />} onClick={() => updateStatusMutation.mutate('WON')}>
                    Won
                  </Button>
                  <Button danger icon={<CloseCircleOutlined />} onClick={() => updateStatusMutation.mutate('LOST')}>
                    Lost
                  </Button>
                </>
              )}
              <Button onClick={() => updateStatusMutation.mutate('CLOSED')}>
                Closed
              </Button>
            </Space>
          </Card>
        </Col>

        <Col span={6}>
          <Timeline timeline={timeline?.data || []} />
        </Col>
      </Row>
    </div>
  )
}