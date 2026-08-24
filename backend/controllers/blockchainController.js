const crypto = require('crypto');
const Block = require('../models/Block');
const PaymentBlock = require('../models/PaymentBlock');
const FraudAlert = require('../models/FraudAlert');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Internal helper to add a new block to the hash chain.
 * Not an express route handler.
 */
const addBlock = async (actionType, action, performedBy, targetUserId) => {
    // Blockchain audit creation disabled per request
    return null;
};

/**
 * GET /api/admin/blockchain/chain
 * Returns all blocks sorted by index ascending.
 */
const getChain = async (req, res) => {
    try {
        const blocks = await Block.find().sort({ index: 1 }).populate('performedBy', 'name email').populate('targetUserId', 'name email');
        res.status(200).json(blocks);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching blockchain', error: error.message });
    }
};

/**
 * Internal logic for validating blockchain integrity.
 */
const validateChainInternal = async (currentAdminId = null) => {
    const blocks = await Block.find().sort({ index: 1 });
    const chainErrors = [];
    const userErrors = [];

    // STEP 1 — Chain hash check (run through ALL blocks, do not stop at first error)
    for (let i = 0; i < blocks.length; i++) {
        const currentBlock = blocks[i];
        let hasSelfError = false;

        const targetUserIdStr = currentBlock.targetUserId
            ? (currentBlock.targetUserId._id ? String(currentBlock.targetUserId._id) : String(currentBlock.targetUserId))
            : '';
        const hashString =
            String(currentBlock.index) +
            currentBlock.action +
            currentBlock.actionType +
            targetUserIdStr +
            new Date(currentBlock.timestamp).toISOString() +
            currentBlock.previousHash;

        const recomputedHash = crypto
            .createHash('sha256')
            .update(hashString)
            .digest('hex');

        if (recomputedHash !== currentBlock.hash) {
            hasSelfError = true;
            chainErrors.push({
                blockIndex: currentBlock.index,
                type: 'chain_hash',
                message: `Block #${currentBlock.index} — data was tampered (hash of stored data does not match)`
            });
        }

        // CHECK B — Link integrity check
        if (i > 0) {
            const previousBlock = blocks[i - 1];
            if (currentBlock.previousHash !== previousBlock.hash) {
                if (!hasSelfError) {
                    chainErrors.push({
                        blockIndex: currentBlock.index,
                        type: 'chain_hash',
                        message: `Block #${currentBlock.index} — previousHash field was manually altered`
                    });
                }
            }
        }
    }

    // STEP 2 — User state check: compare current live user against the LATEST block for that user
    // Find the latest block (highest index) for each targetUserId that has a userStateSnapshot
    const latestBlockPerUser = new Map();
    for (const block of blocks) {
        if (block.targetUserId && block.userStateSnapshot && block.userStateSnapshot.status) {
            const userIdStr = String(block.targetUserId._id || block.targetUserId);
            const existing = latestBlockPerUser.get(userIdStr);
            if (!existing || block.index > existing.index) {
                latestBlockPerUser.set(userIdStr, block);
            }
        }
    }

    for (const [userIdStr, latestBlock] of latestBlockPerUser.entries()) {
        const user = await User.findById(userIdStr);
        if (!user) {
            userErrors.push({
                blockIndex: latestBlock.index,
                type: 'user_deleted',
                message: `Block #${latestBlock.index} — User no longer exists in database (possible deletion)`
            });
            continue;
        }

        const snapshot = latestBlock.userStateSnapshot;
        const changedFields = [];

        if (user.status !== snapshot.status) {
            changedFields.push({ field: 'status', was: String(snapshot.status || ''), now: String(user.status || '') });
        }
        if (Boolean(user.isFrozen) !== Boolean(snapshot.isFrozen)) {
            changedFields.push({ field: 'isFrozen', was: String(snapshot.isFrozen), now: String(user.isFrozen) });
        }
        if (user.role !== snapshot.role) {
            changedFields.push({ field: 'role', was: String(snapshot.role || ''), now: String(user.role || '') });
        }
        if (user.email !== snapshot.email) {
            changedFields.push({ field: 'email', was: String(snapshot.email || ''), now: String(user.email || '') });
        }

        if (changedFields.length > 0) {
            const fieldStrings = changedFields.map(cf => {
                if (cf.field === 'isFrozen') {
                    return `${cf.field} (was: ${cf.was} → now: ${cf.now})`;
                }
                return `${cf.field} (was: '${cf.was}' → now: '${cf.now}')`;
            });
            const message = `Block #${latestBlock.index} — User data tampered. Changed fields: ${fieldStrings.join(', ')}`;
            userErrors.push({
                blockIndex: latestBlock.index,
                type: 'user_state',
                message: message,
                changedFields: changedFields
            });
        }
    }

    // STEP 3 — Combine and respond
    const allErrors = [...chainErrors, ...userErrors];

    if (allErrors.length === 0) {
        return { valid: true, errors: [] };
    }

    for (const err of allErrors) {
        await handleTampering(err.blockIndex, err.message, err.type, err.changedFields || [], currentAdminId);
    }

    return { valid: false, errors: allErrors };
};

/**
 * GET /api/admin/blockchain/validate
 * Recomputes each block's hash and checks previousHash against prior block's hash.
 * If invalid, creates a FraudAlert (if duplicate doesn't exist) and a Notification for the admin.
 */
const validateChain = async (req, res) => {
    try {
        const result = await validateChainInternal(req.user ? req.user.id : null);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Server error validating blockchain', error: error.message });
    }
};

/**
 * Helper to log FraudAlert and notify Admin upon chain validation failure.
 */
const handleTampering = async (blockIndex, message, type, changedFields = [], currentAdminId) => {
    try {
        // Create FraudAlert if one doesn't exist for exact blockIndex
        const query = { blockIndex };
        if (type) {
            query.$or = [{ type }, { message }];
        } else {
            query.message = message;
        }

        const existingAlert = await FraudAlert.findOne(query);
        if (!existingAlert) {
            const alert = new FraudAlert({ blockIndex, message, type, changedFields });
            await alert.save();
        } else {
            existingAlert.message = message;
            if (type) existingAlert.type = type;
            if (changedFields && changedFields.length > 0) {
                existingAlert.changedFields = changedFields;
            }
            await existingAlert.save();
        }

        // Find all admins to notify
        const admins = await User.find({ role: 'admin' });
        const notifMessage = `[FRAUD ALERT] ${message}`;

        for (const admin of admins) {
            const existingNotifs = await Notification.find({
                userId: admin._id,
                type: 'fraud_alert',
                message: notifMessage
            }).sort({ timestamp: -1 });

            if (existingNotifs.length > 1) {
                const idsToDelete = existingNotifs.slice(1).map(n => n._id);
                await Notification.deleteMany({ _id: { $in: idsToDelete } });
            } else if (existingNotifs.length === 0) {
                const notif = new Notification({
                    userId: admin._id,
                    message: notifMessage,
                    type: 'fraud_alert'
                });
                await notif.save();
            }
        }
    } catch (err) {
        console.error('Failed to record fraud alert / notification:', err);
    }
};

/**
 * GET /api/admin/blockchain/fraud-alerts
 * Returns all FraudAlert documents sorted newest first.
 */
const getFraudAlerts = async (req, res) => {
    try {
        const alerts = await FraudAlert.find().sort({ detectedAt: -1 });
        const uniqueAlertsMap = new Map();
        for (const alert of alerts) {
            const key = `${alert.blockIndex}_${alert.type || 'alert'}`;
            if (!uniqueAlertsMap.has(key)) {
                uniqueAlertsMap.set(key, alert);
            }
        }
        const uniqueAlerts = Array.from(uniqueAlertsMap.values());
        res.status(200).json(uniqueAlerts);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching fraud alerts', error: error.message });
    }
};

/**
 * GET /api/admin/payment-blockchain/chain
 * Returns all PaymentBlocks sorted by index ascending.
 */
const getPaymentChain = async (req, res) => {
    try {
        const blocks = await PaymentBlock.find().sort({ index: 1 });
        res.status(200).json(blocks);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching payment blockchain', error: error.message });
    }
};

module.exports = {
    addBlock,
    getChain,
    getPaymentChain,
    validateChain,
    validateChainInternal,
    getFraudAlerts
};
