import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise: Promise<string> | null = null

// Request interceptor — attach token & normalize URL
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.url && !config.url.startsWith('/api') && !config.url.startsWith('http')) {
    config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`
  }
  return config
})

// Response interceptor — refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')
        refreshPromise ??= axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken })
          .then(({ data }) => {
            const token = data.data.accessToken as string
            localStorage.setItem('accessToken', token)
            if (data.data.refreshToken) localStorage.setItem('refreshToken', data.data.refreshToken)
            return token
          })
          .finally(() => { refreshPromise = null })
        const newToken = await refreshPromise
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        const user = localStorage.getItem('user')
        let loginPath = '/admin/login'
        try {
          if (user && JSON.parse(user).role === 'customer') loginPath = '/customer/login'
        } catch { /* Fall back to admin login when cached user data is invalid. */ }
        ;['accessToken', 'refreshToken', 'user', 'dairy'].forEach((key) => localStorage.removeItem(key))
        if (window.location.pathname !== loginPath) window.location.href = loginPath
      }
    }
    return Promise.reject(error)
  }
)

export { api }
export default api
