import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Space, Typography, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import axios from 'axios'
import type { ApiErrorBody } from '../../api/types'

interface CompanyInfoData {
  companyName: string | null
  taxCode: string | null
  address: string | null
  representative: string | null
  chiefAccountant: string | null
  treasurer: string | null
  logoBase64: string | null
}

export default function CompanyInfoPage() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-company-info'],
    queryFn: async () => {
      const res = await apiClient.get<CompanyInfoData>('/admin/company-info')
      return res.data
    },
  })

  useEffect(() => {
    if (data) {
      form.setFieldsValue(data)
      if (data.logoBase64) setLogoPreview(data.logoBase64)
    }
  }, [data, form])

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      await apiClient.put('/admin/company-info', values)
    },
    onSuccess: () => {
      message.success('Đã cập nhật thông tin doanh nghiệp')
    },
    onError: (err) => {
      const body = axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined
      message.error(body?.message ?? 'Lỗi lưu')
    },
  })

  const handleSubmit = async () => {
    const values = await form.validateFields()
    if (logoPreview && !values.logoBase64) values.logoBase64 = logoPreview
    saveMutation.mutate(values)
  }

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = (e.target?.result as string)?.split(',')[1]
      if (base64) {
        const dataUrl = data:;base64,
        setLogoPreview(dataUrl)
        form.setFieldsValue({ logoBase64: dataUrl })
      }
    }
    reader.readAsDataURL(file)
    return false
  }

  return (
    <div>
      <Typography.Title level={3}>Thông tin doanh nghiệp</Typography.Title>
      <Card loading={isLoading} style={{ maxWidth: 600 }}>
        <Form form={form} layout=\"vertical\">
          <Form.Item name=\"companyName\" label=\"Tên doanh nghiệp\">
            <Input />
          </Form.Item>
          <Form.Item name=\"taxCode\" label=\"Mã số thuế\">
            <Input />
          </Form.Item>
          <Form.Item name=\"address\" label=\"Địa chỉ\">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name=\"representative\" label=\"Người đại diện\">
            <Input />
          </Form.Item>
          <Form.Item name=\"chiefAccountant\" label=\"Kế toán trưởng\">
            <Input />
          </Form.Item>
          <Form.Item name=\"treasurer\" label=\"Thủ quỹ\">
            <Input />
          </Form.Item>
          <Form.Item label=\"Logo\">
            <Upload
              accept=\"image/*\"
              showUploadList={false}
              beforeUpload={handleLogoUpload as any}
            >
              <Button icon={<UploadOutlined />}>Chọn ảnh logo</Button>
            </Upload>
            {logoPreview && (
              <div style={{ marginTop: 8 }}>
                <img src={logoPreview} alt=\"Logo\" style={{ maxWidth: 200, maxHeight: 100 }} />
              </div>
            )}
          </Form.Item>
          <Form.Item name=\"logoBase64\" hidden><Input /></Form.Item>
          <Form.Item>
            <Button type=\"primary\" loading={saveMutation.isPending} onClick={handleSubmit}>
              Lưu thông tin
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
