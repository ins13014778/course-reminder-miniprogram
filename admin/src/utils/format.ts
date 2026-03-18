export function formatDateTime(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatShortDate(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const pad = (num: number) => String(num).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function weekdayLabel(value?: number | string | null) {
  const labels = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return labels[Number(value || 0)] || '-'
}

export function sectionLabel(start?: number | string | null, end?: number | string | null) {
  return `第 ${start || '-'}-${end || '-'} 节`
}

export function boolLabel(value: unknown, truthy = '是', falsy = '否') {
  return value ? truthy : falsy
}

export function permissionLabel(status?: string | null) {
  return status === 'banned' ? '已封禁' : '正常'
}

export function trimText(value: string | null | undefined, maxLength = 80) {
  const text = String(value || '').trim()
  if (!text) return '-'
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}
