// src/api/client.js
import axios from 'axios'

// ─── Gateway URL from environment ────────────────────────────────
// In dev: reads from .env.local (VITE_ prefix required by Vite)
// In Docker build: reads from .env.docker passed at build time
// Falls back to localhost:8090 if not set
const GATEWAY = ''

export const api = axios.create({
  baseURL: GATEWAY,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ─── Request interceptor — add correlation ID ─────────────────────
api.interceptors.request.use((config) => {
  config.headers['X-Request-Id'] = crypto.randomUUID()
  return config
})

// ─── Response interceptor — global error handling ────────────────
api.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 429) {
        console.warn('Rate limit hit — slow down requests')
      }
      return Promise.reject(error)
    }
)

// ─── Problems (Admin) ─────────────────────────────────────────────
export const getAllProblems = ()        => api.get('/admin/problems')
export const getProblem    = (id)      => api.get(`/admin/problems/${id}`)
export const createProblem = (data)    => api.post('/admin/problems', data)
export const deleteProblem = (id)      => api.delete(`/admin/problems/${id}`)

// ─── Test Cases ───────────────────────────────────────────────────
export const addTestCases  = (pid, d)  => api.post(`/admin/problems/${pid}/test-cases`, d)
export const deleteTestCase = (id)     => api.delete(`/admin/test-cases/${id}`)

// ─── Submissions ──────────────────────────────────────────────────
export const submitCode    = (data)    => api.post('/submissions', data)
export const getResult     = (id)      => api.get(`/results/${id}`)

// ─── SSE stream URL ───────────────────────────────────────────────
// SSE uses EventSource which doesn't go through axios
// Must be the direct gateway URL accessible from the browser
export const getStreamUrl  = (id)      => `${GATEWAY}/results/${id}/stream`