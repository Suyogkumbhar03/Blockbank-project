import { useState, useEffect, useMemo, useRef } from 'react'
import api from '../services/api'

export default function TransactionVolumeChart() {
  const [chartRange, setChartRange] = useState('1D') // '1D' | '1W' | '1M'
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const containerRef = useRef(null)

  // Fetch transactions from backend
  const fetchTransactions = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/admin/transactions')
      if (Array.isArray(res.data)) {
        setTransactions(res.data)
      }
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch transactions for volume chart', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchTransactions()
  }, [])

  // Real-time polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions(true)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Aggregate volume based on chartRange
  const chartData = useMemo(() => {
    const now = new Date()
    let buckets = []

    if (chartRange === '1D') {
      // 24 hourly buckets for the last 24 hours
      for (let i = 23; i >= 0; i--) {
        const start = new Date(now.getTime() - i * 60 * 60 * 1000)
        start.setMinutes(0, 0, 0)
        const end = new Date(start.getTime() + 60 * 60 * 1000)

        const label = start.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })

        // Ensure last item (i === 0) gets a visible label
        buckets.push({
          start,
          end,
          label: (i % 4 === 0 || i === 0) ? label : '',
          fullLabel: `${start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}, ${label}`,
          volume: 0,
          count: 0
        })
      }
    } else if (chartRange === '1W') {
      // 7 daily buckets for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const start = new Date(now)
        start.setDate(now.getDate() - i)
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setHours(23, 59, 59, 999)

        const label = i === 0 ? 'Today' : start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })

        buckets.push({
          start,
          end,
          label,
          fullLabel: start.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
          volume: 0,
          count: 0
        })
      }
    } else if (chartRange === '1M') {
      // 15 2-day buckets for the last 30 days
      for (let i = 14; i >= 0; i--) {
        const start = new Date(now)
        start.setDate(now.getDate() - (i * 2 + 1))
        start.setHours(0, 0, 0, 0)
        const end = new Date(now)
        end.setDate(now.getDate() - (i * 2))
        end.setHours(23, 59, 59, 999)

        const label = start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })

        buckets.push({
          start,
          end,
          label: (i % 2 === 0 || i === 0) ? label : '',
          fullLabel: `${start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
          volume: 0,
          count: 0
        })
      }
    }

    // Populate transaction data into buckets
    transactions.forEach(tx => {
      if (!tx.timestamp) return
      const txTime = new Date(tx.timestamp).getTime()
      const amt = Number(tx.amount) || 0

      const bucket = buckets.find(b => txTime >= b.start.getTime() && txTime <= b.end.getTime())
      if (bucket) {
        bucket.volume += amt
        bucket.count += 1
      }
    })

    const volumes = buckets.map(b => b.volume)
    const totalPeriodVolume = volumes.reduce((a, b) => a + b, 0)
    const maxVolume = Math.max(...volumes, 1000) // Fallback 1000 for nice scale

    return {
      buckets,
      totalPeriodVolume,
      maxVolume
    }
  }, [transactions, chartRange])

  // Dimensions & Padding for SVG to guarantee rightmost point is 100% visible
  const width = 1000
  const height = 280
  const paddingLeft = 55
  const paddingRight = 75 // Generous right padding so rightmost point & label are never cut off
  const paddingTop = 30
  const paddingBottom = 45

  const points = useMemo(() => {
    const { buckets, maxVolume } = chartData
    const n = buckets.length
    if (n === 0) return []

    const chartW = width - paddingLeft - paddingRight
    const chartH = height - paddingTop - paddingBottom

    return buckets.map((b, i) => {
      const x = paddingLeft + (i / (n - 1 || 1)) * chartW
      const y = height - paddingBottom - (b.volume / maxVolume) * chartH
      return {
        ...b,
        x,
        y
      }
    })
  }, [chartData])

  // Build SVG Path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' }

    let d = `M ${points[0].x},${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      const cpX = (curr.x + next.x) / 2
      d += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`
    }

    const area = `${d} L ${points[points.length - 1].x},${height - paddingBottom} L ${points[0].x},${height - paddingBottom} Z`
    return { linePath: d, areaPath: area }
  }, [points])

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-6 shadow-sm flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-on-surface">System Transaction Volume</h2>
            {/* Real-time badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </div>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Real-time aggregate transfer volume updated every 5 seconds.
          </p>
        </div>

        {/* Controls: Range selector */}
        <div className="flex items-center gap-4">
          <div className="flex bg-surface-container rounded-lg p-1">
            {['1D', '1W', '1M'].map((range) => (
              <button
                key={range}
                onClick={() => setChartRange(range)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  chartRange === range
                    ? 'bg-surface-container-lowest shadow-sm text-on-surface'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-outline-variant/30 text-xs font-mono">
        <div>
          <span className="text-on-surface-variant text-[11px] font-semibold uppercase tracking-wider block">Period Volume</span>
          <span className="font-extrabold text-base text-primary">
            ₹{chartData.totalPeriodVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="h-8 w-px bg-outline-variant/40 hidden sm:block"></div>
        <div>
          <span className="text-on-surface-variant text-[11px] font-semibold uppercase tracking-wider block">Last Sync</span>
          <span className="font-medium text-on-surface-variant">
            {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={containerRef} className="relative w-full h-[280px] bg-surface-container-low/40 rounded-xl border border-outline-variant/40 p-2 overflow-visible">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-xs z-20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-on-surface-variant">Updating live data...</span>
            </div>
          </div>
        ) : null}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="volumeChartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid Horizontal Lines */}
          {[0, 0.33, 0.66, 1].map((pct, idx) => {
            const y = paddingTop + pct * (height - paddingTop - paddingBottom)
            const val = chartData.maxVolume * (1 - pct)
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--color-outline-variant)"
                  strokeOpacity="0.3"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="var(--color-on-surface-variant)"
                  opacity="0.7"
                >
                  ₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                </text>
              </g>
            )
          })}

          {/* Area Fill */}
          {areaPath && (
            <path d={areaPath} fill="url(#volumeChartGradient)" />
          )}

          {/* Line Path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#0f172a"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points & Interactive Hover Circles */}
          {points.map((pt, idx) => (
            <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)}>
              {/* Invisible larger target for easy hovering */}
              <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

              {/* Visible dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint?.x === pt.x ? '6' : '4.5'}
                fill={hoveredPoint?.x === pt.x ? '#0f172a' : '#ffffff'}
                stroke="#0f172a"
                strokeWidth="2.5"
                className="transition-all duration-150"
              />
            </g>
          ))}

          {/* X Axis Labels */}
          {points.map((pt, idx) => {
            if (!pt.label) return null
            return (
              <text
                key={idx}
                x={pt.x}
                y={height - 12}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fontFamily="sans-serif"
                fill="var(--color-on-surface-variant)"
              >
                {pt.label}
              </text>
            )
          })}
        </svg>

        {/* Floating Tooltip Card with smart positioning to prevent right/left edge clipping */}
        {hoveredPoint && (() => {
          const pctX = (hoveredPoint.x / width) * 100
          // Shift tooltip left if near right edge (>75%), right if near left edge (<15%), else center
          const translateX = pctX > 75 ? '-translate-x-full' : pctX < 15 ? 'translate-x-0' : '-translate-x-1/2'

          return (
            <div
              className={`absolute z-30 pointer-events-none bg-slate-900 text-white rounded-lg p-3 shadow-xl text-xs font-sans transform ${translateX} -translate-y-full border border-slate-700 transition-all duration-75`}
              style={{
                left: `${pctX}%`,
                top: `${(hoveredPoint.y / height) * 100 - 8}%`
              }}
            >
              <div className="font-bold text-[11px] text-slate-300 mb-1 border-b border-slate-700 pb-1">
                {hoveredPoint.fullLabel}
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Volume:</span>
                <span className="font-extrabold text-emerald-400 font-mono">
                  ₹{hoveredPoint.volume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 mt-0.5">
                <span className="text-slate-400">Transactions:</span>
                <span className="font-bold font-mono text-white">{hoveredPoint.count} txns</span>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
