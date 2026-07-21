import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

function TransferSuccess() {
  const navigate = useNavigate()
  const [currentDateStr, setCurrentDateStr] = useState('')
  const [copied, setCopied] = useState(false)
  const [confetti, setConfetti] = useState([])
  const styleRef = useRef(null)

  const txId = 'TX-9f8a48b94abfa80d'

  useEffect(() => {
    // Inject keyframe CSS
    const style = document.createElement('style')
    style.innerHTML = `
      @keyframes confettiFall {
        0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
        80%  { opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }
      @keyframes confettiSway {
        0%, 100% { margin-left: 0px; }
        25%       { margin-left: 15px; }
        75%       { margin-left: -15px; }
      }
    `
    document.head.appendChild(style)
    styleRef.current = style

    // Generate confetti pieces
    const colors = ['#6366f1', '#a5b4fc', '#4ade80', '#facc15', '#f87171', '#38bdf8', '#e2e8f0', '#94a3b8', '#c084fc']
    const pieces = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      width: `${Math.floor(Math.random() * 8) + 5}px`,
      height: `${Math.floor(Math.random() * 12) + 6}px`,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: `${(Math.random() * 3).toFixed(2)}s`,
      duration: `${(Math.random() * 2.5 + 2).toFixed(2)}s`,
      rotate: `${Math.floor(Math.random() * 60) - 30}deg`,
    }))
    setConfetti(pieces)

    // Date
    const now = new Date()
    const options = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    setCurrentDateStr(now.toLocaleString('en-IN', options))

    return () => {
      if (styleRef.current) document.head.removeChild(styleRef.current)
    }
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(txId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* Confetti strips */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {confetti.map(c => (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              top: '-20px',
              left: c.left,
              width: c.width,
              height: c.height,
              background: c.color,
              borderRadius: 2,
              transform: `rotate(${c.rotate})`,
              animation: `confettiFall ${c.duration} ease-in ${c.delay} forwards, confettiSway ${c.duration} ease-in-out ${c.delay} infinite`,
              opacity: 1
            }}
          />
        ))}
      </div>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        width: '100%',
        maxWidth: 480,
        overflow: 'hidden'
      }}>

        {/* ── Top success banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '40px 36px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* Animated check icon */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20
          }}>
            <span
              className="material-symbols-outlined"
              style={{ color: '#4ade80', fontSize: 40, fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Transaction Confirmed!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Your funds have been securely transferred<br />and recorded on the ledger.
          </p>
        </div>

        {/* ── Amount spotlight ── */}
        <div style={{
          background: '#f8fafc',
          borderBottom: '1px solid #e5e7eb',
          padding: '24px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
              Amount Transferred
            </p>
            <p style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              ₹12,500.00
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 20,
            padding: '6px 12px'
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Settled
            </span>
          </div>
        </div>

        {/* ── Transaction details ── */}
        <div style={{ padding: '24px 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Receiver */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Receiver
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
              Acme Corporation Ltd.
            </span>
          </div>

          <div style={{ height: 1, background: '#f1f5f9' }} />

          {/* Date & Time */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Date & Time
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
              {currentDateStr || 'Jul 21, 2026, 07:35 PM'}
            </span>
          </div>

          <div style={{ height: 1, background: '#f1f5f9' }} />

          {/* Transaction ID */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Transaction ID
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#374151', fontWeight: 600 }}>
                {txId}
              </span>
              <button
                onClick={handleCopy}
                title="Copy ID"
                style={{
                  background: copied ? '#f0fdf4' : '#f3f4f6',
                  border: copied ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: '4px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: copied ? '#15803d' : '#6b7280' }}>
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>

          <div style={{ height: 1, background: '#f1f5f9' }} />

          {/* Blockchain Block */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Blockchain Block
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#374151' }}>
              #894211
            </span>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{
          padding: '20px 36px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%',
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '15px 0',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              transition: 'background 0.15s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#1e293b'}
            onMouseOut={e => e.currentTarget.style.background = '#0f172a'}
          >
            Go to Dashboard
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={{
                flex: 1,
                background: '#fff',
                color: '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: 14,
                padding: '12px 0',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'background 0.15s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseOut={e => e.currentTarget.style.background = '#fff'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
              Download Receipt
            </button>
            <button
              style={{
                flex: 1,
                background: '#fff',
                color: '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: 14,
                padding: '12px 0',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseOut={e => e.currentTarget.style.background = '#fff'}
            >
              View on Explorer
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default TransferSuccess
