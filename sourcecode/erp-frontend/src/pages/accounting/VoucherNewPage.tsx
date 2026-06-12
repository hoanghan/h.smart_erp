import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as AntApp, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, VoucherCreate, VoucherLineCreate, VoucherOut } from '../../api/types'
import { VOUCHER_TYPE_LABELS } from '../../api/finance'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'
import { AccountLabel, AccountTreeSelect, useBusinessOperations, useCashFunds } from './common'

const VOUCHER_TYPE_OPTIONS = Object.entries(VOUCHER_TYPE_LABELS).map(([value, label]) => ({ value, label }))

interface DraftLine extends VoucherLineCreate {
  key: string
}

/** Tạo chứng từ kế toán mới (header + dòng chứng từ) — gửi 1 lần qua POST /finance/vouchers. */
export default function VoucherNewPage() {
  const { message } = AntApp.useApp()
  const navigate = useNavigate()
  const [headerForm] = Form.useForm()
  const [lineForm] = Form.useForm()
  const [lines, setLines] = useState<DraftLine[]>([])

  const { data: operations } = useBusinessOperations()
  const { data: funds } = useCashFunds()
  const voucherType = Form.useWatch('voucherType', headerForm)

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const createMutation = useMutation({
    mutationFn: (body: VoucherCreate) => apiClient.post<VoucherOut>('/finance/vouchers', body),
    onSuccess: (res) => {
      message.success(`Đã tạo chứng từ ${res.data.docNo}`)
      navigate(`/accounting/vouchers/${res.data.id}`)
    },
    onError: (err) => showError(err, 'Không thể tạo chứng từ'),
  })

  const handleAddLine = async () => {
    const v = await lineForm.validateFields()
    setLines((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${prev.length}`,
        description: v.description ?? null,
        productId: v.productId ?? null,
        quantity: v.quantity ?? null,
        unitPrice: v.unitPrice ?? null,
        amount: v.amount ?? 0,
        vatPct: v.vatPct ?? null,
        drAccountId: v.drAccountId ?? null,
        crAccountId: v.crAccountId ?? null,
        drObjectType: v.drObjectType ?? null,
        drObjectId: v.drObjectId ?? null,
        crObjectType: v.crObjectType ?? null,
        crObjectId: v.crObjectId ?? null,
      },
    ])
    lineForm.resetFields()
  }

  const handleRemoveLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const handleCreate = async () => {
    const h = await headerForm.validateFields()
    if (lines.length === 0) {
      message.error('Vui lòng thêm ít nhất một dòng chứng từ')
      return
    }
    const body: VoucherCreate = {
      voucherType: h.voucherType,
      docDate: h.docDate ? h.docDate.format('YYYY-MM-DD') : null,
      partnerId: h.partnerId ?? null,
      operationId: h.operationId ?? null,
      fundId: h.fundId ?? null,
      yccType: h.yccType ?? null,
      invoiceNo: h.invoiceNo ?? null,
      invoiceSerial: h.invoiceSerial ?? null,
      invoiceForm: h.invoiceForm ?? null,
      invoiceDate: h.invoiceDate ? h.invoiceDate.format('YYYY-MM-DD') : null,
      currencyCode: h.currencyCode ?? 'VND',
      exchangeRate: h.exchangeRate ?? 1,
      description: h.description ?? null,
      lines: lines.map(({ key, ...l }) => l),
    }
    createMutation.mutate(body)
  }

  const columns: ColumnsType<DraftLine> = [
    { title: 'Diễn giải', dataIndex: 'description', key: 'description' },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity', align: 'right', width: 80, render: formatNumberVN },
    { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right', width: 110, render: formatNumberVN },
    { title: 'Thành tiền', dataIndex: 'amount', key: 'amount', align: 'right', width: 120, render: formatNumberVN },
    { title: 'VAT %', dataIndex: 'vatPct', key: 'vatPct', align: 'right', width: 70, render: formatNumberVN },
    { title: 'TK Nợ', key: 'dr', width: 160, render: (_, r) => <AccountLabel id={r.drAccountId} /> },
    { title: 'TK Có', key: 'cr', width: 160, render: (_, r) => <AccountLabel id={r.crAccountId} /> },
    {
      title: '',
      key: '__actions',
      width: 50,
      render: (_, r) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveLine(r.key)} />,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Tạo chứng từ kế toán</Typography.Title>

      <Card title="Thông tin chung" style={{ marginBottom: 16 }}>
        <Form form={headerForm} layout="vertical" initialValues={{ currencyCode: 'VND', exchangeRate: 1 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Loại chứng từ" name="voucherType" rules={[{ required: true, message: 'Chọn loại chứng từ' }]}>
                <Select showSearch options={VOUCHER_TYPE_OPTIONS} optionFilterProp="label" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Ngày chứng từ" name="docDate">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Đối tượng" name="partnerId">
                <LookupSelect resource="partners" labelField="shortName" placeholder="Chọn đối tượng" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Nghiệp vụ" name="operationId">
                <Select
                  allowClear
                  showSearch
                  placeholder="Chọn nghiệp vụ"
                  optionFilterProp="label"
                  options={(operations ?? []).map((o) => ({ value: o.id, label: `${o.code} — ${o.name}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Quỹ tiền" name="fundId">
                <Select
                  allowClear
                  showSearch
                  placeholder="Chọn quỹ"
                  optionFilterProp="label"
                  options={(funds ?? []).map((f) => ({ value: f.id, label: `${f.code} — ${f.name}` }))}
                />
              </Form.Item>
            </Col>
            {voucherType === 'YEU_CAU_CHI' && (
              <Col span={6}>
                <Form.Item label="Loại YCC" name="yccType">
                  <Input placeholder="vd: Trả NCC, Chi khác..." />
                </Form.Item>
              </Col>
            )}
            <Col span={6}>
              <Form.Item label="Số hóa đơn" name="invoiceNo">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Ký hiệu HĐ" name="invoiceSerial">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Mẫu số HĐ" name="invoiceForm">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Ngày hóa đơn" name="invoiceDate">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Tiền tệ" name="currencyCode">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Tỷ giá" name="exchangeRate">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Diễn giải" name="description">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="Dòng chứng từ">
        <Table<DraftLine> rowKey="key" columns={columns} dataSource={lines} pagination={false} size="small" scroll={{ x: 'max-content' }} />

        <Form form={lineForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item label="Diễn giải" name="description">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Sản phẩm" name="productId">
                <LookupSelect resource="products" placeholder="Sản phẩm (nếu có)" />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item label="Số lượng" name="quantity">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Đơn giá" name="unitPrice">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item label="Thành tiền" name="amount" rules={[{ required: true, message: 'Nhập số tiền' }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={2}>
              <Form.Item label="VAT %" name="vatPct">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item label="TK Nợ" name="drAccountId">
                <AccountTreeSelect placeholder="Tài khoản Nợ" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Loại đối tượng Nợ" name="drObjectType">
                <Input placeholder="vd: partner, employee" />
              </Form.Item>
            </Col>
            <Col span={2}>
              <Form.Item label="Mã đối tượng Nợ" name="drObjectId">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="TK Có" name="crAccountId">
                <AccountTreeSelect placeholder="Tài khoản Có" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Loại đối tượng Có" name="crObjectType">
                <Input placeholder="vd: partner, employee" />
              </Form.Item>
            </Col>
            <Col span={2}>
              <Form.Item label="Mã đối tượng Có" name="crObjectId">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddLine}>
            Thêm dòng
          </Button>
        </Form>
      </Card>

      <Button type="primary" style={{ marginTop: 16 }} onClick={handleCreate} loading={createMutation.isPending}>
        Tạo chứng từ
      </Button>
    </div>
  )
}
