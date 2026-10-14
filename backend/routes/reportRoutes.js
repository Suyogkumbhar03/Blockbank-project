const express = require('express');
const router = express.Router();
const { submitReport, getMyReports } = require('../controllers/reportController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/report/submit
router.post('/submit', verifyToken, submitReport);

// GET /api/report/my-reports
router.get('/my-reports', verifyToken, getMyReports);

module.exports = router;
