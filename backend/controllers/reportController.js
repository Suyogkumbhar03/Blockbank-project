const Report = require('../models/Report');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const FraudAlert = require('../models/FraudAlert');
const Notification = require('../models/Notification');

// POST /api/report/submit
// User submits an account or transaction issue report
const submitReport = async (req, res) => {
    try {
        const { issueType, transactionId, description } = req.body;

        if (!issueType) {
            return res.status(400).json({ success: false, message: 'Issue type is required' });
        }

        const validIssueTypes = ["Unauthorized Transfer", "Suspicious Login", "Wrong Transaction", "Other"];
        if (!validIssueTypes.includes(issueType)) {
            return res.status(400).json({ success: false, message: 'Invalid issue type selected' });
        }

        if (!description || description.trim().length < 20) {
            return res.status(400).json({
                success: false,
                message: 'Please describe what happened with at least 20 characters.'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const reportId = 'RPT-' + Date.now();

        const report = new Report({
            reportId,
            userId: user._id,
            userName: user.name || 'User',
            userPaymentId: user.paymentId || '',
            userEmail: user.email || '',
            issueType,
            transactionId: transactionId ? transactionId.trim() : '',
            description: description.trim(),
            status: 'Open'
        });

        await report.save();

        // Create admin notifications: “New account report submitted by [userName] — Issue: [issueType]. Report ID: [reportId].”
        try {
            const adminNotifMessage = `New account report submitted by ${user.name} — Issue: ${issueType}. Report ID: ${reportId}.`;
            const admins = await User.find({ role: 'admin' });
            for (const admin of admins) {
                const notif = new Notification({
                    userId: admin._id,
                    message: adminNotifMessage,
                    type: 'fraud_alert'
                });
                await notif.save();
            }
        } catch (notifErr) {
            console.error('Failed to create admin notification for report:', notifErr);
        }

        return res.status(201).json({
            success: true,
            reportId,
            message: "Your report has been submitted. Our team will review it shortly.",
            report
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error submitting report',
            error: error.message
        });
    }
};

// GET /api/report/my-reports
// User views their own submitted reports
const getMyReports = async (req, res) => {
    try {
        const reports = await Report.find({ userId: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json(reports);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error fetching your reports',
            error: error.message
        });
    }
};

// GET /api/admin/reports
// Admin views all reports across all users with full user details, recent transactions & fraud alerts
const getAdminReports = async (req, res) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 });

        const reportsWithContext = await Promise.all(reports.map(async (report) => {
            const repObj = report.toObject();

            // Fetch last 5 transactions for this user using userPaymentId
            let recentTransactions = [];
            if (report.userPaymentId) {
                recentTransactions = await Transaction.find({
                    $or: [
                        { senderPaymentId: report.userPaymentId },
                        { receiverPaymentId: report.userPaymentId }
                    ]
                }).sort({ timestamp: -1, createdAt: -1 }).limit(5);
            }

            // Fetch fraud alerts for this user using userId or userPaymentId
            const userFraudAlerts = await FraudAlert.find({
                $or: [
                    { userId: report.userId },
                    { senderPaymentId: report.userPaymentId }
                ]
            }).sort({ detectedAt: -1, createdAt: -1 });

            repObj.recentTransactions = recentTransactions;
            repObj.userFraudAlerts = userFraudAlerts;

            return repObj;
        }));

        return res.status(200).json(reportsWithContext);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error fetching admin reports',
            error: error.message
        });
    }
};

// PATCH /api/admin/reports/:reportId/status
// Admin updates report status and admin note
const updateReportStatus = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { status, adminNote } = req.body;

        // Allow lookup by reportId (e.g. "RPT-123456") or MongoDB _id
        const report = await Report.findOne({
            $or: [
                { reportId: reportId },
                { _id: reportId.match(/^[0-9a-fA-F]{24}$/) ? reportId : null }
            ]
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        if (status) {
            const validStatuses = ["Open", "Under Investigation", "Resolved"];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status value' });
            }
            report.status = status;
            if (status === 'Resolved') {
                report.resolvedAt = new Date();
            }
        }

        if (adminNote !== undefined) {
            report.adminNote = adminNote.trim();
        }

        await report.save();

        return res.status(200).json({
            success: true,
            message: 'Report status updated successfully',
            report
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error updating report status',
            error: error.message
        });
    }
};

module.exports = {
    submitReport,
    getMyReports,
    getAdminReports,
    updateReportStatus
};
