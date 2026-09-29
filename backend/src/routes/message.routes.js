import { Router } from 'express';
import {
  editMessage,
  deleteMessage,
  toggleReaction,
  getMessageReceipts,
} from '../controllers/message.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router({ mergeParams: true }); // inherit :id (conversationId) from parent

// All message-action routes are protected
router.use(protect);

// Edit own message
router.patch('/:msgId', editMessage);

// Delete for everyone (within 10 min)
router.delete('/:msgId', deleteMessage);

// Toggle emoji reaction
router.post('/:msgId/reactions', toggleReaction);

// Seen-by receipts (for "Seen by X of Y" UI)
router.get('/:msgId/receipts', getMessageReceipts);

export default router;
