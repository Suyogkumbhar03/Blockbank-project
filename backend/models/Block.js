const mongoose = require('mongoose');
const crypto = require('crypto');

const blockSchema = new mongoose.Schema({
    index: { type: Number, required: true },
    action: { type: String, required: true },
    actionType: {
        type: String,
        enum: ['approve', 'reject', 'freeze', 'unfreeze'],
        required: true
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    previousHash: { type: String, required: true },
    hash: { type: String, required: true }
});

blockSchema.statics.computeHash = function (block) {
    const data = `${block.index}${block.action}${block.actionType}${block.targetUserId}${block.timestamp}${block.previousHash}`;
    return crypto.createHash('sha256').update(data).digest('hex');
};

module.exports = mongoose.model('Block', blockSchema);
