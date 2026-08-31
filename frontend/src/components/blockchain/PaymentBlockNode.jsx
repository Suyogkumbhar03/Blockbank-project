import React from 'react'
import { Handle, Position } from '@xyflow/react'

export default function PaymentBlockNode({ data }) {
  const isGenesis = data.index === 0
  const isTampered = data.statusType === 'tampered' || data.isValid === false

  const truncatedTxId = data.transactionId
    ? (data.transactionId.length > 12 ? `${data.transactionId.substring(0, 12)}...` : data.transactionId)
    : 'N/A'

  const truncatedPrevHash = data.previousHash
    ? (data.previousHash.length > 10 ? `${data.previousHash.substring(0, 10)}...` : data.previousHash)
    : '0'

  const truncatedHash = data.hash
    ? (data.hash.length > 10 ? `${data.hash.substring(0, 10)}...` : data.hash)
    : 'N/A'

  return (
    <div
      onClick={() => data.onSelect && data.onSelect()}
      className={`w-[260px] rounded-xl p-4 transition-all duration-200 cursor-pointer text-xs font-sans border shadow-sm hover:shadow-md ${
        isTampered
          ? 'bg-red-50/90 border-2 border-red-500 text-red-950 animate-pulse'
          : isGenesis
          ? 'bg-surface-container-lowest border-2 border-blue-500/70 text-on-surface'
          : 'bg-surface-container-lowest border-outline-variant hover:border-primary/70 text-on-surface'
      }`}
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
        <span className={`font-bold font-mono tracking-tight text-sm ${isTampered ? 'text-red-700' : 'text-primary'}`}>
          BLOCK #{data.index}
        </span>
        {isTampered ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 border border-red-300 rounded-md text-[10px] font-extrabold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            Tampered
          </span>
        ) : isGenesis ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-extrabold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Genesis
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-extrabold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            PoA Verified
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
          <span className="font-extrabold font-mono text-emerald-600 text-xs">
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
