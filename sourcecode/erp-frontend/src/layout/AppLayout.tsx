import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  SidebarComponent,
  BreadcrumbComponent,
  type MenuItemModel,
  type BreadcrumbItemModel,
  type BreadcrumbClickEventArgs,
} from '@syncfusion/ej2-react-navigations'
import { App as AntApp, AutoComplete, Avatar, Button, Dropdown, Input, Modal } from 'antd'
import type { MenuProps } from 'antd'
import {
  IdcardOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/auth'

const SIDEBAR_COLLAPSED_KEY = 'erp.sidebarCollapsed'

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

// Nhãn tiếng Việt cho từng module (đoạn đầu của route) — dùng cho breadcrumb.
const MODULE_LABELS: Record<string, string> = {
  crm: 'CRM',
  sales: 'Bán hàng',
  purchasing: 'Mua hàng',
  inventory: 'Kho hàng',
  mfg: 'Sản xuất',
  accounting: 'Kế toán',
  'master-data': 'Danh mục',
  admin: 'Quản trị',
}

// Map đường dẫn đầy đủ (từ menuItems) -> nhãn tiếng Việt, dùng cho breadcrumb.
const PATH_LABELS: Record<string, string> = {}
menuItems.forEach((group) => {
  group.items?.forEach((item) => {
    if (item.url) PATH_LABELS[item.url] = item.text ?? item.url
  })
})

function buildBreadcrumbItems(pathname: string): BreadcrumbItemModel[] {
  if (pathname === '/') {
    return [{ text: 'Trang chủ' }]
  }
  const segments = pathname.split('/').filter(Boolean)
  const items: BreadcrumbItemModel[] = [{ text: 'Trang chủ', url: '/' }]
  let acc = ''
  segments.forEach((seg, idx) => {
    acc += `/${seg}`
    const isLast = idx === segments.length - 1
    let label = PATH_LABELS[acc]
    if (!label) {
      if (idx === 0) {
        label = MODULE_LABELS[seg] ?? seg
      } else if (seg === 'new') {
        label = 'Tạo mới'
      } else if (/^\d+$/.test(seg)) {
        label = `Chi tiết #${seg}`
      } else {
        label = seg
      }
    }
    items.push(isLast ? { text: label } : { text: label, url: acc })
  })
  return items
}

// Danh sách điều hướng dùng cho Awesomebar (Ctrl+K) — suy ra từ menuItems.
const NAVIGABLE_ITEMS: { label: string; path: string; group: string }[] = []
menuItems.forEach((group) => {
  if (group.url) {
    NAVIGABLE_ITEMS.push({ label: group.text ?? '', path: group.url, group: 'Chung' })
  }
  group.items?.forEach((item) => {
    if (item.url) {
      NAVIGABLE_ITEMS.push({ label: item.text ?? '', path: item.url, group: group.text ?? '' })
    }
  })
})

const AWESOMEBAR_OPTIONS = NAVIGABLE_ITEMS.map((item) => ({
  value: item.path,
  label: `${item.label} · ${item.group}`,
}))

const quickCreateItems: MenuProps['items'] = [
  { key: '/sales/quotations/new', label: 'Báo giá' },
  { key: '/purchasing/requests/new', label: 'Yêu cầu mua hàng' },
  { key: '/purchasing/orders/new', label: 'Đơn hàng mua' },
  { key: '/inventory/docs/new', label: 'Phiếu kho (Nhập / Xuất / Chuyển)' },
  { key: '/purchasing/supplier-returns/new', label: 'Trả hàng NCC' },
]

const userMenuItems: MenuProps['items'] = [
  { key: 'profile', icon: <IdcardOutlined />, label: 'Hồ sơ' },
  { key: 'change-password', icon: <LockOutlined />, label: 'Đổi mật khẩu' },
  { type: 'divider' },
  { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = AntApp.useApp()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [awesomebarOpen, setAwesomebarOpen] = useState(false)
  const [awesomebarQuery, setAwesomebarQuery] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      // ignore (vd. trình duyệt ở chế độ ẩn danh)
    }
  }, [collapsed])

  // Nhóm menu chứa route hiện tại — dùng để highlight + tự mở submenu.
  const activeGroupText = useMemo(
    () => menuItems.find((g) => g.items?.some((i) => i.url && location.pathname.startsWith(i.url)))?.text,
    [location.pathname],
  )
  const [openGroup, setOpenGroup] = useState<string | undefined>(activeGroupText)

  useEffect(() => {
    if (activeGroupText) {
      setOpenGroup(activeGroupText)
    }
  }, [activeGroupText])

  const breadcrumbItems = useMemo(() => buildBreadcrumbItems(location.pathname), [location.pathname])

  // Ctrl+K / Cmd+K mở Awesomebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAwesomebarOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleGroupClick = (text: string) => {
    if (collapsed) {
      setCollapsed(false)
    }
    setOpenGroup((prev) => (prev === text ? undefined : text))
  }

  const handleBreadcrumbClick = (args: BreadcrumbClickEventArgs) => {
    args.cancel = true
    if (args.item.url) {
      navigate(args.item.url)
    }
  }

  const handleQuickCreateClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      handleLogout()
    } else {
      message.info('Chức năng đang phát triển')
    }
  }

  const closeAwesomebar = () => {
    setAwesomebarOpen(false)
    setAwesomebarQuery('')
  }

  const handleAwesomebarSelect = (value: string) => {
    navigate(value)
    closeAwesomebar()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <SidebarComponent
        width="250px"
        dockSize="64px"
        enableDock
        isOpen={!collapsed}
        style={{ backgroundColor: 'var(--bg-sidebar)' }}
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">SE</div>
          {!collapsed && <span className="sidebar-brand-text">Smart ERP</span>}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((group) =>
            group.url ? (
              <NavLink
                key={group.text}
                to={group.url}
                end
                className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}
                title={collapsed ? group.text : undefined}
              >
                <span className={group.iconCss} />
                {!collapsed && <span className="sidebar-nav-text">{group.text}</span>}
              </NavLink>
            ) : (
              <div key={group.text} className="sidebar-nav-group">
                <div
                  className={`sidebar-nav-link sidebar-nav-group-header${
                    group.text === activeGroupText ? ' active' : ''
                  }`}
                  onClick={() => handleGroupClick(group.text ?? '')}
                  title={collapsed ? group.text : undefined}
                >
                  <span className={group.iconCss} />
                  {!collapsed && (
                    <>
                      <span className="sidebar-nav-text">{group.text}</span>
                      <span
                        className={`e-icons e-chevron-down sidebar-nav-chevron${
                          openGroup === group.text ? ' open' : ''
                        }`}
                      />
                    </>
                  )}
                </div>
                {!collapsed && openGroup === group.text && (
                  <div className="sidebar-nav-submenu">
                    {group.items?.map((item) => (
                      <NavLink
                        key={item.url}
                        to={item.url ?? '#'}
                        className={({ isActive }) => `sidebar-nav-sublink${isActive ? ' active' : ''}`}
                      >
                        {item.text}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
        </nav>
      </SidebarComponent>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            height: '64px',
            backgroundColor: 'var(--bg-surface)',
            padding: '0 calc(var(--space) * 3)',
            display: 'flex',
            alignItems: 'center',
            gap: 'calc(var(--space) * 2)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Thu gọn/Mở rộng sidebar"
          />

          <BreadcrumbComponent items={breadcrumbItems} itemClick={handleBreadcrumbClick} />

          <div style={{ flex: 1 }} />

          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm kiếm (Ctrl+K)"
            readOnly
            onClick={() => setAwesomebarOpen(true)}
            style={{ width: 240, cursor: 'pointer' }}
          />

          <Dropdown menu={{ items: quickCreateItems, onClick: handleQuickCreateClick }} trigger={['click']}>
            <Button icon={<PlusOutlined />}>Tạo nhanh</Button>
          </Dropdown>

          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} trigger={['click']} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space)', cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: 'var(--brand-600)' }} />
              <span style={{ color: 'var(--text-2)', fontSize: '14px' }}>{user?.username ?? '...'}</span>
            </div>
          </Dropdown>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 'calc(var(--space) * 3)', overflow: 'auto', backgroundColor: 'var(--bg-app)' }}>
          <Outlet />
        </div>
      </div>

      {/* Awesomebar / Command palette (Ctrl+K) */}
      <Modal
        open={awesomebarOpen}
        onCancel={closeAwesomebar}
        footer={null}
        closable={false}
        width={560}
        style={{ top: 120 }}
        destroyOnClose
      >
        <AutoComplete
          autoFocus
          style={{ width: '100%' }}
          options={AWESOMEBAR_OPTIONS}
          value={awesomebarQuery}
          onChange={setAwesomebarQuery}
          onSelect={handleAwesomebarSelect}
          filterOption={(inputValue, option) =>
            (option?.label as string)?.toLowerCase().includes(inputValue.toLowerCase()) ?? false
          }
        >
          <Input size="large" prefix={<SearchOutlined />} placeholder="Tìm màn hình... (VD: Báo giá, Đơn hàng mua)" />
        </AutoComplete>
      </Modal>
    </div>
  )
}
