import { MarkerType } from '@xyflow/react'

/**
 * Converts array of payment blocks into React Flow node objects.
 * Supports validationResultsMap from GET /api/admin/payment-blockchain/validate.
 */
export function buildBlockchainNodes(blocks = [], onSelectBlock, validationResultsMap = null) {
  if (!Array.isArray(blocks) || blocks.length === 0) return []

  const nodes = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const validationResult = validationResultsMap ? validationResultsMap[block.index] : null

    const severity = validationResult?.severity || (validationResult ? (validationResult.status === 'PASS' ? 'OK' : 'CRITICAL') : undefined)
    const reasons = validationResult?.reasons || []

    nodes.push({
      id: `block-${block.index}`,
      type: 'paymentBlock',
      position: { x: i * 350, y: 70 },
      data: {
        ...block,
        validationStatus: validationResult ? validationResult.status : undefined, // 'PASS' | 'FAIL' | undefined
        severity, // 'OK' | 'WARNING' | 'CRITICAL' | undefined
        reasons,
        validationResult,
        onSelect: () => onSelectBlock && onSelectBlock(block, validationResult)
      }
    })
  }

  return nodes
}

/**
 * Converts array of payment blocks into React Flow edge objects.
 * Shows red dashed line with '✕ Broken Chain' if validation failed between blocks.
 */
export function buildBlockchainEdges(blocks = [], validationResultsMap = null) {
  if (!Array.isArray(blocks) || blocks.length <= 1) return []

  const edges = []
  for (let i = 0; i < blocks.length - 1; i++) {
    const currentBlock = blocks[i]
    const nextBlock = blocks[i + 1]

    let isBroken = false

    if (validationResultsMap) {
      const currResult = validationResultsMap[currentBlock.index]
      const nextResult = validationResultsMap[nextBlock.index]

      const currSeverity = currResult?.severity || (currResult?.status === 'FAIL' ? 'CRITICAL' : 'OK')
      const nextSeverity = nextResult?.severity || (nextResult?.status === 'FAIL' ? 'CRITICAL' : 'OK')

      // A connection is visually broken if current or next block is CRITICAL, or link is broken, or blocks out of order
      if (
        currSeverity === 'CRITICAL' ||
        nextSeverity === 'CRITICAL' ||
        currResult?.linkValid === false ||
        nextResult?.linkValid === false ||
        nextResult?.indexValid === false ||
        currResult?.status === 'FAIL' ||
        nextResult?.status === 'FAIL'
      ) {
        isBroken = true
      }
    }

    edges.push({
      id: `edge-${currentBlock.index}-${nextBlock.index}`,
      source: `block-${currentBlock.index}`,
      target: `block-${nextBlock.index}`,
      label: isBroken ? '✕ Broken Chain' : 'previousHash',
      type: 'smoothstep',
      animated: !isBroken,
      style: {
        stroke: isBroken ? '#ef4444' : '#0284c7',
        strokeWidth: isBroken ? 2.5 : 2,
        strokeDasharray: isBroken ? '6,6' : 'none'
      },
      labelStyle: {
        fill: isBroken ? '#dc2626' : '#64748b',
        fontSize: 10,
        fontWeight: isBroken ? 800 : 600,
        fontFamily: 'monospace'
      },
      labelBgStyle: {
        fill: isBroken ? '#fef2f2' : '#ffffff',
        fillOpacity: 0.98,
        stroke: isBroken ? '#ef4444' : '#cbd5e1',
        strokeWidth: isBroken ? 1.5 : 1,
        rx: 4,
        ry: 4
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isBroken ? '#ef4444' : '#0284c7',
        width: 18,
        height: 18
      }
    })
  }

  return edges
}
