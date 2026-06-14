import { useState, useEffect } from 'react'
import { App as AntApp, Button, Card, Form, Input, Space, Typography, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'

interface CompanyInfoData {
  companyName?: string
  taxCode?: string
  address?: string
  representative?: string
  chiefAccountant?: string
  treasurer?: string
  logoBase64?: string
}

export default function CompanyInfoPage() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [logoPreview, setLogoPreview] = useState<string>('')

  const { data: companyInfo, isLoading } = useQuery({
    queryKey: ['admin-company-info'],
    queryFn: async () => {
      const res = await apiClient.get<CompanyInfoData>('/admin/company-info')
      return res.data
    },
  })

  useEffect(() => {
    if (companyInfo) {
      form.setFieldsValue(companyInfo)
      if (companyInfo.logoBase64) setLogoPreview(companyInfo.logoBase64)
    }
  }, [companyInfo, form])

  const saveMutation = useMutation({
    mutationFn: async (values: CompanyInfoData) => {
      await apiClient.put('/admin/company-info', values)
    },
    onSuccess: () => {
      message.success('Đã lưu thông tin')
    },
    onError: (err) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as any).response?.data?.message ?? 'Lỗi lưu'
        : 'Lỗi lưu'
      message.error(msg)
    },
  })

  const handleSubmit = async () => {
    const values = await form.validateFields()
    values.logoBase64 = logoPreview
    saveMutation.mutate(values)
  }

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setLogoPreview(result)
    }
    reader.readAsDataURL(file)
    return false
  }

  const handleRemoveLogo = () => {
    setLogoPreview('')
  }

  return (
    <div>
      <Typography.Title level={3}>Thông tin doanh nghiệp</Typography.Title>
      <Card loading={isLoading} style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="companyName" label="Tên doanh nghiệp">
            <Input />
          </Form.Item>
          <Form.Item name="taxCode" label="Mã số thuế">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="representative" label="Người đại diện">
            <Input />
          </Form.Item>
          <Form.Item name="chiefAccountant" label="Kế toán trưởng">
            <Input />
          </Form.Item>
          <Form.Item name="treasurer" label="Thủ quỹ">
            <Input />
          </Form.Item>
          <Form.Item label="Logo">
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={handleLogoUpload}
            >
              <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
            </Upload>
            {logoPreview && (
              <div style={{ marginTop: 8 }}>
                <img src={logoPreview} alt="Logo" style={{ maxWidth: 200, maxHeight: 100 }} />
                <Button type="link" onClick={handleRemoveLogo} style={{ marginLeft: 8 }}>
                  Xóa
                </Button>
              </div>
            )}
          </Form.Item>
          <Form.Item name="logoBase64" hidden><Input /></Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" loading={saveMutation.isPending} onClick={handleSubmit}>
                Lưu thông tin
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}