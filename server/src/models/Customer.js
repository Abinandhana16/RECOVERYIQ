const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    customer_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    payment_history_score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    total_past_defaults: {
      type: Number,
      default: 0,
      min: 0,
    },
    relationship_length: {
      type: Number,
      required: true,
      min: 0,
      comment: 'Relationship length in months',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Customer', CustomerSchema);
