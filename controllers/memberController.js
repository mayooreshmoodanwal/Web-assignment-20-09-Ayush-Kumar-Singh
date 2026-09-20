const User = require('../models/User');
const Membership = require('../models/Membership');
const WorkoutPlan = require('../models/WorkoutPlan');
const Attendance = require('../models/Attendance');
const WeightLog = require('../models/WeightLog');
const { getTodayRange, getDayOfWeek, formatDate, formatTime, formatDateTime } = require('../utils/dateUtils');
const { getMembershipStatus, daysUntilExpiry, syncMembershipStatuses } = require('../utils/membershipUtils');

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// GET /member/dashboard
const dashboard = async (req, res) => {
  try {
    await syncMembershipStatuses();
    const memberId = req.session.user.id;
    const now = new Date();
    const todayDayName = getDayOfWeek(now);
    const { start: todayStart, end: todayEnd } = getTodayRange(now);

    // 1. User & Trainer
    const member = await User.findById(memberId)
      .populate('trainer', 'name email phone specialization')
      .lean();

    // 2. Active or Latest Membership
    const latestMembership = await Membership.findOne({ member: memberId })
      .populate('plan', 'name durationDays price description')
      .sort({ createdAt: -1 })
      .lean();

    let membershipStatus = 'No Plan';
    let daysLeft = 0;
    if (latestMembership) {
      membershipStatus = getMembershipStatus(latestMembership.expiryDate);
      daysLeft = daysUntilExpiry(latestMembership.expiryDate);
    }

    // 3. Today's Attendance Check
    const todayAttendance = await Attendance.findOne({
      member: memberId,
      date: { $gte: todayStart, $lte: todayEnd }
    }).lean();

    // 4. Latest Weight
    const latestWeightLog = await WeightLog.findOne({ member: memberId })
      .sort({ loggedAt: -1 })
      .lean();

    // 5. Workout Plan & Today's Exercises
    const workoutPlan = await WorkoutPlan.findOne({ member: memberId }).lean();
    let todayExercises = [];
    if (workoutPlan && workoutPlan.exercises) {
      todayExercises = workoutPlan.exercises.filter((ex) => ex.dayOfWeek === todayDayName);
    }

    res.render('member/dashboard', {
      title: 'Member Dashboard - GymFlow',
      user: req.session.user,
      member,
      latestMembership,
      membershipStatus,
      daysLeft,
      todayAttendance,
      latestWeight: latestWeightLog ? latestWeightLog.weight : null,
      workoutPlan,
      todayDayName,
      todayExercises,
      formatDate,
      formatTime
    });
  } catch (err) {
    console.error('Member dashboard error:', err);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/login');
  }
};

// GET /member/workout
const getWorkout = async (req, res) => {
  try {
    const memberId = req.session.user.id;
    const todayDayName = getDayOfWeek(new Date());

    const workoutPlan = await WorkoutPlan.findOne({ member: memberId })
      .populate('trainer', 'name specialization')
      .lean();

    // Group exercises by day of week
    const exercisesByDay = {};
    DAYS_OF_WEEK.forEach((day) => {
      exercisesByDay[day] = [];
    });

    if (workoutPlan && workoutPlan.exercises) {
      workoutPlan.exercises.forEach((ex) => {
        if (exercisesByDay[ex.dayOfWeek]) {
          exercisesByDay[ex.dayOfWeek].push(ex);
        }
      });
    }

    res.render('member/workout', {
      title: 'My Workout Plan - GymFlow',
      user: req.session.user,
      workoutPlan,
      exercisesByDay,
      todayDayName,
      daysOfWeek: DAYS_OF_WEEK
    });
  } catch (err) {
    console.error('Error loading member workout:', err);
    req.flash('error', 'Failed to load workout plan');
    res.redirect('/member/dashboard');
  }
};

// GET /member/profile
const getProfile = async (req, res) => {
  try {
    const memberId = req.session.user.id;
    const member = await User.findById(memberId)
      .populate('trainer', 'name email phone specialization')
      .lean();

    const latestMembership = await Membership.findOne({ member: memberId })
      .populate('plan', 'name durationDays price')
      .sort({ createdAt: -1 })
      .lean();

    res.render('member/profile', {
      title: 'My Profile - GymFlow',
      user: req.session.user,
      member,
      latestMembership,
      formatDate,
      daysUntilExpiry,
      getMembershipStatus
    });
  } catch (err) {
    console.error('Error loading member profile:', err);
    req.flash('error', 'Failed to load profile');
    res.redirect('/member/dashboard');
  }
};

// POST /member/profile
const postUpdateProfile = async (req, res) => {
  try {
    const memberId = req.session.user.id;
    const { name, phone } = req.body;

    if (!name || name.trim() === '') {
      req.flash('error', 'Name cannot be empty');
      return res.redirect('/member/profile');
    }

    const member = await User.findById(memberId);
    if (!member) {
      req.flash('error', 'User not found');
      return res.redirect('/login');
    }

    // Only allow updating name and phone
    member.name = name.trim();
    member.phone = phone ? phone.trim() : '';

    await member.save();

    // Update session name
    req.session.user.name = member.name;

    req.flash('success', 'Profile updated successfully');
    res.redirect('/member/profile');
  } catch (err) {
    console.error('Error updating profile:', err);
    req.flash('error', 'Failed to update profile');
    res.redirect('/member/profile');
  }
};

module.exports = {
  dashboard,
  getWorkout,
  getProfile,
  postUpdateProfile
};
