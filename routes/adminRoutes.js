const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const membershipController = require('../controllers/membershipController');
const { isAuthenticated } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roles');

// Apply admin guard to all routes in this file
router.use(isAuthenticated, authorizeRoles('admin'));

// Admin Dashboard
router.get('/dashboard', adminController.dashboard);

// Members
router.get('/members', adminController.getMembers);
router.get('/members/:id', adminController.getMemberDetail);
router.post('/members/:id/edit', adminController.updateMember);
router.post('/members/:id/toggle-status', adminController.toggleMemberStatus);
router.post('/members/:id/assign-trainer', adminController.assignTrainer);
router.post('/members/:id/assign-membership', membershipController.postAssignMembership);
router.post('/members/:id/renew-membership', membershipController.postRenewMembership);

// Trainers
router.get('/trainers', adminController.getTrainers);
router.get('/trainers/create', adminController.getCreateTrainer);
router.post('/trainers/create', adminController.postCreateTrainer);
router.post('/trainers/:id/edit', adminController.updateTrainer);
router.post('/trainers/:id/toggle-status', adminController.toggleTrainerStatus);

// Membership Plans
router.get('/membership-plans', membershipController.getPlans);
router.get('/membership-plans/create', membershipController.getCreatePlan);
router.post('/membership-plans/create', membershipController.postCreatePlan);
router.get('/membership-plans/:id/edit', membershipController.getEditPlan);
router.post('/membership-plans/:id/edit', membershipController.postEditPlan);
router.post('/membership-plans/:id/delete', membershipController.postDeletePlan);

// Memberships & Expiring
router.get('/memberships', (req, res) => res.redirect('/admin/members'));
router.get('/memberships/expiring', adminController.getExpiringMemberships);

// Attendance
router.get('/attendance', adminController.getAttendance);

module.exports = router;
