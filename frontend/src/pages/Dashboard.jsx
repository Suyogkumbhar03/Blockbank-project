import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../services/api'

function Dashboard() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [user, setUser] = useState({
    name: 'User',
    accountNumber: '',
    paymentId: '',
    balance: 0,
  })

  const [transactions, setTransactions] = useState([])
  const [loadingTxs, setLoadingTxs] = useState(true)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr)
        if (parsed) {
          setUser(parsed)
        }
      } catch (err) {
        console.error('Failed to parse user data from localStorage', err)
      }
    }
  }, [])

  // Fetch real transaction history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoadingTxs(true)
        const res = await api.get('/transfer/history')
        if (Array.isArray(res.data)) {
          setTransactions(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch transaction history', err)
      } finally {
        setLoadingTxs(false)
      }
    }

    fetchHistory()
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Filter transactions by search query
  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (tx.senderName || '').toLowerCase().includes(q) ||
      (tx.receiverName || '').toLowerCase().includes(q) ||
      (tx.senderPaymentId || '').toLowerCase().includes(q) ||
      (tx.receiverPaymentId || '').toLowerCase().includes(q) ||
      (tx.note || '').toLowerCase().includes(q) ||
      (tx.transactionId || '').toLowerCase().includes(q)
    )
  })

  // Calculate daily spending data (sent transactions) for the last 7 days
  const getDailySpendingChart = () => {
    const days = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
      days.push({ dateStr, dayLabel, totalAmount: 0, count: 0 })
    }

    transactions.forEach((tx) => {
      if (!tx.timestamp) return
      // Only include spending (sent / outgoing transactions)
      const isSent = tx.direction === 'sent' || (user.paymentId && tx.senderPaymentId === user.paymentId)
      if (!isSent) return

      const txDateStr = new Date(tx.timestamp).toISOString().split('T')[0]
      const dayObj = days.find((d) => d.dateStr === txDateStr)
      if (dayObj) {
        dayObj.totalAmount += Number(tx.amount || 0)
        dayObj.count += 1
      }
    })

    const maxAmount = Math.max(...days.map((d) => d.totalAmount), 1)

    return days.map((d) => ({
      ...d,
      heightPct: d.totalAmount > 0 ? Math.max(Math.round((d.totalAmount / maxAmount) * 100), 12) : 0,
    }))
  }

  const dailyChartData = getDailySpendingChart()

  return (
    <div
      className={`font-sans antialiased min-h-screen flex ${
        isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-surface text-on-surface'
      }`}
    >
      {/* Shared User Sidebar */}
      <Sidebar role="user" />

      {/* Main Content Area */}
      <div className="ml-64 w-full flex flex-col min-h-screen">
        {/* TopNavBar */}
        <header className="h-16 fixed top-0 right-0 left-64 z-40 bg-surface border-b border-outline-variant flex justify-between items-center px-lg">
          <div className="flex-1 flex items-center">
            <div className="relative w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded font-sans text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-tertiary-fixed-dim/10 transition-all"
                placeholder="Search transactions, accounts, or IDs..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-md">
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
              <span
                className="material-symbols-outlined text-[28px] text-primary-fixed-dim"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_circle
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider">
                {user.name}
              </span>
            </button>
          </div>
        </header>

        {/* Dashboard Canvas */}
        <main className="flex-1 mt-16 p-margin-desktop bg-background overflow-y-auto">
          <div className="max-w-[1280px] mx-auto flex flex-col gap-xl">
            {/* Welcome Section */}
            <section className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-semibold text-on-surface mb-xs">
                  Welcome back, {user.name}.
                </h2>
                <p className="text-base text-on-surface-variant">
                  Here is your daily financial summary.
                </p>
                {user.accountNumber && (
                  <div className="flex items-center gap-4 mt-2 text-xs font-mono text-on-surface-variant">
                    <span>Account No: <strong>{user.accountNumber}</strong></span>
                    {user.paymentId && <span>Payment ID: <strong>{user.paymentId}</strong></span>}
                  </div>
                )}
              </div>
              <div className="flex gap-sm">
                <button className="px-md py-2 bg-surface-container-lowest border border-outline-variant text-primary text-xs font-semibold uppercase tracking-wider rounded hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">download</span> Export Report
                </button>
              </div>
            </section>

            {/* Top Row: Balance & Quick Actions */}
            <section className="grid grid-cols-12 gap-gutter">
              {/* Daily Spending Card */}
              <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-lg p-lg flex flex-col justify-between">
                <div className="flex justify-between items-center mb-md">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      Daily Spending
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5 font-medium">
                      Daily spending activity over the last 7 days
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-surface-container text-on-surface-variant px-3 py-1 rounded text-xs font-semibold border border-outline-variant/60">
                    <span className="material-symbols-outlined text-[16px] text-primary">bar_chart</span>
                    <span>7-Day Spending</span>
                  </div>
                </div>

                {/* Visual Chart representation of Daily Spending */}
                <div className="flex-1 min-h-[160px] relative border-b border-outline-variant/50 flex items-end pb-2 gap-3 mt-md">
                  {dailyChartData.map((day, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                      {/* Amount above bar for spending days */}
                      <div className="text-[11px] font-mono font-bold h-4 text-on-surface">
                        {day.totalAmount > 0 ? `₹${day.totalAmount}` : ''}
                      </div>

                      {/* Black Spending Bar */}
                      <div className="w-full h-[110px] flex items-end justify-center">
                        {day.totalAmount > 0 && (
                          <div
                            className="w-full bg-black rounded-t transition-all duration-500 shadow-sm"
                            style={{ height: `${day.heightPct}%` }}
                            title={`${day.dayLabel}: Spent ₹${day.totalAmount.toLocaleString('en-IN')} (${day.count} transfer(s))`}
                          />
                        )}
                      </div>

                      {/* Day Label with ₹0 near the day for 0 spending days */}
                      <div className="flex flex-col items-center mt-0.5">
                        {day.totalAmount === 0 && (
                          <span className="text-[10px] font-mono font-semibold text-on-surface-variant/50 -mb-0.5">
                            ₹0
                          </span>
                        )}
                        <span className="text-xs font-semibold text-on-surface-variant font-mono">
                          {day.dayLabel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Bento */}
              <div className="col-span-12 lg:col-span-4 grid grid-rows-2 gap-sm">
                <button
                  className="bg-primary text-on-primary rounded-lg p-md flex items-center justify-between hover:bg-primary/90 transition-colors cursor-pointer"
                  onClick={() => navigate('/transfer')}
                >
                  <div className="flex items-center gap-md">
                    <span className="material-symbols-outlined">payments</span>
                    <span className="text-sm font-semibold uppercase tracking-wider">
                      Initiate Transfer
                    </span>
                  </div>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button
                  className="bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg p-md flex items-center justify-between hover:bg-surface-container transition-colors cursor-pointer"
                  onClick={() => navigate('/transactions')}
                >
                  <div className="flex items-center gap-md">
                    <span className="material-symbols-outlined">history</span>
                    <span className="text-sm font-semibold uppercase tracking-wider">
                      Transaction History
                    </span>
                  </div>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </section>

            {/* Bottom Row: Real Transaction History */}
            <section
              id="recent-transactions-section"
              className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden"
            >
              <div className="p-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Recent Transactions
                </h3>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-bright">
                      <th className="p-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Date
                      </th>
                      <th className="p-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Party / Payment ID
                      </th>
                      <th className="p-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Description / Note
                      </th>
                      <th className="p-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant text-right">
                        Amount
                      </th>
                      <th className="p-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant text-center">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTxs ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-on-surface-variant text-sm">
                          Loading transaction history...
                        </td>
                      </tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-on-surface-variant text-sm">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.slice(0, 5).map((tx) => {
                        const isSent = tx.direction === 'sent'
                        const otherPartyName = isSent ? tx.receiverName : tx.senderName
                        const otherPartyId = isSent ? tx.receiverPaymentId : tx.senderPaymentId

                        return (
                          <tr
                            key={tx._id || tx.transactionId}
                            className="border-b border-outline-variant/60 hover:bg-surface-container-lowest/80 transition-colors text-sm"
                          >
                            {/* Date */}
                            <td className="p-md text-xs text-on-surface-variant whitespace-nowrap font-medium">
                              {formatDate(tx.timestamp)}
                            </td>

                            {/* Party / Payment ID */}
                            <td className="p-md">
                              <div className="font-semibold text-on-surface">{otherPartyName}</div>
                              <div className="text-xs font-mono text-on-surface-variant">
                                {otherPartyId}
                              </div>
                            </td>

                            {/* Description / Note */}
                            <td className="p-md text-xs text-on-surface-variant">
                              {tx.note || (isSent ? `Transfer to ${otherPartyName}` : `Received from ${otherPartyName}`)}
                            </td>

                            {/* Amount */}
                            <td className="p-md text-right font-mono font-bold whitespace-nowrap">
                              <span className={isSent ? 'text-on-surface' : 'text-green-600'}>
                                {isSent ? '-' : '+'} ₹
                                {tx.amount.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="p-md text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 uppercase">
                                Success
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
