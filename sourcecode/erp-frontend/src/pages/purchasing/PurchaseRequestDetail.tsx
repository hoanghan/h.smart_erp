import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { App as AntApp, Button, Col, Form, Input, Row, Spin, Tabs, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, PurchaseRequestOut, PurchaseRequestUpdate } from '../../api/types'
import { PURCHASE_REQUEST_STATUS_LABELS } from '../../api/workflow'
import LookupSelect from '../../components/LookupSelect'
import WorkflowBar from '../../components/WorkflowBar'
import { formatDateVN } from '../../utils/format'
import PurchaseRequestLinesTab from './PurchaseRequestLinesTab'

const EDITABLE_STATUSES = ['DRAFT']

export default function PurchaseRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()

  const queryKey = ['purchase-request', id]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<PurchaseRequestOut>(`/purchasing/requests/${id}`)).data,
    enabled: !!id,
  })

  useEffect(() => {
    if (!data) return
    form.setFieldsValue({
      requesterId: data.requesterId,
      departmentId: data.departmentId,
      note: data.note,
    })
  }, [data, form])

  const locked = data ? !EDITABLE_STATUSES.includes(data.status) : true

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const saveMutation = useMutation({
    mutationFn: (values: PurchaseRequestUpdate) => apiClient.put<PurchaseRequestOut>(`/purchasing/requests/${id}`, values),
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
        Yêu cầu mua hàng {data.docNo} <Typography.Text type="secondary" style={{ fontSize: 16, fontWeight: 400 }}>— {formatDateVN(data.docDate)}</Typography.Text>
      </Typography.Title>

      <WorkflowBar
        resource="purchase-requests"
        baseUrl={`/purchasing/requests/${data.id}`}
        status={data.status}
        statusLabels={PURCHASE_REQUEST_STATUS_LABELS}
        onActionSuccess={handleWorkflowSuccess}
      />

      <Form form={form} layout="vertical" disabled={locked}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Người yêu cầu" name="requesterId">
              <LookupSelect resource="employees" labelField="fullName" placeholder="Chọn người yêu cầu" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Bộ phận" name="departmentId">
              <LookupSelect resource="departments" placeholder="Chọn bộ phận" />
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
            children: <PurchaseRequestLinesTab requestId={data.id} lines={data.lines} locked={locked} queryKey={queryKey} />,
          },
        ]}
      />
    </div>
  )
}
