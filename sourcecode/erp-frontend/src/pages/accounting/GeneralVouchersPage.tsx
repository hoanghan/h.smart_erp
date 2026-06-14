import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as AntApp, Button, Form, Input, Modal, Space, Typography } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type { ApiErrorBody, VoucherOut } from '../../api/types'
import axios from 'axios'

interface VoucherLineInput {
  accountCode: string
  side: 'DEBIT' | 'CREDIT'
  amount: number
  description?: string
  partnerId?: number | null
}

interface VoucherCreateFromLines {
  voucherType: string
  docDate: string
  description?: string
  lines: VoucherLineInput[]
}

export default function GeneralVouchersPage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<{ docDate: dayjs.Dayjs; description: string }>()

  const showError = (err: unknown, fallback: string) => {
    const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
    message.error(body?.message ?? fallback)
  }

  const createMutation = useMutation({
    mutationFn: (body: VoucherCreateFromLines) =>
      apiClient.post<VoucherOut>('/finance/vouchers', body),
    onSuccess: (res) => {
      message.success('Đã tạo phiếu tổng hợp')
      queryClient.invalidateQueries({ queryKey: ['finance-vouchers'] })
      setModalOpen(false)
      form.resetFields()
      navigate(`/accounting/vouchers/${res.data.id}`)
    },
    onError: (err) => showError(err, 'Không thể tạo phiếu'),
  })

  const handleCreate = async () => {
    const values = await form.validateFields()
    createMutation.mutate({
      voucherType: 'CT_TONG_HOP',
      docDate: values.docDate.format('YYYY-MM-DD'),
      description: values.description,
      lines: [],
    })
  }

  return (
    <div>
      <Typography.Title level={3}>Phiếu tổng hợp</Typography.Title>
      <Typography.Text type="secondary">
        Chứng từ định khoản thủ công (Nợ/Có nhiều dòng). Dùng cho kết chuyển, phân bổ, khấu hao...
      </Typography.Text>

      <Space style={{ marginTop: 16, marginBottom: 16 }}>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          + Tạo phiếu tổng hợp
        </Button>
      </Space>

      <Typography.Paragraph type="secondary">
        Danh sách phiếu tổng hợp được hiển thị ở mục "Tất cả chứng từ". Bấm vào để xem chi tiết và
        thêm dòng kế toán.
      </Typography.Paragraph>

      <Modal
        title="Tạo phiếu tổng hợp"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        okText="Tạo"
        cancelText="Đóng"
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ docDate: dayjs() }}>
          <Form.Item label="Diễn giải" name="description">
            <Input.TextArea rows={2} placeholder="Kết chuyển cuối kỳ..." />
          </Form.Item>
        </Form>
        <Typography.Text type="secondary">
          Sau khi tạo, bạn sẽ thêm dòng Nợ/Có ở màn chi tiết.
        </Typography.Text>
      </Modal>
    </div>
  )
}