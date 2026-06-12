import { useState } from 'react'
import { App as AntApp, Button, Form, Input, Modal, Space, Tag } from 'antd'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '../api/client'
import type { ApiErrorBody } from '../api/types'
import { ACTION_LABELS, DANGER_ACTIONS, PRIMARY_ACTIONS, WF_DEFINITIONS, statusColor } from '../api/workflow'

interface WorkflowBarProps {
  /** Khóa resource trong WF_DEFINITIONS, vd "quotations" hoặc "sales-orders" */
  resource: keyof typeof WF_DEFINITIONS
  /** Đường dẫn API của bản ghi, vd "/sales/quotations/123" — action sẽ POST tới `${baseUrl}/actions/{action}` */
  baseUrl: string
  status: string
  statusLabels: Record<string, string>
  /** Gọi sau khi action thành công, nhận dữ liệu trả về và tên action */
  onActionSuccess: (data: unknown, action: string) => void
}

/** Thanh trạng thái + nút hành động theo luồng workflow của backend (WorkflowService.Definitions). */
export default function WorkflowBar({ resource, baseUrl, status, statusLabels, onActionSuccess }: WorkflowBarProps) {
  const { message } = AntApp.useApp()
  const [reasonAction, setReasonAction] = useState<string | null>(null)
  const [reasonForm] = Form.useForm()

  const mutation = useMutation({
    mutationFn: ({ action, reason }: { action: string; reason?: string }) =>
      apiClient.post(`${baseUrl}/actions/${action}`, reason ? { reason } : {}),
    onSuccess: (res, vars) => {
      message.success(`Đã thực hiện: ${ACTION_LABELS[vars.action] ?? vars.action}`)
      setReasonAction(null)
      reasonForm.resetFields()
      onActionSuccess(res.data, vars.action)
    },
    onError: (err) => {
      const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
      message.error(body?.message ?? 'Có lỗi xảy ra, vui lòng thử lại')
    },
  })

  const transitions = (WF_DEFINITIONS[resource] ?? []).filter((t) => t.from.includes(status))

  const handleClick = (action: string, requireReason?: boolean) => {
    if (requireReason) {
      setReasonAction(action)
    } else {
      mutation.mutate({ action })
    }
  }

  const handleReasonOk = async () => {
    const values = await reasonForm.validateFields()
    mutation.mutate({ action: reasonAction!, reason: values.reason })
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        padding: '12px 16px',
        background: '#fafafa',
        borderRadius: 8,
        flexWrap: 'wrap',
      }}
    >
      <Tag color={statusColor(status)} style={{ fontSize: 14, padding: '4px 12px' }}>
        {statusLabels[status] ?? status}
      </Tag>
      <Space wrap>
        {transitions.map((t) => (
          <Button
            key={t.action}
            type={PRIMARY_ACTIONS.has(t.action) ? 'primary' : 'default'}
            danger={DANGER_ACTIONS.has(t.action)}
            loading={mutation.isPending && mutation.variables?.action === t.action}
            onClick={() => handleClick(t.action, t.requireReason)}
          >
            {ACTION_LABELS[t.action] ?? t.action}
          </Button>
        ))}
      </Space>
      <Modal
        title={`${ACTION_LABELS[reasonAction ?? ''] ?? ''} — nhập lý do`}
        open={reasonAction !== null}
        onOk={handleReasonOk}
        onCancel={() => {
          setReasonAction(null)
          reasonForm.resetFields()
        }}
        confirmLoading={mutation.isPending}
        okText="Xác nhận"
        cancelText="Đóng"
        forceRender
      >
        <Form form={reasonForm} layout="vertical">
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}>
            <Input.TextArea rows={3} autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
