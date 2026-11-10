const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Bug must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a bug title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a bug description'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    severity: {
      type: String,
      required: [true, 'Please specify severity'],
      enum: {
        values: ['low', 'med', 'high'],
        message: 'Severity must be either: low, med, or high',
      },
      default: 'med',
    },
    status: {
      type: String,
      required: [true, 'Please specify status'],
      enum: {
        values: ['open', 'in-progress', 'closed'],
        message: 'Status must be either: open, in-progress, or closed',
      },
      default: 'open',
    },
    imageKey: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Database compound indexes for high performance filtering and sorting
bugSchema.index({ userId: 1, status: 1 });
bugSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Bug', bugSchema);
