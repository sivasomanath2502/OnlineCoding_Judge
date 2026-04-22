import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProblem, submitCode, getResult, getStreamUrl } from '../api/client'
import CodeEditor from '../components/CodeEditor'
import VerdictDisplay from '../components/VerdictDisplay'

const LANGUAGES = [
  {
    id: 1,
    name: 'C++',
    monacoLang: 'cpp',
    defaultCode:
`#include<iostream>
using namespace std;

int main(){
    // Write your solution here
    return 0;
}`,
  },
  {
    id: 2,
    name: 'Python',
    monacoLang: 'python',
    defaultCode:
`import sys
input = sys.stdin.readline

def solve():
    # Write your solution here
    pass

solve()`,
  },
  {
    id: 3,
    name: 'Java',
    monacoLang: 'java',
    defaultCode:
`import java.util.*;

public class solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Write your solution here
    }
}`,
  },
]

const PHASE = { IDLE: 'idle', COMPILING: 'compiling', RUNNING: 'running', DONE: 'done' }
const TAB = { TESTCASE: 'testcase', RESULT: 'result' }

// Run result types
const RUN_STATUS = { IDLE: 'idle', RUNNING: 'running', DONE: 'done', ERROR: 'error' }

export default function ProblemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [problem,     setProblem]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [lang,        setLang]        = useState(LANGUAGES[0])
  const [code,        setCode]        = useState(LANGUAGES[0].defaultCode)
  const [phase,       setPhase]       = useState(PHASE.IDLE)
  const [verdict,     setVerdict]     = useState(null)
  const [statusMsg,   setStatusMsg]   = useState('')
  const [activeTab,   setActiveTab]   = useState(TAB.TESTCASE)
  const [customInput, setCustomInput] = useState('')
  const [runResult,   setRunResult]   = useState(null)  // { status, output, verdict }
  const [runStatus,   setRunStatus]   = useState(RUN_STATUS.IDLE)
  const esRef = useRef(null)

  useEffect(() => {
    getProblem(id)
      .then(r => {
        setProblem(r.data)
        setCustomInput(r.data.testCases?.[0]?.input || '')
      })
      .catch(() => setProblem(null))
      .finally(() => setLoading(false))
    return () => esRef.current?.close()
  }, [id])

  const changeLang = (l) => {
    setLang(l)
    setCode(l.defaultCode)
    setVerdict(null)
    setRunResult(null)
    setRunStatus(RUN_STATUS.IDLE)
  }

  const handleReset = () => {
    setCode(lang.defaultCode)
    setVerdict(null)
    setRunResult(null)
    setRunStatus(RUN_STATUS.IDLE)
    setPhase(PHASE.IDLE)
    setStatusMsg('')
  }

  // ─── Run against custom input ─────────────────────────────────
  const handleRun = async () => {
    if (!code.trim()) return
    setRunStatus(RUN_STATUS.RUNNING)
    setRunResult(null)
    setActiveTab(TAB.TESTCASE)

    try {
      const res = await submitCode({
        problemId: id,
        languageId: lang.id,
        userId: 'user-guest',
        code,
      })
      await pollForRun(res.data.submissionId)
    } catch {
      setRunStatus(RUN_STATUS.ERROR)
      setRunResult({ output: 'Failed to submit. Check if backend is running.', isError: true })
    }
  }

  const pollForRun = async (submissionId) => {
    for (let i = 0; i < 30; i++) {
      await sleep(1000)
      try {
        const r = await getResult(submissionId)
        if (r.data.status === 'COMPLETED' || r.data.status === 'FAILED') {
          const v = r.data
          if (v.verdict === 'ACCEPTED') {
            setRunResult({
              output: `All ${v.testCasesTotal} test case(s) passed in ${v.executionMs}ms`,
              isError: false,
              verdict: v.verdict,
            })
          } else if (v.verdict === 'COMPILATION_ERROR') {
            setRunResult({ output: v.errorMessage || 'Compilation failed', isError: true, verdict: v.verdict })
          } else if (v.verdict === 'RUNTIME_ERROR') {
            setRunResult({ output: v.errorMessage || 'Runtime error', isError: true, verdict: v.verdict })
          } else if (v.verdict === 'WRONG_ANSWER') {
            setRunResult({
              output: v.errorMessage || `Wrong answer — ${v.testCasesPassed}/${v.testCasesTotal} passed`,
              isError: true,
              verdict: v.verdict,
            })
          } else {
            setRunResult({ output: v.errorMessage || v.verdict, isError: true, verdict: v.verdict })
          }
          setRunStatus(RUN_STATUS.DONE)
          return
        }
      } catch { /* continue */ }
    }
    setRunResult({ output: 'Timed out waiting for result.', isError: true })
    setRunStatus(RUN_STATUS.ERROR)
  }

  // ─── Submit against all test cases with SSE ──────────────────
  const handleSubmit = async () => {
    if (!code.trim()) return
    setPhase(PHASE.COMPILING)
    setVerdict(null)
    setStatusMsg('Submitting...')
    setActiveTab(TAB.RESULT)

    try {
      const res = await submitCode({
        problemId: id,
        languageId: lang.id,
        userId: 'user-guest',
        code,
      })
      const submissionId = res.data.submissionId
      setStatusMsg('Judging your solution...')
      setPhase(PHASE.RUNNING)
      openSSE(submissionId)
    } catch {
      setStatusMsg('Submission failed. Please retry.')
      setPhase(PHASE.IDLE)
    }
  }

  const openSSE = (submissionId) => {
    esRef.current?.close()
    const es = new EventSource(getStreamUrl(submissionId))
    esRef.current = es

    es.addEventListener('result', (e) => {
      const result = JSON.parse(e.data)
      setVerdict(result)
      setStatusMsg('')
      setPhase(PHASE.DONE)
      es.close()
    })

    // Also try 'verdict' event name for compatibility
    es.addEventListener('verdict', (e) => {
      const result = JSON.parse(e.data)
      setVerdict(result)
      setStatusMsg('')
      setPhase(PHASE.DONE)
      es.close()
    })

    es.onerror = () => {
      es.close()
      pollResult(submissionId)
    }

    setTimeout(() => {
      if (phase !== PHASE.DONE) {
        es.close()
        pollResult(submissionId)
      }
    }, 35000)
  }

  const pollResult = async (submissionId) => {
    for (let i = 0; i < 25; i++) {
      await sleep(1500)
      try {
        const r = await getResult(submissionId)
        if (r.data.status === 'COMPLETED' || r.data.status === 'FAILED') {
          setVerdict(r.data)
          setStatusMsg('')
          setPhase(PHASE.DONE)
          return
        }
      } catch { /* continue */ }
    }
    setStatusMsg('Timed out.')
    setPhase(PHASE.IDLE)
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms))
  const busy  = phase === PHASE.COMPILING || phase === PHASE.RUNNING

  if (loading)  return <div className="state-box"><div className="spinner" />Loading...</div>
  if (!problem) return (
    <div className="state-box error">
      Problem not found.{' '}
      <button className="link-btn" onClick={() => navigate('/')}>Go back</button>
    </div>
  )

  return (
    <div className="detail-layout">

      {/* ─── LEFT: Problem description ─── */}
      <div className="desc-panel">
        <div className="desc-header">
          <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
          <span className={`diff-badge ${problem.difficulty?.toLowerCase()}`}>
            {problem.difficulty}
          </span>
        </div>

        <h1 className="prob-title">{problem.title}</h1>

        <div className="prob-meta-row">
          <span className="meta-chip">⏱ {problem.timeLimitMs}ms</span>
          <span className="meta-chip">🧪 {problem.testCaseCount} test cases</span>
        </div>

        <p className="prob-desc">{problem.description}</p>

        {problem.testCases?.slice(0, 2).map((tc, i) => (
          <div key={tc.id} className="sample-block">
            <div className="sample-label">Example {i + 1}</div>
            <div className="sample-io-grid">
              <div>
                <div className="io-header">Input</div>
                <pre className="io-pre">{tc.input}</pre>
              </div>
              <div>
                <div className="io-header">Output</div>
                <pre className="io-pre">{tc.expectedOutput}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── RIGHT: Editor panel ─── */}
      <div className="editor-panel">

        {/* Toolbar */}
        <div className="editor-toolbar">
          <div className="lang-pills">
            {LANGUAGES.map(l => (
              <button
                key={l.id}
                className={`lang-pill ${lang.id === l.id ? 'active' : ''}`}
                onClick={() => changeLang(l)}
                disabled={busy}
              >
                {l.name}
              </button>
            ))}
          </div>

          <div className="action-btns">
            {/* Reset button — symbol only */}
            <button
              className="btn-icon"
              onClick={handleReset}
              disabled={busy}
              title="Reset to default code"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>

            {/* Run button — symbol only */}
            <button
              className="btn-run-icon"
              onClick={handleRun}
              disabled={busy || runStatus === RUN_STATUS.RUNNING}
              title="Run against custom input"
            >
              {runStatus === RUN_STATUS.RUNNING
                ? <span className="spinner small" />
                : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                )
              }
            </button>

            {/* Submit button — symbol only */}
            <button
              className="btn-submit-icon"
              onClick={handleSubmit}
              disabled={busy}
              title="Submit solution"
            >
              {busy
                ? <span className="spinner small" style={{ borderTopColor: '#fff' }} />
                : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22,2 15,22 11,13 2,9"/>
                  </svg>
                )
              }
            </button>
          </div>
        </div>

        {/* Monaco editor */}
        <CodeEditor
          language={lang.monacoLang}
          value={code}
          onChange={setCode}
        />

        {/* Bottom pane */}
        <div className="bottom-pane">
          <div className="pane-tabs">
            <button
              className={`pane-tab ${activeTab === TAB.TESTCASE ? 'active' : ''}`}
              onClick={() => setActiveTab(TAB.TESTCASE)}
            >
              Test Case
            </button>
            <button
              className={`pane-tab ${activeTab === TAB.RESULT ? 'active' : ''}`}
              onClick={() => setActiveTab(TAB.RESULT)}
            >
              Result
              {verdict && (
                <span className={`tab-dot ${verdict.verdict === 'ACCEPTED' ? 'green' : 'red'}`} />
              )}
            </button>
          </div>

          {activeTab === TAB.TESTCASE ? (
            <div className="testcase-pane">
              <div className="testcase-io">
                <div className="testcase-section">
                  <div className="testcase-label">
                    <span>Input</span>
                    {problem.testCases?.length > 0 && (
                      <button
                        className="use-example-btn"
                        onClick={() => setCustomInput(problem.testCases[0].input)}
                      >
                        Use Example 1
                      </button>
                    )}
                  </div>
                  <textarea
                    className="testcase-textarea"
                    placeholder="Enter custom input..."
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                  />
                </div>
                <div className="testcase-section">
                  <div className="testcase-label">
                    <span>Output</span>
                    {runStatus === RUN_STATUS.RUNNING && (
                      <span className="run-status-indicator">
                        <span className="spinner small" /> Running...
                      </span>
                    )}
                  </div>
                  <div className="testcase-output">
                    {runStatus === RUN_STATUS.IDLE && (
                      <span className="placeholder-msg">Click ▶ to run your code</span>
                    )}
                    {runStatus === RUN_STATUS.RUNNING && (
                      <span className="placeholder-msg">Executing...</span>
                    )}
                    {runStatus === RUN_STATUS.DONE && runResult && (
                      <div className={`run-output ${runResult.isError ? 'run-error' : 'run-success'}`}>
                        {runResult.verdict && (
                          <div className="run-verdict-badge">
                            {runResult.verdict === 'ACCEPTED' ? '✓' : '✗'} {runResult.verdict.replace(/_/g, ' ')}
                          </div>
                        )}
                        <pre>{runResult.output}</pre>
                      </div>
                    )}
                    {runStatus === RUN_STATUS.ERROR && runResult && (
                      <div className="run-output run-error">
                        <pre>{runResult.output}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="verdict-pane">
              {phase !== PHASE.IDLE && phase !== PHASE.DONE && (
                <div className="judging-indicator">
                  <div className="judging-dots">
                    <span /><span /><span />
                  </div>
                  <span>{statusMsg}</span>
                </div>
              )}
              {verdict && <VerdictDisplay verdict={verdict} />}
              {!verdict && (phase === PHASE.IDLE || phase === PHASE.DONE) && (
                <span className="placeholder-msg">
                  Click ✈ Submit to judge your solution against all test cases.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
