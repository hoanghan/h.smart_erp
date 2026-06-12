import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Layout, Menu, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import {
  AccountBookOutlined,
  AppstoreOutlined,
  HomeOutlined,
  InboxOutlined,
  LogoutOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/auth'

const { Header, Sider, Content } = Layout

const menuItems: MenuProps['items'] = [
  { key: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
  {
    key: '/sales',
    icon: <ShoppingCartOutlined />,
    label: 'Bán hàng',
    children: [
      { key: '/sales/quotations', label: 'Báo giá' },
      { key: '/sales/orders', label: 'Đơn hàng bán' },
    ],
  },
  {
    key: '/purchasing',
    icon: <ShoppingOutlined />,
    label: 'Mua hàng',
    children: [
      { key: '/purchasing/requests', label: 'Yêu cầu mua hàng' },
      { key: '/purchasing/orders', label: 'Đơn hàng mua' },
      { key: '/purchasing/payments', label: 'Thanh toán mua hàng' },
      { key: '/purchasing/supplier-returns', label: 'Trả hàng NCC' },
    ],
  },
  {
    key: '/inventory',
    icon: <InboxOutlined />,
    label: 'Kho hàng',
    children: [
      { key: '/inventory/receipts', label: 'Nhập kho' },
      { key: '/inventory/issues', label: 'Xuất kho' },
      { key: '/inventory/transfers', label: 'Chuyển kho' },
      { key: '/inventory/stock', label: 'Tồn kho' },
      { key: '/inventory/moves', label: 'Thẻ kho' },
    ],
  },
  {
    key: '/accounting',
    icon: <AccountBookOutlined />,
    label: 'Kế toán',
    children: [
      { key: '/accounting/accounts', label: 'Hệ thống tài khoản' },
      { key: '/accounting/periods', label: 'Kỳ kế toán' },
      { key: '/accounting/opening-balances', label: 'Số dư đầu kỳ' },
      { key: '/accounting/lerp', label: 'Phiếu chờ phát sinh (LERP)' },
      { key: '/accounting/vouchers', label: 'Chứng từ kế toán' },
      { key: '/accounting/assets', label: 'Tài sản cố định' },
      { key: '/accounting/vat-invoices', label: 'Hóa đơn GTGT' },
      { key: '/accounting/closing', label: 'Kết chuyển cuối kỳ' },
    ],
  },
  {
    key: '/master-data',
    icon: <AppstoreOutlined />,
    label: 'Danh mục',
    children: [
      { key: '/master-data/products', label: 'Sản phẩm' },
      { key: '/master-data/product-groups', label: 'Nhóm hàng' },
      { key: '/master-data/uoms', label: 'Đơn vị tính' },
      { key: '/master-data/partners', label: 'Đối tác' },
      { key: '/master-data/warehouses', label: 'Kho' },
      { key: '/master-data/payment-methods', label: 'Phương thức thanh toán' },
      { key: '/master-data/delivery-methods', label: 'Phương thức giao hàng' },
      { key: '/master-data/departments', label: 'Phòng ban' },
      { key: '/master-data/employees', label: 'Nhân viên' },
    ],
  },
  { key: '/admin', icon: <SettingOutlined />, label: 'Quản trị' },
]

/** Tìm key menu khớp dài nhất với pathname hiện tại để highlight đúng mục. */
function selectedKeyFor(pathname: string): string {
  const flat: string[] = []
  for (const item of menuItems ?? []) {
    if (!item) continue
    flat.push(item.key as string)
    if ('children' in item && item.children) {
      for (const child of item.children) {
        if (child) flat.push(child.key as string)
      }
    }
  }
  const matches = flat
    .filter((key) => key === '/' ? pathname === '/' : pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)
  return matches[0] ?? '/'
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const selectedKey = selectedKeyFor(location.pathname)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsible>
        <div
          style={{
            height: 48,
            margin: 12,
            color: '#fff',
            fontWeight: 600,
            fontSize: 18,
            textAlign: 'center',
            lineHeight: '48px',
          }}
        >
          ERP
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={['/sales', '/purchasing', '/master-data', '/accounting', '/admin']}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 24px',
          }}
        >
          <Space size="middle">
            <Avatar icon={<UserOutlined />} />
            <Typography.Text>{user?.username ?? '...'}</Typography.Text>
            <a onClick={handleLogout}>
              <LogoutOutlined /> Đăng xuất
            </a>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}