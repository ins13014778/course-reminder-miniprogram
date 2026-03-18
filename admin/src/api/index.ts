import request from '../utils/request'

export const overviewApi = {
  get: () => request.get('/admin/overview'),
}

export const userApi = {
  getList: (params?: any) => request.get('/admin/users', { params }),
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
}

export const subscriptionApi = {
  getList: () => request.get('/admin/subscriptions'),
}

export const noteApi = {
  getList: (params?: any) => request.get('/admin/notes', { params }),
}

export const announcementApi = {
  getCurrent: () => request.get('/admin/announcements/current'),
  saveCurrent: (data: any) => request.put('/admin/announcements/current', data),
}
