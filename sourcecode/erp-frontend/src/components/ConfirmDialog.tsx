import { DialogComponent } from '@syncfusion/ej2-react-popups'
import { useRef } from 'react'

let dialogRef: DialogComponent | null = null

export function ConfirmDialogProvider() {
  const ref = useRef<DialogComponent>(null)
  dialogRef = ref.current

  return (
    <DialogComponent
      ref={ref}
      isModal
      visible={false}
      width="400px"
      showCloseIcon
      buttons={[
        {
          buttonModel: { content: 'Hủy' },
          click: () => {
            dialogRef?.hide()
            pendingResolve?.(false)
          },
        },
        {
          buttonModel: { content: 'Xác nhận', isPrimary: true, cssClass: 'e-danger' },
          click: () => {
            dialogRef?.hide()
            pendingResolve?.(true)
          },
        },
      ]}
    />
  )
}

let pendingResolve: ((result: boolean) => void) | null = null

export function confirm(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (dialogRef) {
      dialogRef.header = title
      dialogRef.content = content
      dialogRef.show()
      pendingResolve = resolve
    } else {
      resolve(false)
    }
  })
}
