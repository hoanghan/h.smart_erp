import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ColumnChooser,
  ExcelExport,
  FilterSettingsModel,
  GridComponent,
  Inject,
  Page,
  PageSettingsModel,
  PdfExport,
  Reorder,
  Resize,
  Search,
  SearchSettingsModel,
  SelectionSettingsModel,
  Sort,
  SortSettingsModel,
  Toolbar,
  ToolbarItems,
  Filter,
} from '@syncfusion/ej2-react-grids'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Input, Modal } from 'antd'
import { apiClient } from '../api/client'
import './ListView.css'

interface PageResult<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export type ChipTone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral'

/** Chip màu trạng thái dùng trong column template — tái dùng token --ok/--warn/--danger. */
export function StatusChip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  return <span className={`lv-chip lv-chip--${tone}`}>{label}</span>
}

const ANTD_COLOR_TONE: Record<string, ChipTone> = {
  green: 'ok',
  red: 'danger',
  orange: 'warn',
  gold: 'warn',
  blue: 'info',
  default: 'neutral',
  purple: 'neutral',
}

/** Quy đổi màu Tag antd (xem api/workflow.ts statusColor) sang tone chip của ListView. */
export function toneFromStatusColor(color: string): ChipTone {
  return ANTD_COLOR_TONE[color] ?? 'neutral'
}

export interface ListViewStatusOption {
  value: string
  label: string
}

export interface ListViewSavedView {
  id: string
  label: string
  filters?: Record<string, string>
}

export interface ListViewBulkAction<T> {
  key: string
  label: string
  danger?: boolean
  /** Thông báo xác nhận trước khi chạy (window.confirm). Bỏ qua nếu không cần xác nhận. */
  confirmMessage?: string
  /** Chỉ cho chạy khi tất cả dòng chọn thỏa điều kiện (vd cùng trạng thái DRAFT). */
  isEnabled?: (rows: T[]) => boolean
  onRun: (rows: T[]) => void | Promise<void>
}

type Density = 'Compact' | 'Normal' | 'Comfortable'

const DENSITY_LABELS: Record<Density, string> = {
  Compact: 'Gọn',
  Normal: 'Vừa',
  Comfortable: 'Thoáng',
}

const DENSITY_ROW_HEIGHT: Record<Density, number> = {
  Compact: 32,
  Normal: 44,
  Comfortable: 56,
}

interface PersistedState {
  filters?: Record<string, string>
  search?: string
  density?: Density
  hiddenColumns?: string[]
  customViews?: ListViewSavedView[]
}

function loadPersisted(key: string): PersistedState {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as PersistedState) : {}
  } catch {
    return {}
  }
}

function savePersisted(key: string, state: PersistedState) {
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // bỏ qua lỗi quota localStorage
  }
}

function buildParams(opts: { page: number; size: number; search: string; sort: string | null; extra: Record<string, unknown> }) {
  const params = new URLSearchParams()
  params.set('page', String(opts.page))
  params.set('size', String(opts.size))
  if (opts.search) params.set('q', opts.search)
  if (opts.sort) params.set('sort', opts.sort)
  for (const [key, value] of Object.entries(opts.extra)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  return params
}

function sameFilters(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((k) => a[k] === b[k])
}

export interface ListViewProps<T> {
  /** Khóa lưu cấu hình (filter/cột/density/saved view) vào localStorage, đặt theo tên màn. */
  viewKey: string
  title?: string
  /** Khóa cache react-query. */
  queryKey: string
  /** Endpoint API trả về PageResult<T> ({ items, total, page, size }). */
  endpoint: string
  columns: any[]
  /** Tham số lọc cố định gửi kèm mọi request, vd { docType: 'RECEIPT' }. */
  baseParams?: Record<string, string | number | boolean | undefined>
  /** Tên field trạng thái dùng cho thanh đếm + saved view (mặc định 'status'). */
  statusField?: string
  /** Danh sách trạng thái để hiển thị thanh đếm "Tất cả N · Nháp X · ...". */
  statusOptions?: ListViewStatusOption[]
  /** Các view có sẵn theo nghiệp vụ, vd "Chờ duyệt", "Tạm giữ". */
  presetViews?: ListViewSavedView[]
  /** Hành động hàng loạt, hiện khi chọn >= 1 dòng (yêu cầu cột checkbox). */
  bulkActions?: ListViewBulkAction<T>[]
  pageSize?: number
  /** Bộ lọc riêng của màn (Select/LookupSelect...), hiển thị trong toolbar dính. */
  toolbarExtra?: React.ReactNode
  onRowDoubleClick?: (row: T) => void
  /** Kiểu lọc nâng cao cho Grid (mặc định 'Menu'). */
  filterType?: 'Menu' | 'Excel'
}

export default function ListView<T extends Record<string, any>>({
  viewKey,
  title,
  queryKey,
  endpoint,
  columns,
  baseParams,
  statusField = 'status',
  statusOptions,
  presetViews = [],
  bulkActions = [],
  pageSize = 20,
  toolbarExtra,
  onRowDoubleClick,
  filterType = 'Menu',
}: ListViewProps<T>) {
  const storageKey = `erp.listview.${viewKey}`
  const initial = useMemo(() => loadPersisted(storageKey), [storageKey])

  const [page, setPage] = useState(1)
  const [pageSizeState, setPageSizeState] = useState(pageSize)
  const [search, setSearch] = useState(initial.search ?? '')
  const [sortString, setSortString] = useState<string | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>(initial.filters ?? {})
  const [density, setDensity] = useState<Density>(initial.density ?? 'Normal')
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(initial.hiddenColumns ?? [])
  const [customViews, setCustomViews] = useState<ListViewSavedView[]>(initial.customViews ?? [])
  const [selectedRows, setSelectedRows] = useState<T[]>([])
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [data, setData] = useState<T[]>([])
  const gridRef = useRef<GridComponent>(null)
  const isFirstRender = useRef(true)

  // Lưu cấu hình hiện tại vào localStorage mỗi khi thay đổi.
  useEffect(() => {
    savePersisted(storageKey, { filters, search, density, hiddenColumns, customViews })
  }, [storageKey, filters, search, density, hiddenColumns, customViews])

  const mergedParams = useMemo(() => ({ ...baseParams, ...filters }), [baseParams, filters])

  const { data: pageData, isFetching } = useQuery({
    queryKey: [queryKey, 'list', page, pageSizeState, search, sortString, mergedParams],
    queryFn: async () => {
      const params = buildParams({ page, size: pageSizeState, search, sort: sortString, extra: mergedParams })
      const res = await apiClient.get<PageResult<T>>(`${endpoint}?${params.toString()}`)
      return res.data
    },
  })

  // --- Thanh đếm theo trạng thái ---
  const filtersWithoutStatus = useMemo(() => {
    const f = { ...filters }
    delete f[statusField]
    return f
  }, [filters, statusField])

  const countBaseParams = useMemo(() => ({ ...baseParams, ...filtersWithoutStatus }), [baseParams, filtersWithoutStatus])

  const countTargets = useMemo(() => {
    if (!statusOptions?.length) return []
    return [{ id: '__all__', label: 'Tất cả', value: undefined as string | undefined }, ...statusOptions.map((o) => ({ id: o.value, label: o.label, value: o.value as string | undefined }))]
  }, [statusOptions])

  const countResults = useQueries({
    queries: countTargets.map((t) => ({
      queryKey: [queryKey, 'count', t.value ?? 'all', countBaseParams],
      queryFn: async () => {
        const extra = t.value ? { ...countBaseParams, [statusField]: t.value } : countBaseParams
        const params = buildParams({ page: 1, size: 1, search: '', sort: null, extra })
        const res = await apiClient.get<PageResult<T>>(`${endpoint}?${params.toString()}`)
        return res.data.total
      },
      staleTime: 10_000,
    })),
  })

  const isStatusActive = (value?: string) => (value ? filters[statusField] === value : !filters[statusField])

  const handleStatusClick = (value?: string) => {
    setPage(1)
    if (!value) setFilters(filtersWithoutStatus)
    else setFilters({ ...filtersWithoutStatus, [statusField]: value })
  }

  // --- Saved views ---
  const allBuiltInViews: ListViewSavedView[] = [{ id: '__all__', label: 'Tất cả', filters: {} }, ...presetViews]

  const isViewActive = (view: ListViewSavedView) => sameFilters(view.filters ?? {}, filters)

  const handleViewClick = (view: ListViewSavedView) => {
    setPage(1)
    setFilters(view.filters ?? {})
  }

  const handleSaveView = () => {
    const label = newViewName.trim()
    if (!label) return
    setCustomViews((v) => [...v, { id: `custom-${Date.now()}`, label, filters: { ...filters } }])
    setSaveModalOpen(false)
    setNewViewName('')
  }

  const handleRemoveView = (id: string) => {
    if (!window.confirm('Xóa view này?')) return
    setCustomViews((v) => v.filter((x) => x.id !== id))
  }

  // --- Cột (checkbox cho bulk action) ---
  const allColumns = useMemo(() => {
    if (bulkActions.length === 0) return columns
    // selectionSettings.persistSelection cần một cột primary key (field 'id') để theo dõi selection.
    return [{ type: 'checkbox', width: 50 }, { field: 'id', isPrimaryKey: true, visible: false, width: 0 }, ...columns]
  }, [columns, bulkActions.length])

  const selectionSettings: SelectionSettingsModel = useMemo(
    () => (bulkActions.length > 0 ? { type: 'Multiple', persistSelection: true, checkboxOnly: true } : { type: 'Single' }),
    [bulkActions.length],
  )

  const handleSelectionChange = () => {
    setSelectedRows((gridRef.current?.getSelectedRecords() ?? []) as T[])
  }

  const handleBulkAction = async (action: ListViewBulkAction<T>) => {
    if (action.confirmMessage && !window.confirm(action.confirmMessage)) return
    await action.onRun(selectedRows)
    gridRef.current?.clearSelection()
    setSelectedRows([])
  }

  // --- Grid settings ---
  const pageSettings: PageSettingsModel = {
    pageSize: pageSizeState,
    pageSizes: [10, 20, 50, 100],
    pageCount: 5,
    totalRecordsCount: pageData?.total ?? 0,
  }

  const filterSettings: FilterSettingsModel = { type: filterType }
  const sortSettings: SortSettingsModel = { allowUnsort: true }
  const searchSettings: SearchSettingsModel = { fields: [], operator: 'contains', ignoreCase: true }
  const toolbarItems: ToolbarItems[] = ['Search', 'ColumnChooser', 'ExcelExport', 'PdfExport']

  useEffect(() => {
    if (pageData) {
      setData(pageData.items)
      if (gridRef.current) {
        gridRef.current.dataSource = pageData.items
        gridRef.current.refresh()
      }
    }
  }, [pageData])

  useEffect(() => {
    if (!gridRef.current) return
    if (isFetching) gridRef.current.showSpinner()
    else gridRef.current.hideSpinner()
  }, [isFetching])

  // Áp dụng lại rowHeight khi đổi density (bỏ qua lần render đầu).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    gridRef.current?.refresh()
  }, [density])

  const handleActionBegin = (args: any) => {
    if (args.requestType === 'searching') {
      setPage(1)
    }
  }

  const handleActionComplete = (args: any) => {
    if (args.requestType === 'paging') {
      setPage(args.currentPage)
      if (args.currentPageSize && args.currentPageSize !== pageSizeState) {
        setPageSizeState(args.currentPageSize)
      }
    } else if (args.requestType === 'searching') {
      setSearch(args.searchString ?? '')
      setPage(1)
    } else if (args.requestType === 'sorting') {
      if (args.columns?.length > 0) {
        const column = args.columns[0]
        setSortString(`${column.field},${column.direction}`)
      } else {
        setSortString(null)
      }
    } else if (args.requestType === 'columnstate') {
      const hidden = (gridRef.current?.getColumns() ?? [])
        .filter((c: any) => c.visible === false && c.field)
        .map((c: any) => c.field as string)
      setHiddenColumns(hidden)
    }
  }

  const handleRowDataBound = (args: any) => {
    if (onRowDoubleClick) {
      args.row.addEventListener('dblclick', () => onRowDoubleClick(args.data))
    }
  }

  const handleCreated = () => {
    if (initial.hiddenColumns?.length) {
      gridRef.current?.hideColumns(initial.hiddenColumns, 'field')
    }
    const input = gridRef.current?.element.querySelector<HTMLInputElement>('.e-toolbar .e-search input')
    if (input && search) input.value = search
  }

  return (
    <div className="lv-root">
      {title && <h3 style={{ margin: 0 }}>{title}</h3>}

      <div className="lv-toolbar">
        <div className="lv-row lv-row--between">
          <div className="lv-row">
            {allBuiltInViews.map((view) => (
              <span
                key={view.id}
                className={`lv-view-tab ${isViewActive(view) ? 'active' : ''}`}
                onClick={() => handleViewClick(view)}
              >
                {view.label}
              </span>
            ))}
            {customViews.map((view) => (
              <span
                key={view.id}
                className={`lv-view-tab ${isViewActive(view) ? 'active' : ''}`}
                onClick={() => handleViewClick(view)}
              >
                {view.label}
                <span
                  className="lv-view-remove"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveView(view.id)
                  }}
                >
                  ×
                </span>
              </span>
            ))}
            <button type="button" className="lv-view-add" onClick={() => setSaveModalOpen(true)}>
              + Lưu view
            </button>
          </div>

          <div className="lv-density">
            {(Object.keys(DENSITY_LABELS) as Density[]).map((d) => (
              <button key={d} type="button" className={density === d ? 'active' : ''} onClick={() => setDensity(d)}>
                {DENSITY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        {countTargets.length > 0 && (
          <div className="lv-status-bar">
            {countTargets.map((t, i) => (
              <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 'inherit' }}>
                {i > 0 && <span className="lv-status-sep">·</span>}
                <button
                  type="button"
                  className={`lv-status-item ${isStatusActive(t.value) ? 'active' : ''}`}
                  onClick={() => handleStatusClick(t.value)}
                >
                  {t.label} {countResults[i]?.data ?? '...'}
                </button>
              </span>
            ))}
          </div>
        )}

        {toolbarExtra && <div className="lv-row">{toolbarExtra}</div>}

        {bulkActions.length > 0 && selectedRows.length > 0 && (
          <div className="lv-bulk-bar">
            <span>Đã chọn {selectedRows.length} dòng</span>
            {bulkActions.map((action) => (
              <button
                key={action.key}
                type="button"
                className={action.danger ? 'lv-danger' : ''}
                disabled={action.isEnabled ? !action.isEnabled(selectedRows) : false}
                onClick={() => handleBulkAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <GridComponent
        ref={gridRef}
        dataSource={data}
        columns={allColumns}
        allowPaging
        allowSorting
        allowFiltering
        allowResizing
        allowReordering
        rowHeight={DENSITY_ROW_HEIGHT[density]}
        pageSettings={pageSettings}
        filterSettings={filterSettings}
        sortSettings={sortSettings}
        searchSettings={searchSettings}
        selectionSettings={selectionSettings}
        toolbar={toolbarItems}
        showColumnChooser
        allowExcelExport
        allowPdfExport
        enableAdaptiveUI
        actionBegin={handleActionBegin}
        actionComplete={handleActionComplete}
        rowSelected={handleSelectionChange}
        rowDeselected={handleSelectionChange}
        rowDataBound={handleRowDataBound}
        created={handleCreated}
        loadingIndicator={{ indicatorType: 'Shimmer' }}
        locale="vi"
      >
        <Inject services={[Page, Sort, Filter, Toolbar, Search, ColumnChooser, ExcelExport, PdfExport, Resize, Reorder]} />
      </GridComponent>

      <Modal
        title="Lưu view hiện tại"
        open={saveModalOpen}
        onOk={handleSaveView}
        onCancel={() => {
          setSaveModalOpen(false)
          setNewViewName('')
        }}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Input
          placeholder="Tên view, ví dụ: Của tôi"
          value={newViewName}
          onChange={(e) => setNewViewName(e.target.value)}
          onPressEnter={handleSaveView}
          autoFocus
        />
      </Modal>
    </div>
  )
}
