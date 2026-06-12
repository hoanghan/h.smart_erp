import { Card, Col, Row, Statistic, Typography } from 'antd'
import { FileTextOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type { PageResult } from '../api/types'

async function fetchTotal(endpoint: string): Promise<number> {
  const res = await apiClient.get<PageResult<unknown>>(endpoint, { params: { size: 1 } })
  return res.data.total
}

export default function HomePage() {
  const quotations = useQuery({
    queryKey: ['dashboard', 'quotations-total'],
    queryFn: () => fetchTotal('/sales/quotations'),
  })
  const orders = useQuery({
    queryKey: ['dashboard', 'orders-total'],
    queryFn: () => fetchTotal('/sales/orders'),
  })

  return (
    <div>
      <Typography.Title level={3}>Tổng quan</Typography.Title>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={quotations.isLoading}>
            <Statistic title="Báo giá" value={quotations.data ?? 0} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={orders.isLoading}>
            <Statistic title="Đơn hàng bán" value={orders.data ?? 0} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
