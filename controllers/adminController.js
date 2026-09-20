const User = require('../models/User');
const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const WorkoutPlan = require('../models/WorkoutPlan');
const Attendance = require('../models/Attendance');
const WeightLog = require('../models/WeightLog');
const { getTodayRange, formatDate, formatTime, formatDateTime, addDays } = require('../utils/dateUtils');
const { getMembershipStatus, daysUntilExpiry, syncMembershipStatuses } = require('../utils/membershipUtils');

// GET /admin/dashboard
const dashboard = async (req, res) => {
  try {
    // Keep membership statuses in sync with current date
    await syncMembershipStatuses();

    const now = new Date();
    const in7Days = addDays(now, 7);
    const { start: todayStart, end: todayEnd } = getTodayRange(now);

    // 1. Metric Counts
    const totalMembers = await User.countDocuments({ role: 'member' });
    const totalTrainers = await User.countDocuments({ role: 'trainer', isActive: true });
    const todayAttendanceCount = await Attendance.countDocuments({
      date: { $gte: todayStart, $lte: todayEnd }
    });

    // Active memberships (status active and expiryDate >= now)
    const activeMembersCount = await Membership.countDocuments({
      expiryDate: { $gte: now },
      status: 'active'
    });

    // Expiring soon (within next 7 days and >= now)
    const expiringSoonCount = await Membership.countDocuments({
      expiryDate: { $gte: now, $lte: in7Days },
      status: 'active'
    });

    // Expired memberships count
    const expiredMembersCount = await Membership.countDocuments({
      $or: [
        { expiryDate: { $lt: now } },
        { status: 'expired' }
      ]
    });

    // 2. Plan Distribution (Aggregation)
    const planDistribution = await Membership.aggregate([
      { $match: { status: 'active', expiryDate: { $gte: now } } },
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'membershipplans',
          localField: '_id',
          foreignField: '_id',
          as: 'planDetails'
        }
      },
      { $unwind: '$planDetails' },
      {
        $project: {
          name: '$planDetails.name',
          count: 1
        }
      }
    ]);

    // 3. Trainer Statistics (Trainers and assigned members)
    const trainers = await User.find({ role: 'trainer' }).lean();
    const trainerStats = await Promise.all(
      trainers.map(async (trainer) => {
        const assignedCount = await User.countDocuments({ trainer: trainer._id, role: 'member' });
        return {
          id: trainer._id,
          name: trainer.name,
          email: trainer.email,
          specialization: trainer.specialization || 'General Fitness',
          assignedCount,
          isActive: trainer.isActive
        };
      })
    );

    // 4. Recent Member Registrations (latest 5)
    const recentMembers = await User.find({ role: 'member' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('trainer', 'name')
      .lean();

    // 5. Expiring Memberships (next 5)
    const expiringMemberships = await Membership.find({
      expiryDate: { $gte: now, $lte: in7Days },
      status: 'active'
    })
      .populate('member', 'name email phone')
      .populate('plan', 'name durationDays price')
      .sort({ expiryDate: 1 })
      .limit(5)
      .lean();

    // 6. Recent Attendance (Today's check-ins, latest 5)
    const recentAttendance = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd }
    })
      .populate('member', 'name email phone')
      .sort({ checkInTime: -1 })
      .limit(5)
      .lean();

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - GymFlow',
      user: req.session.user,
      metrics: {
        totalMembers,
        activeMembersCount,
        expiredMembersCount,
        totalTrainers,
        todayAttendanceCount,
        expiringSoonCount
      },
      planDistribution,
      trainerStats,
      recentMembers,
      expiringMemberships,
      recentAttendance,
      formatDate,
      formatTime,
      daysUntilExpiry,
      getMembershipStatus
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    req.flash('error', 'Failed to load dashboard statistics');
    res.render('admin/dashboard', {
      title: 'Admin Dashboard - GymFlow',
      user: req.session.user,
      metrics: { totalMembers: 0, activeMembersCount: 0, expiredMembersCount: 0, totalTrainers: 0, todayAttendanceCount: 0, expiringSoonCount: 0 },
      planDistribution: [],
      trainerStats: [],
      recentMembers: [],
      expiringMemberships: [],
      recentAttendance: [],
      formatDate,
      formatTime,
      daysUntilExpiry,
      getMembershipStatus
    });
  }
};

// GET /admin/members
const getMembers = async (req, res) => {
  try {
    await syncMembershipStatuses();
    const { search, status, trainer, plan } = req.query;

    let userQuery = { role: 'member' };

    // Search by name, email, phone
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      userQuery.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Filter by trainer
    if (trainer && trainer !== 'all') {
      userQuery.trainer = trainer;
    }

    const members = await User.find(userQuery)
      .populate('trainer', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich each member with their current membership
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        const latestMembership = await Membership.findOne({ member: member._id })
          .populate('plan', 'name durationDays price')
          .sort({ createdAt: -1 })
          .lean();

        let membershipStatus = 'No Plan';
        let daysLeft = null;

        if (latestMembership) {
          membershipStatus = getMembershipStatus(latestMembership.expiryDate);
          daysLeft = daysUntilExpiry(latestMembership.expiryDate);
        }

        return {
          ...member,
          membership: latestMembership,
          membershipStatus,
          daysLeft
        };
      })
    );

    // Filter by membership status if selected
    let filteredMembers = enrichedMembers;
    if (status && status !== 'all') {
      if (status === 'active') {
        filteredMembers = enrichedMembers.filter((m) => m.membershipStatus === 'active');
      } else if (status === 'expiring_soon') {
        filteredMembers = enrichedMembers.filter((m) => m.membershipStatus === 'expiring_soon');
      } else if (status === 'expired') {
        filteredMembers = enrichedMembers.filter((m) => m.membershipStatus === 'expired' || m.membershipStatus === 'No Plan');
      }
    }

    // Filter by plan if selected
    if (plan && plan !== 'all') {
      filteredMembers = filteredMembers.filter(
        (m) => m.membership && m.membership.plan && m.membership.plan._id.toString() === plan
      );
    }

    // Fetch trainers and plans for filter dropdowns
    const allTrainers = await User.find({ role: 'trainer', isActive: true }).select('name').lean();
    const allPlans = await MembershipPlan.find({ isActive: true }).select('name').lean();

    res.render('admin/members', {
      title: 'Member Management - GymFlow',
      user: req.session.user,
      members: filteredMembers,
      trainers: allTrainers,
      plans: allPlans,
      filters: { search, status, trainer, plan },
      formatDate,
      daysUntilExpiry
    });
  } catch (err) {
    console.error('Error fetching members:', err);
    req.flash('error', 'Failed to load members');
    res.redirect('/admin/dashboard');
  }
};

// GET /admin/members/:id
const getMemberDetail = async (req, res) => {
  try {
    const member = await User.findOne({ _id: req.params.id, role: 'member' })
      .populate('trainer', 'name email phone specialization')
      .lean();

    if (!member) {
      req.flash('error', 'Member not found');
      return res.redirect('/admin/members');
    }

    // Memberships history
    const memberships = await Membership.find({ member: member._id })
      .populate('plan', 'name durationDays price')
      .sort({ createdAt: -1 })
      .lean();

    const currentMembership = memberships.length > 0 ? memberships[0] : null;

    // Workout plan
    const workoutPlan = await WorkoutPlan.findOne({ member: member._id })
      .populate('trainer', 'name')
      .lean();

    // Attendance history (recent 30)
    const attendanceHistory = await Attendance.find({ member: member._id })
      .sort({ date: -1 })
      .limit(30)
      .lean();

    // Weight logs (recent 30)
    const weightLogs = await WeightLog.find({ member: member._id })
      .sort({ loggedAt: -1 })
      .limit(30)
      .lean();

    // All active trainers and plans for modal assignment dropdowns
    const activeTrainers = await User.find({ role: 'trainer', isActive: true }).lean();
    const activePlans = await MembershipPlan.find({ isActive: true }).lean();

    res.render('admin/memberDetail', {
      title: `${member.name} - Member Profile - GymFlow`,
      user: req.session.user,
      member,
      currentMembership,
      memberships,
      workoutPlan,
      attendanceHistory,
      weightLogs,
      trainers: activeTrainers,
      plans: activePlans,
      formatDate,
      formatTime,
      formatDateTime,
      daysUntilExpiry,
      getMembershipStatus
    });
  } catch (err) {
    console.error('Error fetching member details:', err);
    req.flash('error', 'Failed to load member profile');
    res.redirect('/admin/members');
  }
};

// POST /admin/members/:id/edit
const updateMember = async (req, res) => {
  try {
    const { name, email, phone, gender, dateOfBirth } = req.body;
    const member = await User.findById(req.params.id);

    if (!member || member.role !== 'member') {
      req.flash('error', 'Member not found');
      return res.redirect('/admin/members');
    }

    member.name = name ? name.trim() : member.name;
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== member.email) {
        const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: member._id } });
        if (existing) {
          req.flash('error', 'Email is already in use by another user');
          return res.redirect(`/admin/members/${member._id}`);
        }
        member.email = normalizedEmail;
      }
    }
    member.phone = phone ? phone.trim() : member.phone;
    member.gender = gender || member.gender;
    if (dateOfBirth) {
      member.dateOfBirth = new Date(dateOfBirth);
    }

    await member.save();
    req.flash('success', 'Member details updated successfully');
    res.redirect(`/admin/members/${member._id}`);
  } catch (err) {
    console.error('Error updating member:', err);
    req.flash('error', 'Failed to update member details');
    res.redirect(`/admin/members/${req.params.id}`);
  }
};

// POST /admin/members/:id/toggle-status
const toggleMemberStatus = async (req, res) => {
  try {
    const member = await User.findById(req.params.id);
    if (!member || member.role !== 'member') {
      req.flash('error', 'Member not found');
      return res.redirect('/admin/members');
    }

    member.isActive = !member.isActive;
    await member.save();

    req.flash('success', `Member ${member.isActive ? 'activated' : 'deactivated'} successfully`);
    res.redirect(`/admin/members/${member._id}`);
  } catch (err) {
    console.error('Error toggling member status:', err);
    req.flash('error', 'Failed to toggle member status');
    res.redirect('/admin/members');
  }
};

// POST /admin/members/:id/assign-trainer
const assignTrainer = async (req, res) => {
  try {
    const { trainerId } = req.body;
    const member = await User.findById(req.params.id);

    if (!member || member.role !== 'member') {
      req.flash('error', 'Member not found');
      return res.redirect('/admin/members');
    }

    if (!trainerId || trainerId === 'none') {
      member.trainer = null;
      await member.save();
      req.flash('success', 'Trainer unassigned successfully');
    } else {
      const trainer = await User.findOne({ _id: trainerId, role: 'trainer' });
      if (!trainer) {
        req.flash('error', 'Selected trainer not found');
        return res.redirect(`/admin/members/${member._id}`);
      }
      member.trainer = trainer._id;
      await member.save();
      req.flash('success', `Trainer ${trainer.name} assigned successfully`);
    }

    res.redirect(`/admin/members/${member._id}`);
  } catch (err) {
    console.error('Error assigning trainer:', err);
    req.flash('error', 'Failed to assign trainer');
    res.redirect(`/admin/members/${req.params.id}`);
  }
};

// GET /admin/trainers
const getTrainers = async (req, res) => {
  try {
    const trainers = await User.find({ role: 'trainer' }).sort({ createdAt: -1 }).lean();

    const trainersWithStats = await Promise.all(
      trainers.map(async (trainer) => {
        const assignedMembers = await User.find({ trainer: trainer._id, role: 'member' })
          .select('name email phone isActive')
          .lean();
        return {
          ...trainer,
          assignedCount: assignedMembers.length,
          assignedMembers
        };
      })
    );

    res.render('admin/trainers', {
      title: 'Trainer Management - GymFlow',
      user: req.session.user,
      trainers: trainersWithStats,
      formatDate
    });
  } catch (err) {
    console.error('Error fetching trainers:', err);
    req.flash('error', 'Failed to load trainers');
    res.redirect('/admin/dashboard');
  }
};

// GET /admin/trainers/create
const getCreateTrainer = (req, res) => {
  res.render('admin/trainerCreate', {
    title: 'Add New Trainer - GymFlow',
    user: req.session.user
  });
};

// POST /admin/trainers/create
const postCreateTrainer = async (req, res) => {
  try {
    const { name, email, phone, password, specialization } = req.body;

    if (!name || !email || !password) {
      req.flash('error', 'Name, email, and password are required');
      return res.redirect('/admin/trainers/create');
    }

    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters long');
      return res.redirect('/admin/trainers/create');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      req.flash('error', 'A user with this email already exists');
      return res.redirect('/admin/trainers/create');
    }

    const trainer = new User({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      password,
      role: 'trainer',
      specialization: specialization ? specialization.trim() : 'General Fitness',
      isActive: true
    });

    await trainer.save();
    req.flash('success', `Trainer ${trainer.name} created successfully`);
    res.redirect('/admin/trainers');
  } catch (err) {
    console.error('Error creating trainer:', err);
    req.flash('error', err.message || 'Failed to create trainer');
    res.redirect('/admin/trainers/create');
  }
};

// POST /admin/trainers/:id/edit
const updateTrainer = async (req, res) => {
  try {
    const { name, phone, specialization } = req.body;
    const trainer = await User.findOne({ _id: req.params.id, role: 'trainer' });

    if (!trainer) {
      req.flash('error', 'Trainer not found');
      return res.redirect('/admin/trainers');
    }

    trainer.name = name ? name.trim() : trainer.name;
    trainer.phone = phone ? phone.trim() : trainer.phone;
    trainer.specialization = specialization ? specialization.trim() : trainer.specialization;

    await trainer.save();
    req.flash('success', 'Trainer details updated successfully');
    res.redirect('/admin/trainers');
  } catch (err) {
    console.error('Error updating trainer:', err);
    req.flash('error', 'Failed to update trainer details');
    res.redirect('/admin/trainers');
  }
};

// POST /admin/trainers/:id/toggle-status
const toggleTrainerStatus = async (req, res) => {
  try {
    const trainer = await User.findOne({ _id: req.params.id, role: 'trainer' });
    if (!trainer) {
      req.flash('error', 'Trainer not found');
      return res.redirect('/admin/trainers');
    }

    trainer.isActive = !trainer.isActive;
    await trainer.save();

    req.flash('success', `Trainer ${trainer.isActive ? 'activated' : 'deactivated'} successfully`);
    res.redirect('/admin/trainers');
  } catch (err) {
    console.error('Error toggling trainer status:', err);
    req.flash('error', 'Failed to toggle trainer status');
    res.redirect('/admin/trainers');
  }
};

// GET /admin/memberships/expiring
const getExpiringMemberships = async (req, res) => {
  try {
    await syncMembershipStatuses();
    const now = new Date();
    const in7Days = addDays(now, 7);

    // Memberships expiring in the next 7 days
    const expiringSoon = await Membership.find({
      expiryDate: { $gte: now, $lte: in7Days },
      status: 'active'
    })
      .populate({
        path: 'member',
        populate: { path: 'trainer', select: 'name' }
      })
      .populate('plan', 'name durationDays price')
      .sort({ expiryDate: 1 })
      .lean();

    // Expired memberships
    const expired = await Membership.find({
      $or: [
        { expiryDate: { $lt: now } },
        { status: 'expired' }
      ]
    })
      .populate({
        path: 'member',
        populate: { path: 'trainer', select: 'name' }
      })
      .populate('plan', 'name durationDays price')
      .sort({ expiryDate: -1 })
      .limit(50)
      .lean();

    res.render('admin/expiring', {
      title: 'Expiring Memberships - GymFlow',
      user: req.session.user,
      expiringSoon,
      expired,
      formatDate,
      daysUntilExpiry,
      getMembershipStatus
    });
  } catch (err) {
    console.error('Error loading expiring memberships:', err);
    req.flash('error', 'Failed to load expiring memberships');
    res.redirect('/admin/dashboard');
  }
};

// GET /admin/attendance
const getAttendance = async (req, res) => {
  try {
    const selectedDateStr = req.query.date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(selectedDateStr);
    const { start, end } = getTodayRange(targetDate);
    const { search } = req.query;

    let attendances = await Attendance.find({
      date: { $gte: start, $lte: end }
    })
      .populate('member', 'name email phone')
      .sort({ checkInTime: -1 })
      .lean();

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      attendances = attendances.filter(
        (a) => a.member && (regex.test(a.member.name) || regex.test(a.member.email) || regex.test(a.member.phone))
      );
    }

    res.render('admin/attendance', {
      title: 'Attendance Records - GymFlow',
      user: req.session.user,
      attendances,
      selectedDate: selectedDateStr,
      search: search || '',
      totalCount: attendances.length,
      formatDate,
      formatTime,
      formatDateTime
    });
  } catch (err) {
    console.error('Error fetching attendance records:', err);
    req.flash('error', 'Failed to load attendance records');
    res.redirect('/admin/dashboard');
  }
};

module.exports = {
  dashboard,
  getMembers,
  getMemberDetail,
  updateMember,
  toggleMemberStatus,
  assignTrainer,
  getTrainers,
  getCreateTrainer,
  postCreateTrainer,
  updateTrainer,
  toggleTrainerStatus,
  getExpiringMemberships,
  getAttendance
};
