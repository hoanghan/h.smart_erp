import { useMemo, useState } from 'react'
import { App as AntApp, Button, Col, DatePicker, Form, InputNumber, Modal, Row, Select, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PricingRuleCreate, PricingRuleOut } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatDateVN, formatNumberVN } from '../../utils/format'

const RULE_SOURCE_OPTIONS = [
  { value: 'SCHEME', label: 'Theo chương trình KM' },
  { value: 'MANUAL', label: 'Thủ công' },
]

export default function PricingRulesPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [ruleSource, setRuleSource] = useState<string | undefined>()
  const [open, setOpen] = useState(false)

  const { data: rules, isLoading } = useQuery({
    queryKey: ['pricing-rules'],
    queryFn: async () => (await apiClient.get<PricingRuleOut[]>('/sales/pricing/rules')).data,
  })

  const filtered = useMemo(
    () => (ruleSource ? (rules ?? []).filter((r) => r.ruleSource === ruleSource) : rules ?? []),
    [rules, ruleSource],
  )

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const createMutation = useMutation({
    mutationFn: (body: PricingRuleCreate) => apiClient.post<PricingRuleOut>('/sales/pricing/rules', body),
    onSuccess: () => {
      message.success('Đã thêm rule giá')
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] })
      setOpen(false)
      form.resetFields()
    },
    onError: (err) => showError(err, 'Không thể thêm rule giá'),
  })

  const handleCreate = async () => {
    const values = await form.validateFields()
    createMutation.mutate({
      productId: values.productId ?? null,
      productGroupId: values.productGroupId ?? null,
      partnerId: values.partnerId ?? null,
      minQty: values.minQty ?? 0,
      maxQty: values.maxQty ?? null,
      discountPct: values.discountPct ?? null,
      rate: values.rate ?? null,
      freeProductId: values.freeProductId ?? null,
      freeQty: values.freeQty ?? null,
      freeRate: values.freeRate ?? undefined,
      validFrom: values.validFrom ? values.validFrom.format('YYYY-MM-DD') : null,
      validTo: values.validTo ? values.validTo.format('YYYY-MM-DD') : null,
      priority: values.priority ?? 0,
    })
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: 'Nguồn', dataIndex: 'ruleSource', width: 130,
      render: (v: string) => <Tag color={v === 'SCHEME' ? 'blue' : 'purple'}>{RULE_SOURCE_OPTIONS.find((o) => o.value === v)?.label ?? v}</Tag>,
    },
    { title: 'Scheme ID', dataIndex: 'schemeId', width: 90 },
    { title: 'Ưu tiên', dataIndex: 'priority', width: 80, align: 'right' as const },
    {
      title: 'Sản phẩm', dataIndex: 'productId', width: 180,
      render: (v: number | null) => (v != null ? <LookupLabel resource="products" id={v} /> : ''),
    },
    {
      title: 'Khách hàng', dataIndex: 'partnerId', width: 180,
      render: (v: number | null) => (v != null ? <LookupLabel resource="partners" id={v} labelField="shortName" /> : ''),
    },
    { title: 'SL từ', dataIndex: 'minQty', width: 90, align: 'right' as const, render: formatNumberVN },
    { title: 'SL đến', dataIndex: 'maxQty', width: 90, align: 'right' as const, render: formatNumberVN },
    { title: 'CK %', dataIndex: 'discountPct', width: 90, align: 'right' as const, render: formatNumberVN },
    { title: 'Đơn giá', dataIndex: 'rate', width: 110, align: 'right' as const, render: formatNumberVN },
    {
      title: 'SP tặng', dataIndex: 'freeProductId', width: 180,
      render: (v: number | null) => (v != null ? <LookupLabel resource="products" id={v} /> : ''),
    },
    { title: 'SL tặng', dataIndex: 'freeQty', width: 90, align: 'right' as const, render: formatNumberVN },
    {
      title: 'Hiệu lực', key: 'valid', width: 170,
      render: (_: unknown, r: PricingRuleOut) => `${formatDateVN(r.validFrom)} - ${formatDateVN(r.validTo)}`,
    },
    {
      title: 'Trạng thái', dataIndex: 'isActive', width: 100,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Hoạt động' : 'Ngừng'}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Quy tắc giá</Typography.Title>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Select
          placeholder="Tất cả nguồn"
          allowClear
          style={{ width: 220 }}
          value={ruleSource}
          onChange={setRuleSource}
          options={RULE_SOURCE_OPTIONS}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Thêm rule thủ công
        </Button>
      </div>
      <Table
        rowKey="id"
        size="small"
        bordered
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        columns={columns}
        dataSource={filtered}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title="Thêm rule giá thủ công"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleCreate}
        okText="Thêm"
        cancelText="Hủy"
        confirmLoading={createMutation.isPending}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Sản phẩm" name="productId">
                <LookupSelect resource="products" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Nhóm mặt hàng" name="productGroupId">
                <LookupSelect resource="product-groups" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Khách hàng" name="partnerId">
                <LookupSelect resource="partners" labelField="shortName" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ưu tiên" name="priority" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="SL từ" name="minQty" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="SL đến" name="maxQty">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Chiết khấu %" name="discountPct">
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Đơn giá đặc biệt" name="rate">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Sản phẩm tặng" name="freeProductId">
                <LookupSelect resource="products" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="SL tặng" name="freeQty">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Đơn giá tặng" name="freeRate">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Hiệu lực từ" name="validFrom">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Hiệu lực đến" name="validTo">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
