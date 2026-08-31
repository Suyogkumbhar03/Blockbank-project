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

export default function PaymentBlockchainFlow({ paymentChain = [] }) {
  const [selectedBlockData, setSelectedBlockData] = useState(null)

  // Custom node types definition
  const nodeTypes = useMemo(() => ({ paymentBlock: PaymentBlockNode }), [])

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const handleSelectBlock = (block, validation) => {
    setSelectedBlockData({ block, validation })
  }

  useEffect(() => {
    if (Array.isArray(paymentChain)) {
      const generatedNodes = buildBlockchainNodes(paymentChain, handleSelectBlock)
      const generatedEdges = buildBlockchainEdges(paymentChain)
      setNodes(generatedNodes)
      setEdges(generatedEdges)
    }
  }, [paymentChain, setNodes, setEdges])

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
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Genesis Block
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            PoA Verified
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-300 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            Tampered Block
          </span>
        </div>
      </div>

      {/* Main React Flow Canvas */}
      <div className="w-full h-[460px] bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm relative">
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
                if (node.data?.statusType === 'tampered') return '#ef4444'
                if (node.data?.index === 0) return '#3b82f6'
                return '#10b981'
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
              style={{ width: '92vw', maxWidth: '520px', minWidth: '280px', margin: 'auto' }}
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
                {/* Validation Status Banner */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    !selectedBlockData.validation.isValid
                      ? 'bg-red-50 text-red-800 border-red-300'
                      : selectedBlockData.block.index === 0
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <span className="font-bold text-sm flex items-center gap-2">
                    {selectedBlockData.validation.isValid
                      ? selectedBlockData.block.index === 0
                        ? '🔵 Genesis Block'
                        : '✅ PoA Verified'
                      : '⚠ Tampered Block'}
                  </span>
                  <span className="text-[11px] font-medium opacity-80">
                    {selectedBlockData.validation.isValid
                      ? 'Cryptographic chain link verified'
                      : 'Hash signature or chain link altered!'}
                  </span>
                </div>

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

                {/* Signature / Authority Info if available */}
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
