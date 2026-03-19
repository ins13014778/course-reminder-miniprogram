import axios from 'axios'
import router from '../router'
import { clearAdminSession, getToken } from './auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
})

request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAdminSession()
      const currentPath = router.currentRoute.value.fullPath
      if (currentPath !== '/login') {
        router.replace({
          path: '/login',
          query: currentPath ? { redirect: currentPath } : undefined,
        })
      }
    }

    return Promise.reject(error)
  },
)

export default request
