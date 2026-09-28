import { Router } from 'express';
import {
  getOrCreateDirectConversation,
  getConversations,
  getConversationById,
  getMessages,
  sendMessage,
} from '../controllers/conversation.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all conversation routes
router.use(protect);

// One-to-One find or create conversation
router.post('/direct', getOrCreateDirectConversation);

// List user's conversations
router.get('/', getConversations);

// Single conversation details
router.get('/:id', getConversationById);

// Load conversation messages
router.get('/:id/messages', getMessages);

// Send message to conversation
router.post('/:id/messages', sendMessage);

export default router;
