import React from 'react'
import { Handle, Position } from '@xyflow/react'

export default function PaymentBlockNode({ data }) {
  const isGenesis = data.index === 0
  const severity = data.severity // 'OK' | 'WARNING' | 'CRITICAL' | undefined
  const reasons = data.reasons || []

  const isOk = severity === 'OK'
  const isWarning = severity === 'WARNING'
  const isCritical = severity === 'CRITICAL'

  const truncatedTxId = data.transactionId
    ? (data.transactionId.length > 12 ? `${data.transactionId.substring(0, 12)}...` : data.transactionId)
    : 'N/A'

  const truncatedPrevHash = data.previousHash
    ? (data.previousHash.length > 10 ? `${data.previousHash.substring(0, 10)}...` : data.previousHash)
    : '0'

  const truncatedHash = data.hash
    ? (data.hash.length > 10 ? `${data.hash.substring(0, 10)}...` : data.hash)
    : 'N/A'

  // Dynamic styling based on validation severity
  let cardClass = 'bg-surface-container-lowest border-outline-variant hover:border-primary/70 text-on-surface'
  let headerColor = 'text-primary'

  if (isCritical) {
    cardClass = 'bg-red-50/95 border-2 border-red-500 text-red-950 shadow-md ring-1 ring-red-400/30'
    headerColor = 'text-red-700'
  } else if (isWarning) {
    cardClass = 'bg-amber-50/90 border-2 border-amber-500 text-amber-950 shadow-md ring-1 ring-amber-400/30'
    headerColor = 'text-amber-800'
  } else if (isOk) {
    cardClass = 'bg-emerald-50/15 border-2 border-emerald-500 text-on-surface shadow-sm'
    headerColor = 'text-emerald-700'
  } else if (isGenesis) {
    cardClass = 'bg-surface-container-lowest border-2 border-blue-500/70 text-on-surface'
    headerColor = 'text-blue-700'
  }

  return (
    <div
      onClick={() => data.onSelect && data.onSelect()}
      className={`w-[270px] rounded-xl p-4 transition-all duration-200 cursor-pointer text-xs font-sans border shadow-sm hover:shadow-md ${cardClass}`}
    >
      {/* Left Input Handle */}
      {!isGenesis && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-slate-400 border-2 border-white"
        />
      )}

      {/* Block Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2 mb-3">
        <span className={`font-bold font-mono tracking-tight text-sm ${headerColor}`}>
          BLOCK #{data.index}
        </span>

        {/* Severity Badge */}
        {isCritical ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-900 border border-red-300 rounded-md text-[10px] font-bold">
            <span className="material-symbols-outlined text-[13px] text-red-600">error</span>
            Tampered
          </span>
        ) : isWarning ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[10px] font-bold">
            <span className="material-symbols-outlined text-[13px] text-amber-600">warning</span>
            Warning
          </span>
        ) : isOk ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-[10px] font-bold">
            <span className="material-symbols-outlined text-[13px] text-emerald-600 font-bold">check_circle</span>
            Healthy
          </span>
        ) : isGenesis ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-extrabold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Genesis
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container text-on-surface-variant border border-outline-variant rounded-md text-[10px] font-semibold uppercase">
            PoA Block
          </span>
        )}
      </div>

      {/* Block Content */}
      <div className="flex flex-col gap-1.5 text-on-surface">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="text-on-surface-variant">TX:</span>
          <span className="font-bold text-on-surface truncate max-w-[170px]" title={data.transactionId}>
            {truncatedTxId}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-on-surface truncate max-w-[110px]" title={data.senderName}>
            {data.senderName || 'N/A'}
          </span>
          <span className="text-on-surface-variant font-bold">→</span>
          <span className="font-semibold text-on-surface truncate max-w-[110px]" title={data.receiverName}>
            {data.receiverName || 'N/A'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-outline-variant/30">
          <span className="text-on-surface-variant font-medium text-[11px]">Amount:</span>
          <span className={`font-extrabold font-mono text-xs ${isCritical ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-emerald-600'}`}>
            ₹{(data.amount || 0).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Hashes Section */}
        <div className="mt-1 pt-1.5 border-t border-outline-variant/30 text-[10px] font-mono flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span>Prev:</span>
            <span className="truncate max-w-[160px]" title={data.previousHash}>
              {truncatedPrevHash}
            </span>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span>Hash:</span>
            <span className="font-semibold text-on-surface truncate max-w-[160px]" title={data.hash}>
              {truncatedHash}
            </span>
          </div>
        </div>

        {/* Plain English Reason below each failed check inside the block card */}
        {reasons && reasons.length > 0 && (
          <div className={`mt-2 pt-2 border-t flex flex-col gap-1.5 ${isCritical ? 'border-red-200' : 'border-amber-200'}`}>
            {reasons.map((reason, idx) => (
              <div
                key={idx}
                className={`p-1.5 rounded-md text-[10px] font-medium leading-snug flex items-start gap-1.5 ${
                  isCritical
                    ? 'bg-red-100/90 text-red-950 border border-red-200'
                    : 'bg-amber-100/90 text-amber-950 border border-amber-200'
                }`}
              >
                <span className={`material-symbols-outlined text-[13px] shrink-0 mt-0.5 ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                  {isCritical ? 'error' : 'warning'}
                </span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-slate-400 border-2 border-white"
      />
    </div>
  )
}
