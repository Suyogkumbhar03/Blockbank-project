import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

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

  // Visual Chart placeholder data
  const chartData = [25, 38, 50, 30, 75, 100]

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
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span
                className="material-symbols-outlined text-[28px] text-primary-fixed-dim"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_circle
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider">
                {user.name}
              </span>
            </div>
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
              {/* Total Assets Card */}
              <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-lg p-lg flex flex-col">
                <div className="flex justify-between items-start mb-md">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-xs">
                      Total Assets
                    </h3>
                    <div className="text-4xl font-semibold text-on-surface">
                      ₹{(user.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                      <span className="text-base text-on-tertiary-container ml-2 font-normal">
                        INR
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-tertiary-fixed-dim/10 text-on-tertiary-container px-2 py-1 rounded-sm border border-tertiary-fixed-dim/20">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    <span className="font-mono text-xs font-semibold">+0.0%</span>
                  </div>
                </div>

                {/* Visual Chart representation */}
                <div className="flex-1 min-h-[140px] relative border-b border-outline-variant/50 flex items-end pb-2 gap-3 mt-md">
                  {chartData.map((val, idx) => (
                    <div
                      key={idx}
                      className={`w-full rounded-t-sm transition-all duration-300 hover:opacity-85 cursor-pointer ${
                        idx === chartData.length - 1 ? 'bg-primary' : 'bg-surface-container'
                      }`}
                      style={{ height: `${val}%` }}
                      title={`Period ${idx + 1}: ${val}%`}
                    ></div>
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
                <button className="bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg p-md flex items-center justify-between hover:bg-surface-container transition-colors cursor-pointer">
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

            {/* Bottom Row: Transactions (Placeholder) */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
              <div className="p-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Recent Transactions
                </h3>
                <span className="text-xs text-on-surface-variant italic">(Placeholder Data)</span>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-bright">
                      <th className="p-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Date
                      </th>
                      <th className="p-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Payment ID
                      </th>
                      <th className="p-md text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Description
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
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-on-surface-variant text-sm">
                        No transactions recorded yet.
                      </td>
                    </tr>
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
