export const baseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api'

export async function api(path, options = {}) {
  let response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch (cause) {
    // A cancelled request must stay recognisable: pages ignore it instead of showing an error.
    if (cause?.name === 'AbortError' || options.signal?.aborted) throw cause
    throw new Error('Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.', { cause })
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && localStorage.getItem('authSessionActive') === 'true' && path !== '/auth/login') {
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
    }
    const error = new Error(body.message || 'Không thể kết nối tới máy chủ')
    error.status = response.status
    throw error
  }
  return body
}
