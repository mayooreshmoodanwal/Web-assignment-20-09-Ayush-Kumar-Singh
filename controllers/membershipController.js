const MembershipPlan = require('../models/MembershipPlan');
const Membership = require('../models/Membership');
const User = require('../models/User');
const { calculateExpiryDate, getMembershipStatus } = require('../utils/membershipUtils');
const { formatDate } = require('../utils/dateUtils');

// GET /admin/membership-plans
const getPlans = async (req, res) => {
  try {
    const plans = await MembershipPlan.find().sort({ durationDays: 1 }).lean();

    // Enrich with count of active members on each plan
    const plansWithCount = await Promise.all(
      plans.map(async (plan) => {
        const activeCount = await Membership.countDocuments({
          plan: plan._id,
          status: 'active',
          expiryDate: { $gte: new Date() }
        });
        return {
          ...plan,
          activeCount
        };
      })
    );

    res.render('admin/plans', {
      title: 'Membership Plans - GymFlow',
      user: req.session.user,
      plans: plansWithCount
    });
  } catch (err) {
    console.error('Error fetching plans:', err);
    req.flash('error', 'Failed to load membership plans');
    res.redirect('/admin/dashboard');
  }
};

// GET /admin/membership-plans/create
const getCreatePlan = (req, res) => {
  res.render('admin/planForm', {
    title: 'Create Membership Plan - GymFlow',
    user: req.session.user,
    plan: null,
    isEdit: false
  });
};

// POST /admin/membership-plans/create
const postCreatePlan = async (req, res) => {
  try {
    const { name, durationDays, price, description } = req.body;

    if (!name || !durationDays || price === undefined) {
      req.flash('error', 'Please fill in all required fields');
      return res.redirect('/admin/membership-plans/create');
    }

    if (Number(durationDays) <= 0) {
      req.flash('error', 'Duration must be greater than 0');
      return res.redirect('/admin/membership-plans/create');
    }

    if (Number(price) < 0) {
      req.flash('error', 'Price cannot be negative');
      return res.redirect('/admin/membership-plans/create');
    }

    const plan = new MembershipPlan({
      name: name.trim(),
      durationDays: Number(durationDays),
      price: Number(price),
      description: description ? description.trim() : '',
      isActive: true
    });

    await plan.save();
    req.flash('success', `Plan "${plan.name}" created successfully`);
    res.redirect('/admin/membership-plans');
  } catch (err) {
    console.error('Error creating plan:', err);
    req.flash('error', err.message || 'Failed to create plan');
    res.redirect('/admin/membership-plans/create');
  }
};

// GET /admin/membership-plans/:id/edit
const getEditPlan = async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      req.flash('error', 'Plan not found');
      return res.redirect('/admin/membership-plans');
    }

    res.render('admin/planForm', {
      title: `Edit ${plan.name} - GymFlow`,
      user: req.session.user,
      plan,
      isEdit: true
    });
  } catch (err) {
    console.error('Error fetching plan for edit:', err);
    req.flash('error', 'Failed to load plan');
    res.redirect('/admin/membership-plans');
  }
};

// POST /admin/membership-plans/:id/edit
const postEditPlan = async (req, res) => {
  try {
    const { name, durationDays, price, description, isActive } = req.body;
    const plan = await MembershipPlan.findById(req.params.id);

    if (!plan) {
      req.flash('error', 'Plan not found');
      return res.redirect('/admin/membership-plans');
    }

    if (Number(durationDays) <= 0) {
      req.flash('error', 'Duration must be greater than 0');
      return res.redirect(`/admin/membership-plans/${plan._id}/edit`);
    }

    if (Number(price) < 0) {
      req.flash('error', 'Price cannot be negative');
      return res.redirect(`/admin/membership-plans/${plan._id}/edit`);
    }

    plan.name = name.trim();
    plan.durationDays = Number(durationDays);
    plan.price = Number(price);
    plan.description = description ? description.trim() : '';
    plan.isActive = isActive === 'on' || isActive === true || isActive === 'true';

    await plan.save();
    req.flash('success', `Plan "${plan.name}" updated successfully`);
    res.redirect('/admin/membership-plans');
  } catch (err) {
    console.error('Error updating plan:', err);
    req.flash('error', 'Failed to update plan');
    res.redirect(`/admin/membership-plans/${req.params.id}/edit`);
  }
};

// POST /admin/membership-plans/:id/delete
const postDeletePlan = async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      req.flash('error', 'Plan not found');
      return res.redirect('/admin/membership-plans');
    }

    // Check if any active memberships use this plan
    const activeMembersCount = await Membership.countDocuments({
      plan: plan._id,
      status: 'active',
      expiryDate: { $gte: new Date() }
    });

    if (activeMembersCount > 0) {
      // Soft-delete by setting isActive to false
      plan.isActive = false;
      await plan.save();
      req.flash('info', `Plan "${plan.name}" has active members and was deactivated instead of deleted.`);
    } else {
      await MembershipPlan.findByIdAndDelete(plan._id);
      req.flash('success', `Plan "${plan.name}" deleted successfully`);
    }

    res.redirect('/admin/membership-plans');
  } catch (err) {
    console.error('Error deleting plan:', err);
    req.flash('error', 'Failed to delete plan');
    res.redirect('/admin/membership-plans');
  }
};

// POST /admin/members/:id/assign-membership
const postAssignMembership = async (req, res) => {
  try {
    const memberId = req.params.id;
    const { planId, startDate, amountPaid } = req.body;

    const member = await User.findById(memberId);
    if (!member || member.role !== 'member') {
      req.flash('error', 'Member not found');
      return res.redirect('/admin/members');
    }

    const plan = await MembershipPlan.findById(planId);
    if (!plan) {
      req.flash('error', 'Selected membership plan not found');
      return res.redirect(`/admin/members/${memberId}`);
    }

    const start = startDate ? new Date(startDate) : new Date();
    const expiry = calculateExpiryDate(start, plan.durationDays);
    const paid = amountPaid !== undefined && amountPaid !== '' ? Number(amountPaid) : plan.price;

    const status = getMembershipStatus(expiry) === 'expired' ? 'expired' : 'active';

    const membership = new Membership({
      member: member._id,
      plan: plan._id,
      startDate: start,
      expiryDate: expiry,
      status,
      amountPaid: paid
    });

    await membership.save();
    req.flash('success', `Membership plan "${plan.name}" assigned successfully to ${member.name}`);
    res.redirect(`/admin/members/${memberId}`);
  } catch (err) {
    console.error('Error assigning membership:', err);
    req.flash('error', 'Failed to assign membership');
    res.redirect(`/admin/members/${req.params.id}`);
  }
};

// POST /admin/members/:id/renew-membership
const postRenewMembership = async (req, res) => {
  try {
    const memberId = req.params.id;
    const { planId, startDate, amountPaid } = req.body;

    const member = await User.findById(memberId);
    if (!member || member.role !== 'member') {
      req.flash('error', 'Member not found');
      return res.redirect('/admin/members');
    }

    const plan = await MembershipPlan.findById(planId);
    if (!plan) {
      req.flash('error', 'Selected membership plan not found');
      return res.redirect(`/admin/members/${memberId}`);
    }

    // Determine start date: if currently active and no custom start given, can extend from current expiry
    let start = startDate ? new Date(startDate) : new Date();

    const latestMembership = await Membership.findOne({ member: member._id })
      .sort({ expiryDate: -1 })
      .lean();

    if (!startDate && latestMembership && new Date(latestMembership.expiryDate) > new Date()) {
      start = new Date(latestMembership.expiryDate);
    }

    const expiry = calculateExpiryDate(start, plan.durationDays);
    const paid = amountPaid !== undefined && amountPaid !== '' ? Number(amountPaid) : plan.price;
    const status = getMembershipStatus(expiry) === 'expired' ? 'expired' : 'active';

    const membership = new Membership({
      member: member._id,
      plan: plan._id,
      startDate: start,
      expiryDate: expiry,
      status,
      amountPaid: paid
    });

    await membership.save();
    req.flash('success', `Membership successfully renewed for ${member.name} with "${plan.name}"`);
    res.redirect(`/admin/members/${memberId}`);
  } catch (err) {
    console.error('Error renewing membership:', err);
    req.flash('error', 'Failed to renew membership');
    res.redirect(`/admin/members/${req.params.id}`);
  }
};

module.exports = {
  getPlans,
  getCreatePlan,
  postCreatePlan,
  getEditPlan,
  postEditPlan,
  postDeletePlan,
  postAssignMembership,
  postRenewMembership
};
