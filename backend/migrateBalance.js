const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const migrateBalance = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        console.log('Connected to DB for balance migration');

        // Update all users where balance does not exist or is null/undefined or is 0
        const result = await User.updateMany(
            {
                $or: [
                    { balance: { $exists: false } },
                    { balance: null },
                    { balance: 0 }
                ]
            },
            {
                $set: { balance: 1000 }
            }
        );

        console.log('User balance migration completed successfully:', result);
        process.exit(0);
    } catch (err) {
        console.error('Balance migration error:', err);
        process.exit(1);
    }
};

migrateBalance();
