import { Tag } from 'antd'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { CouponCodeOut } from '../../api/types'
import { formatDateVN } from '../../utils/format'

const columns = [
  { field: 'code', headerText: 'Mã coupon', width: 160 },
  { field: 'pricingRuleId', headerText: 'Pricing Rule ID', width: 130 },
  { field: 'used', headerText: 'Đã dùng', width: 100 },
  { field: 'maxUse', headerText: 'Giới hạn dùng', width: 120 },
  {
    field: 'validFrom', headerText: 'Hiệu lực từ', width: 120,
    template: (r: CouponCodeOut) => formatDateVN(r.validFrom),
  },
  {
    field: 'validTo', headerText: 'Hiệu lực đến', width: 120,
    template: (r: CouponCodeOut) => formatDateVN(r.validTo),
  },
  {
    field: 'isActive', headerText: 'Trạng thái', width: 110,
    template: (r: CouponCodeOut) => <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? 'Hoạt động' : 'Ngừng'}</Tag>,
  },
]

const formFields: CrudFormField[] = [
  { name: 'code', label: 'Mã coupon', type: 'text', required: true },
  { name: 'pricingRuleId', label: 'Pricing Rule ID', type: 'number', required: true, min: 1, precision: 0 },
  { name: 'maxUse', label: 'Giới hạn dùng', type: 'number', min: 0, precision: 0 },
  { name: 'validFrom', label: 'Hiệu lực từ', type: 'date' },
  { name: 'validTo', label: 'Hiệu lực đến', type: 'date' },
  { name: 'isActive', label: 'Đang áp dụng', type: 'switch', editOnly: true },
]

export default function CouponsPage() {
  return (
    <CrudPage<CouponCodeOut>
      resource="sales/coupon-codes"
      endpoint="/sales/coupon-codes"
      title="Mã giảm giá"
      columns={columns}
      formFields={formFields}
      searchPlaceholder="Tìm theo mã coupon..."
    />
  )
}
