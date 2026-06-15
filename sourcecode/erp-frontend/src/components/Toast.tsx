import { message } from 'antd'

export function ToastProvider() {
  return null
}

export const toast = {
  success: (msg: string) => message.success(msg),
  error: (msg: string) => message.error(msg),
  info: (msg: string) => message.info(msg),
}
