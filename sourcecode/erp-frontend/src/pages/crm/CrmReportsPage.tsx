import { useState } from 'react'
import { Card, Col, DatePicker, Row, Statistic, Table, Tabs, Typography } from 'antd'
import { FunnelPlotOutlined, DollarOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

export default function CrmReportsPage() {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])

  const { data: summary } = useQuery({
    queryKey: ['crm-reports-summary', dateRange],
    queryFn: () => apiClient.get<any>('/crm/reports/summary', {
      params: { from: dateRange[0].toISOString(), to: dateRange[1].toISOString() },
    }),
  })

  const funnelColumns = [
    { title: 'Giai đoạn', dataIndex: 'stageName', key: 'stageName' },
    { title: 'Số lượng', dataIndex: 'count', key: 'count', width: 100 },
    { title: 'Tổng giá trị', dataIndex: 'totalValue', key: 'totalValue', width: 150, render: (v: number) => v.toLocaleString('vi-VN') },
  ]

  const conversionColumns = [
    { title: 'Nguồn', dataIndex: 'sourceName', key: 'sourceName' },
    { title: 'Tổng Leads', dataIndex: 'totalLeads', key: 'totalLeads', width: 120 },
    { title: 'Đã chuyển đổi', dataIndex: 'converted', key: 'converted', width: 120 },
    { title: 'Tỷ lệ %', dataIndex: 'conversionPct', key: 'conversionPct', width: 100, render: (v: number) => `${v}%` },
  ]

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>
        Báo cáo CRM
      </Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <RangePicker value={dateRange} onChange={(dates) => setDateRange(dates as any)} />
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng Leads"
              value={summary?.data?.totalLeads || 0}
              prefix={<UserSwitchOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng Opportunities"
              value={summary?.data?.totalOpportunities || 0}
              prefix={<FunnelPlotOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Giá trị Pipeline"
              value={summary?.data?.pipelineValue || 0}
              prefix={<DollarOutlined />}
              formatter={(value) => `${value?.toLocaleString('vi-VN')}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tỷ lệ chuyển đổi"
              value={summary?.data?.conversionRate || 0}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'funnel',
            label: 'Sales Funnel',
            children: (
              <Card title="Phễu bán hàng theo giai đoạn">
                <Table
                  columns={funnelColumns}
                  dataSource={[]}
                  rowKey="stageName"
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'conversion',
            label: 'Chuyển đổi theo nguồn',
            children: (
              <Card title="Tỷ lệ chuyển đổi theo nguồn">
                <Table
                  columns={conversionColumns}
                  dataSource={[]}
                  rowKey="sourceName"
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'lost',
            label: 'Lý do thua',
            children: (
              <Card title="Lý do thua hợp đồng">
                <Typography.Text>Dữ liệu chưa có</Typography.Text>
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}