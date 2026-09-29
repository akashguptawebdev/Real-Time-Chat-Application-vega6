import { Conversation, ConversationMember } from '../models/index.js';

/**
 * Middleware factory to enforce group roles:
 * - 'OWNER': Delete group, transfer ownership, promote/demote admins
 * - 'ADMIN': Add/remove members, update group name/avatar
 * - 'MEMBER': Send and read messages only
 */
export const requireGroupRole = (allowedRoles = []) => async (req, res, next) => {
  try {
    const conversationId = req.params.groupId || req.params.id;
    const userId = req.user.userId;

    if (!conversationId) {
      return res.status(400).json({ message: 'Conversation/Group ID is required' });
    }

    // Verify conversation exists and is a group
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ message: 'This conversation is not a group' });
    }

    // Verify user is an active member
    const membership = await ConversationMember.findOne({
      where: {
        conversationId,
        userId,
        removedAt: null,
      },
    });

    if (!membership) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this group' });
    }

    // Verify role permissions
    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        message: `Forbidden: This action requires ${allowedRoles.join(' or ')} privileges`,
        yourRole: membership.role,
        requiredRoles: allowedRoles,
      });
    }

    req.group = conversation;
    req.membership = membership;
    next();
  } catch (err) {
    console.error('requireGroupRole error:', err);
    return res.status(500).json({ message: 'Failed to verify group permissions' });
  }
};

export const requireOwner = requireGroupRole(['OWNER']);
export const requireAdminOrOwner = requireGroupRole(['OWNER', 'ADMIN']);
export const requireActiveMember = requireGroupRole(['OWNER', 'ADMIN', 'MEMBER']);
