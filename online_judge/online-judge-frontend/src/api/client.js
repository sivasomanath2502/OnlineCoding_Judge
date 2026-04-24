import axios from 'axios'

// Empty string = same origin (nginx proxies /submissions/, /results/, /admin/ to gateway)
// In local dev set VITE_API_URL=http://localhost:8090 in .env.local
const GATEWAY = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: GATEWAY,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,  // increased from 10s — some endpoints are slower
})

// ─── Problems (Admin) ─────────────────────────────────────────────
export const getAllProblems = ()       => api.get('/admin/problems')
export const getProblem     = (id)    => api.get(`/admin/problems/${id}`)
export const createProblem  = (data)  => api.post('/admin/problems', data)
export const deleteProblem  = (id)    => api.delete(`/admin/problems/${id}`)

// ─── Test Cases ───────────────────────────────────────────────────
export const addTestCases   = (pid, d) => api.post(`/admin/problems/${pid}/test-cases`, d)
export const deleteTestCase = (id)     => api.delete(`/admin/test-cases/${id}`)

// ─── Submissions ──────────────────────────────────────────────────
export const submitCode = (data) => api.post('/submissions', data)
export const getResult  = (id)   => api.get(`/results/${id}`)

// ─── SSE stream URL ───────────────────────────────────────────────
// Must be absolute for EventSource — in production GATEWAY is empty
// so we build the full URL from window.location
export const getStreamUrl = (id) => {
  const base = import.meta.env.VITE_API_URL || window.location.origin
  return `${base}/results/${id}/stream`
}