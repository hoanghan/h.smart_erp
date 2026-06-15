import type { ReactNode } from 'react'
import { ClockCircleOutlined, CommentOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons'
import { Card, List, Tag, Typography } from 'antd'

interface TimelineItem {
  timestamp: string
  type: 'ACTIVITY' | 'STATUS_CHANGE'
  description: string
  actor: ReactNode
  metadata: {
    status?: string
    dueDate?: string
  }
}

interface TimelineProps {
  timeline: TimelineItem[]
  title?: string
}

export default function Timeline({ timeline, title = 'Timeline' }: TimelineProps) {
  return (
    <Card title={title} size="small">
      <List
        dataSource={timeline}
        renderItem={(item, index) => (
          <List.Item key={index}>
            <List.Item.Meta
              avatar={
                item.type === 'ACTIVITY' && item.description.startsWith('NOTE:') ? (
                  <CommentOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                ) : item.type === 'ACTIVITY' && item.description.startsWith('CALL:') ? (
                  <PhoneOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                ) : item.type === 'ACTIVITY' && item.description.startsWith('EMAIL:') ? (
                  <MailOutlined style={{ fontSize: 20, color: '#722ed1' }} />
                ) : item.type === 'ACTIVITY' && item.description.startsWith('MEETING:') ? (
                  <UserOutlined style={{ fontSize: 20, color: '#fa8c16' }} />
                ) : item.type === 'ACTIVITY' && item.description.startsWith('TODO:') ? (
                  <ClockCircleOutlined style={{ fontSize: 20, color: '#eb2f96' }} />
                ) : (
                  <ClockCircleOutlined style={{ fontSize: 20, color: '#8c8c8c' }} />
                )
              }
              title={
                <div>
                  <Typography.Text strong>{item.description}</Typography.Text>
                  {item.metadata.dueDate && item.metadata.status === 'OPEN' && (
                    <Tag color="red" style={{ marginLeft: 8 }}>Quá hạn</Tag>
                  )}
                </div>
              }
              description={
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(item.timestamp).toLocaleString('vi-VN')}
                  </Typography.Text>
                  {item.actor && (
                    <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      • {item.actor}
                    </Typography.Text>
                  )}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  )
}