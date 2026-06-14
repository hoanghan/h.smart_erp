import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { App as AntApp, Button, Card, Col, DatePicker, Descriptions, Form, Input, Modal, Row, Select, Space, Tag, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import Timeline from '../../components/Timeline'
import type { PageResult } from '../../api/types'

interface Lead {
  id: number
  docNo: string
  firstName: string
  lastName: string | null
  companyName: string | null
  jobTitle: string | null
  email: string
  phone: string
  status: string
  leadSourceId: number | null
  leadSourceName: string | null
  campaignId: number | null
  campaignName: string | null
  territoryId: number | null
  territoryName: string | null
  salespersonId: number | null
  salespersonName: string | null
  partnerId: number | null
  partnerName: string | null
  note: string | null
  createdAt: string
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [opportunityModalVisible, setOpportunityModalVisible] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [opportunityForm] = Form.useForm()

  const { data: lead, isLoading } = useQuery({
    queryKey: ['crm-leads', id],
    queryFn: () => apiClient.get<Lead>(`/crm/leads/${id}`),
    enabled: !!id,
  })

  const { data: salesStages } = useQuery({
    queryKey: ['md-sales-stages'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<{ id: number; name: string; probabilityPct: number }>>('/md/sales-stages', { params: { size: 100 } })
      return res.data.items
    },
  })

  const { data: timeline } = useQuery({
    queryKey: ['crm-timeline', 'lead', id],
    queryFn: () => apiClient.get<any[]>(`/crm/lead/${id}/timeline`),
    enabled: !!id,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => apiClient.put(`/crm/leads/${id}`, { status }),
    onSuccess: () => {
      message.success('Cập nhật trạng thái thành công')
      queryClient.invalidateQueries({ queryKey: ['crm-leads', id] })
      setStatusModalVisible(false)
    },
  })

  const convertToOpportunityMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(`/crm/leads/${id}/convert-to-opportunity`, data),
    onSuccess: (res) => {
      message.success('Đã chuyển sang Opportunity')
      navigate(`/crm/opportunities/${res.data.id}`)
    },
  })

  const convertToCustomerMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(`/crm/leads/${id}/convert-to-customer`, data),
    onSuccess: () => {
      message.success('Đã tạo khách hàng')
      queryClient.invalidateQueries({ queryKey: ['crm-leads', id] })
    },
  })

  const handleStatusChange = (status: string) => {
    if (status === 'LOST') {
      setStatusModalVisible(true)
    } else {
      updateStatusMutation.mutate(status)
    }
  }

  const handleConfirmLost = () => {
    updateStatusMutation.mutate('LOST')
  }

  const handleConvertToOpportunity = async () => {
    const values = await opportunityForm.validateFields()
    convertToOpportunityMutation.mutate(values)
  }

  const handleConvertToCustomer = () => {
    Modal.confirm({
      title: 'Chuyển thành Khách hàng',
      content: 'Bạn có chắc muốn chuyển lead này thành khách hàng?',
      onOk: () => convertToCustomerMutation.mutate({ partnerType: 'CUSTOMER' }),
    })
  }

  if (isLoading || !lead?.data) {
    return <div>Đang tải...</div>
  }

  const l = lead.data

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/crm/leads')}>
          Quay lại
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Lead: {l.docNo}
        </Typography.Title>
      </Space>

      <Row gutter={16}>
        <Col span={18}>
          <Card title="Thông tin Lead">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Số chứng từ">{l.docNo}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={l.status === 'LEAD' ? 'default' : l.status === 'OPEN' ? 'blue' : l.status === 'REPLIED' ? 'cyan' : 'green'}>
                  {l.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Họ tên">{l.firstName} {l.lastName}</Descriptions.Item>
              <Descriptions.Item label="Công ty">{l.companyName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{l.email}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{l.phone}</Descriptions.Item>
              <Descriptions.Item label="Chức danh">{l.jobTitle || '-'}</Descriptions.Item>
              <Descriptions.Item label="Nguồn">{l.leadSourceName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Chiến dịch">{l.campaignName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Khu vực">{l.territoryName || '-'}</Descriptions.Item>
              <Descriptions.Item label="NV phụ trách">{l.salespersonName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{l.partnerName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày tạo" span={2}>
                {new Date(l.createdAt).toLocaleDateString('vi-VN')}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>
                {l.note || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Hành động" style={{ marginTop: 16 }}>
            <Space wrap>
              {l.status === 'LEAD' && (
                <>
                  <Button onClick={() => handleStatusChange('OPEN')}>Open</Button>
                  <Button onClick={() => handleStatusChange('REPLIED')}>Replied</Button>
                </>
              )}
              {(l.status === 'LEAD' || l.status === 'OPEN' || l.status === 'REPLIED') && (
                <>
                  <Button type="primary" onClick={() => setOpportunityModalVisible(true)}>
                    Convert to Opportunity
                  </Button>
                  <Button onClick={handleConvertToCustomer}>
                    Convert to Customer
                  </Button>
                </>
              )}
              <Button danger onClick={() => handleStatusChange('LOST')}>
                Set as Lost
              </Button>
              <Button onClick={() => handleStatusChange('DO_NOT_CONTACT')}>
                Do Not Contact
              </Button>
            </Space>
          </Card>
        </Col>

        <Col span={6}>
          <Timeline timeline={timeline?.data || []} />
        </Col>
      </Row>

      <Modal
        title="Lý do thua"
        open={statusModalVisible}
        onOk={handleConfirmLost}
        onCancel={() => setStatusModalVisible(false)}
      >
        <Input.TextArea
          rows={4}
          placeholder="Nhập lý do thua..."
          value={lostReason}
          onChange={(e) => setLostReason(e.target.value)}
        />
      </Modal>

      <Modal
        title="Convert to Opportunity"
        open={opportunityModalVisible}
        onOk={handleConvertToOpportunity}
        onCancel={() => setOpportunityModalVisible(false)}
        width={800}
      >
        <Form form={opportunityForm} layout="vertical">
          <Form.Item
            name="salesStageId"
            label="Giai đoạn"
            rules={[{ required: true, message: 'Vui lòng chọn giai đoạn' }]}
          >
            <Select
              placeholder="Chọn giai đoạn"
              options={salesStages?.map((s) => ({
                label: `${s.name} (${s.probabilityPct}%)`,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="expectedClosingDate"
            label="Ngày dự kiến chốt"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="expectedValue" label="Giá trị dự kiến">
            <Input type="number" placeholder="Giá trị" />
          </Form.Item>

          <Form.Item name="currency" label="Loại tiền">
            <Select defaultValue="VND" options={[{ label: 'VND', value: 'VND' }, { label: 'USD', value: 'USD' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}