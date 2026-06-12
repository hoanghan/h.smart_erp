import { useQuery } from '@tanstack/react-query'
import { TreeSelect } from 'antd'
import { apiClient } from '../../api/client'
import type { AccountOut, BusinessOperationOut, CashFundOut, FiscalPeriodOut, ObjectCategoryOut } from '../../api/types'

interface AccountTreeNode {
  value: number
  title: string
  children: AccountTreeNode[]
}

/** Toàn bộ hệ thống tài khoản — danh sách phẳng, cache lâu vì ít thay đổi. */
export function useAccounts() {
  return useQuery({
    queryKey: ['finance-accounts'],
    queryFn: async () => (await apiClient.get<AccountOut[]>('/finance/accounts')).data,
    staleTime: 60 * 1000,
  })
}

export function useCashFunds() {
  return useQuery({
    queryKey: ['finance-cash-funds'],
    queryFn: async () => (await apiClient.get<CashFundOut[]>('/finance/cash-funds')).data,
    staleTime: 60 * 1000,
  })
}

export function useObjectCategories() {
  return useQuery({
    queryKey: ['finance-object-categories'],
    queryFn: async () => (await apiClient.get<ObjectCategoryOut[]>('/finance/object-categories')).data,
    staleTime: 60 * 1000,
  })
}

export function useBusinessOperations() {
  return useQuery({
    queryKey: ['finance-business-operations'],
    queryFn: async () => (await apiClient.get<BusinessOperationOut[]>('/finance/business-operations')).data,
    staleTime: 60 * 1000,
  })
}

export function useFiscalPeriods(year?: number) {
  return useQuery({
    queryKey: ['finance-fiscal-periods', year],
    queryFn: async () =>
      (await apiClient.get<FiscalPeriodOut[]>('/finance/fiscal-periods', { params: { year } })).data,
    staleTime: 30 * 1000,
  })
}

/** Xây cây TreeSelect (AntD) từ danh sách tài khoản phẳng theo parentId. */
export function buildAccountTree(accounts: AccountOut[]): AccountTreeNode[] {
  const byParent = new Map<number | null, AccountOut[]>()
  for (const a of accounts) {
    const key = a.parentId ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(a)
  }
  const build = (parentId: number | null): AccountTreeNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((a) => ({
        value: a.id,
        title: `${a.code} — ${a.name}`,
        children: build(a.id),
      }))
  return build(null)
}

interface AccountTreeSelectProps {
  value?: number | null
  onChange?: (value: number | null) => void
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  /** Loại bỏ một id (và cây con) khỏi lựa chọn — dùng khi chọn TK cha để tránh chọn chính nó. */
  excludeId?: number
}

function removeSubtree(tree: AccountTreeNode[], excludeId?: number): AccountTreeNode[] {
  if (excludeId === undefined) return tree
  return tree
    .filter((node) => node.value !== excludeId)
    .map((node) => ({ ...node, children: removeSubtree(node.children ?? [], excludeId) }))
}

/** TreeSelect chọn tài khoản theo cây — dùng cho TK cha (Danh mục TK) và TK Nợ/Có (Chứng từ). */
export function AccountTreeSelect({ value, onChange, placeholder, allowClear = true, disabled, excludeId }: AccountTreeSelectProps) {
  const { data: accounts, isLoading } = useAccounts()
  const treeData = removeSubtree(buildAccountTree(accounts ?? []), excludeId)

  return (
    <TreeSelect
      value={value ?? undefined}
      onChange={(v) => onChange?.(v === undefined ? null : (v as number))}
      treeData={treeData}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      loading={isLoading}
      showSearch
      treeNodeFilterProp="title"
      treeDefaultExpandAll
      style={{ width: '100%' }}
    />
  )
}

/** Hiển thị "code — tên" cho một accountId, dùng trong bảng (tra từ danh sách đã cache). */
export function AccountLabel({ id }: { id: number | null | undefined }) {
  const { data: accounts } = useAccounts()
  if (id === null || id === undefined) return null
  const a = accounts?.find((x) => x.id === id)
  if (!a) return <span>#{id}</span>
  return <span>{a.code} — {a.name}</span>
}
