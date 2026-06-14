import { useEffect, useRef, useState } from 'react'
import {
  ColumnChooser,
  ExcelExport,
  Filter,
  FilterSettingsModel,
  GridComponent,
  Group,
  GroupSettingsModel,
  Inject,
  Page,
  PageSettingsModel,
  PdfExport,
  Search,
  SearchSettingsModel,
  Sort,
  SortSettingsModel,
  Toolbar,
  ToolbarItems,
} from '@syncfusion/ej2-react-grids'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'

interface PageResult<T> {
  items: T[]
  total: number
  page: number
  size: number
}

interface DataTableProps<T> {
  queryKey: string
  endpoint: string
  columns: any[]
  /** Tham số lọc cố định gửi kèm mỗi request, vd { status: 'DRAFT' } */
  extraParams?: Record<string, string | number | boolean | undefined>
  searchPlaceholder?: string
  allowGrouping?: boolean
  allowPaging?: boolean
  allowSorting?: boolean
  allowFiltering?: boolean
  pageSize?: number
  toolbar?: ToolbarItems[]
  onRowDoubleClick?: (data: T) => void
  toolbarExtra?: React.ReactNode
}

export default function DataTable<T extends Record<string, any>>({
  queryKey,
  endpoint,
  columns,
  extraParams,
  searchPlaceholder = 'Tìm kiếm...',
  allowGrouping = false,
  allowPaging = true,
  allowSorting = true,
  allowFiltering = true,
  pageSize = 20,
  toolbar = ['Search', 'ColumnChooser'],
  onRowDoubleClick,
  toolbarExtra,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1)
  const [pageSizeState, setPageSizeState] = useState(pageSize)
  const [search, setSearch] = useState('')
  const [sortString, setSortString] = useState<string | null>(null)
  const [data, setData] = useState<T[]>([])
  const gridRef = useRef<GridComponent>(null)

  const { data: pageData, isFetching, refetch } = useQuery({
    queryKey: [queryKey, page, pageSizeState, search, sortString, extraParams],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('size', pageSizeState.toString())
      if (search) params.append('q', search)
      if (sortString) params.append('sort', sortString)
      if (extraParams) {
        for (const [key, value] of Object.entries(extraParams)) {
          if (value !== undefined) params.append(key, String(value))
        }
      }

      const response = await apiClient.get<PageResult<T>>(`${endpoint}?${params.toString()}`)
      return response.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      refetch()
    },
  })

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

  const pageSettings: PageSettingsModel = {
    pageSize: pageSizeState,
    pageSizes: [10, 20, 50, 100],
    pageCount: 5,
  }

  const filterSettings: FilterSettingsModel = {
    type: 'Menu',
  }

  const sortSettings: SortSettingsModel = {
    allowUnsort: true,
  }

  const groupSettings: GroupSettingsModel = {
    showGroupedColumn: allowGrouping,
    showDropArea: allowGrouping,
  }

  const searchSettings: SearchSettingsModel = {
    fields: [],
    operator: 'contains',
    ignoreCase: true,
  }

  const handleActionBegin = (args: any) => {
    if (args.requestType === 'delete') {
      args.cancel = true
      if (window.confirm('Bạn có chắc chắn muốn xóa?')) {
        deleteMutation.mutate(args.data[0].id)
      }
    }
  }

  const handleActionComplete = (args: any) => {
    if (args.requestType === 'paging') {
      setPage(args.currentPage)
      if (args.currentPageSize && args.currentPageSize !== pageSizeState) {
        setPageSizeState(args.currentPageSize)
      }
    } else if (args.requestType === 'searching') {
      setSearch(args.searchString)
      setPage(1)
    } else if (args.requestType === 'sorting') {
      if (args.columns.length > 0) {
        const column = args.columns[0]
        setSortString(`${column.field},${column.direction}`)
      } else {
        setSortString(null)
      }
    }
  }

  const handleRowDataBound = (args: any) => {
    if (onRowDoubleClick) {
      args.row.addEventListener('dblclick', () => {
        onRowDoubleClick(args.data)
      })
    }
  }

  const handleCreated = () => {
    const input = gridRef.current?.element.querySelector<HTMLInputElement>('.e-toolbar .e-search input')
    if (input) input.placeholder = searchPlaceholder
  }

  return (
    <div className="control-pane">
      {toolbarExtra && (
        <div style={{ marginBottom: 16 }}>
          {toolbarExtra}
        </div>
      )}
      <GridComponent
        ref={gridRef}
        dataSource={data}
        columns={columns}
        allowPaging={allowPaging}
        allowSorting={allowSorting}
        allowFiltering={allowFiltering}
        allowGrouping={allowGrouping}
        pageSettings={pageSettings}
        filterSettings={filterSettings}
        sortSettings={sortSettings}
        groupSettings={groupSettings}
        searchSettings={searchSettings}
        toolbar={toolbar}
        showColumnChooser={true}
        allowExcelExport={true}
        allowPdfExport={true}
        actionBegin={handleActionBegin}
        actionComplete={handleActionComplete}
        rowDataBound={handleRowDataBound}
        created={handleCreated}
        loadingIndicator={{ indicatorType: 'Shimmer' }}
        locale="vi-VN"
      >
        <Inject services={[Page, Sort, Filter, Toolbar, Search, ColumnChooser, ExcelExport, PdfExport, Group]} />
      </GridComponent>
    </div>
  )
}