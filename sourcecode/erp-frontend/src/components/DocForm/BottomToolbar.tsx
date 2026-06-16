import { Button, Dropdown, Space, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  UndoOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  CaretLeftOutlined,
  CaretRightOutlined,
  PrinterOutlined,
  CloseOutlined,
} from '@ant-design/icons'

/**
 * BottomToolbar — Thanh toolbar đáy form theo LeanSCRM style:
 * Trái: Thêm, Xóa, Lưu, Bỏ lưu, Điều hướng bản ghi
 * Phải: In▼, Workflow buttons, Đóng
 */

export interface WorkflowButton {
  label: string
  onClick: () => void
  type?: 'primary' | 'default' | 'danger'
  loading?: boolean
  /** Vô hiệu hóa riêng nút này (vd thiếu quyền duyệt) */
  disabled?: boolean
  /** Tooltip giải thích khi nút bị mờ */
  tooltip?: string
}

interface BottomToolbarProps {
  /** Thêm mới */
  onAdd?: () => void
  /** Xóa */
  onDelete?: () => void
  /** Lưu */
  onSave?: () => void
  /** Bỏ lưu */
  onUndo?: () => void
  /** Điều hướng */
  onFirst?: () => void
  onPrev?: () => void
  onNext?: () => void
  onLast?: () => void
  /** In */
  onPrint?: () => void
  onPrintPreview?: () => void
  /** Nút workflow — đổi theo trạng thái */
  workflowButtons?: WorkflowButton[]
  /** Đóng */
  onClose?: () => void
  /** Disable tất cả */
  disabled?: boolean
  /** Lock (không cho thêm/xóa/sửa) */
  locked?: boolean
}

export default function BottomToolbar({
  onAdd,
  onDelete,
  onSave,
  onUndo,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onPrint,
  onPrintPreview,
  workflowButtons = [],
  onClose,
  disabled = false,
  locked = false,
}: BottomToolbarProps) {
  const printMenuItems: MenuProps['items'] = [
    {
      key: 'preview',
      label: 'Xem trước khi in',
      onClick: onPrintPreview,
    },
    {
      key: 'print',
      label: 'In ngay',
      onClick: onPrint,
    },
  ]

  return (
    <div className="docform-bottom-toolbar">
      {/* Trái — CRUD + điều hướng */}
      <Space size={4}>
        {onAdd && (
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={onAdd}
            disabled={disabled || locked}
            title="Thêm mới"
          >
            Thêm
          </Button>
        )}
        {onDelete && (
          <Button
            size="small"
            icon={<DeleteOutlined />}
            onClick={onDelete}
            disabled={disabled || locked}
            danger
            title="Xóa"
          >
            Xóa
          </Button>
        )}
        {onSave && (
          <Button
            size="small"
            icon={<SaveOutlined />}
            onClick={onSave}
            disabled={disabled || locked}
            type="primary"
            title="Lưu (Ctrl+S)"
          >
            Lưu
          </Button>
        )}
        {onUndo && (
          <Button
            size="small"
            icon={<UndoOutlined />}
            onClick={onUndo}
            disabled={disabled || locked}
            title="Bỏ lưu"
          >
            Bỏ lưu
          </Button>
        )}
      </Space>

      {/* Điều hướng bản ghi */}
      <Space size={2} style={{ marginLeft: 12 }}>
        <Button size="small" icon={<StepBackwardOutlined />} onClick={onFirst} disabled={disabled} title="Bản ghi đầu" />
        <Button size="small" icon={<CaretLeftOutlined />} onClick={onPrev} disabled={disabled} title="Bản ghi trước" />
        <Button size="small" icon={<CaretRightOutlined />} onClick={onNext} disabled={disabled} title="Bản ghi sau" />
        <Button size="small" icon={<StepForwardOutlined />} onClick={onLast} disabled={disabled} title="Bản ghi cuối" />
      </Space>

      {/* Phải — In + Workflow + Đóng */}
      <div className="docform-toolbar-right">
        <Dropdown menu={{ items: printMenuItems }} disabled={disabled}>
          <Button size="small" icon={<PrinterOutlined />} disabled={disabled}>
            In ▼
          </Button>
        </Dropdown>

        {workflowButtons.map((btn, i) => {
          const button = (
            <Button
              key={i}
              size="small"
              type={btn.type === 'primary' ? 'primary' : 'default'}
              danger={btn.type === 'danger'}
              onClick={btn.onClick}
              loading={btn.loading}
              disabled={disabled || btn.disabled}
            >
              {btn.label}
            </Button>
          )
          return btn.tooltip
            ? <Tooltip key={i} title={btn.tooltip}>{button}</Tooltip>
            : button
        })}

        {onClose && (
          <Button size="small" icon={<CloseOutlined />} onClick={onClose} title="Đóng">
            Đóng
          </Button>
        )}
      </div>
    </div>
  )
}