import { useNavigate } from 'react-router-dom'
import { Button, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import DataTable from '../../components/DataTable'
import type { PromotionalSchemeOut } from '../../api/types'
import { formatDateVN } from '../../utils/format'

const APPLY_ON_LABELS: Record<string, string> = {
  ITEM: 'Mặt hàng',
  ITEM_GROUP: 'Nhóm mặt hàng',
  ALL: 'Tất cả',
}

export default function PromotionalSchemesListPage() {
  const navigate = useNavigate()

  const columns = [
    {
      field: 'code', headerText: 'Mã', width: 140,
      template: (r: PromotionalSchemeOut) => <a onClick={() => navigate(`/sales/promotional-schemes/${r.id}`)}>{r.code}</a>,
    },
    { field: 'name', headerText: 'Tên chương trình' },
    {
      field: 'applyOn', headerText: 'Áp dụng cho', width: 140,
      template: (r: PromotionalSchemeOut) => APPLY_ON_LABELS[r.applyOn] ?? r.applyOn,
    },
    {
      field: 'validFrom', headerText: 'Hiệu lực từ', width: 120,
      template: (r: PromotionalSchemeOut) => formatDateVN(r.validFrom),
    },
    {
      field: 'validTo', headerText: 'Hiệu lực đến', width: 120,
      template: (r: PromotionalSchemeOut) => formatDateVN(r.validTo),
    },
    {
      field: 'isActive', headerText: 'Trạng thái', width: 120,
      template: (r: PromotionalSchemeOut) => <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? 'Đang áp dụng' : 'Ngừng'}</Tag>,
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>Chương trình khuyến mãi</Typography.Title>
      <DataTable<PromotionalSchemeOut>
        queryKey="promotional-schemes"
        endpoint="/sales/promotional-schemes"
        columns={columns}
        toolbarExtra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/sales/promotional-schemes/new')}>
            Thêm mới
          </Button>
        }
      />
    </div>
  )
}
