import { Outlet, useNavigate } from 'react-router-dom'
import {
  SidebarComponent,
  MenuComponent,
  MenuItemModel,
  MenuEventArgs
} from '@syncfusion/ej2-react-navigations'
import { ButtonComponent } from '@syncfusion/ej2-react-buttons'
import { useAuthStore } from '../stores/auth'

const menuItems: MenuItemModel[] = [
  {
    text: 'Trang chủ',
    iconCss: 'e-icons e-home',
    url: '/',
  },
  {
    text: 'CRM',
    iconCss: 'e-icons e-people',
    items: [
      { text: 'Leads', url: '/crm/leads' },
      { text: 'Opportunities', url: '/crm/opportunities' },
      { text: 'Báo cáo CRM', url: '/crm/reports' },
    ],
  },
  {
    text: 'Bán hàng',
    iconCss: 'e-icons e-cart',
    items: [
      { text: 'Báo giá', url: '/sales/quotations' },
      { text: 'Đơn hàng bán', url: '/sales/orders' },
      { text: 'Chương trình KM', url: '/sales/promotional-schemes' },
      { text: 'Quy tắc giá', url: '/sales/pricing-rules' },
      { text: 'Mã giảm giá', url: '/sales/coupons' },
      { text: 'Thử giá', url: '/sales/price-check' },
    ],
  },
  {
    text: 'Mua hàng',
    iconCss: 'e-icons e-shopping-cart',
    items: [
      { text: 'Yêu cầu mua hàng', url: '/purchasing/requests' },
      { text: 'Đơn hàng mua', url: '/purchasing/orders' },
      { text: 'Thanh toán mua hàng', url: '/purchasing/payments' },
      { text: 'Trả hàng NCC', url: '/purchasing/supplier-returns' },
    ],
  },
  {
    text: 'Kho hàng',
    iconCss: 'e-icons e-box',
    items: [
      { text: 'Nhập kho', url: '/inventory/receipts' },
      { text: 'Xuất kho', url: '/inventory/issues' },
      { text: 'Chuyển kho', url: '/inventory/transfers' },
      { text: 'Tồn kho', url: '/inventory/stock' },
      { text: 'Thẻ kho', url: '/inventory/moves' },
    ],
  },
  {
    text: 'Sản xuất',
    iconCss: 'e-icons e-gantt',
    items: [
      { text: 'BOM', url: '/mfg/boms' },
      { text: 'Lệnh sản xuất', url: '/mfg/work-orders' },
      { text: 'Kế hoạch sản xuất', url: '/mfg/production-plans' },
      { text: 'Báo cáo SX', url: '/mfg/reports' },
      { text: 'Trạm sản xuất', url: '/mfg/workstations' },
      { text: 'Công đoạn', url: '/mfg/operations' },
    ],
  },
  {
    text: 'Kế toán',
    iconCss: 'e-icons e-calculator',
    items: [
      { text: 'Hệ thống tài khoản', url: '/accounting/accounts' },
      { text: 'Kỳ kế toán', url: '/accounting/periods' },
      { text: 'Số dư đầu kỳ', url: '/accounting/opening-balances' },
      { text: 'Phiếu chờ phát sinh (LERP)', url: '/accounting/lerp' },
      { text: 'Chứng từ kế toán', url: '/accounting/vouchers' },
      { text: 'Tài sản cố định', url: '/accounting/assets' },
      { text: 'Hóa đơn GTGT', url: '/accounting/vat-invoices' },
      { text: 'Kết chuyển cuối kỳ', url: '/accounting/closing' },
    ],
  },
  {
    text: 'Danh mục',
    iconCss: 'e-icons e-folder',
    items: [
      { text: 'Sản phẩm', url: '/master-data/products' },
      { text: 'Nhóm hàng', url: '/master-data/product-groups' },
      { text: 'Đơn vị tính', url: '/master-data/uoms' },
      { text: 'Đối tác', url: '/master-data/partners' },
      { text: 'Kho', url: '/master-data/warehouses' },
      { text: 'Phương thức thanh toán', url: '/master-data/payment-methods' },
      { text: 'Phương thức giao hàng', url: '/master-data/delivery-methods' },
      { text: 'Phòng ban', url: '/master-data/departments' },
      { text: 'Nhân viên', url: '/master-data/employees' },
    ],
  },
  {
    text: 'Quản trị',
    iconCss: 'e-icons e-settings',
    items: [
      { text: 'Người dùng', url: '/admin/users' },
      { text: 'Nhóm người dùng', url: '/admin/groups' },
      { text: 'Phân quyền', url: '/admin/permissions' },
      { text: 'Đánh số chứng từ', url: '/admin/doc-numbering' },
      { text: 'Thông tin doanh nghiệp', url: '/admin/company-info' },
      { text: 'Nhật ký hệ thống', url: '/admin/audit-log' },
    ],
  },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleMenuSelect = (args: MenuEventArgs) => {
    if (args.item.url) {
      navigate(args.item.url)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <SidebarComponent width="250px" style={{ backgroundColor: '#001529' }}>
        <div
          style={{
            height: '64px',
            margin: '12px 16px',
            color: '#fff',
            fontWeight: 600,
            fontSize: '20px',
            textAlign: 'center',
            lineHeight: '64px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          ERP
        </div>
        <div style={{ padding: '0 16px' }}>
          <MenuComponent
            items={menuItems}
            select={handleMenuSelect}
            orientation="Vertical"
            cssClass="sidebar-menu"
            fields={{ text: 'text', iconCss: 'iconCss', url: 'url' }}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
            }}
          />
        </div>
      </SidebarComponent>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            height: '64px',
            backgroundColor: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '16px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <span style={{ color: '#333', fontSize: '14px' }}>{user?.username ?? '...'}</span>
          <ButtonComponent
            cssClass="e-outline"
            onClick={handleLogout}
            iconCss="e-icons e-sign-out"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            Đăng xuất
          </ButtonComponent>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', overflow: 'auto', backgroundColor: '#f0f2f5' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}