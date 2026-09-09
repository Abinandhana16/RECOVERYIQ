const mongoose = require('mongoose');

const RecoveryActionSchema = new mongoose.Schema(
  {
    action_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    case_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecoveryCase',
      required: true,
    },
    action_type: {
      type: String,
      enum: ['reminder', 'payment_link', 'human_followup'],
      required: true,
    },
    expected_recovery_value: {
      type: Number,
      required: true,
      min: 0,
    },
    chosen: {
      type: Boolean,
      default: false,
    },
    outcome: {
      type: String,
      enum: ['success', 'fail', 'pending'],
      default: 'pending',
    },
    ai_explanation: {
      type: String,
      trim: true,
    },
    ai_message: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RecoveryAction', RecoveryActionSchema);
