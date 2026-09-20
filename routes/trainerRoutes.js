const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');
const workoutController = require('../controllers/workoutController');
const { isAuthenticated } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roles');
const { verifyTrainerMemberOwnership } = require('../middleware/ownership');

// Apply trainer guard to all routes
router.use(isAuthenticated, authorizeRoles('trainer'));

// Trainer Dashboard
router.get('/dashboard', trainerController.dashboard);

// Assigned Members List
router.get('/members', trainerController.getMembers);

// Assigned Member Profile (Protected by trainer ownership check)
router.get('/members/:id', verifyTrainerMemberOwnership, trainerController.getMemberDetail);

// Workout Plan Management for Assigned Member (Protected by trainer ownership check)
router.get('/members/:id/workout', verifyTrainerMemberOwnership, workoutController.getWorkoutEditor);
router.post('/members/:id/workout/info', verifyTrainerMemberOwnership, workoutController.postUpdateWorkoutInfo);
router.post('/members/:id/workout/add-exercise', verifyTrainerMemberOwnership, workoutController.postAddExercise);
router.post('/members/:id/workout/edit-exercise/:exerciseId', verifyTrainerMemberOwnership, workoutController.postEditExercise);
router.post('/members/:id/workout/delete-exercise/:exerciseId', verifyTrainerMemberOwnership, workoutController.postDeleteExercise);

module.exports = router;
