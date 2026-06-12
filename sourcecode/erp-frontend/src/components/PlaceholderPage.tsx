import { Empty, Typography } from 'antd'

export default function PlaceholderPage({ title, description = 'Đang phát triển' }: { title: string; description?: string }) {
  return (
    <div>
      <Typography.Title level={3}>{title}</Typography.Title>
      <Empty description={description} />
    </div>
  )
}
