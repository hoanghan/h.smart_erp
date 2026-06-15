import { useState } from 'react'
import { App as AntApp, Button, Card, Descriptions, Form, Input, InputNumber, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PricingResolveResult } from '../../api/types'
import LookupLabel from '../../components/LookupLabel'
import LookupSelect from '../../components/LookupSelect'
import { formatNumberVN } from '../../utils/format'

interface PriceCheckFormValues {
  partnerId?: number | null
  productId: number
  qty: number
  couponCode?: string
}

export default function PriceCheckPage() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<PriceCheckFormValues>()
  const [result, setResult] = useState<PricingResolveResult | null>(null)

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const checkMutation = useMutation({
    mutationFn: async (values: PriceCheckFormValues) => (await apiClient.get<PricingResolveResult>('/sales/pricing/resolve', {
      params: {
        partnerId: values.partnerId ?? undefined,
        productId: values.productId,
        qty: values.qty,
        date: dayjs().format('YYYY-MM-DD'),
        couponCode: values.couponCode || undefined,
      },
    })).data,
    onSuccess: (data) => setResult(data),
    onError: (err) => {
      setResult(null)
      showError(err, 'Không thể kiểm tra giá')
    },
  })

  const handleCheck = async () => {
    const values = await form.validateFields()
    checkMutation.mutate(values)
  }

  return (
    <div>
      <Typography.Title level={3}>Thử giá</Typography.Title>
      <Form form={form} layout="vertical" style={{ maxWidth: 480 }}>
        <Form.Item label="Khách hàng" name="partnerId">
          <LookupSelect resource="partners" labelField="shortName" placeholder="Để trống = mọi khách hàng" />
        </Form.Item>
        <Form.Item label="Sản phẩm" name="productId" rules={[{ required: true, message: 'Chọn sản phẩm' }]}>
          <LookupSelect resource="products" />
        </Form.Item>
        <Form.Item label="Số lượng" name="qty" initialValue={1} rules={[{ required: true, message: 'Nhập số lượng' }]}>
          <InputNumber style={{ width: '100%' }} min={0.0001} />
        </Form.Item>
        <Form.Item label="Mã giảm giá" name="couponCode">
          <Input placeholder="Nhập coupon code nếu có" />
        </Form.Item>
        <Button type="primary" icon={<SearchOutlined />} loading={checkMutation.isPending} onClick={handleCheck}>
          Kiểm tra
        </Button>
      </Form>

      {result && (
        <Card title="Kết quả" style={{ marginTop: 24, maxWidth: 480 }}>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Đơn giá áp dụng">{formatNumberVN(result.rate)}</Descriptions.Item>
            <Descriptions.Item label="Chiết khấu %">{formatNumberVN(result.discountPct)}</Descriptions.Item>
            <Descriptions.Item label="Hàng tặng">
              {result.freeItems.length === 0 ? '—' : result.freeItems.map((f, i) => (
                <div key={i}><LookupLabel resource="products" id={f.productId} /> × {formatNumberVN(f.qty)}</div>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="Rules áp dụng">
              {result.appliedRules.length === 0 ? '—' : result.appliedRules.join(', ')}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  )
}
