import axios from 'axios'

// Always use relative URLs — nginx proxies /submissions/, /results/, /admin/, /worker/
// to api-gateway:8090 in both Docker and local dev (when using nginx locally)
// For local dev WITHOUT Docker, set VITE_API_URL=http://localhost:8090 in .env.local
const GATEWAY = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: GATEWAY,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ─── Problems (Admin) ─────────────────────────────────────────────
export const getAllProblems = ()        => api.get('/admin/problems')
export const getProblem     = (id)     => api.get(`/admin/problems/${id}`)
export const createProblem  = (data)   => api.post('/admin/problems', data)
export const deleteProblem  = (id)     => api.delete(`/admin/problems/${id}`)

// ─── Test Cases ───────────────────────────────────────────────────
export const addTestCases   = (pid, d) => api.post(`/admin/problems/${pid}/test-cases`, d)
export const deleteTestCase = (id)     => api.delete(`/admin/test-cases/${id}`)

// ─── Submissions ──────────────────────────────────────────────────
export const submitCode = (data) => api.post('/submissions', data)
export const getResult  = (id)   => api.get(`/results/${id}`)

// ─── SSE stream URL ───────────────────────────────────────────────
// EventSource needs absolute URL — derive from current window origin
// In Docker: window.location.origin = http://your-server-ip:3000
// nginx then proxies /results/... to api-gateway
export const getStreamUrl = (id) => {
  const origin = import.meta.env.VITE_API_URL || window.location.origin
  return `${origin}/results/${id}/stream`
}