import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function TransferSuccess() {
  const navigate = useNavigate()
  const [currentDateStr, setCurrentDateStr] = useState('')
  const [confetti, setConfetti] = useState([])

  useEffect(() => {
    // Set current date string
    const now = new Date()
    const options = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }
    setCurrentDateStr(now.toLocaleDateString('en-US', options).replace(',', ''))

    // Generate confetti particles
    const colors = ['#191c1e', '#45464d', '#c6c6cd', '#dae2fd']
    const newConfetti = Array.from({ length: 45 }).map((_, idx) => {
      const scale = Math.random() * 0.5 + 0.5
      return {
        id: idx,
        left: `${Math.random() * 100}vw`,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        animationDelay: `${Math.random() * 2}s`,
        animationDuration: `${Math.random() * 3 + 2}s`,
        transform: `scale(${scale})`
      }
    })
    setConfetti(newConfetti)
  }, [])

  return (
    <div className="bg-background text-on-background font-sans antialiased min-h-screen flex flex-col justify-center items-center relative overflow-hidden">
      
      {/* Confetti Particle Container */}
      <div className="absolute inset-0 pointer-events-none z-0" id="confetti-container">
        {confetti.map((c) => (
          <div
            key={c.id}
            className="confetti-piece rounded-sm"
            style={{
              left: c.left,
              backgroundColor: c.backgroundColor,
              animation: `fall ${c.animationDuration} linear forwards`,
              animationDelay: c.animationDelay,
              transform: c.transform
            }}
          ></div>
        ))}
      </div>

      <main className="relative z-10 w-full max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-2xl flex flex-col items-center">
        
        {/* Header Section */}
        <div className="text-center mb-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-highest mb-md">
            <span className="material-symbols-outlined text-4xl text-primary animate-[pulse_2s_infinite]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h1 className="text-3xl font-semibold text-on-background mb-sm">Transaction Confirmed</h1>
          <p className="text-base text-on-surface-variant">Your funds have been securely transferred and recorded on the ledger.</p>
        </div>

        {/* Syncing Centerpiece */}
        <div className="w-full max-w-lg aspect-video relative rounded-xl border border-surface-variant bg-surface-container-low overflow-hidden shadow-sm mb-xl flex flex-col items-center justify-center p-lg">
          <div className="relative flex items-center justify-center mb-md">
            <span className="material-symbols-outlined text-5xl text-primary animate-spin">sync</span>
          </div>
          <p className="text-sm font-semibold text-on-surface uppercase tracking-wider text-center">Syncing Ledger Node</p>
          <div className="absolute bottom-4 right-4 bg-surface/80 backdrop-blur-sm px-3 py-1.5 rounded border border-surface-variant flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse"></div>
            <span className="text-[10px] font-bold text-on-surface uppercase">Ledger Syncing</span>
          </div>
        </div>

        {/* Transaction Details Bento */}
        <div className="w-full max-w-2xl bg-surface rounded-xl border border-outline-variant p-lg md:p-xl grid grid-cols-1 md:grid-cols-2 gap-lg mb-xl text-sm">
          <div className="col-span-1 md:col-span-2 flex justify-between items-end border-b border-surface-variant pb-md">
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant block mb-xs uppercase tracking-wider">Amount Transferred</span>
              <div className="text-2xl font-bold text-primary tracking-tight">$12,500.00</div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded border border-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container"></span>
                <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Settled</span>
              </span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant block mb-xs uppercase tracking-wider">Receiver</span>
            <div className="text-base text-on-background font-medium">Acme Corporation Ltd.</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant block mb-xs uppercase tracking-wider">Date & Time</span>
            <div className="text-base text-on-background font-medium">{currentDateStr || 'Oct 24, 2023 • 14:32 UTC'}</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant block mb-xs uppercase tracking-wider">Transaction ID</span>
            <div className="font-mono text-xs text-on-surface flex items-center gap-2">
              <span className="truncate w-32 md:w-auto">TX-9f8a48b94abfa80d089cbdc3b21c</span>
              <button 
                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" 
                title="Copy ID"
                onClick={() => navigator.clipboard.writeText('TX-9f8a48b94abfa80d089cbdc3b21c')}
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
              </button>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant block mb-xs uppercase tracking-wider">Blockchain Block</span>
            <div className="font-mono text-xs text-on-surface">#894211</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-md w-full max-w-2xl justify-center">
          <button 
            className="w-full sm:w-auto px-6 py-3 bg-primary text-on-primary rounded text-xs font-semibold uppercase tracking-wider hover:bg-inverse-surface transition-colors cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </button>
          <button className="w-full sm:w-auto px-6 py-3 bg-surface text-primary border border-outline-variant rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-surface-container-lowest transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-sm">download</span>
            Download Receipt
          </button>
          <button className="w-full sm:w-auto px-6 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer">
            View on Explorer
          </button>
        </div>
      </main>
    </div>
  )
}

export default TransferSuccess
