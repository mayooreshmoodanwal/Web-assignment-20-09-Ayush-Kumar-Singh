const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const attendanceController = require('../controllers/attendanceController');
const weightController = require('../controllers/weightController');
const { isAuthenticated } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roles');

// Apply member guard to all routes
router.use(isAuthenticated, authorizeRoles('member'));

// Member Dashboard
router.get('/dashboard', memberController.dashboard);

// Workout Plan (Read-only for member)
router.get('/workout', memberController.getWorkout);

// Attendance
router.get('/attendance', attendanceController.getMemberAttendance);
router.post('/attendance/mark', attendanceController.postMarkAttendance);

// Body Weight Progress
router.get('/progress', weightController.getMemberProgress);
router.post('/progress/log', weightController.postLogWeight);
router.get('/progress/chart-data', weightController.getWeightDataApi);

// Profile
router.get('/profile', memberController.getProfile);
router.post('/profile', memberController.postUpdateProfile);

module.exports = router;
