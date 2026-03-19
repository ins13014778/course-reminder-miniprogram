export function resolveCloudFileUrl(fileId?: string) {
  if (!fileId) return ''

  const value = String(fileId).trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value

  const match = value.match(/^cloud:\/\/([^./]+)\.([^/]+)\/(.+)$/)
  if (!match) return value

  const [, , bucket, filePath] = match
  return `https://${bucket}.tcb.qcloud.la/${filePath}`
}
