const Attendance = require('../models/Attendance');
const { normalizeDate, getTodayRange, formatDate, formatTime, getDayOfWeek } = require('../utils/dateUtils');

// GET /member/attendance
const getMemberAttendance = async (req, res) => {
  try {
    const memberId = req.session.user.id;
    const now = new Date();
    const { start: todayStart, end: todayEnd } = getTodayRange(now);

    // 1. Check today's status
    const todayAttendance = await Attendance.findOne({
      member: memberId,
      date: { $gte: todayStart, $lte: todayEnd }
    }).lean();

    // 2. Count attendance this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthlyCount = await Attendance.countDocuments({
      member: memberId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // 3. Attendance history (recent 60 days)
    const history = await Attendance.find({ member: memberId })
      .sort({ date: -1 })
      .limit(60)
      .lean();

    const formattedHistory = history.map((record) => ({
      ...record,
      day: getDayOfWeek(record.date),
      formattedDate: formatDate(record.date),
      formattedTime: formatTime(record.checkInTime)
    }));

    res.render('member/attendance', {
      title: 'My Attendance - GymFlow',
      user: req.session.user,
      todayAttendance,
      monthlyCount,
      history: formattedHistory,
      formatDate,
      formatTime,
      getDayOfWeek
    });
  } catch (err) {
    console.error('Error fetching member attendance:', err);
    req.flash('error', 'Failed to load attendance records');
    res.redirect('/member/dashboard');
  }
};

// POST /member/attendance/mark
const postMarkAttendance = async (req, res) => {
  try {
    const memberId = req.session.user.id;
    const now = new Date();
    const normalizedDate = normalizeDate(now);
    const { start: todayStart, end: todayEnd } = getTodayRange(now);

    // Check if attendance already marked today
    const existing = await Attendance.findOne({
      member: memberId,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (existing) {
      req.flash('error', 'Attendance has already been marked today.');
      return res.redirect('/member/attendance');
    }

    const attendance = new Attendance({
      member: memberId,
      date: normalizedDate,
      checkInTime: now
    });

    await attendance.save();
    req.flash('success', `Attendance marked successfully at ${formatTime(now)}!`);
    res.redirect('/member/attendance');
  } catch (err) {
    if (err.code === 11000) {
      req.flash('error', 'Attendance has already been marked today.');
      return res.redirect('/member/attendance');
    }
    console.error('Error marking attendance:', err);
    req.flash('error', 'Failed to mark attendance. Please try again.');
    res.redirect('/member/attendance');
  }
};

module.exports = {
  getMemberAttendance,
  postMarkAttendance
};
