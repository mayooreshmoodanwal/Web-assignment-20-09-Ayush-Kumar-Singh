const Membership = require('../models/Membership');

/**
 * Calculate membership expiry date based on start date and duration in days
 */
const calculateExpiryDate = (startDate, durationDays) => {
  const start = new Date(startDate || Date.now());
  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + Number(durationDays));
  return expiry;
};

/**
 * Calculate days remaining until expiry
 */
const daysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return 0;
  const now = new Date();
  const diffTime = new Date(expiryDate).getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Determine dynamic membership status: 'active', 'expiring_soon', or 'expired'
 */
const getMembershipStatus = (expiryDate) => {
  if (!expiryDate) return 'expired';
  const now = new Date();
  const expiry = new Date(expiryDate);

  if (now > expiry) {
    return 'expired';
  }
  const daysLeft = daysUntilExpiry(expiryDate);
  if (daysLeft <= 7) {
    return 'expiring_soon';
  }
  return 'active';
};

/**
 * Sync statuses in the database for memberships whose expiry date has passed
 */
const syncMembershipStatuses = async () => {
  try {
    const now = new Date();
    await Membership.updateMany(
      { expiryDate: { $lt: now }, status: 'active' },
      { $set: { status: 'expired' } }
    );
  } catch (err) {
    console.error('Error syncing membership statuses:', err.message);
  }
};

module.exports = {
  calculateExpiryDate,
  daysUntilExpiry,
  getMembershipStatus,
  syncMembershipStatuses
};
