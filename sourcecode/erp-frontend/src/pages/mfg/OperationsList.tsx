import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DialogComponent } from '@syncfusion/ej2-react-popups'
import { ButtonComponent } from '@syncfusion/ej2-react-buttons'
import { TextBoxComponent, NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs'
import { apiClient } from '../../api/client'
import { DialogUtility } from '@syncfusion/ej2-react-popups'
import DataTable from '../../components/DataTable'

interface Operation {
  id: number
  name: string
  default_workstation_id?: number
  default_workstation_name?: string
  standard_time_minutes: number
  description?: string
  is_active: boolean
}

export default function OperationsList() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Operation>) => {
      return apiClient.post('/mfg/operations', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] })
      alert('Đã tạo công đoạn thành công')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Operation> }) => {
      return apiClient.put(`/mfg/operations/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] })
      alert('Đã cập nhật công đoạn thành công')
    },
  })

  const handleEdit = (data: Operation) => {
    showDialog(data)
  }

  const handleDelete = async (data: Operation) => {
    const result = await DialogUtility.confirm({
      title: 'Xác nhận',
      content: `Bạn có chắc muốn xóa công đoạn "${data.name}"?`,
      okButton: { text: 'Xóa', cssClass: 'e-danger' },
      cancelButton: { text: 'Hủy', cssClass: 'e-flat' },
    })
    if (result) {
      apiClient.delete(`/mfg/operations/${data.id}`).then(() => {
        queryClient.invalidateQueries({ queryKey: ['operations'] })
      })
    }
  }

  const [dialogVisible, setDialogVisible] = useState(false)
  const [editingData, setEditingData] = useState<Operation | null>(null)
  const [formData, setFormData] = useState<Partial<Operation>>({
    name: '',
    standard_time_minutes: 0,
    description: '',
    is_active: true,
  })

  const showDialog = (data?: Operation) => {
    if (data) {
      setEditingData(data)
      setFormData(data)
    } else {
      setEditingData(null)
      setFormData({
        name: '',
        standard_time_minutes: 0,
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
    { field: 'name', headerText: 'Tên công đoạn', width: 150 },
    { field: 'default_workstation_name', headerText: 'Trạm mặc định', width: 150 },
    { 
      field: 'standard_time_minutes', 
      headerText: 'Thời gian chuẩn (phút)', 
      width: 150,
      format: 'N0' 
    },
    { field: 'description', headerText: 'Mô tả', width: 200 },
    {
      field: 'is_active',
      headerText: 'Trạng thái',
      width: 100,
      template: (data: Operation) => (
        <span style={{ color: data.is_active ? 'green' : 'red' }}>
          {data.is_active ? 'Hoạt động' : 'Ngưng'}
        </span>
      ),
    },
    {
      field: 'id',
      headerText: 'Hành động',
      width: 140,
      template: (data: Operation) => (
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
      <h2>Công đoạn</h2>
      <ButtonComponent
        cssClass="e-primary"
        style={{ marginBottom: 16 }}
        onClick={() => showDialog()}
      >
        Thêm công đoạn mới
      </ButtonComponent>
      <DataTable
        queryKey="operations"
        endpoint="/mfg/operations"
        columns={columns}
        onRowDoubleClick={handleEdit}
      />

      <DialogComponent
        header={editingData ? 'Sửa công đoạn' : 'Thêm công đoạn'}
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
              Tên công đoạn <span style={{ color: 'red' }}>*</span>
            </label>
            <TextBoxComponent
              placeholder="Nhập tên công đoạn"
              value={formData.name}
              change={(e) => setFormData({ ...formData, name: e.value })}
              floatLabelType="Never"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Thời gian chuẩn (phút) <span style={{ color: 'red' }}>*</span>
            </label>
            <NumericTextBoxComponent
              placeholder="Nhập thời gian chuẩn"
              value={formData.standard_time_minutes}
              format="N0"
              change={(e) => setFormData({ ...formData, standard_time_minutes: e.value })}
              floatLabelType="Never"
              min={0}
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