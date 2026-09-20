const WorkoutPlan = require('../models/WorkoutPlan');
const User = require('../models/User');

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// GET /trainer/members/:id/workout
const getWorkoutEditor = async (req, res) => {
  try {
    const member = req.targetMember; // From verifyTrainerMemberOwnership
    const trainerId = req.session.user.id;

    let workoutPlan = await WorkoutPlan.findOne({ member: member._id });

    if (!workoutPlan) {
      // Create an initial empty workout plan for this member
      workoutPlan = new WorkoutPlan({
        member: member._id,
        trainer: trainerId,
        title: `${member.name}'s Workout Routine`,
        goal: 'General Fitness & Strength',
        notes: '',
        exercises: []
      });
      await workoutPlan.save();
    }

    // Group exercises by day
    const exercisesByDay = {};
    DAYS_OF_WEEK.forEach((day) => {
      exercisesByDay[day] = [];
    });

    workoutPlan.exercises.forEach((ex) => {
      if (exercisesByDay[ex.dayOfWeek]) {
        exercisesByDay[ex.dayOfWeek].push(ex);
      }
    });

    res.render('trainer/workoutEdit', {
      title: `Workout Plan - ${member.name} - GymFlow`,
      user: req.session.user,
      member,
      workoutPlan,
      exercisesByDay,
      daysOfWeek: DAYS_OF_WEEK
    });
  } catch (err) {
    console.error('Error loading workout editor:', err);
    req.flash('error', 'Failed to load workout editor');
    res.redirect('/trainer/members');
  }
};

// POST /trainer/members/:id/workout/info
const postUpdateWorkoutInfo = async (req, res) => {
  try {
    const member = req.targetMember;
    const { title, goal, notes } = req.body;

    let workoutPlan = await WorkoutPlan.findOne({ member: member._id });
    if (!workoutPlan) {
      workoutPlan = new WorkoutPlan({
        member: member._id,
        trainer: req.session.user.id
      });
    }

    workoutPlan.title = title ? title.trim() : workoutPlan.title;
    workoutPlan.goal = goal ? goal.trim() : workoutPlan.goal;
    workoutPlan.notes = notes ? notes.trim() : '';

    await workoutPlan.save();
    req.flash('success', 'Workout details updated successfully');
    res.redirect(`/trainer/members/${member._id}/workout`);
  } catch (err) {
    console.error('Error updating workout plan info:', err);
    req.flash('error', 'Failed to update workout information');
    res.redirect(`/trainer/members/${req.params.id}/workout`);
  }
};

// POST /trainer/members/:id/workout/add-exercise
const postAddExercise = async (req, res) => {
  try {
    const member = req.targetMember;
    const { dayOfWeek, exerciseName, sets, reps, restSeconds, notes } = req.body;

    if (!dayOfWeek || !exerciseName || !sets || !reps) {
      req.flash('error', 'Day, exercise name, sets, and reps are required');
      return res.redirect(`/trainer/members/${member._id}/workout`);
    }

    if (Number(sets) <= 0) {
      req.flash('error', 'Sets must be greater than 0');
      return res.redirect(`/trainer/members/${member._id}/workout`);
    }

    let workoutPlan = await WorkoutPlan.findOne({ member: member._id });
    if (!workoutPlan) {
      workoutPlan = new WorkoutPlan({
        member: member._id,
        trainer: req.session.user.id,
        exercises: []
      });
    }

    workoutPlan.exercises.push({
      dayOfWeek,
      exerciseName: exerciseName.trim(),
      sets: Number(sets),
      reps: reps.trim(),
      restSeconds: restSeconds ? Number(restSeconds) : 60,
      notes: notes ? notes.trim() : ''
    });

    await workoutPlan.save();
    req.flash('success', `Added "${exerciseName}" to ${dayOfWeek}`);
    res.redirect(`/trainer/members/${member._id}/workout`);
  } catch (err) {
    console.error('Error adding exercise:', err);
    req.flash('error', 'Failed to add exercise');
    res.redirect(`/trainer/members/${req.params.id}/workout`);
  }
};

// POST /trainer/members/:id/workout/edit-exercise/:exerciseId
const postEditExercise = async (req, res) => {
  try {
    const member = req.targetMember;
    const { exerciseId } = req.params;
    const { dayOfWeek, exerciseName, sets, reps, restSeconds, notes } = req.body;

    const workoutPlan = await WorkoutPlan.findOne({ member: member._id });
    if (!workoutPlan) {
      req.flash('error', 'Workout plan not found');
      return res.redirect(`/trainer/members/${member._id}/workout`);
    }

    const exercise = workoutPlan.exercises.id(exerciseId);
    if (!exercise) {
      req.flash('error', 'Exercise not found');
      return res.redirect(`/trainer/members/${member._id}/workout`);
    }

    if (dayOfWeek) exercise.dayOfWeek = dayOfWeek;
    if (exerciseName) exercise.exerciseName = exerciseName.trim();
    if (sets) exercise.sets = Number(sets);
    if (reps) exercise.reps = reps.trim();
    if (restSeconds !== undefined) exercise.restSeconds = Number(restSeconds);
    if (notes !== undefined) exercise.notes = notes.trim();

    await workoutPlan.save();
    req.flash('success', 'Exercise updated successfully');
    res.redirect(`/trainer/members/${member._id}/workout`);
  } catch (err) {
    console.error('Error updating exercise:', err);
    req.flash('error', 'Failed to update exercise');
    res.redirect(`/trainer/members/${req.params.id}/workout`);
  }
};

// POST /trainer/members/:id/workout/delete-exercise/:exerciseId
const postDeleteExercise = async (req, res) => {
  try {
    const member = req.targetMember;
    const { exerciseId } = req.params;

    const workoutPlan = await WorkoutPlan.findOne({ member: member._id });
    if (!workoutPlan) {
      req.flash('error', 'Workout plan not found');
      return res.redirect(`/trainer/members/${member._id}/workout`);
    }

    workoutPlan.exercises.pull({ _id: exerciseId });
    await workoutPlan.save();

    req.flash('success', 'Exercise removed from workout plan');
    res.redirect(`/trainer/members/${member._id}/workout`);
  } catch (err) {
    console.error('Error deleting exercise:', err);
    req.flash('error', 'Failed to remove exercise');
    res.redirect(`/trainer/members/${req.params.id}/workout`);
  }
};

module.exports = {
  getWorkoutEditor,
  postUpdateWorkoutInfo,
  postAddExercise,
  postEditExercise,
  postDeleteExercise
};
