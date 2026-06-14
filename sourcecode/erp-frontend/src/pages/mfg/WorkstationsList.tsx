import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DialogComponent } from '@syncfusion/ej2-react-popups'
import { ButtonComponent } from '@syncfusion/ej2-react-buttons'
import { TextBoxComponent, NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs'
import { apiClient } from '../../api/client'
import { DialogUtility } from '@syncfusion/ej2-react-popups'
import DataTable from '../../components/DataTable'

interface Workstation {
  id: number
  name: string
  hourly_cost: number
  working_hours_per_day: number
  description?: string
  cost_center_id?: number
  is_active: boolean
}

export default function WorkstationsList() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Workstation>) => {
      return apiClient.post('/mfg/workstations', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstations'] })
      alert('Đã tạo trạm sản xuất thành công')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Workstation> }) => {
      return apiClient.put(`/mfg/workstations/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstations'] })
      alert('Đã cập nhật trạm sản xuất thành công')
    },
  })

  const handleEdit = (data: Workstation) => {
    showDialog(data)
  }

  const handleDelete = async (data: Workstation) => {
    const result = await DialogUtility.confirm({
      title: 'Xác nhận',
      content: `Bạn có chắc muốn xóa trạm sản xuất "${data.name}"?`,
      okButton: { text: 'Xóa', cssClass: 'e-danger' },
      cancelButton: { text: 'Hủy', cssClass: 'e-flat' },
    })
    if (result) {
      apiClient.delete(`/mfg/workstations/${data.id}`).then(() => {
        queryClient.invalidateQueries({ queryKey: ['workstations'] })
      })
    }
  }

  const [dialogVisible, setDialogVisible] = useState(false)
  const [editingData, setEditingData] = useState<Workstation | null>(null)
  const [formData, setFormData] = useState<Partial<Workstation>>({
    name: '',
    hourly_cost: 0,
    working_hours_per_day: 8,
    description: '',
    is_active: true,
  })

  const showDialog = (data?: Workstation) => {
    if (data) {
      setEditingData(data)
      setFormData(data)
    } else {
      setEditingData(null)
      setFormData({
        name: '',
        hourly_cost: 0,
        working_hours_per_day: 8,
        description: '',
        is_active: true,
      })
    }
    setDialogVisible(true)
  }

  const hideDialog = () => {
    setDialogVisible(false)
    setEditingData(null)
  }

  const handleSubmit = () => {
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
    hideDialog()
  }

  const columns = [
    { field: 'id', headerText: 'ID', width: 80, isPrimaryKey: true },
    { field: 'name', headerText: 'Tên trạm', width: 150 },
    { field: 'hourly_cost', headerText: 'Chi phí giờ', width: 120, format: 'N2' },
    { field: 'working_hours_per_day', headerText: 'Giờ/ngày', width: 100 },
    { field: 'description', headerText: 'Mô tả', width: 200 },
    {
      field: 'is_active',
      headerText: 'Trạng thái',
      width: 100,
      template: (data: Workstation) => (
        <span style={{ color: data.is_active ? 'green' : 'red' }}>
          {data.is_active ? 'Hoạt động' : 'Ngưng'}
        </span>
      ),
    },
    {
      field: 'id',
      headerText: 'Hành động',
      width: 140,
      template: (data: Workstation) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <ButtonComponent cssClass="e-small" onClick={() => handleEdit(data)}>
            Sửa
          </ButtonComponent>
          <ButtonComponent cssClass="e-small e-danger" onClick={() => handleDelete(data)}>
            Xóa
          </ButtonComponent>
        </div>
      ),
    },
  ]

  return (
    <div>
      <h2>Trạm sản xuất</h2>
      <ButtonComponent
        cssClass="e-primary"
        style={{ marginBottom: 16 }}
        onClick={() => showDialog()}
      >
        Thêm trạm mới
      </ButtonComponent>
      <DataTable
        queryKey="workstations"
        endpoint="/mfg/workstations"
        columns={columns}
        onRowDoubleClick={handleEdit}
      />

      <DialogComponent
        header={editingData ? 'Sửa trạm sản xuất' : 'Thêm trạm sản xuất'}
        visible={dialogVisible}
        isModal={true}
        showCloseIcon={true}
        target="#root"
        width="500px"
        close={hideDialog}
        footerTemplate={() => (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <ButtonComponent cssClass="e-flat" onClick={hideDialog}>
              Hủy
            </ButtonComponent>
            <ButtonComponent
              cssClass="e-primary"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingData ? 'Cập nhật' : 'Tạo mới'}
            </ButtonComponent>
          </div>
        )}
      >
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Tên trạm <span style={{ color: 'red' }}>*</span>
            </label>
            <TextBoxComponent
              placeholder="Nhập tên trạm"
              value={formData.name}
              change={(e) => setFormData({ ...formData, name: e.value })}
              floatLabelType="Never"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Chi phí giờ (VNĐ) <span style={{ color: 'red' }}>*</span>
            </label>
            <NumericTextBoxComponent
              placeholder="Nhập chi phí giờ"
              value={formData.hourly_cost}
              format="N0"
              change={(e) => setFormData({ ...formData, hourly_cost: e.value })}
              floatLabelType="Never"
              min={0}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Giờ làm việc/ngày <span style={{ color: 'red' }}>*</span>
            </label>
            <NumericTextBoxComponent
              placeholder="Nhập giờ làm việc/ngày"
              value={formData.working_hours_per_day}
              format="N0"
              change={(e) => setFormData({ ...formData, working_hours_per_day: e.value })}
              floatLabelType="Never"
              min={1}
              max={24}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Mô tả
            </label>
            <TextBoxComponent
              placeholder="Nhập mô tả"
              value={formData.description}
              change={(e) => setFormData({ ...formData, description: e.value })}
              floatLabelType="Never"
              multiline={true}
            />
          </div>
        </div>
      </DialogComponent>
    </div>
  )
}