import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

export default function TransferMoney() {
  const navigate = useNavigate()

  /* ---------- state ---------- */
  const [receiverId, setReceiverId]     = useState('')
  const [verifyState, setVerifyState]   = useState('idle') // idle | verifying | verified
  const [amount, setAmount]             = useState('')
  const [remarks, setRemarks]           = useState('')
  const [showModal, setShowModal]       = useState(false)

  const isVerified  = verifyState === 'verified'
  const parsedAmt   = parseFloat(amount) || 0
  const fee         = parsedAmt * 0.0015
  const totalDebit  = parsedAmt + fee
  const canReview   = isVerified && parsedAmt > 0

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

  /* ---------- sidebar nav item ---------- */
  const NavLink = ({ icon, label, to, active }) => (
    <Link
      to={to || '#'}
      className={`flex items-center gap-md px-md py-sm rounded-[0.125rem] transition-colors
        ${active
          ? 'text-on-surface font-bold border-r-2 border-primary bg-surface-container-low scale-[0.98] transition-transform duration-100'
          : 'text-on-surface-variant hover:bg-surface-container'}`}
    >
      <span
        className="material-symbols-outlined"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      <span className="text-[12px] font-medium tracking-[0.02em]">{label}</span>
    </Link>
  )

  return (
    <div className="bg-background text-on-background font-sans text-[14px] antialiased min-h-screen">

      {/* ─── Sidebar ─── */}
      <aside className="bg-surface-container-lowest border-r border-outline-variant h-screen w-64 fixed left-0 top-0 flex flex-col py-lg z-50">

        {/* Brand */}
        <div className="px-lg pb-xl border-b border-surface-container mb-md">
          <div className="flex items-center gap-md">
            <div className="w-8 h-8 bg-primary rounded-[0.125rem] flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
            </div>
            <div>
              <h1 className="text-[20px] font-bold leading-[1.4] text-on-surface">BlockBank</h1>
              <p className="text-[12px] font-medium tracking-[0.02em] text-on-surface-variant mt-[4px]">Secure Ledger v2.4</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-md flex flex-col gap-xs">
          <NavLink icon="dashboard"           label="Dashboard"           to="/dashboard" />
          <NavLink icon="account_balance"     label="Accounts"            to="#" />
          <NavLink icon="payments"            label="Transfer Money"      to="/transfer"  active />
          <NavLink icon="receipt_long"        label="Transactions"        to="#" />
          <NavLink icon="hub"                 label="Blockchain Explorer" to="#" />
          <NavLink icon="gpp_maybe"           label="Fraud Alerts"        to="#" />
          <div className="my-sm border-t border-surface-container" />
          <NavLink icon="admin_panel_settings" label="Admin"             to="#" />
          <NavLink icon="settings"            label="Settings"            to="#" />
        </nav>

        {/* Logout */}
        <div className="px-md mt-auto pt-md border-t border-surface-container">
          <Link
            to="/"
            className="flex items-center gap-md px-md py-sm rounded-[0.125rem] text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-[12px] font-medium tracking-[0.02em]">Logout</span>
          </Link>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="ml-64 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="bg-surface border-b border-outline-variant h-16 fixed top-0 right-0 left-64 z-40 flex justify-between items-center px-lg">
          <div className="flex items-center">
            {/* intentionally minimal — matches Stitch design */}
          </div>
          <div className="flex items-center gap-md">
            <button className="text-on-surface-variant hover:text-on-surface transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-on-surface-variant hover:text-on-surface transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container">
              <span className="material-symbols-outlined">dark_mode</span>
            </button>
            <div className="h-6 w-px bg-outline-variant mx-xs" />
            <button className="flex items-center gap-sm text-primary text-[12px] font-medium tracking-[0.02em] hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_circle
              </span>
              Profile
            </button>
          </div>
        </header>

        {/* Page canvas */}
        <main className="flex-1 mt-16 p-[48px] flex items-center justify-center">

          {/* ── Transfer card ── */}
          <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col overflow-hidden shadow-[0_4px_20px_rgba(15,23,42,0.02)]">

            {/* Card header */}
            <div className="px-xl py-lg border-b border-outline-variant bg-surface-bright flex justify-between items-center">
              <div>
                <h2 className="text-[20px] font-semibold leading-[1.4] text-on-surface">Initiate Transfer</h2>
                <p className="text-[14px] leading-[1.5] text-on-surface-variant mt-xs">Securely move funds across verified networks.</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
                <span className="material-symbols-outlined">sync_alt</span>
              </div>
            </div>

            {/* Form body */}
            <div className="p-xl flex flex-col gap-xl">

              {/* ── Receiver section ── */}
              <div className="flex flex-col gap-sm">
                <label className="text-[12px] font-medium tracking-[0.02em] text-on-surface uppercase">
                  Receiver Payment ID
                </label>

                <div className="flex gap-md">
                  {/* Input */}
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
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
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-[0.125rem] pl-10 pr-sm py-sm font-mono text-[13px] leading-[1.5] text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all disabled:opacity-60"
                    />
                  </div>

                  {/* Verify button */}
                  <button
                    id="btn-verify"
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerified || verifyState === 'verifying' || receiverId.length <= 5}
                    className={`px-lg rounded-[0.125rem] text-[12px] font-medium tracking-[0.02em] whitespace-nowrap border transition-colors
                      ${isVerified
                        ? 'bg-secondary-fixed text-primary-container border-secondary-fixed-dim cursor-default'
                        : 'bg-surface-container border-outline-variant text-on-surface hover:bg-surface-variant disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'}`}
                  >
                    {verifyState === 'verifying' ? 'Verifying...' : isVerified ? 'Verified' : 'Verify'}
                  </button>
                </div>

                {/* Verified recipient banner */}
                {isVerified && (
                  <div
                    className="mt-sm p-md bg-secondary-fixed border border-secondary-fixed-dim rounded-[0.125rem] flex items-center justify-between"
                    style={{ animation: 'fadeIn 0.2s ease-out' }}
                  >
                    <div className="flex items-center gap-sm">
                      <span
                        className="material-symbols-outlined text-primary-container"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                      <div>
                        <p className="text-[12px] font-medium tracking-[0.02em] text-primary-container">Verified Recipient</p>
                        <p className="text-[14px] font-semibold leading-[1.5] text-on-surface">Acme Corporation Ltd.</p>
                      </div>
                    </div>
                    <span className="px-sm py-xs bg-surface-container-lowest rounded-full text-[10px] uppercase font-medium text-primary-container border border-secondary-fixed-dim">
                      Institutional
                    </span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-surface-container w-full" />

              {/* ── Amount section ── */}
              <div className="flex flex-col gap-sm">
                <div className="flex justify-between items-end">
                  <label className="text-[12px] font-medium tracking-[0.02em] text-on-surface uppercase">
                    Transfer Amount
                  </label>
                  <span className="text-[12px] font-medium tracking-[0.02em] text-on-surface-variant">
                    Available:{' '}
                    <span className="font-mono text-[13px] text-on-surface font-semibold">$124,500.00</span>
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[36px] leading-[1.2] font-semibold text-outline">
                    $
                  </span>
                  <input
                    id="transfer-amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-[0.125rem] pl-12 pr-sm py-md text-[36px] leading-[1.2] font-semibold tracking-[-0.02em] text-on-surface text-right focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                  />
                </div>
              </div>

              {/* ── Remarks section ── */}
              <div className="flex flex-col gap-sm">
                <label className="text-[12px] font-medium tracking-[0.02em] text-on-surface uppercase">
                  Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Invoice #4092 Payment"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-[0.125rem] px-sm py-sm text-[14px] leading-[1.5] text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                />
              </div>

              {/* ── Transaction breakdown (shown only when verified + amount > 0) ── */}
              {canReview && (
                <div
                  id="transfer-breakdown"
                  className="flex flex-col gap-md p-lg bg-surface-container-low rounded-[0.125rem] border border-surface-variant"
                  style={{ animation: 'fadeIn 0.2s ease-out' }}
                >
                  <h3 className="text-[12px] font-medium tracking-[0.02em] text-on-surface uppercase mb-xs">
                    Transaction Details
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] leading-[1.5] text-on-surface-variant">Network Fee (0.15%)</span>
                    <span className="font-mono text-[13px] leading-[1.5] text-on-surface">{formatCurrency(fee)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] leading-[1.5] text-on-surface-variant">Estimated Settlement</span>
                    <span className="text-[14px] leading-[1.5] text-on-surface flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
                      ~10 Minutes
                    </span>
                  </div>
                  <div className="h-px bg-outline-variant w-full my-xs" />
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-[14px] leading-[1.5] text-on-surface">Total Debit</span>
                    <span className="font-mono text-[13px] leading-[1.5] text-on-surface">{formatCurrency(totalDebit)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card footer */}
            <div className="px-xl py-lg border-t border-outline-variant bg-surface flex justify-end gap-md">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-lg py-sm text-[12px] font-medium tracking-[0.02em] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-review"
                type="button"
                disabled={!canReview}
                onClick={() => setShowModal(true)}
                className="bg-primary-container text-on-primary text-[12px] font-medium tracking-[0.02em] px-xl py-sm rounded-[0.125rem] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Review Transfer
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ─── Confirmation modal ─── */}
      {showModal && (
        <div
          id="confirmation-modal"
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            id="modal-backdrop"
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal card */}
          <div
            className="relative bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_8px_32px_rgba(15,23,42,0.1)] w-full max-w-md flex flex-col overflow-hidden z-10"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="p-xl flex flex-col items-center text-center gap-md border-b border-surface-container">
              <div className="w-16 h-16 rounded-full bg-secondary-fixed flex items-center justify-center text-primary-container mb-xs">
                <span className="material-symbols-outlined text-[32px]">shield_lock</span>
              </div>
              <h3 className="text-[20px] font-semibold leading-[1.4] text-on-surface">Confirm Transaction</h3>
              <p className="text-[14px] leading-[1.5] text-on-surface-variant">
                Please review the details below before authorizing this transfer. This action cannot be undone.
              </p>
            </div>

            {/* Details */}
            <div className="p-xl bg-surface-container-low flex flex-col gap-md">
              <div className="flex justify-between py-xs border-b border-outline-variant/50">
                <span className="text-[12px] font-medium tracking-[0.02em] text-on-surface-variant">To</span>
                <span className="text-[14px] font-medium leading-[1.5] text-on-surface">Acme Corporation Ltd.</span>
              </div>
              <div className="flex justify-between py-xs border-b border-outline-variant/50">
                <span className="text-[12px] font-medium tracking-[0.02em] text-on-surface-variant">Amount</span>
                <span className="font-mono text-[13px] font-medium leading-[1.5] text-on-surface">
                  {formatCurrency(parsedAmt)}
                </span>
              </div>
              <div className="flex justify-between py-xs border-b border-outline-variant/50">
                <span className="text-[12px] font-medium tracking-[0.02em] text-on-surface-variant">Total with Fees</span>
                <span className="font-mono text-[13px] font-bold leading-[1.5] text-primary-container">
                  {formatCurrency(totalDebit)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-lg bg-surface-container-lowest flex gap-md">
              <button
                id="btn-modal-cancel"
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 border border-outline-variant text-on-surface text-[12px] font-medium tracking-[0.02em] py-md rounded-[0.125rem] hover:bg-surface-variant transition-colors cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleAuthorize}
                className="flex-1 bg-primary text-on-primary text-[12px] font-medium tracking-[0.02em] py-md rounded-[0.125rem] hover:opacity-90 transition-opacity flex items-center justify-center gap-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
