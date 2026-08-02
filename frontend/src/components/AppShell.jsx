import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Intro Splash ─────────────────────────────────────────────────────────────
// Plays once per browser session. Subsequent internal navigations skip it.
function IntroSplash({ onDone }) {
  useEffect(() => {
    // logo fades in (600ms) + brief hold (250ms) + exit handled by AnimatePresence (400ms) = ~1.25s
    const t = setTimeout(onDone, 950)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      key="intro-splash"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-container-lowest"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <motion.div
        className="flex flex-col items-center gap-sm"
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: '52px', fontVariationSettings: "'FILL' 1" }}
        >
          account_balance
        </span>
        <span className="font-sans text-2xl font-bold tracking-tight text-on-surface">
          BlockBank
        </span>
        <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest mt-xs">
          Secured by Blockchain
        </span>
      </motion.div>
    </motion.div>
  )
}

// ─── Page Transition Wrapper ──────────────────────────────────────────────────
function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
// Wraps the entire app. Manages intro splash state and per-route transitions.
export default function AppShell({ children }) {
  const location = useLocation()

  // Show intro only once per browser session
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return sessionStorage.getItem('bb_intro_shown') !== '1'
    } catch {
      return false
    }
  })

  const handleIntroDone = () => {
    try { sessionStorage.setItem('bb_intro_shown', '1') } catch {}
    setShowIntro(false)
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showIntro && <IntroSplash key="intro" onDone={handleIntroDone} />}
      </AnimatePresence>

      {/* Page-level route transitions — only render content after intro is done */}
      <AnimatePresence mode="wait">
        {!showIntro && (
          <PageTransition key={location.pathname}>
            {children}
          </PageTransition>
        )}
      </AnimatePresence>
    </>
  )
}
