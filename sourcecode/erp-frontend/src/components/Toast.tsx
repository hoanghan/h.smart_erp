import { ToastComponent } from '@syncfusion/ej2-react-popups'
import { useRef } from 'react'

let toastRef: ToastComponent | null = null

export function ToastProvider() {
  const ref = useRef<ToastComponent>(null)
  toastRef = ref.current
  return <ToastComponent ref={ref} position={{ X: 'Right', Y: 'Top' }} />
}

export const toast = {
  success: (message: string) => {
    toastRef?.show({ content: message, cssClass: 'e-toast-success', timeOut: 3000 })
  },
  error: (message: string) => {
    toastRef?.show({ content: message, cssClass: 'e-toast-danger', timeOut: 5000 })
  },
  info: (message: string) => {
    toastRef?.show({ content: message, cssClass: 'e-toast-info', timeOut: 3000 })
  },
}
