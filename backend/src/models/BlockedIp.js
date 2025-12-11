import mongoose from 'mongoose';

const blockedIpSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
    },
    reason: {
      type: String,
      default: '',
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

blockedIpSchema.index({ ip: 1 });

const BlockedIp =
  mongoose.models.BlockedIp || mongoose.model('BlockedIp', blockedIpSchema);

export default BlockedIp;
