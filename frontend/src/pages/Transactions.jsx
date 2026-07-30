import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import UserProfileButton from '../components/UserProfileButton'
import api from '../services/api'

function Transactions() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // all | sent | received
  const [user, setUser] = useState({
    name: 'User',
    accountNumber: '',
    paymentId: '',
    balance: 0,
    profilePhoto: '',
  })

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
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
          }
          setUser(updatedUser)
          localStorage.setItem('user', JSON.stringify(updatedUser))
        }
      })
      .catch((err) => console.error('Failed to fetch profile in Transactions:', err))

    return () => { isMounted = false }
  }, [])

  // Fetch full transaction history
  const fetchHistory = async () => {
    try {
      setLoading(true)
      const res = await api.get('/transfer/history')
      if (Array.isArray(res.data)) {
        setTransactions(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch transaction history', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Filter transactions by search query and type (all / sent / received)
  const filteredTransactions = transactions.filter((tx) => {
    // Type filter
    if (filterType === 'sent' && tx.direction !== 'sent') return false
    if (filterType === 'received' && tx.direction !== 'received') return false

    // Search query filter
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

  return (
    <div className="font-sans antialiased min-h-screen flex bg-surface text-on-surface">
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
                placeholder="Search by name, ID, or description..."
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
            <div className="h-6 w-px bg-outline-variant mx-2"></div>
            <UserProfileButton user={user} />
          </div>
        </header>

        {/* Transactions Page Canvas */}
        <main className="flex-1 mt-16 p-margin-desktop bg-background overflow-y-auto">
          <div className="max-w-[1280px] mx-auto flex flex-col gap-xl">
            {/* Header Section */}
            <section className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-semibold text-on-surface mb-xs">
                  Transactions
                </h2>
                <p className="text-base text-on-surface-variant">
                  View and manage your entire ledger activity history.
                </p>
              </div>
              <div className="flex gap-sm">
                <button
                  onClick={fetchHistory}
                  className="px-md py-2 bg-surface-container-lowest border border-outline-variant text-on-surface text-xs font-semibold uppercase tracking-wider rounded hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
                </button>
                <button
                  onClick={() => navigate('/transfer')}
                  className="px-md py-2 bg-primary text-on-primary text-xs font-semibold uppercase tracking-wider rounded hover:bg-primary/90 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span> Send Money
                </button>
              </div>
            </section>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-outline-variant pb-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 text-xs font-semibold rounded transition-colors cursor-pointer ${filterType === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                All Transactions ({transactions.length})
              </button>
              <button
                onClick={() => setFilterType('sent')}
                className={`px-4 py-2 text-xs font-semibold rounded transition-colors cursor-pointer ${filterType === 'sent'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                Sent ({transactions.filter((t) => t.direction === 'sent').length})
              </button>
              <button
                onClick={() => setFilterType('received')}
                className={`px-4 py-2 text-xs font-semibold rounded transition-colors cursor-pointer ${filterType === 'received'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                Received ({transactions.filter((t) => t.direction === 'received').length})
              </button>
            </div>

            {/* Transaction History Table */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-bright">
                      <th className="p-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Transaction ID
                      </th>
                      <th className="p-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Date & Time
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
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-on-surface-variant text-sm">
                          Loading transaction history...
                        </td>
                      </tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-on-surface-variant text-sm">
                          No transactions found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const isSent = tx.direction === 'sent'
                        const otherPartyName = isSent ? tx.receiverName : tx.senderName
                        const otherPartyId = isSent ? tx.receiverPaymentId : tx.senderPaymentId

                        return (
                          <tr
                            key={tx._id || tx.transactionId}
                            className="border-b border-outline-variant/60 hover:bg-surface-container-lowest/80 transition-colors text-sm"
                          >
                            {/* Transaction ID */}
                            <td className="p-md font-mono text-xs font-bold text-gray-800 whitespace-nowrap">
                              {tx.transactionId}
                            </td>

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

export default Transactions
