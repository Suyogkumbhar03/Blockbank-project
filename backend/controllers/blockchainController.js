const Block = require('../models/Block');
const FraudAlert = require('../models/FraudAlert');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Internal helper to add a new block to the hash chain.
 * Not an express route handler.
 */
const addBlock = async (actionType, action, performedBy, targetUserId) => {
    try {
        const lastBlock = await Block.findOne().sort({ index: -1 });
        const index = lastBlock ? lastBlock.index + 1 : 0;
        const previousHash = lastBlock ? lastBlock.hash : '0';
        const timestamp = new Date();

        const blockData = {
            index,
            action,
            actionType,
            performedBy,
            targetUserId,
            timestamp,
            previousHash
        };

        const hash = Block.computeHash(blockData);

        const newBlock = new Block({
            ...blockData,
            hash
        });

        await newBlock.save();
        return newBlock;
    } catch (error) {
        console.error('Failed to add block to blockchain:', error);
        throw error;
    }
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
 * GET /api/admin/blockchain/validate
 * Recomputes each block's hash and checks previousHash against prior block's hash.
 * If invalid, creates a FraudAlert (if duplicate doesn't exist) and a Notification for the admin.
 */
const validateChain = async (req, res) => {
    try {
        const blocks = await Block.find().sort({ index: 1 });

        for (let i = 0; i < blocks.length; i++) {
            const currentBlock = blocks[i];
            const computedHash = Block.computeHash(currentBlock);

            // Check 1: stored hash vs recomputed hash
            if (currentBlock.hash !== computedHash) {
                const message = `Tampering detected in Block #${currentBlock.index} — stored hash does not match recalculated hash.`;
                await handleTampering(currentBlock.index, message, req.user ? req.user.id : null);
                return res.status(200).json({
                    valid: false,
                    brokenBlockIndex: currentBlock.index,
                    message
                });
            }

            // Check 2: previousHash link matching prior block's actual hash
            if (i > 0) {
                const previousBlock = blocks[i - 1];
                if (currentBlock.previousHash !== previousBlock.hash) {
                    const message = `Tampering detected in Block #${currentBlock.index} — previousHash does not match prior block hash.`;
                    await handleTampering(currentBlock.index, message, req.user ? req.user.id : null);
                    return res.status(200).json({
                        valid: false,
                        brokenBlockIndex: currentBlock.index,
                        message
                    });
                }
            }
        }

        res.status(200).json({ valid: true });
    } catch (error) {
        res.status(500).json({ message: 'Server error validating blockchain', error: error.message });
    }
};

/**
 * Helper to log FraudAlert and notify Admin upon chain validation failure.
 */
const handleTampering = async (blockIndex, message, currentAdminId) => {
    try {
        // Create FraudAlert if one doesn't exist for exact blockIndex + message
        const existingAlert = await FraudAlert.findOne({ blockIndex, message });
        if (!existingAlert) {
            const alert = new FraudAlert({ blockIndex, message });
            await alert.save();
        }

        // Notify admin user
        let adminUserId = currentAdminId;
        if (!adminUserId) {
            const admin = await User.findOne({ role: 'admin' });
            if (admin) adminUserId = admin._id;
        }

        if (adminUserId) {
            const notif = new Notification({
                userId: adminUserId,
                message: `[FRAUD ALERT] Blockchain tamper detected at Block #${blockIndex}!`,
                type: 'fraud_alert'
            });
            await notif.save();
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
        res.status(200).json(alerts);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching fraud alerts', error: error.message });
    }
};

module.exports = {
    addBlock,
    getChain,
    validateChain,
    getFraudAlerts
};
