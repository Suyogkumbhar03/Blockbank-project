const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });

        const adminEmail = 'admin@organization.com';
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                name: 'System Admin',
                email: adminEmail,
                phone: '0000000000',
                password: hashedPassword,
                role: 'admin',
                status: 'approved',
                accountNumber: 'BB0000000000',
                paymentId: 'admin@blockbank',
                balance: 1000000
            });
            await admin.save();
            console.log('Admin account created successfully:');
            console.log('Email: admin@organization.com');
            console.log('Password: admin123');
        } else {
            console.log('Admin account already exists.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error.message);
        process.exit(1);
    }
};

seedAdmin();
