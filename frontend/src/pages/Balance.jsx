import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../services/api'

export default function Balance() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  const [user, setUser] = useState({
    name: 'User',
    accountNumber: '',
    paymentId: '',
    balance: 0,
    profilePhoto: '',
  })

  // Security PIN state
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isVerifyingPin, setIsVerifyingPin] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr)
        if (parsed) {
          setUser(parsed)
        }
      } catch (err) {
        console.error('Failed to parse user from localStorage', err)
      }
    }
  }, [])

  const handleVerifyPin = async (e) => {
    if (e) e.preventDefault()
    if (!/^\d{4}$/.test(pin)) {
      setPinError('PIN must be exactly 4 digits')
      return
    }

    setIsVerifyingPin(true)
    setPinError('')

    try {
      const res = await api.post('/transfer/verify-pin', { pin })
      if (res.data && res.data.valid) {
        setIsUnlocked(true)
        setPin('')
      } else {
        setPinError(res.data?.message || 'Incorrect PIN')
        setPin('')
      }
    } catch (err) {
      setPinError(err.response?.data?.message || 'Incorrect PIN')
      setPin('')
    } finally {
      setIsVerifyingPin(false)
    }
  }

  return (
    <div
      className={`font-sans antialiased min-h-screen flex ${
        isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-surface text-on-surface'
      }`}
    >
      {/* Shared User Sidebar */}
      <Sidebar role="user" />

      {/* Main Content Area */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* TopNavBar */}
        <header className="h-16 fixed top-0 right-0 left-64 z-40 bg-surface border-b border-outline-variant flex justify-between items-center px-8">
          <div className="flex-1 flex items-center">
            <div className="relative w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded font-sans text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-tertiary-fixed-dim/10 transition-all"
                placeholder="Search ledger or transactions..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-full hover:bg-surface-container relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button
              className="p-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-full hover:bg-surface-container"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              <span className="material-symbols-outlined">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <div className="h-6 w-px bg-outline-variant mx-2"></div>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-opacity cursor-pointer focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center overflow-hidden border border-outline-variant font-bold text-xs">
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : user.name ? (
                  user.name.split(' ').map((n) => n[0]).join('').substring(0, 2)
                ) : (
                  'AT'
                )}
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider">
                {user.name}
              </span>
            </button>
          </div>
        </header>

        {/* Page Canvas */}
        {!isUnlocked ? (
          /* Locked PIN State - Centered Modal Screen */
          <main className="flex-1 mt-16 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-surface-container/50 p-6">
            <div className="w-full max-w-[460px] bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-md flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-primary mb-4 shrink-0">
                <span className="material-symbols-outlined text-[32px]">lock</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface mb-1">
                Enter Security PIN
              </h2>
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                Please enter your 4-digit transaction PIN to unlock your account balance.
              </p>

              <form onSubmit={handleVerifyPin} className="w-full flex flex-col gap-4">
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full text-center text-3xl tracking-[0.6em] font-mono py-3.5 bg-surface-container border border-outline-variant rounded-xl text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />

                {pinError && (
                  <div className="text-xs text-error font-semibold">
                    {pinError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifyingPin || pin.length !== 4}
                  className="w-full py-3.5 bg-black text-white hover:bg-slate-800 disabled:opacity-50 transition-colors text-xs font-semibold uppercase tracking-wider rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-2 mt-2"
                >
                  <span className="material-symbols-outlined text-[18px]">lock_open</span>
                  {isVerifyingPin ? 'Verifying PIN...' : 'Unlock Balance'}
                </button>
              </form>
            </div>
          </main>
        ) : (
          /* Unlocked Account Balance Card */
          <main className="flex-1 mt-16 p-8 bg-background overflow-y-auto">
            <div className="max-w-[800px] mx-auto w-full flex flex-col gap-6 animate-fadeIn">
              <div>
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">
                  Account Balance
                </h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  View your real-time verified ledger balance and details.
                </p>
              </div>

              <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
                      Available Account Balance
                    </span>
                    <div className="text-4xl font-bold text-on-surface font-mono tracking-tight">
                      ₹{(user.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                      <span className="text-base text-on-surface-variant font-normal">INR</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsUnlocked(false)}
                    className="bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    <span>Lock Balance</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-outline-variant/60">
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/40">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
                      Account Number
                    </span>
                    <span className="font-mono font-bold text-sm text-on-surface">
                      {user.accountNumber || 'ACC-9842104921'}
                    </span>
                  </div>

                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/40">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
                      Payment ID
                    </span>
                    <span className="font-mono font-bold text-sm text-on-surface">
                      {user.paymentId || 'BB-USER-9901'}
                    </span>
                  </div>

                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/40">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
                      Account Status
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs uppercase mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Active / Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  )
}
