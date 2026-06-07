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

let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  res => res,
  async error => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `http://127.0.0.1:${apiPort}/api/auth/refresh`,
          { refreshToken: refresh }
        );
        
        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        
        processQueue(null, newToken);
        
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
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
