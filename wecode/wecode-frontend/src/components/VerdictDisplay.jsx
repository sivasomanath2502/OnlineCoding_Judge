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

  return <canvas ref={canvasRef} className="confetti-canvas" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
}

const CONFIGS = {
  ACCEPTED: {
    label: 'Accepted',
    color: '#00b8a3',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    showConfetti: true,
  },
  WRONG_ANSWER: {
    label: 'Wrong Answer',
    color: '#ff375f',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  },
  COMPILATION_ERROR: {
    label: 'Compile Error',
    color: '#ff375f',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  RUNTIME_ERROR: {
    label: 'Runtime Error',
    color: '#f97316',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  TIME_LIMIT_EXCEEDED: {
    label: 'Time Limit Exceeded',
    color: '#ffb800',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    color: '#a0a0a0',
    icon: <span>❓</span>,
  }

  const isAccepted = verdict.verdict === 'ACCEPTED'

  return (
    <div className="leetcode-verdict">
      {isAccepted && <Confetti />}
      
      <div className="lv-header">
        <div className="lv-status" style={{ color: cfg.color }}>
          <span className="lv-icon">{cfg.icon}</span>
          <span className="lv-label">{cfg.label}</span>
        </div>
        <div className="lv-meta">
          {verdict.testCasesTotal > 0 && (
            <div className="lv-meta-item">
              <span className="lv-meta-label">Testcases Passed</span>
              <span className="lv-meta-val">{verdict.testCasesPassed} / {verdict.testCasesTotal}</span>
            </div>
          )}
        </div>
      </div>

      <div className="lv-stats">
        {verdict.executionMs != null && (
          <div className="lv-stat-card">
            <span className="lv-stat-label">Runtime</span>
            <span className="lv-stat-val">{verdict.executionMs} ms</span>
          </div>
        )}
        <div className="lv-stat-card">
          <span className="lv-stat-label">Memory</span>
          <span className="lv-stat-val">-- MB</span>
        </div>
      </div>

      {verdict.errorMessage && (
        <div className="lv-error-box">
          <pre>{verdict.errorMessage}</pre>
        </div>
      )}
    </div>
  )
}
