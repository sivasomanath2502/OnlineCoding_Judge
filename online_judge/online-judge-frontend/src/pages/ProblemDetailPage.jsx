import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProblem, submitCode, getResult, getStreamUrl } from '../api/client'
import CodeEditor from '../components/CodeEditor'
import VerdictDisplay from '../components/VerdictDisplay'

// ─── SVG Icons ────────────────────────────────────────────────────
const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)
const RunIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
)
const SubmitIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)
const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const FullscreenIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
)
const ExitFullscreenIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 0 2 2v3M16 21v-3a2 2 0 0 0 2-2h3" />
  </svg>
)
const HistoryIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const KeyboardIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <line x1="6" y1="10" x2="6.01" y2="10" strokeWidth="3" />
    <line x1="10" y1="10" x2="10.01" y2="10" strokeWidth="3" />
    <line x1="14" y1="10" x2="14.01" y2="10" strokeWidth="3" />
    <line x1="18" y1="10" x2="18.01" y2="10" strokeWidth="3" />
    <line x1="8" y1="14" x2="16" y2="14" />
  </svg>
)
const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ─── Constants ───────────────────────────────────────────────────
const LANGUAGES = [
  {
    id: 1, name: 'C++', monacoLang: 'cpp',
    defaultCode: `#include<iostream>\nusing namespace std;\n\nint main(){\n    // Write your solution here\n    return 0;\n}`,
  },
  {
    id: 2, name: 'Python', monacoLang: 'python',
    defaultCode: `import sys\ninput = sys.stdin.readline\n\ndef solve():\n    # Write your solution here\n    pass\n\nsolve()`,
  },
  {
    id: 3, name: 'Java', monacoLang: 'java',
    defaultCode: `import java.util.*;\n\npublic class solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}`,
  },
]

const PHASE = { IDLE: 'idle', COMPILING: 'compiling', RUNNING: 'running', DONE: 'done' }
const TAB = { TESTCASE: 'testcase', RESULT: 'result', HISTORY: 'history' }
const RUN_STATUS = { IDLE: 'idle', RUNNING: 'running', DONE: 'done', ERROR: 'error' }

const VERDICT_COLOR = {
  ACCEPTED: '#00b8a3',
  WRONG_ANSWER: '#ff375f',
  COMPILATION_ERROR: '#ff375f',
  RUNTIME_ERROR: '#f97316',
  TIME_LIMIT_EXCEEDED: '#ffb800',
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const codeKey = (pid, lid) => `wecode:code:${pid}:${lid}`
const histKey = (pid) => `wecode:history:${pid}`

// ─── Shortcuts Modal ─────────────────────────────────────────────
function ShortcutsModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rows = [
    ['Run code', 'Ctrl + `'],
    ['Submit solution', 'Ctrl + Enter'],
    ['Reset code', 'Ctrl + Shift + R'],
    ['Toggle fullscreen', 'Ctrl + Shift + F'],
    ['Copy code', 'Ctrl + Shift + C'],
    ['Show shortcuts', '?'],
  ]
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Keyboard Shortcuts</span>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="shortcut-list">
          {rows.map(([label, key]) => (
            <div key={label} className="shortcut-row">
              <span className="shortcut-label">{label}</span>
              <kbd className="shortcut-key">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── History Item ─────────────────────────────────────────────────
function HistoryItem({ item, onRestore }) {
  const col = VERDICT_COLOR[item.verdict] || '#a0a0a0'
  return (
    <div className="hist-item">
      <div className="hist-left">
        <span className="hist-dot" style={{ background: col }} />
        <span className="hist-verdict" style={{ color: col }}>
          {item.verdict?.replace(/_/g, ' ')}
        </span>
        <span className="hist-sep">·</span>
        <span className="hist-lang">{item.lang}</span>
        {item.executionMs != null && (
          <><span className="hist-sep">·</span><span className="hist-ms">{item.executionMs}ms</span></>
        )}
        {item.testCasesTotal > 0 && (
          <><span className="hist-sep">·</span><span className="hist-tc">{item.testCasesPassed}/{item.testCasesTotal} passed</span></>
        )}
      </div>
      <div className="hist-right">
        <span className="hist-time">{item.ts}</span>
        <button className="hist-load-btn" onClick={() => onRestore(item)}>Load</button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────
export default function ProblemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState(LANGUAGES[0])
  const [code, setCode] = useState(LANGUAGES[0].defaultCode)
  const [phase, setPhase] = useState(PHASE.IDLE)
  const [verdict, setVerdict] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [runStatus, setRunStatus] = useState(RUN_STATUS.IDLE)
  const [runResult, setRunResult] = useState(null)
  const [activeTab, setActiveTab] = useState(TAB.TESTCASE)
  const [customInput, setCustomInput] = useState('')
  const [fontSize, setFontSize] = useState(14)
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [history, setHistory] = useState([])

  const esRef = useRef(null)

  // Keep refs in sync so keyboard handlers always have fresh values
  const codeRef = useRef(code)
  const langRef = useRef(lang)
  const phaseRef = useRef(phase)
  const runStatusRef = useRef(runStatus)
  const fullscreenRef = useRef(fullscreen)

  useEffect(() => { codeRef.current = code }, [code])
  useEffect(() => { langRef.current = lang }, [lang])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { runStatusRef.current = runStatus }, [runStatus])
  useEffect(() => { fullscreenRef.current = fullscreen }, [fullscreen])

  // ─── Load ─────────────────────────────────────────────────────
  useEffect(() => {
    setProblem(null); setLoading(true)
    getProblem(id)
      .then(r => { setProblem(r.data); setCustomInput(r.data.testCases?.[0]?.input || '') })
      .catch(() => setProblem(null))
      .finally(() => setLoading(false))
    setHistory(JSON.parse(localStorage.getItem(histKey(id)) || '[]'))
    return () => esRef.current?.close()
  }, [id])

  // Restore persisted code when lang changes
  useEffect(() => {
    if (!id) return
    const saved = localStorage.getItem(codeKey(id, lang.id))
    setCode(saved ?? lang.defaultCode)
  }, [id, lang.id])

  // Persist code on every change
  useEffect(() => {
    if (id && code) localStorage.setItem(codeKey(id, lang.id), code)
  }, [code, id, lang.id])

  // ─── Helpers (stable refs) ────────────────────────────────────
  const doReset = useCallback(() => {
    const l = langRef.current
    setCode(l.defaultCode)
    localStorage.removeItem(codeKey(id, l.id))
    setVerdict(null); setRunResult(null)
    setRunStatus(RUN_STATUS.IDLE); setPhase(PHASE.IDLE); setStatusMsg('')
  }, [id])

  const doCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(codeRef.current) } catch { }
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }, [])

  const doToggleFullscreen = useCallback(() => {
    setFullscreen(f => !f)
  }, [])

  // ─── Keyboard shortcuts (single stable handler) ───────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      const inInput = tag === 'TEXTAREA' || tag === 'INPUT'

      // Escape exits fullscreen
      if (e.key === 'Escape') {
        if (fullscreenRef.current) { setFullscreen(false); return }
        setShowShortcuts(false); return
      }

      // ? opens shortcuts (not when typing)
      if (e.key === '?' && !inInput && !e.ctrlKey && !e.metaKey) {
        setShowShortcuts(s => !s); return
      }

      // Ctrl/Cmd combos — always intercept these
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === '`') {
        e.preventDefault()
        // Only run if not already busy
        if (phaseRef.current !== PHASE.COMPILING && phaseRef.current !== PHASE.RUNNING
          && runStatusRef.current !== RUN_STATUS.RUNNING) {
          // Trigger via DOM — avoids stale closure over handleRun
          document.getElementById('btn-run')?.click()
        }
        return
      }

      if (ctrl && e.key === 'Enter') {
        e.preventDefault()
        if (phaseRef.current !== PHASE.COMPILING && phaseRef.current !== PHASE.RUNNING) {
          document.getElementById('btn-submit')?.click()
        }
        return
      }

      if (ctrl && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        document.getElementById('btn-reset')?.click()
        return
      }

      if (ctrl && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        doToggleFullscreen()
        return
      }

      if (ctrl && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        doCopy()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doCopy, doToggleFullscreen]) // stable deps only

  // ─── Helpers ──────────────────────────────────────────────────
  const changeLang = (l) => {
    setLang(l); setVerdict(null); setRunResult(null)
    setRunStatus(RUN_STATUS.IDLE); setPhase(PHASE.IDLE); setStatusMsg('')
  }

  const addHistory = (item) => {
    const prev = JSON.parse(localStorage.getItem(histKey(id)) || '[]')
    const next = [item, ...prev].slice(0, 20)
    localStorage.setItem(histKey(id), JSON.stringify(next))
    setHistory(next)
  }

  const restoreFromHistory = (item) => {
    const l = LANGUAGES.find(l => l.name === item.lang) || lang
    setLang(l); setCode(item.code); setActiveTab(TAB.TESTCASE)
  }

  // ─── Run ──────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!code.trim()) return
    setRunStatus(RUN_STATUS.RUNNING); setRunResult(null); setActiveTab(TAB.TESTCASE)
    try {
      const res = await submitCode({ problemId: id, languageId: lang.id, userId: 'user-guest', code })
      await pollForRun(res.data.submissionId)
    } catch {
      setRunStatus(RUN_STATUS.ERROR)
      setRunResult({ output: 'Failed to submit. Is the backend running?', isError: true })
    }
  }

  const pollForRun = async (sid) => {
    for (let i = 0; i < 30; i++) {
      await sleep(1000)
      try {
        const r = await getResult(sid)
        if (r.data.status === 'COMPLETED' || r.data.status === 'FAILED') {
          const v = r.data
          const isOk = v.verdict === 'ACCEPTED'
          setRunResult({
            verdict: v.verdict, isError: !isOk,
            output: isOk
              ? `Passed ${v.testCasesTotal} test case(s) · ${v.executionMs}ms`
              : v.errorMessage || v.verdict?.replace(/_/g, ' '),
          })
          setRunStatus(RUN_STATUS.DONE); return
        }
      } catch { /* retry */ }
    }
    setRunResult({ output: 'Timed out.', isError: true }); setRunStatus(RUN_STATUS.ERROR)
  }

  // ─── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!code.trim()) return
    setPhase(PHASE.COMPILING); setVerdict(null)
    setStatusMsg('Submitting...'); setActiveTab(TAB.RESULT)
    try {
      const res = await submitCode({ problemId: id, languageId: lang.id, userId: 'user-guest', code })
      setStatusMsg('Judging...'); setPhase(PHASE.RUNNING)
      openSSE(res.data.submissionId)
    } catch {
      setStatusMsg('Submission failed.'); setPhase(PHASE.IDLE)
    }
  }

  const openSSE = (sid) => {
    esRef.current?.close()
    const es = new EventSource(getStreamUrl(sid))
    esRef.current = es
    const finish = (data) => {
      setVerdict(data); setStatusMsg(''); setPhase(PHASE.DONE); es.close()
      addHistory({
        id: sid, verdict: data.verdict, lang: lang.name, code,
        executionMs: data.executionMs, testCasesPassed: data.testCasesPassed,
        testCasesTotal: data.testCasesTotal,
        ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })
    }
    es.addEventListener('result', e => finish(JSON.parse(e.data)))
    es.addEventListener('verdict', e => finish(JSON.parse(e.data)))
    es.onerror = () => { es.close(); pollResult(sid) }
    setTimeout(() => { if (phaseRef.current !== PHASE.DONE) { es.close(); pollResult(sid) } }, 35000)
  }

  const pollResult = async (sid) => {
    for (let i = 0; i < 25; i++) {
      await sleep(1500)
      try {
        const r = await getResult(sid)
        if (r.data.status === 'COMPLETED' || r.data.status === 'FAILED') {
          setVerdict(r.data); setStatusMsg(''); setPhase(PHASE.DONE)
          addHistory({
            id: sid, verdict: r.data.verdict, lang: lang.name, code,
            executionMs: r.data.executionMs,
            ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })
          return
        }
      } catch { /* retry */ }
    }
    setStatusMsg('Timed out.'); setPhase(PHASE.IDLE)
  }

  const busy = phase === PHASE.COMPILING || phase === PHASE.RUNNING

  if (loading) return <div className="state-box"><div className="spinner" />Loading...</div>
  if (!problem) return (
    <div className="state-box error">
      Problem not found.{' '}
      <button className="link-btn" onClick={() => navigate('/')}>Go back</button>
    </div>
  )

  return (
    <>
      <div className={`detail-layout ${fullscreen ? 'detail-fullscreen' : ''}`}>

        {/* LEFT PANEL */}
        {!fullscreen && (
          <div className="desc-panel">
            <div className="desc-header">
              <button className="back-btn" onClick={() => navigate('/')}><BackIcon /> Back</button>
              <span className={`diff-badge ${problem.difficulty?.toLowerCase()}`}>{problem.difficulty}</span>
            </div>
            <h1 className="prob-title">{problem.title}</h1>
            <div className="prob-meta-row">
              <span className="meta-chip">⏱ {problem.timeLimitMs}ms</span>
              <span className="meta-chip">🧪 {problem.testCaseCount} tests</span>
            </div>
            <p className="prob-desc">{problem.description}</p>
            {problem.testCases?.slice(0, 2).map((tc, i) => (
              <div key={tc.id} className="sample-block">
                <div className="sample-label">Example {i + 1}</div>
                <div className="sample-io-grid">
                  <div><div className="io-header">Input</div><pre className="io-pre">{tc.input}</pre></div>
                  <div><div className="io-header">Output</div><pre className="io-pre">{tc.expectedOutput}</pre></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RIGHT PANEL */}
        <div className="editor-panel">

          {/* Toolbar */}
          <div className="editor-toolbar">
            <div className="toolbar-left">
              <div className="lang-pills">
                {LANGUAGES.map(l => (
                  <button key={l.id} className={`lang-pill ${lang.id === l.id ? 'active' : ''}`}
                    onClick={() => changeLang(l)} disabled={busy}>{l.name}</button>
                ))}
              </div>
              <div className="font-controls">
                <button className="btn-icon-sm" onClick={() => setFontSize(s => Math.max(11, s - 1))} title="Smaller font">
                  <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'monospace' }}>A</span>
                </button>
                <span className="font-size-val">{fontSize}</span>
                <button className="btn-icon-sm" onClick={() => setFontSize(s => Math.min(22, s + 1))} title="Larger font">
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace' }}>A</span>
                </button>
              </div>
            </div>

            <div className="action-btns">
              <button className="btn-icon" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)">
                <KeyboardIcon />
              </button>
              <button className="btn-icon" onClick={doCopy} title="Copy code (Ctrl+Shift+C)">
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
              <button className="btn-icon" onClick={doToggleFullscreen} title="Toggle fullscreen (Ctrl+Shift+F)">
                {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
              </button>
              <div className="toolbar-divider" />
              <button id="btn-reset" className="btn-icon" onClick={doReset} disabled={busy} title="Reset code (Ctrl+Shift+R)">
                <ResetIcon />
              </button>
              <button
                id="btn-run"
                className="btn-run-icon"
                onClick={handleRun}
                disabled={busy || runStatus === RUN_STATUS.RUNNING}
                title="Run (Ctrl+`)"
              >
                {runStatus === RUN_STATUS.RUNNING ? <span className="spinner small" /> : <RunIcon />}
              </button>
              <button
                id="btn-submit"
                className="btn-submit-icon"
                onClick={handleSubmit}
                disabled={busy}
                title="Submit (Ctrl+Enter)"
              >
                {busy ? <span className="spinner small" style={{ borderTopColor: '#1a1a1a' }} /> : <SubmitIcon />}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <CodeEditor language={lang.monacoLang} value={code} onChange={setCode} fontSize={fontSize} />

          {/* Bottom pane */}
          <div className="bottom-pane">
            <div className="pane-tabs">
              <button className={`pane-tab ${activeTab === TAB.TESTCASE ? 'active' : ''}`} onClick={() => setActiveTab(TAB.TESTCASE)}>
                Test Case
              </button>
              <button className={`pane-tab ${activeTab === TAB.RESULT ? 'active' : ''}`} onClick={() => setActiveTab(TAB.RESULT)}>
                Result
                {verdict && <span className={`tab-dot ${verdict.verdict === 'ACCEPTED' ? 'green' : 'red'}`} />}
              </button>
              <button className={`pane-tab ${activeTab === TAB.HISTORY ? 'active' : ''}`} onClick={() => setActiveTab(TAB.HISTORY)}>
                <HistoryIcon /> Submissions
                {history.length > 0 && <span className="tab-count">{history.length}</span>}
              </button>
            </div>

            {/* Test Case Tab */}
            {activeTab === TAB.TESTCASE && (
              <div className="testcase-pane">
                <div className="testcase-io">
                  <div className="testcase-section">
                    <div className="testcase-label">
                      <span>Input</span>
                      <div className="example-chips">
                        {problem.testCases?.slice(0, 3).map((tc, i) => (
                          <button key={tc.id} className="example-chip" onClick={() => setCustomInput(tc.input)}>
                            Case {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea className="testcase-textarea" placeholder="Enter custom input..."
                      value={customInput} onChange={e => setCustomInput(e.target.value)} spellCheck={false} />
                  </div>
                  <div className="testcase-section">
                    <div className="testcase-label">
                      <span>Output</span>
                      {runStatus === RUN_STATUS.RUNNING && (
                        <span className="run-status-indicator"><span className="spinner small" /> Running...</span>
                      )}
                    </div>
                    <div className="testcase-output">
                      {runStatus === RUN_STATUS.IDLE && <span className="placeholder-msg">Click ▶ to run your code</span>}
                      {runStatus === RUN_STATUS.RUNNING && <span className="placeholder-msg">Executing...</span>}
                      {(runStatus === RUN_STATUS.DONE || runStatus === RUN_STATUS.ERROR) && runResult && (
                        <div className="run-output">
                          {runResult.verdict && (
                            <span className="run-verdict-badge" style={{
                              color: VERDICT_COLOR[runResult.verdict] || 'var(--text-2)',
                              background: `${VERDICT_COLOR[runResult.verdict]}20`,
                            }}>
                              {runResult.isError ? '✗' : '✓'} {runResult.verdict.replace(/_/g, ' ')}
                            </span>
                          )}
                          <pre style={{ color: runResult.isError ? VERDICT_COLOR[runResult.verdict] || 'var(--red)' : 'var(--text-1)' }}>
                            {runResult.output}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Result Tab */}
            {activeTab === TAB.RESULT && (
              <div className="verdict-pane">
                {busy && (
                  <div className="judging-indicator">
                    <div className="judging-dots"><span /><span /><span /></div>
                    <span>{statusMsg}</span>
                  </div>
                )}
                {verdict && <VerdictDisplay verdict={verdict} />}
                {!verdict && !busy && (
                  <span className="placeholder-msg">Press Submit (Ctrl+Enter) to judge your solution.</span>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === TAB.HISTORY && (
              <div className="history-pane">
                {history.length === 0
                  ? <span className="placeholder-msg">No submissions yet for this problem.</span>
                  : <div className="hist-list">
                    {history.map((item, i) => (
                      <HistoryItem key={i} item={item} onRestore={restoreFromHistory} />
                    ))}
                  </div>
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  )
}