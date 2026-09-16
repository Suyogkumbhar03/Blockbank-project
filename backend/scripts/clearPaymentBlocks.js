const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const PaymentBlock = require('../models/PaymentBlock');

const clearPaymentBlocks = async () => {
    try {
        await connectDB();
        const result = await PaymentBlock.deleteMany({});
        console.log(`Successfully deleted ${result.deletedCount} payment blockchain blocks.`);
        console.log('User transactions remain untouched.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to clear payment blocks:', error);
        process.exit(1);
    }
};

clearPaymentBlocks();
