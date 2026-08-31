import React from 'react'

/**
 * ReportTemplate - HTML template for BlockBank System Report
 * Clean, human corporate bank statement layout.
 */

export default function ReportTemplate({
  adminName = 'Admin',
  totalUsers = 0,
  approvedUsers = 0,
  pendingUsers = 0,
  rejectedUsers = 0,
  allTransactions = [],
  chartPeriod = '1D'
}) {
  const generatedAt = new Date()
  const formattedDateStr =
    generatedAt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) +
    ' ' +
    generatedAt.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

  // Normalize user counts
  const appCount = Array.isArray(approvedUsers) ? approvedUsers.length : Number(approvedUsers) || 0
  const pendCount = Array.isArray(pendingUsers) ? pendingUsers.length : Number(pendingUsers) || 0
  const rejCount = Array.isArray(rejectedUsers) ? rejectedUsers.length : Number(rejectedUsers) || 0
  const totUsers = Number(totalUsers) || appCount + pendCount + rejCount

  // Determine period bounds and chart title based on chartPeriod
  let periodStart
  let periodEnd = generatedAt
  let chartSectionTitle = 'Transaction Volume & Activity Trend'

  const formatShortDate = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const formatFullDate = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const isCustomPeriod = typeof chartPeriod === 'object' && chartPeriod?.custom
  const periodKey = isCustomPeriod ? 'Custom' : chartPeriod

  if (periodKey === '1D') {
    periodStart = new Date(generatedAt.getTime() - 24 * 60 * 60 * 1000)
    chartSectionTitle = 'Transaction Volume — Last 24 Hours'
  } else if (periodKey === '1W') {
    periodStart = new Date(generatedAt.getTime() - 7 * 24 * 60 * 60 * 1000)
    chartSectionTitle = 'Transaction Volume — Last 7 Days'
  } else if (periodKey === '1M') {
    periodStart = new Date(generatedAt.getTime() - 30 * 24 * 60 * 60 * 1000)
    chartSectionTitle = 'Transaction Volume — Last 30 Days'
  } else if (isCustomPeriod || periodKey === 'Custom') {
    let sD = new Date((chartPeriod.startDate || '') + 'T00:00:00')
    let eD = new Date((chartPeriod.endDate || '') + 'T23:59:59.999')
    if (isNaN(sD.getTime())) sD = new Date(generatedAt.getTime() - 7 * 24 * 60 * 60 * 1000)
    if (isNaN(eD.getTime())) eD = generatedAt

    if (sD.getTime() > eD.getTime()) {
      const temp = sD
      sD = eD
      eD = temp
    }
    periodStart = sD
    periodEnd = eD

    if (periodStart.getFullYear() === periodEnd.getFullYear()) {
      chartSectionTitle = `Transaction Volume — ${formatShortDate(periodStart)} to ${formatFullDate(periodEnd)}`
    } else {
      chartSectionTitle = `Transaction Volume — ${formatFullDate(periodStart)} to ${formatFullDate(periodEnd)}`
    }
  } else {
    periodStart = new Date(generatedAt.getTime() - 24 * 60 * 60 * 1000)
    chartSectionTitle = 'Transaction Volume — Last 24 Hours'
  }

  // Filter transactions
  const rawTxList = Array.isArray(allTransactions) ? allTransactions : []
  const txList = rawTxList.filter((t) => {
    if (!t.timestamp) return false
    const tTime = new Date(t.timestamp).getTime()
    return tTime >= periodStart.getTime() && tTime <= periodEnd.getTime()
  })

  const totalTxCount = txList.length
  const totalAmountTransferred = txList.reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
  const avgTxAmount = totalTxCount > 0 ? totalAmountTransferred / totalTxCount : 0

  // Calculate Volume & Count Data for Chart
  const dailyData = []
  const diffMs = periodEnd.getTime() - periodStart.getTime()
  const diffDays = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)))

  if (diffDays <= 1) {
    for (let i = 0; i < 6; i++) {
      const bStart = new Date(periodStart.getTime() + i * 4 * 60 * 60 * 1000)
      const bEnd = new Date(bStart.getTime() + 4 * 60 * 60 * 1000)
      const label = bStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

      let volume = 0
      let count = 0
      txList.forEach((t) => {
        const tTime = new Date(t.timestamp).getTime()
        if (tTime >= bStart.getTime() && tTime < bEnd.getTime()) {
          volume += Number(t.amount) || 0
          count += 1
        }
      })
      dailyData.push({ dayStr: `h-${i}`, label, volume, count })
    }
  } else {
    const numBuckets = Math.min(diffDays, 10)
    const daysPerBucket = diffDays / numBuckets

    for (let i = 0; i < numBuckets; i++) {
      const bStart = new Date(periodStart.getTime() + i * daysPerBucket * 24 * 60 * 60 * 1000)
      const bEnd = new Date(periodStart.getTime() + (i + 1) * daysPerBucket * 24 * 60 * 60 * 1000)
      const label = bStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

      let volume = 0
      let count = 0
      txList.forEach((t) => {
        const tTime = new Date(t.timestamp).getTime()
        if (tTime >= bStart.getTime() && tTime <= bEnd.getTime()) {
          volume += Number(t.amount) || 0
          count += 1
        }
      })
      dailyData.push({ dayStr: `d-${i}`, label, volume, count })
    }
  }

  const maxVol = Math.max(...dailyData.map((d) => d.volume), 1000)

  // Top 20 recent transactions in period
  const recentTransactions = [...txList]
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 20)

  const formatINR = (val) => {
    return 'INR ' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatShortINR = (val) => {
    const num = Number(val || 0)
    if (num >= 100000) return 'INR ' + (num / 100000).toFixed(1) + 'L'
    if (num >= 1000) return 'INR ' + (num / 1000).toFixed(1) + 'k'
    return 'INR ' + Math.round(num)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'N/A'
    return (
      d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) +
      ', ' +
      d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    )
  }

  return (
    <div
      id="blockbank-report-template"
      style={{
        width: '800px',
        backgroundColor: '#ffffff',
        color: '#1e293b',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        padding: '36px',
        boxSizing: 'border-box'
      }}
    >
      {/* Corporate Letterhead Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
            BLOCKBANK
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
            Financial & System Administration Report
          </p>
        </div>

        <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569', lineHeight: '1.5' }}>
          <div><strong>Date:</strong> {formattedDateStr}</div>
          <div><strong>Generated By:</strong> {adminName}</div>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: '#cbd5e1', marginBottom: '24px' }} />

      {/* Executive Summary */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0' }}>
          Executive Summary
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Total Accounts</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{totUsers}</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Approved Users</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{appCount}</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Pending Review</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{pendCount}</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Period Volume</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{formatShortINR(totalAmountTransferred)}</div>
          </div>
        </div>
      </div>

      {/* Financial Indicators */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0' }}>
          Financial Key Indicators
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Total Transactions</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{totalTxCount}</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Avg Transfer Value</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{formatShortINR(avgTxAmount)}</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Period Activity</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{totalTxCount} txns</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Rejected Accounts</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{rejCount}</div>
          </div>
        </div>
      </div>

      {/* Transaction Volume Chart */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
            {chartSectionTitle}
          </h2>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            <span style={{ color: '#1e293b', fontWeight: 'bold' }}>■ Volume (INR)</span> &nbsp;|&nbsp; <span style={{ color: '#0d9488', fontWeight: 'bold' }}>• Txn Count</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', paddingBottom: '24px', borderBottom: '1px solid #cbd5e1', position: 'relative' }}>
            {dailyData.map((d) => {
              const barH = Math.max((d.volume / maxVol) * 100, d.volume > 0 ? 6 : 2)
              return (
                <div key={d.dayStr} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  {d.volume > 0 && (
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                      {formatShortINR(d.volume)}
                    </span>
                  )}
                  <div
                    style={{
                      width: '24px',
                      height: `${barH}px`,
                      backgroundColor: '#1e293b',
                      borderRadius: '2px 2px 0 0'
                    }}
                  />
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#0d9488', marginTop: '4px' }}>
                    {d.count} txns
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    {d.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '8px' }}>
            <span>Y-Axis: Volume (INR)</span>
            <span style={{ marginLeft: 'auto' }}>X-Axis: Date (Selected Period)</span>
          </div>
        </div>
      </div>

      {/* Recent Transactions Ledger */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0' }}>
          Recent Transaction History
        </h2>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '700', fontSize: '10px' }}>
                <th style={{ padding: '8px 12px' }}>Date & Time</th>
                <th style={{ padding: '8px 12px' }}>Transaction ID</th>
                <th style={{ padding: '8px 12px' }}>Sender</th>
                <th style={{ padding: '8px 12px' }}>Receiver</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                    No transactions recorded in selected period.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((t, idx) => {
                  const isFailed = t.status === 'failed'
                  return (
                    <tr
                      key={t._id || t.transactionId || idx}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0'
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontSize: '10px', color: '#475569' }}>
                        {formatDate(t.timestamp)}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: '700', color: '#1e293b', fontSize: '10px' }}>
                        {t.transactionId || 'N/A'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{t.senderName || 'N/A'}</div>
                        <div style={{ fontSize: '9px', color: '#64748b' }}>{t.senderPaymentId || ''}</div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{t.receiverName || 'N/A'}</div>
                        <div style={{ fontSize: '9px', color: '#64748b' }}>{t.receiverPaymentId || ''}</div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#1e293b', fontSize: '10px' }}>
                        {formatINR(t.amount)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            color: isFailed ? '#e11d48' : '#0d9488'
                          }}
                        >
                          {(t.status || 'success').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div style={{ paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
        <div>BlockBank Operations & Financial Statement</div>
      </div>
    </div>
  )
}
