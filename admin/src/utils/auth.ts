const TOKEN_KEY = 'admin_token'
const PROFILE_KEY = 'admin_profile'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getAdminProfile() {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setAdminProfile(profile: any) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile || {}))
}

export function clearAdminProfile() {
  localStorage.removeItem(PROFILE_KEY)
}

export function clearAdminSession() {
  clearToken()
  clearAdminProfile()
  localStorage.removeItem('token')
}

export function hasAdminRole(roles?: string[]) {
  if (!roles || !roles.length) return true
  const profile = getAdminProfile()
  const role = profile?.role
  return !!role && roles.includes(role)
}

export function getAdminPermissions() {
  const profile = getAdminProfile()
  return Array.isArray(profile?.permissions) ? profile.permissions : []
}

export function hasAdminPermission(permissions?: string[]) {
  if (!permissions || !permissions.length) return true
  const profile = getAdminProfile()
  if (profile?.role === 'super_admin') return true
  const current = getAdminPermissions()
  return permissions.every((permission) => current.includes(permission))
}
