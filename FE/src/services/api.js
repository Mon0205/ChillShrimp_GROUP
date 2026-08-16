const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || 'Không thể kết nối tới máy chủ')
  return body
}
