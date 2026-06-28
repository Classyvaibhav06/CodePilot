import express from 'express';
import { generateCode } from '../controllers/generateController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected route: only logged in users can generate code
router.post('/', protect, generateCode);

export default router;
