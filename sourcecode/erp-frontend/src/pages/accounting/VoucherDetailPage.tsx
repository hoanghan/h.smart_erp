import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { App as AntApp, Button, DatePicker, Descriptions, Form, Input, Popconfirm, Space, Spin, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, VoucherOut, VoucherUpdate } from '../../api/types'
import { VOUCHER_STATUS_LABELS, VOUCHER_TYPE_LABELS } from '../../api/finance'
import { statusColor } from '../../api/workflow'
import LookupLabel from '../../components/LookupLabel'
import { formatDateVN, formatNumberVN } from '../../utils/format'
import { useBusinessOperations, useCashFunds, useFiscalPeriods } from './common'
import GlEntriesDrawer from './GlEntriesDrawer'
import VoucherLinesTable from './VoucherLinesTable'

const EDITABLE_STATUSES = ['DRAFT', 'UNLOCKED']

export default function VoucherDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [glOpen, setGlOpen] = useState(false)

  const queryKey = ['finance-voucher', id]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<VoucherOut>(`/finance/vouchers/${id}`)).data,
    enabled: !!id,
  })

  const { data: operations } = useBusinessOperations()
  const { data: funds } = useCashFunds()
  const { data: periods } = useFiscalPeriods()

  useEffect(() => {
    if (!data) return
    form.setFieldsValue({
      description: data.description,
      invoiceNo: data.invoiceNo,
      postingDate: data.postingDate ? dayjs(data.postingDate) : null,
    })
  }, [data, form])

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const saveMutation = useMutation({
    mutationFn: (body: VoucherUpdate) => apiClient.put<VoucherOut>(`/finance/vouchers/${id}`, body),
    onSuccess: (res) => {
      message.success('Đã lưu')
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Không thể lưu'),
  })

  const postMutation = useMutation({
    mutationFn: () => apiClient.post<VoucherOut>(`/finance/vouchers/${id}/post`),
    onSuccess: (res) => {
      message.success('Đã ghi sổ')
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Không thể ghi sổ'),
  })

  const unpostMutation = useMutation({
    mutationFn: () => apiClient.post(`/finance/vouchers/${id}/unpost`),
    onSuccess: () => {
      message.success('Đã mở khóa')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => showError(err, 'Không thể mở khóa'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => apiClient.post<VoucherOut>(`/finance/vouchers/${id}/cancel`),
    onSuccess: (res) => {
      message.success('Đã hủy chứng từ')
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Không thể hủy'),
  })

  const handleSave = async () => {
    const values = await form.validateFields()
    saveMutation.mutate({
      description: values.description,
      invoiceNo: values.invoiceNo,
      postingDate: values.postingDate ? values.postingDate.format('YYYY-MM-DD') : null,
    })
  }

  if (isLoading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  const editable = EDITABLE_STATUSES.includes(data.status)
  const operation = operations?.find((o) => o.id === data.operationId)
  const fund = funds?.find((f) => f.id === data.fundId)
  const period = periods?.find((p) => p.id === data.periodId)

  return (
    <div>
      <Typography.Title level={3}>
        {VOUCHER_TYPE_LABELS[data.voucherType] ?? data.voucherType} {data.docNo}{' '}
        <Typography.Text type="secondary" style={{ fontSize: 16, fontWeight: 400 }}>
          — {formatDateVN(data.docDate)}
        </Typography.Text>
      </Typography.Title>

      <Space style={{ marginBottom: 16 }}>
        <Tag color={statusColor(data.status)}>{VOUCHER_STATUS_LABELS[data.status] ?? data.status}</Tag>
        {data.status === 'DRAFT' && (
          <>
            <Popconfirm title="Ghi sổ chứng từ này?" okText="Ghi sổ" cancelText="Hủy" onConfirm={() => postMutation.mutate()}>
              <Button type="primary" loading={postMutation.isPending}>
                Ghi sổ
              </Button>
            </Popconfirm>
            <Popconfirm title="Hủy chứng từ này?" okText="Hủy chứng từ" cancelText="Đóng" onConfirm={() => cancelMutation.mutate()}>
              <Button danger loading={cancelMutation.isPending}>
                Hủy
              </Button>
            </Popconfirm>
          </>
        )}
        {data.status === 'POSTED' && (
          <Popconfirm title="Mở khóa chứng từ này?" description="Bút toán sổ cái sẽ bị xóa." okText="Mở khóa" cancelText="Đóng" onConfirm={() => unpostMutation.mutate()}>
            <Button loading={unpostMutation.isPending}>Mở khóa</Button>
          </Popconfirm>
        )}
        {(data.status === 'POSTED' || data.status === 'UNLOCKED') && <Button onClick={() => setGlOpen(true)}>C/từ</Button>}
      </Space>

      <Descriptions bordered size="small" column={3} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Đối tượng">
          <LookupLabel resource="partners" id={data.partnerId} labelField="shortName" />
        </Descriptions.Item>
        <Descriptions.Item label="Nghiệp vụ">{operation ? `${operation.code} — ${operation.name}` : '—'}</Descriptions.Item>
        <Descriptions.Item label="Quỹ">{fund ? `${fund.code} — ${fund.name}` : '—'}</Descriptions.Item>
        <Descriptions.Item label="Kỳ kế toán">{period ? `Năm ${period.fiscalYear} — Kỳ ${period.periodNo}` : '—'}</Descriptions.Item>
        <Descriptions.Item label="Ngày ghi sổ">{formatDateVN(data.postingDate)}</Descriptions.Item>
        <Descriptions.Item label="Tiền tệ">{data.currencyCode} (tỷ giá {formatNumberVN(data.exchangeRate)})</Descriptions.Item>
        <Descriptions.Item label="Số hóa đơn">{data.invoiceNo ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Tổng tiền / VAT">
          {formatNumberVN(data.totalAmount)} / {formatNumberVN(data.totalVat)}
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical" disabled={!editable}>
        <Descriptions title="Thông tin sửa được" bordered size="small" column={1} />
        <div style={{ display: 'flex', gap: 16, marginTop: 8, alignItems: 'flex-start' }}>
          <Form.Item label="Diễn giải" name="description" style={{ flex: 2 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Số hóa đơn" name="invoiceNo" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item label="Ngày ghi sổ" name="postingDate" style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </div>
        {editable && (
          <Button type="primary" onClick={handleSave} loading={saveMutation.isPending}>
            Lưu
          </Button>
        )}
      </Form>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Các dòng chứng từ
      </Typography.Title>
      <VoucherLinesTable lines={data.lines} />

      <GlEntriesDrawer voucherId={data.id} open={glOpen} onClose={() => setGlOpen(false)} />
    </div>
  )
}
