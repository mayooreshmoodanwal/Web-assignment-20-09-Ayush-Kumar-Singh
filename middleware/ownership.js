const User = require('../models/User');

/**
 * Middleware to verify that a member is assigned to the logged-in trainer
 */
const verifyTrainerMemberOwnership = async (req, res, next) => {
  try {
    const memberId = req.params.id || req.body.memberId;
    const trainerId = req.session.user.id;

    if (!memberId) {
      req.flash('error', 'Member ID is missing');
      return res.redirect('/trainer/members');
    }

    const member = await User.findById(memberId);

    if (!member) {
      req.flash('error', 'Member not found');
      return res.redirect('/trainer/members');
    }

    // Check ownership: member's trainer must match the logged-in trainer's ID
    if (!member.trainer || member.trainer.toString() !== trainerId.toString()) {
      return res.status(403).render('errors/403', {
        title: 'Access Denied - GymFlow',
        user: req.session.user,
        message: 'Unauthorized: This member is not assigned to you.'
      });
    }

    // Attach verified member to request object
    req.targetMember = member;
    next();
  } catch (err) {
    console.error('Trainer ownership check failed:', err);
    req.flash('error', 'An error occurred while verifying member ownership');
    res.redirect('/trainer/members');
  }
};

module.exports = {
  verifyTrainerMemberOwnership
};
