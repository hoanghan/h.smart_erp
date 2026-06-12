import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { App as AntApp, Button, Col, DatePicker, Form, Input, Row, Select, Spin, Switch, Tabs, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PurchaseOrderOut, PurchaseOrderUpdate } from '../../api/types'
import { PURCHASE_ORDER_STATUS_LABELS } from '../../api/workflow'
import LookupSelect from '../../components/LookupSelect'
import WorkflowBar from '../../components/WorkflowBar'
import { formatDateVN } from '../../utils/format'
import { ORDER_FORM_LABELS } from './PurchaseOrdersList'
import PurchaseOrderLinesTab from './PurchaseOrderLinesTab'
import PurchaseOrderCostsTab from './PurchaseOrderCostsTab'
import PurchaseOrderPaymentsTab from './PurchaseOrderPaymentsTab'
import PurchaseOrderReceiptsTab from './PurchaseOrderReceiptsTab'

const ORDER_FORM_OPTIONS = Object.entries(ORDER_FORM_LABELS).map(([value, label]) => ({ value, label }))

const EDITABLE_STATUSES = ['DRAFT']

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()

  const queryKey = ['purchase-order', id]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<PurchaseOrderOut>(`/purchasing/orders/${id}`)).data,
    enabled: !!id,
  })

  useEffect(() => {
    if (!data) return
    form.setFieldsValue({
      partnerId: data.partnerId,
      orderForm: data.orderForm,
      receiveDatePlan: data.receiveDatePlan ? dayjs(data.receiveDatePlan) : null,
      paymentMethodId: data.paymentMethodId,
      receiveAddress: data.receiveAddress,
      vatIncluded: data.vatIncluded,
      note: data.note,
    })
  }, [data, form])

  const locked = data ? !EDITABLE_STATUSES.includes(data.status) : true

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const saveMutation = useMutation({
    mutationFn: (values: PurchaseOrderUpdate) => apiClient.put<PurchaseOrderOut>(`/purchasing/orders/${id}`, values),
    onSuccess: (res) => {
      message.success('Đã lưu')
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Không thể lưu'),
  })

  const handleSave = async () => {
    const values = await form.validateFields()
    saveMutation.mutate({
      ...values,
      receiveDatePlan: values.receiveDatePlan ? values.receiveDatePlan.format('YYYY-MM-DD') : null,
    })
  }

  const handleWorkflowSuccess = (resData: unknown) => {
    queryClient.setQueryData(queryKey, resData)
  }

  if (isLoading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Typography.Title level={3}>
        Đơn hàng mua {data.docNo} <Typography.Text type="secondary" style={{ fontSize: 16, fontWeight: 400 }}>— {formatDateVN(data.orderDate)}</Typography.Text>
      </Typography.Title>

      <WorkflowBar
        resource="purchase-orders"
        baseUrl={`/purchasing/orders/${data.id}`}
        status={data.status}
        statusLabels={PURCHASE_ORDER_STATUS_LABELS}
        onActionSuccess={handleWorkflowSuccess}
      />

      <Form form={form} layout="vertical" disabled={locked}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Nhà cung cấp" name="partnerId" rules={[{ required: true, message: 'Vui lòng chọn nhà cung cấp' }]}>
              <LookupSelect resource="partners" labelField="shortName" placeholder="Chọn nhà cung cấp" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Hình thức" name="orderForm">
              <Select options={ORDER_FORM_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Ngày nhận hàng kế hoạch" name="receiveDatePlan">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Phương thức thanh toán" name="paymentMethodId">
              <LookupSelect resource="payment-methods" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Địa chỉ nhận hàng" name="receiveAddress">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Bao gồm VAT" name="vatIncluded" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="Ghi chú" name="note">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" onClick={handleSave} loading={saveMutation.isPending} disabled={locked}>
          Lưu
        </Button>
      </Form>

      <Tabs
        style={{ marginTop: 24 }}
        items={[
          {
            key: 'lines',
            label: 'Hàng hóa',
            children: (
              <PurchaseOrderLinesTab
                orderId={data.id}
                lines={data.lines}
                locked={locked}
                totalAmount={data.totalAmount}
                totalVat={data.totalVat}
                queryKey={queryKey}
              />
            ),
          },
          {
            key: 'costs',
            label: 'Chi phí',
            children: <PurchaseOrderCostsTab orderId={data.id} />,
          },
          {
            key: 'payments',
            label: 'Thanh toán',
            children: <PurchaseOrderPaymentsTab orderId={data.id} />,
          },
          {
            key: 'receipts',
            label: 'Nhận hàng',
            children: <PurchaseOrderReceiptsTab orderId={data.id} status={data.status} poQueryKey={queryKey} />,
          },
        ]}
      />
    </div>
  )
}
