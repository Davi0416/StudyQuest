import axios, { type AxiosResponse } from 'axios'

const urlParams = new URLSearchParams(window.location.search)
const portFromUrl = urlParams.get('apiPort')
if (portFromUrl) sessionStorage.setItem('apiPort', portFromUrl)
const apiPort = sessionStorage.getItem('apiPort') || '8080'
const api = axios.create({ baseURL: `http://127.0.0.1:${apiPort}/api` })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async error => {
    const isAuthEndpoint = error.config?.url?.includes('/auth/')
    if (error.response?.status === 401 && !error.config._retry && !isAuthEndpoint) {
      error.config._retry = true
      try {
        const refresh = localStorage.getItem('refreshToken')
        const { data } = await axios.post(
          `http://127.0.0.1:${apiPort}/api/auth/refresh?token=${refresh}`
        )
        localStorage.setItem('accessToken', data.data.accessToken)
        localStorage.setItem('refreshToken', data.data.refreshToken)
        error.config.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(error.config)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export interface ApiResponse<T> {
  success: boolean
  data: T
  error: string | null
  message: string | null
  timestamp: string
}

export function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  if (res.data && res.data.success !== false) {
    // some endpoints might just return the raw data object inside data, or wrapped based on the prompt
    // the prompt said: res.data.data
    return res.data.data
  }
  throw new Error(res.data?.message || 'API Error')
}

export default api
