import axios from 'axios'

// Direct gateway URL — frontend calls gateway directly from browser
// Change this IP to your server's actual IP
const GATEWAY = 'http://100.128.165.74:8090'  // ← replace with your actual IP

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
export const getStreamUrl = (id) => `${GATEWAY}/results/${id}/stream`