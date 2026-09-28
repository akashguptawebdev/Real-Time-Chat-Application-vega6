import crypto from 'crypto';
import { Op } from 'sequelize';
import {
  sequelize,
  User,
  Conversation,
  DirectConversation,
  ConversationMember,
  Message,
} from '../models/index.js';

// Helper to format conversation and extract other participant info for direct chats
const formatConversation = (conversation, currentUserId) => {
  const json = conversation.toJSON ? conversation.toJSON() : conversation;
  let otherUser = null;

  if (json.members && json.members.length > 0) {
    const otherMember = json.members.find((m) => m.userId !== currentUserId);
    if (otherMember && otherMember.user) {
      otherUser = otherMember.user;
    }
  }

  // Get last message snippet if loaded
  const lastMessage = json.messages && json.messages.length > 0 ? json.messages[0] : null;

  return {
    ...json,
    otherUser,
    lastMessage,
  };
};

/**
 * Step 2: Find or create a One-to-One conversation
 * POST /api/conversations/direct
 * Body: { participantId }
 */
export const getOrCreateDirectConversation = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const participantId = req.body.participantId || req.body.recipientId || req.body.userId;

    if (!participantId) {
      return res.status(400).json({ message: 'participantId is required' });
    }

    if (participantId === currentUserId) {
      return res.status(400).json({ message: 'Cannot create a direct conversation with yourself' });
    }

    // Verify participant exists
    const participant = await User.findByPk(participantId, {
      attributes: ['id', 'name', 'email', 'avatarUrl', 'lastSeenAt'],
    });

    if (!participant) {
      return res.status(404).json({ message: 'Participant user not found' });
    }

    // Direct conversation canonical ordering: userLowId & userHighId
    const userLowId = currentUserId < participantId ? currentUserId : participantId;
    const userHighId = currentUserId > participantId ? currentUserId : participantId;

    // Check DB: Does a direct conversation already exist?
    const existingDirect = await DirectConversation.findOne({
      where: { userLowId, userHighId },
    });

    let conversationId;
    let isNew = false;

    if (existingDirect) {
      conversationId = existingDirect.conversationId;
    } else {
      // Create new conversation, direct mapping, and memberships atomically
      const newConv = await sequelize.transaction(async (t) => {
        const conv = await Conversation.create(
          {
            type: 'direct',
            createdBy: currentUserId,
          },
          { transaction: t }
        );

        await DirectConversation.create(
          {
            conversationId: conv.id,
            userLowId,
            userHighId,
          },
          { transaction: t }
        );

        await ConversationMember.bulkCreate(
          [
            { conversationId: conv.id, userId: currentUserId, role: 'MEMBER' },
            { conversationId: conv.id, userId: participantId, role: 'MEMBER' },
          ],
          { transaction: t }
        );

        return conv;
      });

      conversationId = newConv.id;
      isNew = true;
    }

    // Fetch the conversation with member user profiles and latest message
    const conversation = await Conversation.findByPk(conversationId, {
      include: [
        {
          model: ConversationMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'avatarUrl', 'lastSeenAt'],
            },
          ],
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'name', 'avatarUrl'],
            },
          ],
        },
      ],
    });

    const formatted = formatConversation(conversation, currentUserId);

    return res.status(isNew ? 201 : 200).json({
      message: isNew ? 'Conversation created' : 'Conversation retrieved',
      conversation: formatted,
      isNew,
    });
  } catch (err) {
    console.error('getOrCreateDirectConversation error:', err);
    return res.status(500).json({ message: 'Failed to find or create conversation' });
  }
};

/**
 * List all conversations for the authenticated user
 * GET /api/conversations
 */
export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Find all active memberships
    const memberships = await ConversationMember.findAll({
      where: { userId: currentUserId, removedAt: null },
      attributes: ['conversationId'],
    });

    const convIds = memberships.map((m) => m.conversationId);

    if (convIds.length === 0) {
      return res.status(200).json({ conversations: [] });
    }

    const conversations = await Conversation.findAll({
      where: { id: { [Op.in]: convIds } },
      include: [
        {
          model: ConversationMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'avatarUrl', 'lastSeenAt'],
            },
          ],
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'name', 'avatarUrl'],
            },
          ],
        },
      ],
    });

    const formattedList = conversations
      .map((conv) => formatConversation(conv, currentUserId))
      .sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.created_at).getTime();
        const timeB = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.created_at).getTime();
        return timeB - timeA;
      });

    return res.status(200).json({ conversations: formattedList });
  } catch (err) {
    console.error('getConversations error:', err);
    return res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

/**
 * Get details for a single conversation
 * GET /api/conversations/:id
 */
export const getConversationById = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { id } = req.params;

    // Verify membership
    const membership = await ConversationMember.findOne({
      where: { conversationId: id, userId: currentUserId, removedAt: null },
    });

    if (!membership) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    const conversation = await Conversation.findByPk(id, {
      include: [
        {
          model: ConversationMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'avatarUrl', 'lastSeenAt'],
            },
          ],
        },
      ],
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    return res.status(200).json({ conversation: formatConversation(conversation, currentUserId) });
  } catch (err) {
    console.error('getConversationById error:', err);
    return res.status(500).json({ message: 'Failed to fetch conversation details' });
  }
};

/**
 * Step 4: Load conversation messages
 * GET /api/conversations/:id/messages
 */
export const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { id } = req.params;

    // Verify user is a member
    const membership = await ConversationMember.findOne({
      where: { conversationId: id, userId: currentUserId, removedAt: null },
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this conversation' });
    }

    // Update lastReadAt for the current user
    await membership.update({ lastReadAt: new Date() });

    const messages = await Message.findAll({
      where: {
        conversationId: id,
        deletedAt: null,
      },
      order: [['created_at', 'ASC']],
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'avatarUrl', 'email'],
        },
      ],
    });

    return res.status(200).json({ messages });
  } catch (err) {
    console.error('getMessages error:', err);
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

/**
 * Send a message in a conversation
 * POST /api/conversations/:id/messages
 * Body: { content, clientMessageId }
 */
export const sendMessage = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { id: conversationId } = req.params;
    const { content, clientMessageId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }

    // Verify membership
    const membership = await ConversationMember.findOne({
      where: { conversationId, userId: currentUserId, removedAt: null },
    });

    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this conversation' });
    }

    const message = await Message.create({
      conversationId,
      senderId: currentUserId,
      clientMessageId: clientMessageId || crypto.randomUUID(),
      content: content.trim(),
    });

    // Update sender's lastReadAt
    await membership.update({ lastReadAt: new Date() });

    // Fetch created message with sender info
    const fullMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'avatarUrl', 'email'],
        },
      ],
    });

    // Real-time broadcast if socket.io is initialized
    const io = req.app.get('io');
    if (io) {
      // Broadcast to room
      io.to(`conv_${conversationId}`).emit('new_message', {
        conversationId,
        message: fullMessage,
      });

      // Also notify members to update their conversations list
      const members = await ConversationMember.findAll({
        where: { conversationId, removedAt: null },
        attributes: ['userId'],
      });
      members.forEach((m) => {
        io.to(`user_${m.userId}`).emit('conversation_updated', {
          conversationId,
          lastMessage: fullMessage,
        });
      });
    }

    return res.status(201).json({ message: fullMessage });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ message: 'Failed to send message' });
  }
};
