const mongoose = require('mongoose');

const RecoveryCaseSchema = new mongoose.Schema(
  {
    case_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    case_type: {
      type: String,
      enum: ['transaction', 'loan'],
      required: true,
    },
    amount_due: {
      type: Number,
      required: true,
      min: 0,
    },
    days_overdue: {
      type: Number,
      required: true,
      min: 0,
    },
    failure_reason: {
      type: String,
      trim: true,
    },
    npa_status: {
      type: String,
      enum: ['Standard', 'SMA-0', 'SMA-1', 'SMA-2', 'NPA'],
      default: 'Standard',
    },
    recovery_probability: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    case_status: {
      type: String,
      enum: ['open', 'action_recommended', 'in_progress', 'recovered', 'written_off'],
      default: 'open',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RecoveryCase', RecoveryCaseSchema);
