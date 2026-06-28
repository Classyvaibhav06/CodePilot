import mongoose from 'mongoose';

/**
 * @typedef {Object} ProjectSummary
 * @property {string} framework
 * @property {string} styling
 * @property {string} theme
 * @property {string} projectPurpose
 * @property {string[]} pages
 * @property {string[]} components
 * @property {string[]} dependencies
 * @property {string} routingStructure
 */

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    summary: {
      framework: { type: String, default: 'React' },
      styling: { type: String, default: 'Tailwind' },
      theme: { type: String, default: 'Light' },
      projectPurpose: { type: String, default: '' },
      pages: [{ type: String }],
      components: [{ type: String }],
      dependencies: [{ type: String }],
      routingStructure: { type: String, default: '' }
    }
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model('Project', projectSchema);

export default Project;
