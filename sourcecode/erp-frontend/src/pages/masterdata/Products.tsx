import ActiveTag from '../../components/ActiveTag'
import CrudPage from '../../components/crud/CrudPage'
import type { CrudFormField } from '../../components/crud/types'
import type { ProductOut } from '../../api/types'

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  GOODS: 'Hàng hóa',
  SERVICE: 'Dịch vụ',
  FINISHED: 'Thành phẩm',
  MATERIAL: 'Nguyên vật liệu',
  TOOL: 'Công cụ dụng cụ',
}

const columns = [
  { field: 'code', headerText: 'Mã hàng', width: 140 },
  { field: 'name', headerText: 'Tên hàng' },
  {
    field: 'productType', headerText: 'Loại', width: 130,
    template: (r: ProductOut) => PRODUCT_TYPE_LABELS[r.productType] ?? r.productType,
  },
  { field: 'spec', headerText: 'Quy cách' },
  {
    field: 'isActive', headerText: 'Hoạt động', width: 110,
    template: (r: ProductOut) => <ActiveTag active={r.isActive} />,
  },
]

const formFields: CrudFormField[] = [
  { name: 'code', label: 'Mã hàng', type: 'text', required: true },
  { name: 'name', label: 'Tên hàng', type: 'text', required: true },
  {
    name: 'productType',
    label: 'Loại hàng',
    type: 'select',
    required: true,
    options: Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  { name: 'uomId', label: 'Đơn vị tính', type: 'lookup', lookupResource: 'uoms', required: true },
  { name: 'groupId', label: 'Nhóm hàng', type: 'lookup', lookupResource: 'product-groups' },
  { name: 'isKit', label: 'Hàng combo (kit)', type: 'switch' },
  { name: 'barcode', label: 'Mã vạch', type: 'text' },
  { name: 'spec', label: 'Quy cách', type: 'textarea' },
  { name: 'minStock', label: 'Tồn tối thiểu', type: 'number', min: 0, precision: 2 },
  { name: 'priceWeight', label: 'Tỷ trọng tính giá', type: 'number', min: 0, precision: 4 },
  { name: 'isActive', label: 'Hoạt động', type: 'switch', editOnly: true },
]

export default function ProductsPage() {
  return (
    <CrudPage<ProductOut>
      resource="products"
      title="Sản phẩm"
      columns={columns}
      formFields={formFields}
      searchPlaceholder="Tìm theo mã, tên, barcode..."
      initialValues={{ productType: 'GOODS', isKit: false }}
    />
  )
}
