import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import 'antd/dist/reset.css'
import './syncfusion'
import '@syncfusion/ej2-base/styles/tailwind3.css'
import '@syncfusion/ej2-buttons/styles/tailwind3.css'
import '@syncfusion/ej2-calendars/styles/tailwind3.css'
import '@syncfusion/ej2-dropdowns/styles/tailwind3.css'
import '@syncfusion/ej2-inputs/styles/tailwind3.css'
import '@syncfusion/ej2-lists/styles/tailwind3.css'
import '@syncfusion/ej2-navigations/styles/tailwind3.css'
import '@syncfusion/ej2-popups/styles/tailwind3.css'
import '@syncfusion/ej2-splitbuttons/styles/tailwind3.css'
import '@syncfusion/ej2-grids/styles/tailwind3.css'
import './theme/tokens.css'
import './index.css'
import App from './App.tsx'

dayjs.locale('vi')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Đồng bộ token màu/bo góc của antd với src/theme/tokens.css (--brand-600 / --radius)
const antdTheme = {
  token: {
    colorPrimary: '#2563eb',
    borderRadius: 8,
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfigProvider locale={viVN} theme={antdTheme}>
          <AntdApp>
            <App />
          </AntdApp>
        </ConfigProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)