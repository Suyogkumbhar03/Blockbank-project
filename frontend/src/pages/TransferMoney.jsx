import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import UserProfileButton from '../components/UserProfileButton'
import NotificationBell from '../components/NotificationBell'
import api from '../services/api'

export default function TransferMoney() {
  const navigate = useNavigate()

  /* ---------- state ---------- */
  const [receiverId, setReceiverId] = useState('')
  const [verifyState, setVerifyState] = useState('idle') // idle | verifying | verified | error
  const [verifyError, setVerifyError] = useState('')
  const [verifiedRecipient, setVerifiedRecipient] = useState(null) // { name, paymentId }

  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [modalStep, setModalStep] = useState('none') // 'none' | 'confirm' | 'pin'
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isVerifyingPin, setIsVerifyingPin] = useState(false)
  const [pinLocked, setPinLocked] = useState(false)
  const [pinLockMessage, setPinLockMessage] = useState('')
  const [userBalance, setUserBalance] = useState(0)
  const [userName, setUserName] = useState('User')
  const [userPaymentId, setUserPaymentId] = useState('')
  const [user, setUser] = useState({ name: 'User', profilePhoto: '', isFrozen: false })

  // Processing & Error states for transfer
  const [isSending, setIsSending] = useState(false)
  const [transferSuccessState, setTransferSuccessState] = useState(false)
  const [transferError, setTransferError] = useState('')

  useEffect(() => {
    let isMounted = true
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr)
        if (parsed) {
          setUser(parsed)
          if (parsed.balance !== undefined) setUserBalance(parsed.balance)
          if (parsed.name) setUserName(parsed.name)
          if (parsed.paymentId) setUserPaymentId(parsed.paymentId)
        }
      } catch (err) {
        console.error('Failed to parse stored user in TransferMoney', err)
      }
    }

    // Fetch authoritative user profile and balance from backend
    api.get('/profile')
      .then((res) => {
        if (res.data && isMounted) {
          const stored = JSON.parse(localStorage.getItem('user') || '{}')
          const updatedUser = {
            ...stored,
            name: res.data.name || stored.name || '',
            email: res.data.email || stored.email || '',
            phone: res.data.phone || stored.phone || '',
            dateOfBirth: res.data.dateOfBirth || stored.dateOfBirth || '',
            accountNumber: res.data.accountNumber || stored.accountNumber || '',
            paymentId: res.data.paymentId || stored.paymentId || '',
            balance: res.data.balance !== undefined ? res.data.balance : (stored.balance || 0),
            isFrozen: res.data.isFrozen !== undefined ? res.data.isFrozen : (stored.isFrozen || false),
          }
          setUser(updatedUser)
          if (res.data.balance !== undefined) setUserBalance(res.data.balance)
          if (res.data.name) setUserName(res.data.name)
          if (res.data.paymentId) setUserPaymentId(res.data.paymentId)
          localStorage.setItem('user', JSON.stringify(updatedUser))
        }
      })
      .catch((err) => console.error('Failed to fetch profile in TransferMoney:', err))

    return () => { isMounted = false }
  }, [])

  const isVerified = verifyState === 'verified' && verifiedRecipient !== null
  const parsedAmt = parseFloat(amount) || 0
  const canSend = isVerified && parsedAmt > 0 && !isSending

  /* ---------- handlers ---------- */
  const handleVerify = async () => {
    if (!receiverId || receiverId.trim().length === 0) return

    setVerifyState('verifying')
    setVerifyError('')
    setVerifiedRecipient(null)

    try {
      const res = await api.get(`/transfer/verify/${encodeURIComponent(receiverId.trim())}`)
      if (res.data && res.data.found) {
        setVerifiedRecipient({
          name: res.data.name,
          paymentId: res.data.paymentId,
        })
        setVerifyState('verified')
      } else {
        setVerifyState('error')
        setVerifyError(res.data?.message || 'No active account found with this Payment ID')
      }
    } catch (err) {
      setVerifyState('error')
      setVerifyError(err.response?.data?.message || 'Failed to verify Payment ID')
    }
  }

  const handleInputChange = (val) => {
    setReceiverId(val)
    if (verifyState !== 'idle') {
      setVerifyState('idle')
      setVerifyError('')
      setVerifiedRecipient(null)
    }
  }

  const handleProceedToPin = () => {
    setModalStep('pin')
    setPin('')
    setPinError('')
  }

  const handleVerifyPinAndSend = async (e) => {
    if (e) e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setPinError('PIN must be exactly 4 digits')
      return
    }

    setIsVerifyingPin(true)
    setPinError('')

    try {
      const res = await api.post('/transfer/verify-pin', { pin })
      if (res.data && res.data.valid) {
        const verifiedPin = pin
        setModalStep('none')
        setIsVerifyingPin(false)
        setPin('')
        setPinLocked(false)
        setPinLockMessage('')
        executeTransfer(verifiedPin)
      } else {
        setIsVerifyingPin(false)
        setPin('')
        if (res.data?.locked) {
          setPinLocked(true)
          setPinLockMessage(res.data.message || 'Transfers are locked. Try again later.')
          setModalStep('none')
        } else {
          setPinError(res.data?.message || 'Incorrect PIN')
        }
      }
    } catch (err) {
      setIsVerifyingPin(false)
      setPin('')
      const errData = err.response?.data
      if (errData?.locked) {
        setPinLocked(true)
        setPinLockMessage(errData.message || 'Transfers are locked. Try again later.')
        setModalStep('none')
      } else {
        setPinError(errData?.message || 'Incorrect PIN')
      }
    }
  }

  const executeTransfer = async (verifiedPin) => {
    setIsSending(true)
    setTransferError('')
    setTransferSuccessState(false)

    // Parallel minimum timer (4.5 seconds) and API request
    const minTimerPromise = new Promise((resolve) => setTimeout(resolve, 4500))
    const apiPromise = api.post('/transfer', {
      receiverPaymentId: receiverId.trim(),
      amount: parsedAmt,
      note: remarks.trim(),
      pin: verifiedPin,
    })

    try {
      const [, apiRes] = await Promise.all([minTimerPromise, apiPromise])

      // Update balance in localStorage
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const u = JSON.parse(userStr)
          u.balance = apiRes.data.newBalance
          localStorage.setItem('user', JSON.stringify(u))
          setUserBalance(apiRes.data.newBalance)
        } catch (e) {
          console.error('Error updating balance in localStorage', e)
        }
      }

      setTransferSuccessState(true)

      try {
        if (apiRes.data?.transaction) {
          sessionStorage.setItem('lastTransaction', JSON.stringify(apiRes.data.transaction))
        }
      } catch (e) {
        console.error('Failed to store lastTransaction in sessionStorage', e)
      }

      // Short delay to show success checkmark before navigating
      setTimeout(() => {
        setIsSending(false)
        navigate('/success', {
          state: {
            transaction: apiRes.data.transaction,
          },
        })
      }, 700)
    } catch (err) {
      setIsSending(false)
      setTransferError(err.response?.data?.message || 'Transfer failed. Please try again.')
    }
  }

  return (
    <div className="font-sans antialiased min-h-screen bg-surface text-on-surface text-[14px]">
      {/* Shared User Sidebar */}
      <Sidebar role="user" />

      {/* ─── Main ─── */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-surface border-b border-outline-variant h-16 fixed top-0 right-0 left-64 z-40 flex justify-between items-center px-lg">
          <div className="flex items-center"></div>
          <div className="flex items-center gap-md">
            <NotificationBell />
            <div className="h-6 w-px bg-outline-variant mx-xs" />
            <UserProfileButton user={user} />
          </div>
        </header>

        {/* Page canvas */}
        <main className="flex-1 mt-16 flex items-center justify-center min-h-[calc(100vh-4rem)] bg-surface-container p-6">
          {Boolean(user.isFrozen) ? (
            <div className="w-full max-w-[540px] bg-white border border-red-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-[0_8px_32px_rgba(239,68,68,0.08)] animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4 shadow-inner shrink-0">
                <span className="material-symbols-outlined text-3xl">ac_unit</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 w-full text-center">
                Your account is freeze
              </h2>
              <p className="w-full text-sm text-gray-600 leading-relaxed mb-6 px-4 text-center">
                Your account has been frozen by BlockBank Admin. You cannot initiate any money transfers at this time. Please contact support if you believe this is an error.
              </p>
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
                <span className="material-symbols-outlined text-base">block</span>
                Your account is freeze
              </div>
            </div>
          ) : (
            /* ── Transfer card ── */
            <div className="w-full max-w-[540px] bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.10)] relative min-h-[500px]">

            {/* TASK 7: Sending Animation Overlay with Lottie */}
            <AnimatePresence>
              {isSending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-between p-6 text-center overflow-hidden"
                >
                  {!transferSuccessState ? (
                    <div className="flex flex-col items-center w-full max-w-full h-full justify-between py-2">
                      {/* Sender & Receiver Badges Row */}
                      <div className="flex items-center justify-between w-full px-4 pt-2">
                        {/* Sender */}
                        <div className="flex flex-col items-center gap-1 max-w-[120px]">
                          <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center text-lg font-bold shadow-md">
                            {userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-gray-900 truncate w-full text-center">
                            {userName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono truncate w-full text-center">
                            {userPaymentId || 'Sender'}
                          </span>
                        </div>

                        {/* Transfer Direction Indicator */}
                        <div className="flex items-center gap-1 text-gray-400 px-2 py-1 bg-gray-50 rounded-full border border-gray-100">
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </div>

                        {/* Receiver */}
                        <div className="flex flex-col items-center gap-1 max-w-[120px]">
                          <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                            {verifiedRecipient?.name?.charAt(0).toUpperCase() || 'R'}
                          </div>
                          <span className="text-xs font-bold text-gray-900 truncate w-full text-center">
                            {verifiedRecipient?.name || 'Receiver'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono truncate w-full text-center">
                            {verifiedRecipient?.paymentId || 'Receiver ID'}
                          </span>
                        </div>
                      </div>

                      {/* Prominent Lottie Animation (Cyan Paper Plane with Cash) */}
                      <div className="flex items-center justify-center w-full h-[220px] my-auto overflow-hidden">
                        <iframe
                          src="https://lottie.host/embed/ef83e33e-a66d-41bc-b562-477b3c942261/6EMAZ8J8Fz.json"
                          className="w-[220px] h-[220px] border-0 overflow-hidden"
                          title="Money Transfer Animation"
                        />
                      </div>

                      {/* Amount & Status Text Section */}
                      <div className="flex flex-col items-center gap-2 pb-2">
                        <div className="text-3xl font-extrabold text-gray-900 font-mono tracking-tight">
                          ₹{parsedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium text-teal-800 bg-teal-50 px-4 py-2 rounded-full border border-teal-100 shadow-sm">
                          <motion.span
                            className="material-symbols-outlined text-teal-600 text-base"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          >
                            sync
                          </motion.span>
                          Sending payment securely...
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Success transition state inside animation */
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center my-auto"
                    >
                      <div className="w-20 h-20 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center text-green-600 mb-4 shadow-lg">
                        <span className="material-symbols-outlined text-4xl">check_circle</span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">Transfer Complete!</h3>
                      <p className="text-sm text-gray-500">Redirecting to receipt...</p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Card header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-white flex justify-between items-start">
              <div>
                <h2 className="text-[22px] font-bold leading-[1.3] text-gray-900">
                  Initiate Transfer
                </h2>
                <p className="text-[14px] leading-[1.5] text-primary mt-1">
                  Securely move funds across verified accounts.
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center text-white shadow-md flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">sync_alt</span>
              </div>
            </div>

            {/* PIN Lock Banner */}
            {pinLocked && (
              <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-300 rounded-xl flex items-center gap-3 text-red-700">
                <span className="material-symbols-outlined text-red-500 text-2xl flex-shrink-0">lock</span>
                <div>
                  <p className="font-bold text-sm">Transfers Locked</p>
                  <p className="text-xs mt-0.5">{pinLockMessage}</p>
                </div>
              </div>
            )}

            {/* Inline Transfer Error Notice */}
            {transferError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs font-semibold">
                <span className="material-symbols-outlined text-red-500 text-base">error</span>
                {transferError}
              </div>
            )}

            {/* Form body */}
            <div className="px-6 py-6 flex flex-col gap-6 bg-white">
              {/* ── Receiver section ── */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold tracking-[0.08em] text-gray-500 uppercase">
                  Receiver Payment ID
                </label>

                <div className="flex gap-2">
                  {/* Input */}
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
                      person_search
                    </span>
                    <input
                      id="receiver-id"
                      type="text"
                      placeholder="Enter Payment ID (e.g. rahul@blockbank)"
                      value={receiverId}
                      onChange={(e) => handleInputChange(e.target.value)}
                      disabled={verifyState === 'verifying' || isSending}
                      className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 font-mono text-[13px] leading-[1.5] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-60"
                    />
                  </div>

                  {/* Verify button */}
                  <button
                    id="btn-verify"
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerified || verifyState === 'verifying' || !receiverId.trim() || isSending}
                    className={`px-5 rounded-lg text-[13px] font-semibold border transition-colors whitespace-nowrap ${isVerified
                        ? 'bg-green-50 text-green-700 border-green-200 cursor-default'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                      }`}
                  >
                    {verifyState === 'verifying'
                      ? 'Verifying...'
                      : isVerified
                        ? '✓ Verified'
                        : 'Verify'}
                  </button>
                </div>

                {/* Verified recipient banner */}
                {isVerified && verifiedRecipient && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-green-600"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                      <div>
                        <p className="text-[11px] font-bold tracking-wide text-green-700 uppercase">
                          Verified Recipient
                        </p>
                        <p className="text-[14px] font-semibold text-gray-900">
                          {verifiedRecipient.name}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-white rounded-full text-[10px] uppercase font-semibold text-green-700 border border-green-200">
                      Approved User
                    </span>
                  </div>
                )}

                {/* Inline verification error */}
                {verifyState === 'error' && (
                  <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {verifyError}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 w-full" />

              {/* ── Amount & Remarks sections (Only revealed/enabled when verified) ── */}
              {isVerified ? (
                <>
                  {/* ── Amount section ── */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <label className="text-[11px] font-bold tracking-[0.08em] text-gray-500 uppercase">
                        Transfer Amount
                      </label>
                      <span className="text-[12px] font-medium text-gray-500">
                        Available:{' '}
                        <span className="font-mono text-[13px] text-gray-900 font-bold">
                          ₹
                          {userBalance.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[28px] leading-[1.2] font-bold text-gray-400">
                        ₹
                      </span>
                      <input
                        id="transfer-amount"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isSending}
                        className="w-full bg-white border border-gray-200 rounded-lg pl-12 pr-4 py-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] text-gray-900 text-right focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* ── Remarks section ── */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold tracking-[0.08em] text-gray-500 uppercase">
                      Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rent share or Dinner bill"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      disabled={isSending}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-[14px] leading-[1.5] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-60"
                    />
                  </div>
                </>
              ) : (
                /* Unverified state prompt */
                <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-500">
                  Please verify the Receiver Payment ID above to unlock transfer amount and notes.
                </div>
              )}
            </div>

            {/* Card footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                disabled={isSending}
                className="px-5 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer rounded-lg hover:bg-gray-100 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                id="btn-send"
                type="button"
                disabled={!canSend || pinLocked}
                onClick={() => { setModalStep('confirm'); setPin(''); setPinError(''); }}
                className="bg-gray-800 text-white text-[13px] font-semibold px-6 py-2 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">{pinLocked ? 'lock' : 'send'}</span>
                {pinLocked ? 'Locked' : 'Send Money'}
              </button>
            </div>
          </div>
          )}
        </main>
      </div>

      {/* ─── Task 9: Confirmation Popup (Yes / No) ─── */}
      {modalStep === 'confirm' && (
        <div
          id="confirmation-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setModalStep('none')}
          />

          {/* Popup card */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              background: '#fff',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              width: '100%',
              maxWidth: '400px',
              padding: '40px 36px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              margin: '0 16px',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 32 }}>
                send
              </span>
            </div>

            <h3
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#111',
                marginBottom: 8,
                lineHeight: 1.3,
              }}
            >
              Confirm Transfer
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 6 }}>Send ₹{parsedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to {verifiedRecipient?.name}?</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#111', marginBottom: 4 }}>
              ₹{parsedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 32 }}>
              to <span style={{ fontWeight: 700, color: '#374151' }}>{verifiedRecipient?.name}</span>
            </p>

            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                id="btn-modal-no"
                type="button"
                onClick={() => setModalStep('none')}
                style={{
                  flex: 1,
                  border: '2px solid #e5e7eb',
                  background: '#fff',
                  color: '#374151',
                  fontSize: 15,
                  fontWeight: 700,
                  padding: '14px 0',
                  borderRadius: 14,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                No
              </button>
              <button
                id="btn-modal-yes"
                type="button"
                onClick={handleProceedToPin}
                style={{
                  flex: 1,
                  background: '#111',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  padding: '14px 0',
                  borderRadius: 14,
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'background 0.15s',
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Task 10: PIN Entry Modal ─── */}
      {modalStep === 'pin' && (
        <div
          id="pin-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => { if (!isVerifyingPin) { setModalStep('none'); setPin(''); setPinError(''); } }}
          />

          {/* Popup card */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              background: '#fff',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              width: '100%',
              maxWidth: '400px',
              padding: '36px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              margin: '0 16px',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 28 }}>
                lock
              </span>
            </div>

            <h3
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#111',
                marginBottom: 6,
                lineHeight: 1.3,
              }}
            >
              Enter Transaction PIN
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              Enter your 4-digit PIN to authorize this transfer.
            </p>

            {/* Inline Error */}
            {pinError && (
              <div className="w-full mb-4 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPinAndSend} className="w-full flex flex-col items-center">
              <div className="w-full mb-6">
                <input
                  id="transfer-pin-input"
                  type="password"
                  maxLength="4"
                  pattern="[0-9]*"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 4) {
                      setPin(val);
                      if (pinError) setPinError('');
                    }
                  }}
                  disabled={isVerifyingPin}
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 px-4 border border-gray-300 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button
                  id="btn-pin-cancel"
                  type="button"
                  onClick={() => { setModalStep('none'); setPin(''); setPinError(''); }}
                  disabled={isVerifyingPin}
                  style={{
                    flex: 1,
                    border: '2px solid #e5e7eb',
                    background: '#fff',
                    color: '#374151',
                    fontSize: 15,
                    fontWeight: 700,
                    padding: '14px 0',
                    borderRadius: 14,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="btn-pin-confirm"
                  type="submit"
                  disabled={pin.length !== 4 || isVerifyingPin}
                  style={{
                    flex: 1,
                    background: pin.length === 4 && !isVerifyingPin ? '#111' : '#9ca3af',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    padding: '14px 0',
                    borderRadius: 14,
                    cursor: pin.length === 4 && !isVerifyingPin ? 'pointer' : 'not-allowed',
                    border: 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  {isVerifyingPin ? 'Verifying...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
