import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { App as AntApp, Button, Col, Form, Input, Row, Spin, Tabs, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, SupplierReturnOut, SupplierReturnUpdate } from '../../api/types'
import { SUPPLIER_RETURN_STATUS_LABELS } from '../../api/workflow'
import DocNoLabel from '../../components/DocNoLabel'
import LookupSelect from '../../components/LookupSelect'
import WorkflowBar from '../../components/WorkflowBar'
import { formatDateVN } from '../../utils/format'
import SupplierReturnLinesTab from './SupplierReturnLinesTab'

const EDITABLE_STATUSES = ['DRAFT']

export default function SupplierReturnDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()

  const queryKey = ['supplier-return', id]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<SupplierReturnOut>(`/purchasing/supplier-returns/${id}`)).data,
    enabled: !!id,
  })

  useEffect(() => {
    if (!data) return
    form.setFieldsValue({
      partnerId: data.partnerId,
      note: data.note,
    })
  }, [data, form])

  const locked = data ? !EDITABLE_STATUSES.includes(data.status) : true

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const saveMutation = useMutation({
    mutationFn: (values: SupplierReturnUpdate) => apiClient.put<SupplierReturnOut>(`/purchasing/supplier-returns/${id}`, values),
    onSuccess: (res) => {
      message.success('Đã lưu')
      queryClient.setQueryData(queryKey, res.data)
    },
    onError: (err) => showError(err, 'Không thể lưu'),
  })

  const handleSave = async () => {
    const values = await form.validateFields()
    saveMutation.mutate(values)
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
        Trả hàng NCC {data.docNo} <Typography.Text type="secondary" style={{ fontSize: 16, fontWeight: 400 }}>— {formatDateVN(data.docDate)}</Typography.Text>
      </Typography.Title>

      <WorkflowBar
        resource="supplier-returns"
        baseUrl={`/purchasing/supplier-returns/${data.id}`}
        status={data.status}
        statusLabels={SUPPLIER_RETURN_STATUS_LABELS}
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
            <Form.Item label="PO nguồn">
              <DocNoLabel endpoint="/purchasing/orders" id={data.orderId} />
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
            children: <SupplierReturnLinesTab returnId={data.id} lines={data.lines} locked={locked} queryKey={queryKey} />,
          },
        ]}
      />
    </div>
  )
}
