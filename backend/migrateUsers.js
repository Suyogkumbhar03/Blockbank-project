const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        console.log('Connected to DB for migration');
        
        const defaultPinHash = await bcrypt.hash('1234', 10);
        const result = await User.updateMany(
            { 
                $or: [
                    { dateOfBirth: { $exists: false } },
                    { transactionPin: { $exists: false } }
                ]
            },
            { 
                $set: { 
                    dateOfBirth: new Date('2000-01-01'),
                    transactionPin: defaultPinHash
                }
            }
        );
        console.log('Legacy users migrated successfully:', result);
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
};

migrate();
