import { useState, useEffect } from 'react'
import {
  getAllProblems, createProblem,
  addTestCases, deleteProblem, deleteTestCase
} from '../api/client'

const EMPTY_FORM = {
  title: '',
  description: '',
  difficulty: 'EASY',
  timeLimitMs: 2000,
  testCases: [{ input: '', expectedOutput: '', orderIndex: 1 }],
}

const EMPTY_TC = { input: '', expectedOutput: '', orderIndex: 1 }

export default function AdminPage() {
  const [problems,  setProblems]  = useState([])
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [flash,     setFlash]     = useState(null)
  const [expanded,  setExpanded]  = useState(null)
  // Per-problem "add test case" form state
  const [addTcMap,  setAddTcMap]  = useState({})   // { problemId: [tc, ...] }
  const [addTcOpen, setAddTcOpen] = useState({})   // { problemId: bool }

  const reload = () =>
    getAllProblems().then(r => setProblems(r.data)).catch(() => {})

  useEffect(() => { reload() }, [])

  const notify = (text, type = 'success') => {
    setFlash({ text, type })
    setTimeout(() => setFlash(null), 3500)
  }

  // ─── Create problem ───────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createProblem(form)
      notify(`✅ Problem "${form.title}" created!`)
      setForm(EMPTY_FORM)
      reload()
    } catch (err) {
      notify(err.response?.data?.error || 'Create failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete problem ───────────────────────────────────────────────
  const handleDeleteProblem = async (pid, title, testCases) => {
    if (!confirm(`Delete "${title}"?\n\nThis will first delete all ${testCases?.length || 0} test cases, then the problem.`)) return
    try {
      // Delete all test cases first to avoid FK constraint
      if (testCases?.length) {
        await Promise.all(testCases.map(tc => deleteTestCase(tc.id)))
      }
      await deleteProblem(pid)
      notify('Problem deleted.')
      if (expanded === pid) setExpanded(null)
      reload()
    } catch (err) {
      notify(err.response?.data?.error || 'Delete failed', 'error')
    }
  }

  // ─── Delete test case ─────────────────────────────────────────────
  const handleDeleteTc = async (tcId) => {
    if (!confirm('Delete this test case?')) return
    try {
      await deleteTestCase(tcId)
      notify('Test case deleted.')
      reload()
    } catch {
      notify('Delete failed', 'error')
    }
  }

  // ─── Add test cases to existing problem ──────────────────────────
  const openAddTc = (pid, existingCount) => {
    setAddTcOpen(p => ({ ...p, [pid]: true }))
    if (!addTcMap[pid]) {
      setAddTcMap(p => ({
        ...p,
        [pid]: [{ input: '', expectedOutput: '', orderIndex: existingCount + 1 }]
      }))
    }
  }

  const updateAddTc = (pid, idx, field, val) => {
    setAddTcMap(p => ({
      ...p,
      [pid]: p[pid].map((tc, i) => i === idx ? { ...tc, [field]: val } : tc)
    }))
  }

  const appendAddTc = (pid, existingCount) => {
    setAddTcMap(p => ({
      ...p,
      [pid]: [...(p[pid] || []), {
        input: '', expectedOutput: '',
        orderIndex: existingCount + (p[pid]?.length || 0) + 1
      }]
    }))
  }

  const removeAddTc = (pid, idx) => {
    setAddTcMap(p => ({
      ...p,
      [pid]: p[pid].filter((_, i) => i !== idx)
    }))
  }

  const saveAddTc = async (pid) => {
    const tcs = addTcMap[pid] || []
    if (tcs.some(tc => !tc.input.trim() || !tc.expectedOutput.trim())) {
      notify('All test case fields are required', 'error')
      return
    }
    try {
      await addTestCases(pid, tcs)
      notify(`✅ ${tcs.length} test case(s) added!`)
      setAddTcOpen(p => ({ ...p, [pid]: false }))
      setAddTcMap(p => ({ ...p, [pid]: null }))
      reload()
    } catch {
      notify('Failed to add test cases', 'error')
    }
  }

  // ─── Form helpers ─────────────────────────────────────────────────
  const setTc = (idx, field, val) =>
    setForm(f => ({
      ...f,
      testCases: f.testCases.map((tc, i) => i === idx ? { ...tc, [field]: val } : tc)
    }))

  const addTcRow = () =>
    setForm(f => ({
      ...f,
      testCases: [...f.testCases, { input: '', expectedOutput: '', orderIndex: f.testCases.length + 1 }]
    }))

  const removeTcRow = (idx) =>
    setForm(f => ({
      ...f,
      testCases: f.testCases.filter((_, i) => i !== idx).map((tc, i) => ({ ...tc, orderIndex: i + 1 }))
    }))

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p className="admin-sub">Manage problems and test cases for WeCode</p>
      </div>

      {flash && (
        <div className={`flash ${flash.type}`}>{flash.text}</div>
      )}

      {/* ─── Create Problem ─── */}
      <section className="admin-card">
        <h2>Create New Problem</h2>
        <form onSubmit={handleCreate} className="create-form">

          <div className="form-grid-3">
            <div className="fg">
              <label>Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Two Sum"
                required
              />
            </div>
            <div className="fg">
              <label>Difficulty *</label>
              <select
                value={form.difficulty}
                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
              >
                <option>EASY</option>
                <option>MEDIUM</option>
                <option>HARD</option>
              </select>
            </div>
            <div className="fg">
              <label>Time Limit (ms)</label>
              <input
                type="number" min="500" max="10000"
                value={form.timeLimitMs}
                onChange={e => setForm(f => ({ ...f, timeLimitMs: +e.target.value }))}
              />
            </div>
          </div>

          <div className="fg">
            <label>Description *</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the problem..."
              required
            />
          </div>

          {/* Test cases */}
          <div className="tc-section">
            <div className="tc-section-header">
              <span>Test Cases *</span>
              <button type="button" className="btn-ghost" onClick={addTcRow}>
                + Add Row
              </button>
            </div>

            {form.testCases.map((tc, idx) => (
              <div key={idx} className="tc-row">
                <div className="tc-row-num">{idx + 1}</div>
                <div className="fg">
                  <label>Input</label>
                  <textarea
                    rows={2}
                    value={tc.input}
                    onChange={e => setTc(idx, 'input', e.target.value)}
                    placeholder="4&#10;2 7 11 15&#10;9"
                    required
                  />
                </div>
                <div className="fg">
                  <label>Expected Output</label>
                  <textarea
                    rows={2}
                    value={tc.expectedOutput}
                    onChange={e => setTc(idx, 'expectedOutput', e.target.value)}
                    placeholder="0 1"
                    required
                  />
                </div>
                {form.testCases.length > 1 && (
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeTcRow(idx)}
                    title="Remove"
                  >✕</button>
                )}
              </div>
            ))}
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Problem'}
          </button>
        </form>
      </section>

      {/* ─── Existing Problems ─── */}
      <section className="admin-card">
        <h2>Problems ({problems.length})</h2>

        {problems.length === 0 && (
          <div className="empty-admin">No problems yet. Create one above.</div>
        )}

        <div className="problem-list-admin">
          {problems.map(p => (
            <div key={p.id} className="prob-admin-item">

              {/* Header row */}
              <div className="prob-admin-header">
                <div className="prob-admin-left">
                  <span className={`diff-badge ${p.difficulty?.toLowerCase()}`}>
                    {p.difficulty}
                  </span>
                  <strong className="prob-admin-title">{p.title}</strong>
                  <span className="prob-admin-meta">
                    {p.testCaseCount} test cases · {p.timeLimitMs}ms
                  </span>
                </div>
                <div className="prob-admin-actions">
                  <button
                    className="btn-ghost small"
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  >
                    {expanded === p.id ? '▲ Collapse' : '▼ Expand'}
                  </button>
                  <button
                    className="btn-danger small"
                    onClick={() => handleDeleteProblem(p.id, p.title, p.testCases)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Expanded body */}
              {expanded === p.id && (
                <div className="prob-admin-body">
                  <p className="prob-desc-text">{p.description}</p>

                  {/* Existing test cases */}
                  <div className="tc-list-header">
                    <span>Test Cases</span>
                    <button
                      className="btn-ghost small"
                      onClick={() => openAddTc(p.id, p.testCases?.length || 0)}
                    >
                      + Add Test Cases
                    </button>
                  </div>

                  {p.testCases?.length === 0 && (
                    <p className="empty-admin small">No test cases.</p>
                  )}

                  {p.testCases?.map((tc, i) => (
                    <div key={tc.id} className="tc-view-row">
                      <div className="tc-view-num">#{i + 1}</div>
                      <div className="tc-view-io">
                        <div>
                          <div className="io-label-sm">Input</div>
                          <pre className="io-pre-sm">{tc.input}</pre>
                        </div>
                        <div>
                          <div className="io-label-sm">Expected Output</div>
                          <pre className="io-pre-sm">{tc.expectedOutput}</pre>
                        </div>
                      </div>
                      <button
                        className="btn-danger small"
                        onClick={() => handleDeleteTc(tc.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}

                  {/* Add test cases inline form */}
                  {addTcOpen[p.id] && (
                    <div className="add-tc-inline">
                      <div className="tc-section-header">
                        <span>New Test Cases</span>
                        <button
                          className="btn-ghost small"
                          onClick={() => appendAddTc(p.id, p.testCases?.length || 0)}
                        >
                          + Row
                        </button>
                      </div>

                      {(addTcMap[p.id] || []).map((tc, idx) => (
                        <div key={idx} className="tc-row">
                          <div className="tc-row-num">{(p.testCases?.length || 0) + idx + 1}</div>
                          <div className="fg">
                            <label>Input</label>
                            <textarea
                              rows={2}
                              value={tc.input}
                              onChange={e => updateAddTc(p.id, idx, 'input', e.target.value)}
                              placeholder="input..."
                            />
                          </div>
                          <div className="fg">
                            <label>Expected Output</label>
                            <textarea
                              rows={2}
                              value={tc.expectedOutput}
                              onChange={e => updateAddTc(p.id, idx, 'expectedOutput', e.target.value)}
                              placeholder="output..."
                            />
                          </div>
                          {(addTcMap[p.id] || []).length > 1 && (
                            <button
                              className="btn-remove"
                              onClick={() => removeAddTc(p.id, idx)}
                            >✕</button>
                          )}
                        </div>
                      ))}

                      <div className="add-tc-actions">
                        <button
                          className="btn-primary small"
                          onClick={() => saveAddTc(p.id)}
                        >
                          Save Test Cases
                        </button>
                        <button
                          className="btn-ghost small"
                          onClick={() => setAddTcOpen(prev => ({ ...prev, [p.id]: false }))}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
