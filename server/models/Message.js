import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'ai', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

// We keep a history but can filter queries to just the last 20 messages per project
messageSchema.index({ projectId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
