
import axios from 'axios'

export const BASE_URL = '';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
    const id = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
    config.headers['X-Request-Id'] = id
    
    const token = sessionStorage.getItem('wecode_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
        sessionStorage.removeItem('wecode_token');
        // Only redirect to log in if we are NOT on the homepage (public route)
        if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
    if (error.response?.status === 429) {
      console.warn('Rate limit hit — slow down requests')
    }
    return Promise.reject(error)
  }
)

export const getAllProblems  = ()        => api.get('/admin/problems')
export const getProblem      = (id)      => api.get(`/admin/problems/${id}`)
export const createProblem   = (data)    => api.post('/admin/problems', data)
export const deleteProblem   = (id)      => api.delete(`/admin/problems/${id}`)
export const addTestCases    = (pid, d)  => api.post(`/admin/problems/${pid}/test-cases`, d)
export const deleteTestCase  = (id)      => api.delete(`/admin/test-cases/${id}`)
export const submitCode      = (data)    => api.post('/submissions', data)
export const getResult       = (id)      => api.get(`/results/${id}`)
export const getStreamUrl    = (id)      => `${BASE_URL}/results/${id}/stream`
