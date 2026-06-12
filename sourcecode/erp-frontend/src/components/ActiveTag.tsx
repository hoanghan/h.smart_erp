import { Tag } from 'antd'

export default function ActiveTag({ active }: { active: boolean }) {
  return <Tag color={active ? 'green' : 'default'}>{active ? 'Đang dùng' : 'Ngừng'}</Tag>
}
