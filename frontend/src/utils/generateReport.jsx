import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * generateReport - Clean corporate financial report generator for BlockBank.
 * Uses ASCII 'INR' formatting to prevent Helvetica font encoding replacing Rupee symbol with '¹'.
 * AutoTable columns sized properly so amounts and status tags are never clipped.
 */
export async function generateReport(reportData = {}) {
  const {
    adminName = 'Admin',
    totalUsers = 0,
    approvedUsers = 0,
    pendingUsers = 0,
    rejectedUsers = 0,
    allTransactions = [],
    chartPeriod = '1D'
  } = reportData

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

  // Filter transactions to selected period
  const rawTxList = Array.isArray(allTransactions) ? allTransactions : []
  const txList = rawTxList.filter((t) => {
    if (!t.timestamp) return false
    const tTime = new Date(t.timestamp).getTime()
    return tTime >= periodStart.getTime() && tTime <= periodEnd.getTime()
  })

  const totalTxCount = txList.length
  const totalAmountTransferred = txList.reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
  const avgTxAmount = totalTxCount > 0 ? totalAmountTransferred / totalTxCount : 0

  // Calculate Volume and Transaction Count Data for Chart
  const dailyData = []
  const diffMs = periodEnd.getTime() - periodStart.getTime()
  const diffDays = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)))

  if (diffDays <= 1) {
    // 6 4-hour buckets for 1-day range
    for (let i = 0; i < 6; i++) {
      const bStart = new Date(periodStart.getTime() + i * 4 * 60 * 60 * 1000)
      const bEnd = new Date(bStart.getTime() + 4 * 60 * 60 * 1000)
      const dateLabel = bStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

      let volume = 0
      let count = 0
      txList.forEach((t) => {
        const tTime = new Date(t.timestamp).getTime()
        if (tTime >= bStart.getTime() && tTime < bEnd.getTime()) {
          volume += Number(t.amount) || 0
          count += 1
        }
      })
      dailyData.push({ dayStr: `h-${i}`, dateLabel, volume, count })
    }
  } else {
    // Up to 10 buckets for multi-day range
    const numBuckets = Math.min(diffDays, 10)
    const daysPerBucket = diffDays / numBuckets

    for (let i = 0; i < numBuckets; i++) {
      const bStart = new Date(periodStart.getTime() + i * daysPerBucket * 24 * 60 * 60 * 1000)
      const bEnd = new Date(periodStart.getTime() + (i + 1) * daysPerBucket * 24 * 60 * 60 * 1000)
      const dateLabel = bStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

      let volume = 0
      let count = 0
      txList.forEach((t) => {
        const tTime = new Date(t.timestamp).getTime()
        if (tTime >= bStart.getTime() && tTime <= bEnd.getTime()) {
          volume += Number(t.amount) || 0
          count += 1
        }
      })
      dailyData.push({ dayStr: `d-${i}`, dateLabel, volume, count })
    }
  }

  const recentTransactions = [...txList]
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 20)

  // ASCII INR Formatting to prevent jsPDF Helvetica font from rendering '₹' as '¹'
  const formatINR = (val) => {
    return 'INR ' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatShortINR = (val) => {
    const num = Number(val || 0)
    if (num >= 100000) return 'INR ' + (num / 100000).toFixed(1) + 'L'
    if (num >= 1000) return 'INR ' + (num / 1000).toFixed(1) + 'k'
    return 'INR ' + Math.round(num)
  }

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const pageHeight = 297
  const margin = 15

  // ─── PAGE 1 ───

  // Corporate Letterhead Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(30, 41, 59)
  doc.text('BLOCKBANK', margin, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('Financial & System Administration Report', margin, 26)

  // Header Details (Right aligned)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  const metaX = pageWidth - margin
  doc.text(`Date: ${formattedDateStr}`, metaX, 18, { align: 'right' })
  doc.text(`Generated By: ${adminName}`, metaX, 23, { align: 'right' })
  doc.text(`Report Ref: BB-SYS-${Date.now().toString().slice(-6)}`, metaX, 28, { align: 'right' })

  // Top Horizontal Divider Line
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.5)
  doc.line(margin, 32, pageWidth - margin, 32)

  // Executive Summary
  let currentY = 40
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text('Executive Summary', margin, currentY)

  currentY += 4
  const summaryBoxWidth = (pageWidth - margin * 2 - 9) / 4
  const summaryBoxHeight = 18

  const drawMetricBox = (x, y, w, h, label, mainValue) => {
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.rect(x, y, w, h, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(label, x + 4, y + 6)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)
    doc.text(String(mainValue), x + 4, y + 13)
  }

  drawMetricBox(margin, currentY, summaryBoxWidth, summaryBoxHeight, 'Total Accounts', totUsers)
  drawMetricBox(margin + summaryBoxWidth + 3, currentY, summaryBoxWidth, summaryBoxHeight, 'Approved Users', appCount)
  drawMetricBox(margin + (summaryBoxWidth + 3) * 2, currentY, summaryBoxWidth, summaryBoxHeight, 'Pending Review', pendCount)
  drawMetricBox(margin + (summaryBoxWidth + 3) * 3, currentY, summaryBoxWidth, summaryBoxHeight, 'Period Volume', formatShortINR(totalAmountTransferred))

  // Financial Metrics Summary
  currentY += summaryBoxHeight + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text('Financial Key Indicators', margin, currentY)

  currentY += 4
  drawMetricBox(margin, currentY, summaryBoxWidth, summaryBoxHeight, 'Total Transactions', totalTxCount)
  drawMetricBox(margin + summaryBoxWidth + 3, currentY, summaryBoxWidth, summaryBoxHeight, 'Avg Transfer Value', formatShortINR(avgTxAmount))
  drawMetricBox(margin + (summaryBoxWidth + 3) * 2, currentY, summaryBoxWidth, summaryBoxHeight, 'Period Activity', `${totalTxCount} txns`)
  drawMetricBox(margin + (summaryBoxWidth + 3) * 3, currentY, summaryBoxWidth, summaryBoxHeight, 'Rejected Accounts', rejCount)

  // Transaction Volume & Activity Trend Chart
  currentY += summaryBoxHeight + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(chartSectionTitle, margin, currentY)

  // Chart Container
  currentY += 4
  const chartOuterH = 68
  const chartOuterW = pageWidth - margin * 2

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.rect(margin, currentY, chartOuterW, chartOuterH, 'FD')

  // Chart Inner Plot Bounds
  const plotLeft = margin + 22
  const plotRight = pageWidth - margin - 12
  const plotTop = currentY + 12
  const plotBottom = currentY + chartOuterH - 16
  const plotWidth = plotRight - plotLeft
  const plotHeight = plotBottom - plotTop

  // Axis Labels
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(71, 85, 105)
  doc.text('Volume (INR)', margin + 2, currentY + 8)

  doc.text('Date (Selected Period)', pageWidth - margin - 32, currentY + chartOuterH - 3)

  // Chart Legend
  doc.setFillColor(30, 41, 59)
  doc.rect(pageWidth - margin - 58, currentY + 5, 4, 3, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(71, 85, 105)
  doc.text('Volume (INR)', pageWidth - margin - 52, currentY + 7.5)

  doc.setFillColor(13, 148, 136)
  doc.circle(pageWidth - margin - 25, currentY + 6.5, 1.5, 'F')
  doc.text('Txn Count', pageWidth - margin - 21, currentY + 7.5)

  // Max Volume for Y-Axis
  const maxVolume = Math.max(...dailyData.map((d) => d.volume), 1000)

  // Y-Axis Grid Lines & Tick Labels
  const gridSteps = 3
  doc.setDrawColor(241, 245, 249)
  doc.setLineWidth(0.25)

  for (let s = 0; s <= gridSteps; s++) {
    const gridY = plotBottom - (plotHeight / gridSteps) * s
    doc.line(plotLeft, gridY, plotRight, gridY)

    const tickVal = (maxVolume / gridSteps) * s
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(100, 116, 139)
    doc.text(formatShortINR(tickVal), plotLeft - 2, gridY + 1.5, { align: 'right' })
  }

  // Draw X-Axis Baseline
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.4)
  doc.line(plotLeft, plotBottom, plotRight, plotBottom)

  // Draw Bars & Data Labels
  const numDays = dailyData.length
  const slotW = plotWidth / (numDays || 1)
  const barW = Math.min(slotW * 0.4, 10)

  dailyData.forEach((d, idx) => {
    const slotCenterX = plotLeft + idx * slotW + slotW / 2
    const barX = slotCenterX - barW / 2
    const barH = Math.max((d.volume / maxVolume) * plotHeight, d.volume > 0 ? 3 : 0.5)
    const barY = plotBottom - barH

    // Render Volume Bar
    doc.setFillColor(30, 41, 59)
    doc.rect(barX, barY, barW, barH, 'F')

    // Amount Label above bar (if volume > 0)
    if (d.volume > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      doc.setTextColor(30, 41, 59)
      doc.text(formatShortINR(d.volume), slotCenterX, Math.max(barY - 1.5, plotTop - 1), { align: 'center' })
    }

    // Transaction Count label below bar
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(13, 148, 136)
    doc.text(`${d.count} txns`, slotCenterX, plotBottom + 4.5, { align: 'center' })

    // Date Label below X-axis
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text(d.dateLabel, slotCenterX, plotBottom + 9, { align: 'center' })
  })

  // Page 1 Footer
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text('BlockBank Operations & Financial Statement', margin, pageHeight - 7)
  doc.text('Page 1 of 2', pageWidth - margin, pageHeight - 7, { align: 'right' })

  // ─── PAGE 2 ───
  doc.addPage('a4', 'p')

  // Page 2 Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 41, 59)
  doc.text('BLOCKBANK', margin, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('Recent Transaction History & Settlement Ledger', margin, 26)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text('Page 2 of 2', pageWidth - margin, 20, { align: 'right' })

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.5)
  doc.line(margin, 30, pageWidth - margin, 30)

  // Transaction Table Rows
  const tableRows = recentTransactions.map((t) => {
    const dateStr = t.timestamp
      ? new Date(t.timestamp).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }) +
        ', ' +
        new Date(t.timestamp).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      : 'N/A'

    const senderText = `${t.senderName || 'N/A'}\n(${t.senderPaymentId || 'N/A'})`
    const receiverText = `${t.receiverName || 'N/A'}\n(${t.receiverPaymentId || 'N/A'})`

    return [
      dateStr,
      t.transactionId || 'N/A',
      senderText,
      receiverText,
      formatINR(t.amount),
      (t.status || 'success').toUpperCase()
    ]
  })

  // AutoTable configuration with widened Amount and Status columns so text is never clipped
  autoTable(doc, {
    startY: 34,
    head: [['Date & Time', 'Transaction ID', 'Sender Details', 'Receiver Details', 'Amount (INR)', 'Status']],
    body: tableRows.length > 0 ? tableRows : [['--', '--', 'No transactions recorded in selected period', '--', '--', '--']],
    margin: { left: margin, right: margin },
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 3,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 30, fontStyle: 'bold' },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
      4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'SUCCESS') {
          data.cell.styles.textColor = [13, 148, 136]
        } else if (data.cell.raw === 'FAILED') {
          data.cell.styles.textColor = [225, 29, 72]
        }
      }
    }
  })

  // Page 2 Footer
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text('BlockBank Operations & Financial Statement', margin, pageHeight - 7)
  doc.text('Page 2 of 2', pageWidth - margin, pageHeight - 7, { align: 'right' })

  // Save PDF
  const dateStamp = generatedAt.toISOString().split('T')[0]
  doc.save(`BlockBank-Financial-Report-${dateStamp}.pdf`)
}
