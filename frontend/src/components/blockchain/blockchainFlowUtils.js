import { MarkerType } from '@xyflow/react'

/**
 * Validates a payment block against Proof-of-Authority (PoA) hash rules.
 * Check 1: Genesis block (index === 0)
 * Check 2: Explicit isValid property if returned by backend
 * Check 3: Link integrity check (previousHash === prevBlock.hash)
 */
export function validatePaymentBlock(block, prevBlock) {
  if (!block) return { isValid: false, status: 'tampered', label: 'Tampered Block' }

  if (block.index === 0) {
    return { isValid: true, status: 'genesis', label: 'Genesis' }
  }

  // If backend provided isValid explicitly
  if (typeof block.isValid === 'boolean') {
    if (!block.isValid) {
      return { isValid: false, status: 'tampered', label: 'Tampered Block' }
    }
  }

  // Check link integrity if previous block exists
  if (prevBlock && prevBlock.hash && block.previousHash) {
    if (block.previousHash !== prevBlock.hash) {
      return { isValid: false, status: 'tampered', label: 'Tampered Block' }
    }
  }

  return { isValid: true, status: 'verified', label: 'PoA Verified' }
}

/**
 * Converts array of payment blocks into React Flow node objects.
 */
export function buildBlockchainNodes(blocks = [], onSelectBlock) {
  if (!Array.isArray(blocks) || blocks.length === 0) return []

  const nodes = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const prevBlock = i > 0 ? blocks[i - 1] : null
    const validation = validatePaymentBlock(block, prevBlock)

    nodes.push({
      id: `block-${block.index}`,
      type: 'paymentBlock',
      position: { x: i * 340, y: 70 },
      data: {
        ...block,
        isValid: validation.isValid,
        statusType: validation.status,
        statusLabel: validation.label,
        onSelect: () => onSelectBlock && onSelectBlock(block, validation)
      }
    })
  }

  return nodes
}

/**
 * Converts array of payment blocks into React Flow edge objects.
 */
export function buildBlockchainEdges(blocks = []) {
  if (!Array.isArray(blocks) || blocks.length <= 1) return []

  const edges = []
  for (let i = 0; i < blocks.length - 1; i++) {
    const currentBlock = blocks[i]
    const nextBlock = blocks[i + 1]
    const nextValidation = validatePaymentBlock(nextBlock, currentBlock)

    const isTampered = !nextValidation.isValid

    edges.push({
      id: `edge-${currentBlock.index}-${nextBlock.index}`,
      source: `block-${currentBlock.index}`,
      target: `block-${nextBlock.index}`,
      label: 'previousHash',
      type: 'smoothstep',
      animated: !isTampered,
      style: {
        stroke: isTampered ? '#ef4444' : '#0284c7',
        strokeWidth: isTampered ? 2.5 : 2,
        strokeDasharray: isTampered ? '5,5' : 'none'
      },
      labelStyle: {
        fill: isTampered ? '#ef4444' : '#64748b',
        fontSize: 10,
        fontWeight: 600,
        fontFamily: 'monospace'
      },
      labelBgStyle: {
        fill: '#ffffff',
        fillOpacity: 0.95,
        rx: 4,
        ry: 4
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isTampered ? '#ef4444' : '#0284c7',
        width: 18,
        height: 18
      }
    })
  }

  return edges
}
