import crypto from 'crypto';
import { Op } from 'sequelize';
import {
  User,
  Conversation,
  ConversationMember,
  Message,
  MessageReaction,
  MessageReceipt,
} from '../models/index.js';
import { getIo } from '../socket/index.js';

const DELETE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Verify that the requesting user is a member of the conversation that owns the message.
 * Returns { message, membership } or sends an error response.
 */
const getMsgAndMembership = async (req, res) => {
  const currentUserId = req.user.userId;
  const { id: conversationId, msgId } = req.params;

  const membership = await ConversationMember.findOne({
    where: { conversationId, userId: currentUserId, removedAt: null },
  });
  if (!membership) {
    res.status(403).json({ message: 'You are not a member of this conversation' });
    return null;
  }

  const message = await Message.findOne({
    where: { id: msgId, conversationId, deletedAt: null },
    include: [
      { model: User, as: 'sender', attributes: ['id', 'name', 'avatarUrl', 'email'] },
      { model: MessageReaction, as: 'reactions', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
    ],
  });
  if (!message) {
    res.status(404).json({ message: 'Message not found' });
    return null;
  }

  return { message, membership };
};

/**
 * Edit own message content
 * PATCH /api/conversations/:id/messages/:msgId
 * Body: { content }
 */
export const editMessage = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content cannot be empty' });
    }

    const result = await getMsgAndMembership(req, res);
    if (!result) return;
    const { message } = result;

    if (message.senderId !== currentUserId) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    await message.update({ content: content.trim(), editedAt: new Date() });

    // Re-fetch with full associations
    const updated = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatarUrl', 'email'] },
        { model: MessageReaction, as: 'reactions', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
      ],
    });

    const io = req.app.get('io') || getIo();
    if (io) {
      io.to(`conv_${message.conversationId}`).emit('message_edited', {
        conversationId: message.conversationId,
        message: updated,
      });
    }

    return res.status(200).json({ message: updated });
  } catch (err) {
    console.error('editMessage error:', err);
    return res.status(500).json({ message: 'Failed to edit message' });
  }
};

/**
 * Delete message for everyone (within 10 minutes of sending, own messages only)
 * DELETE /api/conversations/:id/messages/:msgId
 */
export const deleteMessage = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const result = await getMsgAndMembership(req, res);
    if (!result) return;
    const { message } = result;

    if (message.senderId !== currentUserId) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    const ageMs = Date.now() - new Date(message.created_at).getTime();
    if (ageMs > DELETE_WINDOW_MS) {
      return res.status(403).json({ message: 'Messages can only be deleted within 10 minutes of sending' });
    }

    await message.update({ deletedAt: new Date() });

    const io = req.app.get('io') || getIo();
    if (io) {
      io.to(`conv_${message.conversationId}`).emit('message_deleted', {
        conversationId: message.conversationId,
        messageId: message.id,
      });
    }

    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('deleteMessage error:', err);
    return res.status(500).json({ message: 'Failed to delete message' });
  }
};

/**
 * Toggle emoji reaction on a message (add if absent, remove if already reacted with same emoji)
 * POST /api/conversations/:id/messages/:msgId/reactions
 * Body: { emoji }
 */
export const toggleReaction = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { emoji } = req.body;

    if (!emoji || !emoji.trim()) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const result = await getMsgAndMembership(req, res);
    if (!result) return;
    const { message } = result;

    const existing = await MessageReaction.findOne({
      where: { messageId: message.id, userId: currentUserId, emoji: emoji.trim() },
    });

    let action;
    if (existing) {
      await existing.destroy();
      action = 'removed';
    } else {
      await MessageReaction.create({
        messageId: message.id,
        userId: currentUserId,
        emoji: emoji.trim(),
      });
      action = 'added';
    }

    // Fetch all reactions for this message to broadcast updated list
    const reactions = await MessageReaction.findAll({
      where: { messageId: message.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    });

    const io = req.app.get('io') || getIo();
    if (io) {
      io.to(`conv_${message.conversationId}`).emit('reaction_updated', {
        conversationId: message.conversationId,
        messageId: message.id,
        reactions,
        action,
        emoji: emoji.trim(),
        userId: currentUserId,
      });
    }

    return res.status(200).json({ reactions, action });
  } catch (err) {
    console.error('toggleReaction error:', err);
    return res.status(500).json({ message: 'Failed to toggle reaction' });
  }
};

/**
 * Get "seen by" info for a message in a group conversation
 * GET /api/conversations/:id/messages/:msgId/receipts
 */
export const getMessageReceipts = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const result = await getMsgAndMembership(req, res);
    if (!result) return;
    const { message } = result;

    const receipts = await MessageReceipt.findAll({
      where: { messageId: message.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatarUrl'] }],
    });

    // Get total active members to compute "seen by X of Y"
    const totalMembers = await ConversationMember.count({
      where: { conversationId: message.conversationId, removedAt: null },
    });

    return res.status(200).json({
      receipts,
      seenCount: receipts.filter((r) => r.readAt).length,
      totalMembers,
    });
  } catch (err) {
    console.error('getMessageReceipts error:', err);
    return res.status(500).json({ message: 'Failed to get receipts' });
  }
};
