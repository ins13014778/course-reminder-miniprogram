import request from '../utils/request'

export const overviewApi = {
  get: () => request.get('/admin/overview'),
}

export const userApi = {
  getList: (params?: any) => request.get('/admin/users', { params }),
  getDetail: (id: number) => request.get(`/admin/users/${id}/detail`),
  updatePermissions: (id: number, data: any) => request.patch(`/admin/users/${id}/permissions`, data),
}

export const courseApi = {
  getList: (params?: any) => request.get('/admin/courses', { params }),
  delete: (id: number) => request.delete(`/admin/courses/${id}`),
}

export const templateApi = {
  getList: (params?: any) => request.get('/admin/template-courses', { params }),
}

export const shareApi = {
  getList: () => request.get('/admin/share-keys'),
  updateStatus: (id: number, data: any) => request.patch(`/admin/share-keys/${id}/status`, data),
}

export const subscriptionApi = {
  getList: () => request.get('/admin/subscriptions'),
}

export const noteApi = {
  getList: (params?: any) => request.get('/admin/notes', { params }),
  moderate: (id: number, data: any) => request.patch(`/admin/notes/${id}/moderation`, data),
}

export const announcementApi = {
  getList: (params?: any) => request.get('/admin/announcements', { params }),
  getCurrent: () => request.get('/admin/announcements/current'),
  saveCurrent: (data: any) => request.put('/admin/announcements/current', data),
  create: (data: any) => request.post('/admin/announcements', data),
  update: (id: number, data: any) => request.put(`/admin/announcements/${id}`, data),
  delete: (id: number) => request.delete(`/admin/announcements/${id}`),
}
