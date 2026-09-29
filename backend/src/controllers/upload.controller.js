import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  User,
  ConversationMember,
  Message,
  MessageReaction,
} from '../models/index.js';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '../middlewares/upload.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Upload a file/image and create a message in the conversation.
 * POST /api/conversations/:id/upload
 * Form-data: file (required), content (optional caption), clientMessageId (optional)
 */
export const uploadFile = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { id: conversationId } = req.params;
    const { content, clientMessageId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Extra image size check
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype) && file.size > MAX_IMAGE_SIZE) {
      return res.status(400).json({ message: `Images must be smaller than 10 MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.` });
    }

    // Verify membership
    const membership = await ConversationMember.findOne({
      where: { conversationId, userId: currentUserId, removedAt: null },
    });

    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this conversation' });
    }

    // Determine message type
    const isImage = ALLOWED_IMAGE_TYPES.has(file.mimetype);
    const messageType = isImage ? 'image' : 'file';

    // Build public URL — served via /uploads/<convId>/<filename>
    const fileUrl = `/uploads/${conversationId}/${path.basename(file.path)}`;

    // Idempotency check
    const effectiveClientId = clientMessageId || crypto.randomUUID();
    const existing = await Message.findOne({
      where: { senderId: currentUserId, clientMessageId: effectiveClientId },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatarUrl', 'email'] },
        { model: MessageReaction, as: 'reactions', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
      ],
    });
    if (existing) return res.status(200).json({ message: existing });

    const message = await Message.create({
      conversationId,
      senderId: currentUserId,
      clientMessageId: effectiveClientId,
      messageType,
      content: content?.trim() || null,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      fileMimeType: file.mimetype,
    });

    await membership.update({ lastReadAt: new Date() });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatarUrl', 'email'] },
        { model: MessageReaction, as: 'reactions', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
      ],
    });

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${conversationId}`).emit('new_message', { conversationId, message: fullMessage });

      const members = await ConversationMember.findAll({
        where: { conversationId, removedAt: null },
        attributes: ['userId'],
      });
      members.forEach((m) => {
        io.to(`user_${m.userId}`).emit('conversation_updated', { conversationId, lastMessage: fullMessage });
      });
    }

    return res.status(201).json({ message: fullMessage });
  } catch (err) {
    console.error('uploadFile error:', err);
    return res.status(500).json({ message: 'Failed to upload file' });
  }
};
