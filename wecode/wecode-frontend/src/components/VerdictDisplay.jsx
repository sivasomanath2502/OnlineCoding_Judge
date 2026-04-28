import { useEffect, useRef } from 'react'

// ─── Confetti burst for ACCEPTED ─────────────────────────────────
function Confetti() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const colors = ['#00b8a3', '#ffa116', '#60a5fa', '#a78bfa', '#f472b6', '#34d399']
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2 + 1,
      size: Math.random() * 5 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }))

    let frame
    let t = 0
    const draw = () => {
      t++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.06
        p.rotation += p.rotSpeed
        p.opacity = Math.max(0, 1 - t / 120)

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation * Math.PI / 180)
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })
      if (t < 130) frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={canvasRef} className="confetti-canvas" />
}

// ─── Animated circle progress ─────────────────────────────────────
function CircleProgress({ passed, total, color }) {
  const pct = total > 0 ? passed / total : 0
  const radius = 28
  const circ = 2 * Math.PI * radius
  const dash = pct * circ

  return (
    <div className="circle-progress-wrap">
      <svg width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={radius} fill="none" stroke="var(--bg-3)" strokeWidth="5" />
        <circle
          cx="35" cy="35" r={radius} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 35 35)"
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <text x="35" y="35" textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize="13" fontWeight="700" fontFamily="monospace">
          {passed}/{total}
        </text>
      </svg>
      <span className="circle-label">Tests</span>
    </div>
  )
}

// ─── Config per verdict ───────────────────────────────────────────
const CONFIGS = {
  ACCEPTED: {
    label: 'Accepted',
    color: '#00b8a3',
    bg: 'radial-gradient(ellipse at 20% 0%, rgba(0,184,163,0.18) 0%, rgba(0,184,163,0.04) 60%)',
    border: 'rgba(0,184,163,0.35)',
    glow: '0 0 24px rgba(0,184,163,0.2)',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    showConfetti: true,
  },
  WRONG_ANSWER: {
    label: 'Wrong Answer',
    color: '#ff375f',
    bg: 'radial-gradient(ellipse at 20% 0%, rgba(255,55,95,0.14) 0%, rgba(255,55,95,0.03) 60%)',
    border: 'rgba(255,55,95,0.3)',
    glow: 'none',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  COMPILATION_ERROR: {
    label: 'Compilation Error',
    color: '#ff375f',
    bg: 'radial-gradient(ellipse at 20% 0%, rgba(255,55,95,0.14) 0%, rgba(255,55,95,0.03) 60%)',
    border: 'rgba(255,55,95,0.3)',
    glow: 'none',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  RUNTIME_ERROR: {
    label: 'Runtime Error',
    color: '#f97316',
    bg: 'radial-gradient(ellipse at 20% 0%, rgba(249,115,22,0.14) 0%, rgba(249,115,22,0.03) 60%)',
    border: 'rgba(249,115,22,0.3)',
    glow: 'none',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  TIME_LIMIT_EXCEEDED: {
    label: 'Time Limit Exceeded',
    color: '#ffb800',
    bg: 'radial-gradient(ellipse at 20% 0%, rgba(255,184,0,0.14) 0%, rgba(255,184,0,0.03) 60%)',
    border: 'rgba(255,184,0,0.3)',
    glow: 'none',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
}

export default function VerdictDisplay({ verdict }) {
  if (!verdict?.verdict) return null

  const cfg = CONFIGS[verdict.verdict] || {
    label: verdict.verdict.replace(/_/g, ' '),
    color: '#a0a0a0', bg: 'transparent', border: 'var(--border)', glow: 'none',
    icon: <span style={{ fontSize: '1.4rem' }}>❓</span>,
  }

  const isAccepted = verdict.verdict === 'ACCEPTED'

  return (
    <div
      className="verdict-v3"
      style={{
        background: cfg.bg,
        borderColor: cfg.border,
        boxShadow: cfg.glow,
      }}
    >
      {/* Confetti canvas — only for accepted */}
      {isAccepted && <Confetti />}

      {/* Header row */}
      <div className="vv3-header">
        <div className="vv3-icon" style={{ color: cfg.color }}>
          {cfg.icon}
        </div>

        <div className="vv3-title-block">
          <div className="vv3-label" style={{ color: cfg.color }}>
            {cfg.label}
          </div>
          {isAccepted && (
            <div className="vv3-congrats">Great job! All test cases passed.</div>
          )}
        </div>

        {/* Circle progress */}
        {verdict.testCasesTotal > 0 && (
          <CircleProgress
            passed={verdict.testCasesPassed}
            total={verdict.testCasesTotal}
            color={cfg.color}
          />
        )}
      </div>

      {/* Stats row */}
      {(verdict.executionMs != null || verdict.testCasesTotal > 0) && (
        <div className="vv3-stats">
          {verdict.testCasesTotal > 0 && (
            <div className="vv3-stat">
              <div className="vv3-stat-val" style={{ color: cfg.color }}>
                {verdict.testCasesPassed}<span className="vv3-stat-denom">/{verdict.testCasesTotal}</span>
              </div>
              <div className="vv3-stat-label">Tests Passed</div>
              {/* Mini progress bar */}
              <div className="vv3-bar-track">
                <div className="vv3-bar-fill" style={{
                  width: `${verdict.testCasesTotal > 0 ? (verdict.testCasesPassed / verdict.testCasesTotal) * 100 : 0}%`,
                  background: cfg.color,
                }} />
              </div>
            </div>
          )}
          {verdict.executionMs != null && (
            <div className="vv3-stat">
              <div className="vv3-stat-val" style={{ color: cfg.color }}>
                {verdict.executionMs}<span className="vv3-stat-unit">ms</span>
              </div>
              <div className="vv3-stat-label">Runtime</div>
            </div>
          )}
        </div>
      )}

      {/* Error block */}
      {verdict.errorMessage && (
        <div className="vv3-error" style={{ borderColor: `${cfg.color}30` }}>
          <div className="vv3-error-title" style={{ color: cfg.color }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Error Details
          </div>
          <pre className="vv3-error-pre" style={{ color: cfg.color }}>{verdict.errorMessage}</pre>
        </div>
      )}
    </div>
  )
}