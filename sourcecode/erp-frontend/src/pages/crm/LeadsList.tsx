import { useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Modal, Select, Space, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import type { PageResult } from '../../api/types'
import DataTable from '../../components/DataTable'

interface Lead {
  id: number
  docNo: string
  firstName: string
  lastName: string
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

interface LeadDuplicateCheck {
  email: string
  phone: string
}

interface LeadDuplicateResult {
  hasDuplicates: boolean
  duplicateLeads: Lead[]
  duplicatePartners: any[]
}

interface LeadCreate {
  firstName: string
  lastName: string | null
  companyName: string | null
  jobTitle: string | null
  email: string
  phone: string
  leadSourceId: number | null
  campaignId: number | null
  territoryId: number | null
  salespersonId: number | null
  remarks: string | null
  forceCreate?: boolean
}

export default function LeadsListPage() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [modalVisible, setModalVisible] = useState(false)
  const [duplicates, setDuplicates] = useState<LeadDuplicateResult | null>(null)
  const [forceCreate, setForceCreate] = useState(false)

  const { data: leadSources } = useQuery({
    queryKey: ['md-lead-sources'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<{ id: number; name: string }>>('/md/lead-sources', { params: { size: 100 } })
      return res.data.items
    },
  })

  const { data: campaigns } = useQuery({
    queryKey: ['md-campaigns'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<{ id: number; name: string }>>('/md/campaigns', { params: { size: 100 } })
      return res.data.items
    },
  })

  const { data: employees } = useQuery({
    queryKey: ['md-employees'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<{ id: number; fullName: string }>>('/md/employees', { params: { size: 500 } })
      return res.data.items
    },
  })

  const { data: territories } = useQuery({
    queryKey: ['md-territories'],
    queryFn: async () => {
      const res = await apiClient.get<PageResult<{ id: number; name: string }>>('/md/territories', { params: { size: 100 } })
      return res.data.items
    },
    retry: false,
  })

  const checkDuplicateMutation = useMutation({
    mutationFn: (data: LeadDuplicateCheck) =>
      apiClient.post<LeadDuplicateResult>('/crm/leads/check-duplicate', data),
  })

  const createMutation = useMutation({
    mutationFn: (data: LeadCreate) => apiClient.post<Lead>('/crm/leads', { ...data, forceCreate }),
    onSuccess: () => {
      message.success('Tạo lead thành công')
      setModalVisible(false)
      form.resetFields()
      setForceCreate(false)
      setDuplicates(null)
    },
  })

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const email = values.email
    const phone = values.phone

    if (!forceCreate && (email || phone)) {
      const result = await checkDuplicateMutation.mutateAsync({ email, phone })
      if (result.data.hasDuplicates) {
        setDuplicates(result.data)
        setForceCreate(false)
        return
      }
    }

    createMutation.mutate(values)
  }

  const handleForceCreate = () => {
    setForceCreate(true)
    const values = form.getFieldsValue()
    createMutation.mutate(values)
  }

  const columns = [
    { field: 'docNo', headerText: 'Số chứng từ', width: 150 },
    {
      field: 'firstName', headerText: 'Họ tên', width: 180,
      template: (r: Lead) => (
        <div>
          <div>{r.firstName} {r.lastName}</div>
          {r.companyName && <div style={{ color: '#999', fontSize: 12 }}>{r.companyName}</div>}
        </div>
      ),
    },
    { field: 'email', headerText: 'Email', width: 200 },
    { field: 'phone', headerText: 'Điện thoại', width: 120 },
    { field: 'jobTitle', headerText: 'Chức danh', width: 150 },
    {
      field: 'status', headerText: 'Trạng thái', width: 120,
      template: (r: Lead) => {
        const color = r.status === 'LEAD' ? 'default' :
                      r.status === 'OPEN' ? 'blue' :
                      r.status === 'REPLIED' ? 'cyan' :
                      r.status === 'OPPORTUNITY' ? 'green' :
                      r.status === 'LOST' ? 'red' : 'orange'
        return <Tag color={color}>{r.status}</Tag>
      },
    },
    { field: 'leadSourceName', headerText: 'Nguồn', width: 120 },
    { field: 'campaignName', headerText: 'Chiến dịch', width: 150 },
    { field: 'territoryName', headerText: 'Khu vực', width: 120 },
    { field: 'salespersonName', headerText: 'NV phụ trách', width: 150 },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Leads
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          Thêm Lead
        </Button>
      </div>

      <DataTable<Lead>
        queryKey="crm-leads"
        endpoint="/crm/leads"
        columns={columns}
        searchPlaceholder="Tìm kiếm lead..."
      />

      {/* Create Lead Modal */}
      <Modal
        title="Thêm Lead mới"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setForceCreate(false)
          setDuplicates(null)
        }}
        width={600}
        footer={
          <Space>
            <Button onClick={() => setModalVisible(false)}>Hủy</Button>
            {duplicates?.hasDuplicates && !forceCreate && (
              <Button danger onClick={handleForceCreate}>
                Tạo vẫn (Bỏ qua trùng)
              </Button>
            )}
            <Button
              type="primary"
              loading={createMutation.isPending || checkDuplicateMutation.isPending}
              onClick={handleSubmit}
            >
              Lưu
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          {duplicates?.hasDuplicates && !forceCreate && (
            <Card
              type="inner"
              title="Cảnh báo: Phát hiện trùng lặp"
              style={{ marginBottom: 16, borderColor: '#faad14' }}
            >
              <div>
                {duplicates.duplicateLeads.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <strong>Leads trùng:</strong>
                    {duplicates.duplicateLeads.map((lead) => (
                      <Tag key={lead.id} color="orange" style={{ margin: 2 }}>
                        {lead.docNo} - {lead.firstName} {lead.lastName}
                      </Tag>
                    ))}
                  </div>
                )}
                {duplicates.duplicatePartners.length > 0 && (
                  <div>
                    <strong>Khách hàng trùng:</strong>
                    {duplicates.duplicatePartners.map((partner) => (
                      <Tag key={partner.id} color="red" style={{ margin: 2 }}>
                        {partner.code} - {partner.shortName}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          <Form.Item
            name="firstName"
            label="Tên"
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
          >
            <Input placeholder="Tên" />
          </Form.Item>

          <Form.Item name="lastName" label="Họ đệm">
            <Input placeholder="Họ đệm" />
          </Form.Item>

          <Form.Item name="companyName" label="Công ty">
            <Input placeholder="Công ty" />
          </Form.Item>

          <Form.Item name="jobTitle" label="Chức danh">
            <Input placeholder="Chức danh" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item name="phone" label="Điện thoại">
            <Input placeholder="Điện thoại" />
          </Form.Item>

          <Form.Item name="leadSourceId" label="Nguồn">
            <Select
              placeholder="Chọn nguồn"
              options={leadSources?.map((s) => ({ label: s.name, value: s.id }))}
              allowClear
            />
          </Form.Item>

          <Form.Item name="campaignId" label="Chiến dịch">
            <Select
              placeholder="Chọn chiến dịch"
              options={campaigns?.map((c) => ({ label: c.name, value: c.id }))}
              allowClear
            />
          </Form.Item>

          <Form.Item name="territoryId" label="Khu vực">
            <Select
              placeholder="Chọn khu vực"
              options={territories?.map((t) => ({ label: t.name, value: t.id }))}
              allowClear
            />
          </Form.Item>

          <Form.Item name="salespersonId" label="NV phụ trách">
            <Select
              placeholder="Chọn nhân viên"
              options={employees?.map((e) => ({ label: e.fullName, value: e.id }))}
              allowClear
            />
          </Form.Item>

          <Form.Item name="remarks" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Ghi chú..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}