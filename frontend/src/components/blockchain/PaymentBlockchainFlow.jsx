import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import PaymentBlockNode from './PaymentBlockNode'
import { buildBlockchainNodes, buildBlockchainEdges } from './blockchainFlowUtils'

export default function PaymentBlockchainFlow({
  paymentChain = [],
  validationResults = null,
  validationStatus = 'not_run'
}) {
  const [selectedBlockData, setSelectedBlockData] = useState(null)

  // Custom node types definition
  const nodeTypes = useMemo(() => ({ paymentBlock: PaymentBlockNode }), [])

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const handleSelectBlock = (block, validation) => {
    setSelectedBlockData({ block, validation })
  }

  // Convert validationResults array into map for fast lookup
  const validationResultsMap = useMemo(() => {
    if (!validationResults) return null
    if (Array.isArray(validationResults)) {
      const map = {}
      for (const item of validationResults) {
        map[item.index] = item
      }
      return map
    }
    return validationResults
  }, [validationResults])

  useEffect(() => {
    if (Array.isArray(paymentChain)) {
      const generatedNodes = buildBlockchainNodes(paymentChain, handleSelectBlock, validationResultsMap)
      const generatedEdges = buildBlockchainEdges(paymentChain, validationResultsMap)
      setNodes(generatedNodes)
      setEdges(generatedEdges)
    }
  }, [paymentChain, validationResultsMap, setNodes, setEdges])

  const formatFullDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const d = new Date(timestamp)
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
        second: '2-digit',
        hour12: true
      })
    )
  }

  const hasRunValidation = validationStatus !== 'not_run' && validationResultsMap !== null

  return (
    <div className="w-full flex flex-col gap-3 mb-6">
      {/* Top Legend and Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
          <h3 className="font-bold text-sm text-on-surface tracking-tight">
            Visual Blockchain — <span className="font-mono text-primary">{paymentChain.length}</span> Blocks
          </h3>
        </div>

        {/* Legend Pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          {hasRunValidation ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full">
                <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                Healthy (No issues)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-300 rounded-full">
                <span className="material-symbols-outlined text-[13px] text-amber-600">warning</span>
                Warning (Structural issue)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-300 rounded-full">
                <span className="material-symbols-outlined text-[13px] text-red-600">error</span>
                Tampered (Compromised)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-dashed border-red-400 rounded-full">
                <span className="text-[12px] font-bold text-red-600">✕</span>
                Broken Chain Link
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Genesis Block
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container text-on-surface-variant border border-outline-variant rounded-full">
                <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                PoA Ledger Block
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main React Flow Canvas */}
      <div className="w-full h-[480px] bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm relative">
        {paymentChain.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] mb-2 opacity-50">link_off</span>
            <p className="text-sm font-medium">No payment blocks available to visualize.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            nodesConnectable={false}
            nodesDraggable={true}
            elementsSelectable={true}
            panOnScroll={true}
            zoomOnPinch={true}
            minZoom={0.2}
            maxZoom={1.8}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={16} size={1} color="#cbd5e1" />
            <Controls position="bottom-right" />
            <MiniMap
              position="bottom-left"
              nodeColor={(node) => {
                if (node.data?.severity === 'CRITICAL' || node.data?.validationStatus === 'FAIL') return '#ef4444'
                if (node.data?.severity === 'WARNING') return '#f59e0b'
                if (node.data?.severity === 'OK' || node.data?.validationStatus === 'PASS') return '#10b981'
                if (node.data?.index === 0) return '#3b82f6'
                return '#94a3b8'
              }}
              maskColor="rgba(241, 245, 249, 0.7)"
              className="!bg-white/90 !border !border-outline-variant !rounded-lg"
            />
          </ReactFlow>
        )}
      </div>

      {/* Block Details Modal Popover */}
      {selectedBlockData &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 99999 }}
            onClick={() => setSelectedBlockData(null)}
          >
            <div
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-on-surface"
              style={{ width: '92vw', maxWidth: '540px', minWidth: '280px', margin: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">view_in_ar</span>
                  <h4 className="font-bold text-base text-on-surface font-mono">
                    BLOCK #{selectedBlockData.block.index} DETAILS
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedBlockData(null)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs font-sans">
                {/* Validation Status Banner if available */}
                {selectedBlockData.validation ? (
                  <div
                    className={`p-3.5 rounded-xl border flex flex-col gap-2.5 ${
                      selectedBlockData.validation.severity === 'CRITICAL'
                        ? 'bg-red-50 text-red-950 border-red-300'
                        : selectedBlockData.validation.severity === 'WARNING'
                        ? 'bg-amber-50 text-amber-950 border-amber-300'
                        : 'bg-emerald-50 text-emerald-950 border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">
                          {selectedBlockData.validation.severity === 'CRITICAL'
                            ? 'error'
                            : selectedBlockData.validation.severity === 'WARNING'
                            ? 'warning'
                            : 'verified'}
                        </span>
                        Status:{' '}
                        {selectedBlockData.validation.severity === 'CRITICAL'
                          ? 'Tampered'
                          : selectedBlockData.validation.severity === 'WARNING'
                          ? 'Warning'
                          : 'Healthy'}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                          selectedBlockData.validation.severity === 'CRITICAL'
                            ? 'bg-red-200 text-red-900'
                            : selectedBlockData.validation.severity === 'WARNING'
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-emerald-200 text-emerald-900'
                        }`}
                      >
                        {selectedBlockData.validation.severity === 'OK'
                          ? 'Healthy'
                          : selectedBlockData.validation.severity === 'WARNING'
                          ? 'Structural Issue'
                          : 'Tampered Block'}
                      </span>
                    </div>

                    {/* Plain English Issues List if any */}
                    {selectedBlockData.validation.reasons && selectedBlockData.validation.reasons.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-2 border-t border-current/20">
                        <span className="font-bold text-[11px] uppercase tracking-wide opacity-80">Identified Issues:</span>
                        {selectedBlockData.validation.reasons.map((r, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] font-medium leading-relaxed">
                            <span className="material-symbols-outlined text-[13px] shrink-0 mt-0.5">chevron_right</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Plain English Detailed Checks Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-current/20 text-[11px]">
                      <div className="bg-white/70 p-2 rounded-lg border border-current/10">
                        <span className="block opacity-75 font-semibold text-[10px]">Index Order</span>
                        <span className={`font-bold ${selectedBlockData.validation.indexValid !== false ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {selectedBlockData.validation.indexValid !== false ? '✓ Correct' : '✕ Out of order'}
                        </span>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-current/10">
                        <span className="block opacity-75 font-semibold text-[10px]">Time Order</span>
                        <span className={`font-bold ${selectedBlockData.validation.timestampValid !== false ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {selectedBlockData.validation.timestampValid !== false ? '✓ Correct' : '✕ Reordered'}
                        </span>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-current/10">
                        <span className="block opacity-75 font-semibold text-[10px]">Bank Record</span>
                        <span className={`font-bold ${selectedBlockData.validation.transactionExists && selectedBlockData.validation.transactionMatches ? 'text-emerald-700' : 'text-red-700'}`}>
                          {selectedBlockData.validation.transactionExists && selectedBlockData.validation.transactionMatches ? '✓ Verified' : '✕ Mismatch'}
                        </span>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-current/10">
                        <span className="block opacity-75 font-semibold text-[10px]">Digital Fingerprint</span>
                        <span className={`font-bold ${selectedBlockData.validation.hashValid ? 'text-emerald-700' : 'text-red-700'}`}>
                          {selectedBlockData.validation.hashValid ? '✓ Valid' : '✕ Tampered'}
                        </span>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-current/10">
                        <span className="block opacity-75 font-semibold text-[10px]">Bank Signature</span>
                        <span className={`font-bold ${selectedBlockData.validation.signatureValid ? 'text-emerald-700' : 'text-red-700'}`}>
                          {selectedBlockData.validation.signatureValid ? '✓ Valid' : '✕ Invalid'}
                        </span>
                      </div>
                      <div className="bg-white/70 p-2 rounded-lg border border-current/10">
                        <span className="block opacity-75 font-semibold text-[10px]">Chain Link</span>
                        <span className={`font-bold ${selectedBlockData.validation.linkValid ? 'text-emerald-700' : 'text-red-700'}`}>
                          {selectedBlockData.validation.linkValid ? '✓ Intact' : '✕ Broken'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">info</span>
                    <span>Validation not run on this block yet. Click 'Validate Chain' above.</span>
                  </div>
                )}

                {/* Transaction Meta Grid */}
                <div className="grid grid-cols-2 gap-3 bg-surface-container-low/60 border border-outline-variant/60 p-3 rounded-xl">
                  <div>
                    <div className="text-on-surface-variant text-[11px] font-medium">Transaction ID</div>
                    <div className="font-mono font-bold text-on-surface break-all mt-0.5">
                      {selectedBlockData.block.transactionId || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-on-surface-variant text-[11px] font-medium">Amount</div>
                    <div className="font-mono font-bold text-emerald-600 text-sm mt-0.5">
                      ₹{(selectedBlockData.block.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Sender & Receiver Info */}
                <div className="grid grid-cols-2 gap-3 bg-surface-container-low/60 border border-outline-variant/60 p-3 rounded-xl">
                  <div>
                    <div className="text-on-surface-variant text-[11px] font-medium">Sender</div>
                    <div className="font-bold text-on-surface mt-0.5">
                      {selectedBlockData.block.senderName || 'N/A'}
                    </div>
                    <div className="text-[10px] font-mono text-on-surface-variant">
                      {selectedBlockData.block.senderPaymentId || ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-on-surface-variant text-[11px] font-medium">Receiver</div>
                    <div className="font-bold text-on-surface mt-0.5">
                      {selectedBlockData.block.receiverName || 'N/A'}
                    </div>
                    <div className="text-[10px] font-mono text-on-surface-variant">
                      {selectedBlockData.block.receiverPaymentId || ''}
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div>
                  <div className="text-on-surface-variant text-[11px] font-medium mb-1">Timestamp</div>
                  <div className="font-mono text-on-surface bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                    {formatFullDate(selectedBlockData.block.timestamp)}
                  </div>
                </div>

                {/* Previous Hash */}
                <div>
                  <div className="text-on-surface-variant text-[11px] font-medium mb-1">Previous Hash</div>
                  <div className="font-mono text-[11px] text-on-surface break-all bg-surface-container-low p-2 rounded-lg border border-outline-variant/40 select-all">
                    {selectedBlockData.block.previousHash || '0'}
                  </div>
                </div>

                {/* Current Hash */}
                <div>
                  <div className="text-on-surface-variant text-[11px] font-medium mb-1">Current Block Hash</div>
                  <div className="font-mono text-[11px] text-on-surface break-all bg-surface-container-low p-2 rounded-lg border border-outline-variant/40 select-all">
                    {selectedBlockData.block.hash || 'N/A'}
                  </div>
                </div>

                {/* Authority Signature */}
                {selectedBlockData.block.signature && (
                  <div>
                    <div className="text-on-surface-variant text-[11px] font-medium mb-1">Authority Signature</div>
                    <div className="font-mono text-[10px] text-on-surface-variant break-all bg-surface-container-low p-2 rounded-lg border border-outline-variant/40 select-all">
                      {selectedBlockData.block.signature}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-surface-container-low border-t border-outline-variant flex justify-end">
                <button
                  onClick={() => setSelectedBlockData(null)}
                  className="px-4 py-1.5 bg-primary text-on-primary rounded-lg font-bold text-xs hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
