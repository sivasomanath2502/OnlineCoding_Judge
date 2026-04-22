import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllProblems } from '../api/client'

const DIFF_ORDER = { EASY: 0, MEDIUM: 1, HARD: 2 }

export default function ProblemsPage() {
  const [problems, setProblems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [filter, setFilter]     = useState('ALL')
  const [search, setSearch]     = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getAllProblems()
      .then(r => setProblems(r.data))
      .catch(() => setError('Could not load problems. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  const displayed = problems
    .filter(p => filter === 'ALL' || p.difficulty === filter)
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()))

  const counts = {
    ALL:    problems.length,
    EASY:   problems.filter(p => p.difficulty === 'EASY').length,
    MEDIUM: problems.filter(p => p.difficulty === 'MEDIUM').length,
    HARD:   problems.filter(p => p.difficulty === 'HARD').length,
  }

  return (
    <div className="problems-page">
      {/* Hero */}
      <div className="problems-hero">
        <h1 className="hero-title">Practice. Code. <span className="accent">Improve.</span></h1>
        <p className="hero-sub">Solve algorithmic problems and sharpen your skills.</p>
      </div>

      {/* Controls */}
      <div className="problems-controls">
        <div className="filter-tabs">
          {['ALL', 'EASY', 'MEDIUM', 'HARD'].map(d => (
            <button
              key={d}
              className={`filter-btn diff-${d.toLowerCase()} ${filter === d ? 'active' : ''}`}
              onClick={() => setFilter(d)}
            >
              {d} <span className="count-badge">{counts[d]}</span>
            </button>
          ))}
        </div>
        <input
          className="search-input"
          placeholder="Search problems..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading && <div className="state-box"><div className="spinner" />Loading problems...</div>}
      {error   && <div className="state-box error">{error}</div>}

      {!loading && !error && (
        <div className="problems-table">
          <div className="table-head">
            <span>#</span>
            <span>Title</span>
            <span>Difficulty</span>
            <span>Time Limit</span>
            <span>Tests</span>
          </div>

          {displayed.length === 0 && (
            <div className="state-box">No problems match your filters.</div>
          )}

          {displayed.map((p, i) => (
            <div
              key={p.id}
              className="table-row"
              onClick={() => navigate(`/problems/${p.id}`)}
            >
              <span className="row-num">{i + 1}</span>
              <span className="row-title">{p.title}</span>
              <span>
                <span className={`diff-badge ${p.difficulty?.toLowerCase()}`}>
                  {p.difficulty}
                </span>
              </span>
              <span className="row-meta">{p.timeLimitMs}ms</span>
              <span className="row-meta">{p.testCaseCount} cases</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
