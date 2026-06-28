import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    componentName: {
      type: String,
      default: ''
    },
    content: {
      type: String,
      required: true,
    },
    // Useful for scoring file relevance by recent edit history
    lastModifiedByAI: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
  }
);

fileSchema.index({ projectId: 1, filePath: 1 }, { unique: true });

const File = mongoose.model('File', fileSchema);

export default File;
