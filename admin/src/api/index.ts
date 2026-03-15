import request from '../utils/request'

export const userApi = {
  getList: () => request.get('/admin/users'),
}

export const courseApi = {
  getList: () => request.get('/admin/courses'),
  delete: (id: number) => request.delete(`/admin/courses/${id}`),
}

export const importApi = {
  getList: () => request.get('/admin/import-tasks'),
}

export const reminderApi = {
  getList: () => request.get('/admin/reminders'),
}
