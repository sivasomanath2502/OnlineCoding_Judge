const SUBMIT_CONFIG = {
  ACCEPTED: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    label: 'Accepted',
    cls: 'accepted',
    bg: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)',
    border: 'rgba(34,197,94,0.4)',
    color: '#22c55e',
  },
  WRONG_ANSWER: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
    label: 'Wrong Answer',
    cls: 'wrong',
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)',
    border: 'rgba(239,68,68,0.4)',
    color: '#ef4444',
  },
  COMPILATION_ERROR: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    label: 'Compilation Error',
    cls: 'ce',
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)',
    border: 'rgba(239,68,68,0.4)',
    color: '#ef4444',
  },
  RUNTIME_ERROR: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    label: 'Runtime Error',
    cls: 're',
    bg: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0.04) 100%)',
    border: 'rgba(249,115,22,0.4)',
    color: '#f97316',
  },
  TIME_LIMIT_EXCEEDED: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    label: 'Time Limit Exceeded',
    cls: 'tle',
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
    border: 'rgba(245,158,11,0.4)',
    color: '#f59e0b',
  },
}

function TestBar({ passed, total, color }) {
  const pct = total > 0 ? (passed / total) * 100 : 0
  return (
    <div className="vd-testbar">
      <div className="vd-testbar-track">
        <div
          className="vd-testbar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="vd-testbar-label" style={{ color }}>
        {passed} / {total}
      </span>
    </div>
  )
}

export default function VerdictDisplay({ verdict }) {
  if (!verdict?.verdict) return null

  const cfg = SUBMIT_CONFIG[verdict.verdict] || {
    icon: '❓', label: verdict.verdict, cls: 'unknown',
    bg: 'transparent', border: 'var(--border)', color: 'var(--text-2)',
  }

  const isAccepted = verdict.verdict === 'ACCEPTED'

  return (
    <div
      className={`verdict-card-v2 ${cfg.cls}`}
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      {/* Top row */}
      <div className="vd-header">
        <div className="vd-icon-wrap" style={{ color: cfg.color }}>
          {cfg.icon}
        </div>
        <div className="vd-title-group">
          <div className="vd-label" style={{ color: cfg.color }}>{cfg.label}</div>
          {verdict.executionMs != null && (
            <div className="vd-runtime">
              {verdict.executionMs} ms
            </div>
          )}
        </div>
        {isAccepted && (
          <div className="vd-confetti">🎉</div>
        )}
      </div>

      {/* Test case progress bar */}
      {verdict.testCasesTotal > 0 && (
        <div className="vd-stats-row">
          <div className="vd-stat-block">
            <div className="vd-stat-label">Test Cases</div>
            <TestBar
              passed={verdict.testCasesPassed}
              total={verdict.testCasesTotal}
              color={cfg.color}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {verdict.errorMessage && (
        <div className="vd-error-block">
          <div className="vd-error-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Details
          </div>
          <pre className="vd-error-pre" style={{ color: cfg.color }}>{verdict.errorMessage}</pre>
        </div>
      )}
    </div>
  )
}
