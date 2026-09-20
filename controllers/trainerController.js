const User = require('../models/User');
const Membership = require('../models/Membership');
const WorkoutPlan = require('../models/WorkoutPlan');
const Attendance = require('../models/Attendance');
const WeightLog = require('../models/WeightLog');
const { getTodayRange, formatDate, formatTime, formatDateTime } = require('../utils/dateUtils');
const { getMembershipStatus, daysUntilExpiry, syncMembershipStatuses } = require('../utils/membershipUtils');

// GET /trainer/dashboard
const dashboard = async (req, res) => {
  try {
    await syncMembershipStatuses();
    const trainerId = req.session.user.id;
    const now = new Date();
    const { start: todayStart, end: todayEnd } = getTodayRange(now);

    // 1. Fetch assigned members
    const assignedMembers = await User.find({ trainer: trainerId, role: 'member' }).lean();
    const memberIds = assignedMembers.map((m) => m._id);

    // 2. Metrics
    const totalAssigned = assignedMembers.length;

    // Active memberships for assigned members
    const activeMemberships = await Membership.find({
      member: { $in: memberIds },
      status: 'active',
      expiryDate: { $gte: now }
    }).select('member').lean();
    const activeMemberIdsSet = new Set(activeMemberships.map((m) => m.member.toString()));
    const activeMembersCount = activeMemberIdsSet.size;

    // Members with workout plans
    const workoutPlans = await WorkoutPlan.find({ member: { $in: memberIds } }).select('member').lean();
    const membersWithPlanSet = new Set(workoutPlans.map((w) => w.member.toString()));
    const membersWithoutPlanCount = totalAssigned - membersWithPlanSet.size;

    // Today's attendance among assigned members
    const todayAttendanceCount = await Attendance.countDocuments({
      member: { $in: memberIds },
      date: { $gte: todayStart, $lte: todayEnd }
    });

    // 3. Enriched table of assigned members
    const membersTableData = await Promise.all(
      assignedMembers.map(async (member) => {
        // Latest membership
        const latestMembership = await Membership.findOne({ member: member._id })
          .populate('plan', 'name')
          .sort({ createdAt: -1 })
          .lean();

        // Workout plan existence
        const hasWorkoutPlan = membersWithPlanSet.has(member._id.toString());

        // Last attendance
        const lastAttendance = await Attendance.findOne({ member: member._id })
          .sort({ date: -1 })
          .lean();

        let membershipStatus = 'No Plan';
        let expiryDate = null;
        let daysLeft = null;

        if (latestMembership) {
          membershipStatus = getMembershipStatus(latestMembership.expiryDate);
          expiryDate = latestMembership.expiryDate;
          daysLeft = daysUntilExpiry(latestMembership.expiryDate);
        }

        return {
          ...member,
          membership: latestMembership,
          membershipStatus,
          expiryDate,
          daysLeft,
          hasWorkoutPlan,
          lastAttendance: lastAttendance ? lastAttendance.checkInTime : null
        };
      })
    );

    res.render('trainer/dashboard', {
      title: 'Trainer Dashboard - GymFlow',
      user: req.session.user,
      metrics: {
        totalAssigned,
        activeMembersCount,
        membersWithoutPlanCount,
        todayAttendanceCount
      },
      members: membersTableData,
      formatDate,
      formatTime,
      formatDateTime,
      daysUntilExpiry,
      getMembershipStatus
    });
  } catch (err) {
    console.error('Trainer dashboard error:', err);
    req.flash('error', 'Failed to load trainer dashboard');
    res.redirect('/login');
  }
};

// GET /trainer/members
const getMembers = async (req, res) => {
  try {
    await syncMembershipStatuses();
    const trainerId = req.session.user.id;

    const assignedMembers = await User.find({ trainer: trainerId, role: 'member' })
      .sort({ name: 1 })
      .lean();

    const enrichedMembers = await Promise.all(
      assignedMembers.map(async (member) => {
        const latestMembership = await Membership.findOne({ member: member._id })
          .populate('plan', 'name')
          .sort({ createdAt: -1 })
          .lean();

        const workoutPlan = await WorkoutPlan.findOne({ member: member._id }).select('title').lean();
        const lastAttendance = await Attendance.findOne({ member: member._id }).sort({ date: -1 }).lean();

        return {
          ...member,
          membership: latestMembership,
          membershipStatus: latestMembership ? getMembershipStatus(latestMembership.expiryDate) : 'No Plan',
          workoutPlanTitle: workoutPlan ? workoutPlan.title : null,
          lastAttendance: lastAttendance ? lastAttendance.checkInTime : null
        };
      })
    );

    res.render('trainer/members', {
      title: 'My Assigned Members - GymFlow',
      user: req.session.user,
      members: enrichedMembers,
      formatDate,
      formatTime,
      daysUntilExpiry
    });
  } catch (err) {
    console.error('Error fetching assigned members:', err);
    req.flash('error', 'Failed to load members');
    res.redirect('/trainer/dashboard');
  }
};

// GET /trainer/members/:id
const getMemberDetail = async (req, res) => {
  try {
    const member = req.targetMember; // Already verified by verifyTrainerMemberOwnership middleware!

    // Membership details
    const membership = await Membership.findOne({ member: member._id })
      .populate('plan', 'name durationDays price')
      .sort({ createdAt: -1 })
      .lean();

    // Workout plan
    const workoutPlan = await WorkoutPlan.findOne({ member: member._id }).lean();

    // Attendance history (recent 20)
    const attendanceHistory = await Attendance.find({ member: member._id })
      .sort({ date: -1 })
      .limit(20)
      .lean();

    // Weight logs (recent 20)
    const weightLogs = await WeightLog.find({ member: member._id })
      .sort({ loggedAt: -1 })
      .limit(20)
      .lean();

    res.render('trainer/memberDetail', {
      title: `${member.name} - Member Details - GymFlow`,
      user: req.session.user,
      member,
      membership,
      workoutPlan,
      attendanceHistory,
      weightLogs,
      formatDate,
      formatTime,
      formatDateTime,
      daysUntilExpiry,
      getMembershipStatus
    });
  } catch (err) {
    console.error('Error loading member detail for trainer:', err);
    req.flash('error', 'Failed to load member profile');
    res.redirect('/trainer/members');
  }
};

module.exports = {
  dashboard,
  getMembers,
  getMemberDetail
};
