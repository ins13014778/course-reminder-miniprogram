import request from '../utils/request'

export const authApi = {
  adminLogin: (data: { email: string; password: string }) => request.post('/admin/login', data),
  getProfile: () => request.get('/admin/profile'),
}

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

export const reminderLogApi = {
  getList: (params?: any) => request.get('/admin/reminder-logs', { params }),
}

export const noteApi = {
  getList: (params?: any) => request.get('/admin/notes', { params }),
  moderate: (id: number, data: any) => request.patch(`/admin/notes/${id}/moderation`, data),
}

export const noteShareApi = {
  getList: (params?: any) => request.get('/admin/note-shares', { params }),
  updateStatus: (id: number, data: any) => request.patch(`/admin/note-shares/${id}/status`, data),
}

export const reportApi = {
  getList: (params?: any) => request.get('/admin/reports', { params }),
  review: (id: number, data: any) => request.patch(`/admin/reports/${id}/review`, data),
}

export const appealApi = {
  getList: (params?: any) => request.get('/admin/appeals', { params }),
  review: (id: number, data: any) => request.patch(`/admin/appeals/${id}/review`, data),
}

export const feedbackApi = {
  getList: (params?: any) => request.get('/admin/feedback', { params }),
  review: (id: number, data: any) => request.patch(`/admin/feedback/${id}/review`, data),
}

export const auditLogApi = {
  getList: (params?: any) => request.get('/admin/audit-logs', { params }),
}

export const adminAccountApi = {
  getList: () => request.get('/admin/admin-accounts'),
  create: (data: any) => request.post('/admin/admin-accounts', data),
  update: (id: number, data: any) => request.patch(`/admin/admin-accounts/${id}`, data),
}

export const announcementApi = {
  getList: (params?: any) => request.get('/admin/announcements', { params }),
  getCurrent: () => request.get('/admin/announcements/current'),
  saveCurrent: (data: any) => request.put('/admin/announcements/current', data),
  create: (data: any) => request.post('/admin/announcements', data),
  update: (id: number, data: any) => request.put(`/admin/announcements/${id}`, data),
  delete: (id: number) => request.delete(`/admin/announcements/${id}`),
}

export const contentPageApi = {
  getList: () => request.get('/admin/content-pages'),
  getDetail: (key: string) => request.get(`/admin/content-pages/${key}`),
  saveDetail: (key: string, data: any) => request.patch(`/admin/content-pages/${key}`, data),
}
