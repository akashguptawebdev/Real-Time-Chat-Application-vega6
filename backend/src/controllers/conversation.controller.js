import crypto from 'crypto';
import { Op } from 'sequelize';
import {
  sequelize,
  User,
  Conversation,
  DirectConversation,
  ConversationMember,
  Message,
  MessageReceipt,
  MessageReaction,
} from '../models/index.js';
import { addUserToRoom } from '../socket/index.js';

// Helper to format conversation and extract other participant info for direct chats or roles for groups
const formatConversation = (conversation, currentUserId) => {
  const json = conversation.toJSON ? conversation.toJSON() : conversation;
  const activeMembers = (json.members || []).filter((m) => !m.removedAt);
  const myMembership = activeMembers.find((m) => m.userId === currentUserId);

  let otherUser = null;
  if (json.type === 'direct' && activeMembers.length > 0) {
    const otherMember = activeMembers.find((m) => m.userId !== currentUserId);
    if (otherMember && otherMember.user) {
      otherUser = otherMember.user;
    }
  }

  // Get last message snippet if loaded
  const lastMessage = json.messages && json.messages.length > 0 ? json.messages[0] : null;

  return {
    ...json,
    members: activeMembers,
    myRole: myMembership ? myMembership.role : null,
    otherUser,
    lastMessage,
  };
};

/**
 * Find or create a One-to-One conversation
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
          { type: 'direct', createdBy: currentUserId },
          { transaction: t }
        );

        await DirectConversation.create(
          { conversationId: conv.id, userLowId, userHighId },
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
            { model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatarUrl', 'lastSeenAt'] },
          ],
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['created_at', 'DESC']],
          include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'avatarUrl'] }],
        },
      ],
    });

    const formatted = formatConversation(conversation, currentUserId);

    if (isNew) {
      addUserToRoom(currentUserId, conversationId);
      addUserToRoom(participantId, conversationId);
    }

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
 * List all conversations for the authenticated user (with unread counts)
 * GET /api/conversations
 */
export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Find all active memberships
    const memberships = await ConversationMember.findAll({
      where: { userId: currentUserId, removedAt: null },
      attributes: ['conversationId', 'lastReadAt'],
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
            { model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatarUrl', 'lastSeenAt'] },
          ],
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['created_at', 'DESC']],
          include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'avatarUrl'] }],
        },
      ],
    });

    // Build map of lastReadAt per conversation for current user
    const lastReadMap = {};
    memberships.forEach((m) => { lastReadMap[m.conversationId] = m.lastReadAt; });

    // Compute unread counts in parallel
    const unreadCounts = await Promise.all(
      convIds.map(async (convId) => {
        const lastReadAt = lastReadMap[convId];
        const count = await Message.count({
          where: {
            conversationId: convId,
            senderId: { [Op.ne]: currentUserId },
            deletedAt: null,
            ...(lastReadAt ? { created_at: { [Op.gt]: lastReadAt } } : {}),
          },
        });
        return { convId, count };
      })
    );
    const unreadMap = {};
    unreadCounts.forEach(({ convId, count }) => { unreadMap[convId] = count; });

    const formattedList = conversations
      .map((conv) => ({
        ...formatConversation(conv, currentUserId),
        unreadCount: unreadMap[conv.id] || 0,
      }))
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
            { model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatarUrl', 'lastSeenAt'] },
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
 * Load conversation messages with cursor-based pagination (infinite scroll upward)
 * GET /api/conversations/:id/messages?before=<messageId>&limit=<n>
 *
 * - `before` (optional): cursor — load messages OLDER than this message ID
 * - `limit`  (optional): default 40, max 100
 *
 * Returns: { messages: [...], nextCursor: <string|null>, hasMore: <bool> }
 */
export const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { id: conversationId } = req.params;
    const { before, limit: limitParam } = req.query;
    const limit = Math.min(parseInt(limitParam, 10) || 40, 100);

    // Verify user is a member
    const membership = await ConversationMember.findOne({
      where: { conversationId, userId: currentUserId, removedAt: null },
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this conversation' });
    }

    // Resolve cursor: get the created_at of the cursor message
    let beforeTimestamp = null;
    if (before) {
      const cursorMsg = await Message.findByPk(before, { attributes: ['id', 'created_at'] });
      if (cursorMsg) {
        beforeTimestamp = cursorMsg.created_at;
      }
    }

    const whereClause = {
      conversationId,
      deletedAt: null,
      ...(beforeTimestamp ? { created_at: { [Op.lt]: beforeTimestamp } } : {}),
    };

    // Fetch one extra to determine hasMore
    const rawMessages = await Message.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: limit + 1,
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatarUrl', 'email'] },
        { model: MessageReaction, as: 'reactions', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
      ],
    });

    const hasMore = rawMessages.length > limit;
    const messages = rawMessages.slice(0, limit).reverse(); // oldest → newest order
    const nextCursor = hasMore ? messages[0]?.id : null;   // oldest message ID as next page cursor

    // Update lastReadAt (marks conversation as read for this user)
    const now = new Date();
    await membership.update({ lastReadAt: now });

    // Upsert read receipts for messages by other users
    const othersMessages = messages.filter((m) => m.senderId !== currentUserId);
    if (othersMessages.length > 0) {
      await Promise.all(
        othersMessages.map((m) =>
          MessageReceipt.upsert({
            messageId: m.id,
            userId: currentUserId,
            deliveredAt: now,
            readAt: now,
          })
        )
      );

      // Broadcast 'messages_read' so the sender sees updated read status in real-time
      const io = req.app.get('io');
      if (io) {
        io.to(`conv_${conversationId}`).emit('messages_read', {
          conversationId,
          readByUserId: currentUserId,
          latestMessageId: othersMessages[othersMessages.length - 1].id,
          readAt: now,
        });
      }
    }

    return res.status(200).json({ messages, nextCursor, hasMore });
  } catch (err) {
    console.error('getMessages error:', err);
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

/**
 * Explicitly mark a conversation as read
 * POST /api/conversations/:id/read
 */
export const markConversationRead = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { id: conversationId } = req.params;

    const membership = await ConversationMember.findOne({
      where: { conversationId, userId: currentUserId, removedAt: null },
    });

    if (!membership) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const prevLastRead = membership.lastReadAt;
    const now = new Date();
    await membership.update({ lastReadAt: now });

    const unreadMsgs = await Message.findAll({
      where: {
        conversationId,
        senderId: { [Op.ne]: currentUserId },
        deletedAt: null,
        ...(prevLastRead ? { created_at: { [Op.gt]: prevLastRead } } : {}),
      },
      attributes: ['id'],
    });

    if (unreadMsgs.length > 0) {
      await Promise.all(
        unreadMsgs.map((m) =>
          MessageReceipt.upsert({ messageId: m.id, userId: currentUserId, deliveredAt: now, readAt: now })
        )
      );

      const io = req.app.get('io');
      if (io) {
        io.to(`conv_${conversationId}`).emit('messages_read', {
          conversationId,
          readByUserId: currentUserId,
          latestMessageId: unreadMsgs[unreadMsgs.length - 1].id,
          readAt: now,
        });
      }
    }

    return res.status(200).json({ message: 'Conversation marked as read', unreadCount: 0 });
  } catch (err) {
    console.error('markConversationRead error:', err);
    return res.status(500).json({ message: 'Failed to mark conversation as read' });
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

    // Idempotency: return existing message if clientMessageId already exists for this sender
    const effectiveClientId = clientMessageId || crypto.randomUUID();
    const existing = await Message.findOne({
      where: { senderId: currentUserId, clientMessageId: effectiveClientId },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'avatarUrl', 'email'] }],
    });
    if (existing) {
      return res.status(200).json({ message: existing });
    }

    const message = await Message.create({
      conversationId,
      senderId: currentUserId,
      clientMessageId: effectiveClientId,
      content: content.trim(),
    });

    // Update sender's lastReadAt
    await membership.update({ lastReadAt: new Date() });

    // Fetch created message with sender info and (empty) reactions
    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatarUrl', 'email'] },
        { model: MessageReaction, as: 'reactions', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
      ],
    });

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${conversationId}`).emit('new_message', {
        conversationId,
        message: fullMessage,
      });

      // Notify all members to update sidebar unread count
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
