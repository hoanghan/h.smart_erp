import { useState } from 'react'
import { Button, Card, Col, Input, InputNumber, Row, Space, Tag, Table, Tabs, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { apiClient } from '../../api/client'
import type { PageResult } from '../../api/types'
import DataTable from '../../components/DataTable'

interface AuditLogRow {
  id: number
  userId: number
  username: string
  action: string
  refTable: string | null
  refId: number | null
  detail: any
  createdAt: string
}

interface WfTransitionLogRow {
  id: number
  refTable: string
  refId: number
  fromStatus: string
  toStatus: string
  actedBy: string
  actedAt: string
  note: string | null
}

export default function AuditLogPage() {
  const [refTableInput, setRefTableInput] = useState<string>('')
  const [refIdInput, setRefIdInput] = useState<number | null>(null)
  const [wfData, setWfData] = useState<WfTransitionLogRow[] | null>(null)
  const [wfLoading, setWfLoading] = useState(false)

  const auditColumns: ColumnsType<AuditLogRow> = [
    { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm:ss'), width: 170 },
    { title: 'Người dùng', dataIndex: 'username', key: 'username', width: 120 },
    { title: 'Hành động', dataIndex: 'action', key: 'action', width: 120 },
    { title: 'Bảng', dataIndex: 'refTable', key: 'refTable', render: (v) => v ? <Tag color="blue">{v}</Tag> : '-', width: 150 },
    { title: 'ID', dataIndex: 'refId', key: 'refId', render: (v) => v ?? '-', width: 80 },
    {
      title: 'Chi tiết', key: 'detail',
      render: (_, record) => {
        if (!record.detail) return '-'
        const json = JSON.stringify(record.detail, null, 2)
        return (
          <details>
            <summary style={{ cursor: 'pointer', color: '#1890ff' }}>Xem</summary>
            <pre style={{ fontSize: 11, margin: '4px 0 0 0', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{json}</pre>
          </details>
        )
      },
    },
  ]

  const wfColumns: ColumnsType<WfTransitionLogRow> = [
    { title: 'Thời gian', dataIndex: 'actedAt', key: 'actedAt', render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm:ss'), width: 170 },
    { title: 'Người duyệt', dataIndex: 'actedBy', key: 'actedBy', width: 120 },
    { title: 'Từ trạng thái', dataIndex: 'fromStatus', key: 'fromStatus', render: (v) => v ?? '-', width: 120 },
    { title: 'Đến trạng thái', dataIndex: 'toStatus', key: 'toStatus', render: (v) => v ?? '-', width: 120 },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', render: (v) => v ?? '-' },
  ]

  const searchWfLog = async () => {
    if (!refTableInput || refIdInput === null) return
    setWfLoading(true)
    try {
      const res = await apiClient.get<PageResult<WfTransitionLogRow>>('/admin/wf-log', {
        params: { refTable: refTableInput, refId: refIdInput, page: 1, size: 50 },
      })
      setWfData(res.data.items)
    } catch {
      setWfData(null)
    } finally {
      setWfLoading(false)
    }
  }

  return (
    <div>
      <Typography.Title level={3}>Nhật ký hệ thống</Typography.Title>
      <Tabs
        items={[
          {
            key: 'audit',
            label: 'Nhật ký hoạt động',
            children: (
              <DataTable<AuditLogRow>
                queryKey="admin-audit-log"
                endpoint="/admin/audit-log"
                columns={auditColumns}
                searchPlaceholder="Tìm kiếm..."
                pageSize={20}
              />
            ),
          },
          {
            key: 'wf',
            label: 'Lịch sử duyệt',
            children: (
              <Card size="small" style={{ marginBottom: 16 }}>
                <Row gutter={16} align="middle">
                  <Col>
                    <Input
                      placeholder="Tên bảng (refTable)"
                      value={refTableInput}
                      onChange={(e) => setRefTableInput(e.target.value)}
                      style={{ width: 200 }}
                    />
                  </Col>
                  <Col>
                    <InputNumber
                      placeholder="ID chứng từ"
                      value={refIdInput}
                      onChange={(v) => setRefIdInput(v)}
                      style={{ width: 150 }}
                    />
                  </Col>
                  <Col>
                    <Button type="primary" icon={<SearchOutlined />} onClick={searchWfLog} loading={wfLoading}>
                      Tra cứu
                    </Button>
                  </Col>
                </Row>
              </Card>
            ),
          },
        ]}
      />
      {wfData !== null && (
        <Card title={`Lịch sử duyệt: ${refTableInput} #${refIdInput}`} style={{ marginTop: 16 }}>
          <Table<WfTransitionLogRow>
            rowKey="id"
            columns={wfColumns}
            dataSource={wfData}
            pagination={false}
            size="small"
          />
          <Space style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
            Tổng số: {wfData.length}
          </Space>
        </Card>
      )}
    </div>
  )
}