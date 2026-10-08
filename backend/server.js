const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const transferRoutes = require('./routes/transferRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

dotenv.config();
connectDB();

const app = express();

app.set('trust proxy', true);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'BlockBank Backend API is running successfully!' });
});

app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});