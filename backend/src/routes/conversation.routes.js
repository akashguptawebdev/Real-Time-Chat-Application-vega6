import { Router } from 'express';
import {
  getOrCreateDirectConversation,
  getConversations,
  getConversationById,
  getMessages,
  sendMessage,
  markConversationRead,
} from '../controllers/conversation.controller.js';
import { uploadFile } from '../controllers/upload.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import messageRoutes from './message.routes.js';

const router = Router();

// Protect all conversation routes
router.use(protect);

// One-to-One find or create conversation
router.post('/direct', getOrCreateDirectConversation);

// List user's conversations (with unread counts)
router.get('/', getConversations);

// Single conversation details
router.get('/:id', getConversationById);

// Load conversation messages (cursor-based pagination: ?before=<msgId>&limit=40)
router.get('/:id/messages', getMessages);

// Send message to conversation
router.post('/:id/messages', sendMessage);

// Upload file/image to conversation (creates a message)
router.post('/:id/upload', upload.single('file'), uploadFile);

// Mark conversation as read (zero unread count)
router.post('/:id/read', markConversationRead);

// Message actions: edit, delete, react, receipts (mounted at /:id/messages/:msgId/...)
router.use('/:id/messages', messageRoutes);

export default router;
