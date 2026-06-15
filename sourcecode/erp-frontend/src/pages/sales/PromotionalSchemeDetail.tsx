import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  App as AntApp, Button, Col, DatePicker, Form, Input, Row, Select, Space, Spin, Switch, Table, Tabs, Tag, Typography,
} from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type {
  ApiErrorBody, PricingRuleOut, PromotionalSchemeCreate, PromotionalSchemeOut, PromotionalSchemeUpdate,
} from '../../api/types'
import EditableGrid from '../../components/DocForm/EditableGrid'
import type { EditColumn } from '../../components/DocForm/EditableGrid'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatDateVN, formatNumberVN } from '../../utils/format'

const APPLY_ON_OPTIONS = [
  { value: 'ITEM', label: 'Mặt hàng cụ thể' },
  { value: 'ITEM_GROUP', label: 'Nhóm mặt hàng' },
  { value: 'ALL', label: 'Tất cả mặt hàng' },
]

interface SchemeItemRow {
  [key: string]: unknown
  _key: string
  productId: number | null
}
interface SchemePriceSlabRow {
  [key: string]: unknown
  _key: string
  productId: number | null
  minQty: number | null
  maxQty: number | null
  discountPct: number | null
  rate: number | null
}
interface SchemeProductSlabRow {
  [key: string]: unknown
  _key: string
  productId: number | null
  minQty: number | null
  maxQty: number | null
  freeProductId: number | null
  freeQty: number | null
  freeRate: number | null
}

let tempKeySeq = 0
const newKey = () => `tmp-${++tempKeySeq}`

const productLabel = (v: unknown) => (v != null ? <LookupLabel resource="products" id={v as number} /> : <span style={{ color: '#999' }}>Mọi sản phẩm</span>)

export default function PromotionalSchemeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntApp.useApp()
  const isNew = id === 'new'

  const queryKey = ['promotional-scheme', id]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<PromotionalSchemeOut>(`/sales/promotional-schemes/${id}`)).data,
    enabled: !isNew,
  })

  const [form] = Form.useForm()
  const applyOn = Form.useWatch('applyOn', form)
  const [items, setItems] = useState<SchemeItemRow[]>([])
  const [priceSlabs, setPriceSlabs] = useState<SchemePriceSlabRow[]>([])
  const [productSlabs, setProductSlabs] = useState<SchemeProductSlabRow[]>([])
  const [activeTab, setActiveTab] = useState('items')

  useEffect(() => {
    if (isNew) {
      form.setFieldsValue({ applyOn: 'ITEM' })
      return
    }
    if (!data) return
    form.setFieldsValue({
      code: data.code,
      name: data.name,
      applyOn: data.applyOn,
      productGroupId: data.productGroupId,
      partnerId: data.partnerId,
      validFrom: data.validFrom ? dayjs(data.validFrom) : null,
      validTo: data.validTo ? dayjs(data.validTo) : null,
      isActive: data.isActive,
    })
    setItems(data.items.map((i) => ({ _key: `id-${i.id}`, productId: i.productId })))
    setPriceSlabs(data.priceSlabs.map((p) => ({
      _key: `id-${p.id}`, productId: p.productId, minQty: p.minQty, maxQty: p.maxQty, discountPct: p.discountPct, rate: p.rate,
    })))
    setProductSlabs(data.productSlabs.map((p) => ({
      _key: `id-${p.id}`, productId: p.productId, minQty: p.minQty, maxQty: p.maxQty,
      freeProductId: p.freeProductId, freeQty: p.freeQty, freeRate: p.freeRate,
    })))
    setActiveTab(data.applyOn === 'ITEM' ? 'items' : 'priceSlabs')
  }, [data, isNew, form])

  const { data: pricingRules } = useQuery({
    queryKey: ['pricing-rules-scheme', id],
    queryFn: async () => (await apiClient.get<PricingRuleOut[]>('/sales/pricing/rules', { params: { schemeId: id } })).data,
    enabled: !isNew,
  })

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const saveMutation = useMutation({
    mutationFn: (body: PromotionalSchemeCreate | PromotionalSchemeUpdate) =>
      isNew
        ? apiClient.post<PromotionalSchemeOut>('/sales/promotional-schemes', body)
        : apiClient.put<PromotionalSchemeOut>(`/sales/promotional-schemes/${id}`, body),
    onSuccess: (res) => {
      message.success('Đã lưu')
      if (isNew) {
        navigate(`/sales/promotional-schemes/${res.data.id}`, { replace: true })
      } else {
        queryClient.setQueryData(queryKey, res.data)
        queryClient.invalidateQueries({ queryKey: ['pricing-rules-scheme', id] })
      }
    },
    onError: (err) => showError(err, 'Không thể lưu'),
  })

  const handleSave = async () => {
    const values = await form.validateFields()
    const body: PromotionalSchemeCreate & { isActive?: boolean } = {
      code: values.code,
      name: values.name,
      applyOn: values.applyOn,
      productGroupId: values.applyOn === 'ITEM_GROUP' ? (values.productGroupId ?? null) : null,
      partnerId: values.partnerId ?? null,
      validFrom: values.validFrom ? values.validFrom.format('YYYY-MM-DD') : null,
      validTo: values.validTo ? values.validTo.format('YYYY-MM-DD') : null,
      items: items.filter((i) => i.productId != null).map((i) => ({ productId: i.productId! })),
      priceSlabs: priceSlabs.map((p) => ({
        productId: p.productId, minQty: p.minQty ?? 0, maxQty: p.maxQty, discountPct: p.discountPct, rate: p.rate,
      })),
      productSlabs: productSlabs
        .filter((p) => p.freeProductId != null)
        .map((p) => ({
          productId: p.productId, minQty: p.minQty ?? 0, maxQty: p.maxQty,
          freeProductId: p.freeProductId!, freeQty: p.freeQty ?? 0, freeRate: p.freeRate ?? undefined,
        })),
    }
    if (!isNew) body.isActive = values.isActive
    saveMutation.mutate(body)
  }

  const itemColumns: EditColumn<SchemeItemRow>[] = [
    {
      title: 'Sản phẩm', dataIndex: 'productId', editable: true, editor: 'lookup', lookupResource: 'products',
      required: true, render: (v) => (v != null ? <LookupLabel resource="products" id={v as number} /> : ''),
    },
  ]

  const priceSlabColumns: EditColumn<SchemePriceSlabRow>[] = [
    {
      title: 'Sản phẩm', dataIndex: 'productId', width: 240, editable: true, editor: 'lookup', lookupResource: 'products',
      render: productLabel,
    },
    { title: 'SL từ', dataIndex: 'minQty', width: 100, align: 'right', editable: true, editor: 'number', required: true, formatNumber: true },
    { title: 'SL đến', dataIndex: 'maxQty', width: 100, align: 'right', editable: true, editor: 'number', formatNumber: true },
    { title: 'Chiết khấu %', dataIndex: 'discountPct', width: 110, align: 'right', editable: true, editor: 'number', formatNumber: true },
    { title: 'Đơn giá đặc biệt', dataIndex: 'rate', width: 140, align: 'right', editable: true, editor: 'number', formatNumber: true },
  ]

  const productSlabColumns: EditColumn<SchemeProductSlabRow>[] = [
    {
      title: 'Sản phẩm', dataIndex: 'productId', width: 220, editable: true, editor: 'lookup', lookupResource: 'products',
      render: productLabel,
    },
    { title: 'SL từ', dataIndex: 'minQty', width: 90, align: 'right', editable: true, editor: 'number', required: true, formatNumber: true },
    { title: 'SL đến', dataIndex: 'maxQty', width: 90, align: 'right', editable: true, editor: 'number', formatNumber: true },
    {
      title: 'Sản phẩm tặng', dataIndex: 'freeProductId', width: 220, editable: true, editor: 'lookup', lookupResource: 'products',
      required: true, render: (v) => (v != null ? <LookupLabel resource="products" id={v as number} /> : ''),
    },
    { title: 'SL tặng', dataIndex: 'freeQty', width: 90, align: 'right', editable: true, editor: 'number', required: true, formatNumber: true },
    { title: 'Đơn giá tặng', dataIndex: 'freeRate', width: 120, align: 'right', editable: true, editor: 'number', formatNumber: true },
  ]

  const pricingRuleColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Ưu tiên', dataIndex: 'priority', width: 80, align: 'right' as const },
    { title: 'Sản phẩm', dataIndex: 'productId', width: 180, render: (v: number | null) => (v != null ? <LookupLabel resource="products" id={v} /> : '') },
    { title: 'SL từ', dataIndex: 'minQty', width: 90, align: 'right' as const, render: formatNumberVN },
    { title: 'SL đến', dataIndex: 'maxQty', width: 90, align: 'right' as const, render: formatNumberVN },
    { title: 'CK %', dataIndex: 'discountPct', width: 90, align: 'right' as const, render: formatNumberVN },
    { title: 'Đơn giá', dataIndex: 'rate', width: 110, align: 'right' as const, render: formatNumberVN },
    { title: 'SP tặng', dataIndex: 'freeProductId', width: 180, render: (v: number | null) => (v != null ? <LookupLabel resource="products" id={v} /> : '') },
    { title: 'SL tặng', dataIndex: 'freeQty', width: 90, align: 'right' as const, render: formatNumberVN },
    { title: 'Hiệu lực', key: 'valid', width: 160, render: (_: unknown, r: PricingRuleOut) => `${formatDateVN(r.validFrom)} - ${formatDateVN(r.validTo)}` },
    { title: 'Trạng thái', dataIndex: 'isActive', width: 100, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Hoạt động' : 'Ngừng'}</Tag> },
  ]

  if (!isNew && isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {isNew ? 'Thêm chương trình khuyến mãi' : `Chương trình khuyến mãi — ${data?.code}`}
        </Typography.Title>
        <Space>
          <Button onClick={() => navigate('/sales/promotional-schemes')}>Đóng</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saveMutation.isPending} onClick={handleSave}>
            Lưu
          </Button>
        </Space>
      </Space>

      <Form form={form} layout="vertical" initialValues={{ applyOn: 'ITEM' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="Mã chương trình" name="code" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item label="Tên chương trình" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Áp dụng cho" name="applyOn">
              <Select options={APPLY_ON_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Nhóm mặt hàng" name="productGroupId">
              <LookupSelect resource="product-groups" disabled={applyOn !== 'ITEM_GROUP'} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Khách hàng (để trống = tất cả)" name="partnerId">
              <LookupSelect resource="partners" labelField="shortName" />
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
          {!isNew && (
            <Col span={4}>
              <Form.Item label="Đang áp dụng" name="isActive" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          ...(applyOn === 'ITEM' ? [{
            key: 'items',
            label: 'Mặt hàng áp dụng',
            children: (
              <EditableGrid<SchemeItemRow>
                columns={itemColumns}
                data={items}
                rowKey="_key"
                onCellChange={(i, k, v) => setItems((prev) => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
                onAddRow={() => setItems((prev) => [...prev, { _key: newKey(), productId: null }])}
                onDeleteRow={(i) => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                onSave={handleSave}
              />
            ),
          }] : []),
          {
            key: 'priceSlabs',
            label: 'Bậc giảm giá',
            children: (
              <EditableGrid<SchemePriceSlabRow>
                columns={priceSlabColumns}
                data={priceSlabs}
                rowKey="_key"
                onCellChange={(i, k, v) => setPriceSlabs((prev) => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
                onAddRow={() => setPriceSlabs((prev) => [...prev, { _key: newKey(), productId: null, minQty: 0, maxQty: null, discountPct: null, rate: null }])}
                onDeleteRow={(i) => setPriceSlabs((prev) => prev.filter((_, idx) => idx !== i))}
                onSave={handleSave}
              />
            ),
          },
          {
            key: 'productSlabs',
            label: 'Bậc tặng hàng',
            children: (
              <EditableGrid<SchemeProductSlabRow>
                columns={productSlabColumns}
                data={productSlabs}
                rowKey="_key"
                onCellChange={(i, k, v) => setProductSlabs((prev) => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
                onAddRow={() => setProductSlabs((prev) => [...prev, { _key: newKey(), productId: null, minQty: 0, maxQty: null, freeProductId: null, freeQty: 0, freeRate: null }])}
                onDeleteRow={(i) => setProductSlabs((prev) => prev.filter((_, idx) => idx !== i))}
                onSave={handleSave}
              />
            ),
          },
        ]}
      />

      {!isNew && (
        <div style={{ marginTop: 16 }}>
          <Typography.Title level={5}>Pricing Rules đã sinh</Typography.Title>
          <Table
            rowKey="id"
            size="small"
            bordered
            pagination={false}
            columns={pricingRuleColumns}
            dataSource={pricingRules ?? []}
            scroll={{ x: 'max-content' }}
          />
        </div>
      )}
    </div>
  )
}
