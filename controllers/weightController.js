const WeightLog = require('../models/WeightLog');
const { formatDate, formatDateTime } = require('../utils/dateUtils');

// GET /member/progress
const getMemberProgress = async (req, res) => {
  try {
    const memberId = req.session.user.id;

    // Fetch logs chronologically for calculation and chart
    const chronologicalLogs = await WeightLog.find({ member: memberId })
      .sort({ loggedAt: 1 })
      .lean();

    // Reverse for table display (most recent first)
    const displayLogs = [...chronologicalLogs].reverse();

    let startingWeight = null;
    let latestWeight = null;
    let totalChange = null;

    if (chronologicalLogs.length > 0) {
      startingWeight = chronologicalLogs[0].weight;
      latestWeight = chronologicalLogs[chronologicalLogs.length - 1].weight;
      totalChange = Number((latestWeight - startingWeight).toFixed(1));
    }

    // Prepare chart data: labels (dates) and data (weights)
    const chartLabels = chronologicalLogs.map((log) => formatDate(log.loggedAt));
    const chartData = chronologicalLogs.map((log) => log.weight);

    res.render('member/progress', {
      title: 'Body Weight Progress - GymFlow',
      user: req.session.user,
      startingWeight,
      latestWeight,
      totalChange,
      logs: displayLogs,
      chartLabels: JSON.stringify(chartLabels),
      chartData: JSON.stringify(chartData),
      formatDate,
      formatDateTime
    });
  } catch (err) {
    console.error('Error loading weight progress:', err);
    req.flash('error', 'Failed to load progress');
    res.redirect('/member/dashboard');
  }
};

// POST /member/progress/log
const postLogWeight = async (req, res) => {
  try {
    const memberId = req.session.user.id;
    const { weight, loggedAt } = req.body;

    if (!weight || isNaN(Number(weight))) {
      req.flash('error', 'Please enter a valid numeric weight');
      return res.redirect('/member/progress');
    }

    const numWeight = Number(weight);
    if (numWeight < 20 || numWeight > 400) {
      req.flash('error', 'Weight must be between 20 kg and 400 kg');
      return res.redirect('/member/progress');
    }

    const logDate = loggedAt ? new Date(loggedAt) : new Date();

    const weightLog = new WeightLog({
      member: memberId,
      weight: Number(numWeight.toFixed(1)),
      loggedAt: logDate
    });

    await weightLog.save();
    req.flash('success', `Logged weight of ${weightLog.weight} kg successfully!`);
    res.redirect('/member/progress');
  } catch (err) {
    console.error('Error logging weight:', err);
    req.flash('error', 'Failed to log weight');
    res.redirect('/member/progress');
  }
};

// GET /member/progress/chart-data (JSON API)
const getWeightDataApi = async (req, res) => {
  try {
    const memberId = req.session.user.id;
    const logs = await WeightLog.find({ member: memberId })
      .sort({ loggedAt: 1 })
      .lean();

    const labels = logs.map((log) => formatDate(log.loggedAt));
    const data = logs.map((log) => log.weight);

    res.json({ labels, data });
  } catch (err) {
    console.error('Error fetching chart data:', err);
    res.status(500).json({ error: 'Failed to fetch weight data' });
  }
};

module.exports = {
  getMemberProgress,
  postLogWeight,
  getWeightDataApi
};
