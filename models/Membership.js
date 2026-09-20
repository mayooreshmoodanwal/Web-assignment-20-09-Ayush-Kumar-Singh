const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member is required']
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      required: [true, 'Membership plan is required']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required']
    },
    status: {
      type: String,
      enum: ['active', 'expired'],
      default: 'active'
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0, 'Amount paid cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

membershipSchema.index({ member: 1 });
membershipSchema.index({ expiryDate: 1 });
membershipSchema.index({ status: 1 });

module.exports = mongoose.model('Membership', membershipSchema);
