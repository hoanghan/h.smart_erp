import { useEffect } from 'react'
import { Spin } from 'antd'
import { useAuthStore } from './stores/auth'
import AppRouter from './router'
import { ToastProvider } from './components/Toast'
import { ConfirmDialogProvider } from './components/ConfirmDialog'

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  if (isBootstrapping) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  return <AppRouter />
}
