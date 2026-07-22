import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

export default function TransferMoney() {
  const navigate = useNavigate()

  /* ---------- state ---------- */
  const [receiverId, setReceiverId] = useState('')
  const [verifyState, setVerifyState] = useState('idle') // idle | verifying | verified
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [userBalance, setUserBalance] = useState(0)
  const [userName, setUserName] = useState('User')

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr)
        if (parsed) {
          if (parsed.balance !== undefined) setUserBalance(parsed.balance)
          if (parsed.name) setUserName(parsed.name)
        }
      } catch (err) {
        console.error('Failed to parse stored user in TransferMoney', err)
      }
    }
  }, [])

  const isVerified = verifyState === 'verified'
  const parsedAmt = parseFloat(amount) || 0
  const fee = parsedAmt * 0.0015
  const canReview = isVerified && parsedAmt > 0

  /* ---------- handlers ---------- */
  const handleVerify = () => {
    if (receiverId.length > 5) {
      setVerifyState('verifying')
      setTimeout(() => setVerifyState('verified'), 600)
    }
  }

  const handleAuthorize = () => {
    setShowModal(false)
    navigate('/success')
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
            <button className="text-on-surface-variant hover:text-on-surface transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-on-surface-variant hover:text-on-surface transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container">
              <span className="material-symbols-outlined">dark_mode</span>
            </button>
            <div className="h-6 w-px bg-outline-variant mx-xs" />
            <div className="flex items-center gap-sm text-primary text-[12px] font-medium tracking-[0.02em]">
              <span
                className="material-symbols-outlined text-[32px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_circle
              </span>
              {userName}
            </div>
          </div>
        </header>

        {/* Page canvas */}
        <main className="flex-1 mt-16 flex items-center justify-center min-h-[calc(100vh-4rem)] bg-surface-container">
          {/* ── Transfer card ── */}
          <div className="w-full max-w-[540px] bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.10)]">
            {/* Card header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-white flex justify-between items-start">
              <div>
                <h2 className="text-[22px] font-bold leading-[1.3] text-gray-900">
                  Initiate Transfer
                </h2>
                <p className="text-[14px] leading-[1.5] text-primary mt-1">
                  Securely move funds across verified networks.
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center text-white shadow-md flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">sync_alt</span>
              </div>
            </div>

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
                      placeholder="Enter Wallet Address or Bank ID"
                      value={receiverId}
                      onChange={(e) => {
                        setReceiverId(e.target.value)
                        if (verifyState === 'verified') setVerifyState('idle')
                      }}
                      disabled={verifyState === 'verifying' || isVerified}
                      className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 font-mono text-[13px] leading-[1.5] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-60"
                    />
                  </div>

                  {/* Verify button */}
                  <button
                    id="btn-verify"
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerified || verifyState === 'verifying' || receiverId.length <= 5}
                    className={`px-5 rounded-lg text-[13px] font-semibold border transition-colors whitespace-nowrap ${
                      isVerified
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
                {isVerified && (
                  <div
                    className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between"
                    style={{ animation: 'fadeIn 0.2s ease-out' }}
                  >
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
                          Acme Corporation Ltd.
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-white rounded-full text-[10px] uppercase font-semibold text-green-700 border border-green-200">
                      Institutional
                    </span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 w-full" />

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
                    className="w-full bg-white border border-gray-200 rounded-lg pl-12 pr-4 py-4 text-[32px] leading-[1.2] font-bold tracking-[-0.02em] text-gray-900 text-right focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
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
                  placeholder="e.g. Invoice #4092 Payment"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-[14px] leading-[1.5] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            {/* Card footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                id="btn-send"
                type="button"
                disabled={!canReview}
                onClick={() => setShowModal(true)}
                className="bg-gray-800 text-white text-[13px] font-semibold px-6 py-2 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                Send Money
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ─── Confirmation Popup ─── */}
      {showModal && (
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
            onClick={() => setShowModal(false)}
          />

          {/* Popup card */}
          <div
            style={{
              animation: 'fadeIn 0.18s ease-out',
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
              Proceed with Payment?
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 6 }}>You are about to send</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#111', marginBottom: 4 }}>
              ₹{parsedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 32 }}>
              to <span style={{ fontWeight: 700, color: '#374151' }}>Acme Corporation Ltd.</span>
            </p>

            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                id="btn-modal-no"
                type="button"
                onClick={() => setShowModal(false)}
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
                onClick={handleAuthorize}
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
                Yes, Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
