import { Op } from 'sequelize';
import {
  sequelize,
  User,
  Conversation,
  ConversationMember,
  Message,
} from '../models/index.js';
import {
  getIo,
  removeUserFromRoom,
  addUserToRoom,
} from '../socket/index.js';

/**
 * Format group response helper
 */
const formatGroup = (group, currentUserId) => {
  const json = group.toJSON ? group.toJSON() : group;
  const activeMembers = (json.members || []).filter((m) => !m.removedAt);
  const myMembership = activeMembers.find((m) => m.userId === currentUserId);
  const lastMessage = json.messages && json.messages.length > 0 ? json.messages[0] : null;

  return {
    ...json,
    members: activeMembers,
    myRole: myMembership ? myMembership.role : null,
    lastMessage,
  };
};

/**
 * Create a new group.
 * Any user can create a group and becomes its Owner.
 * POST /api/groups
 */
export const createGroup = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { name, avatarUrl, memberIds = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const uniqueMemberIds = Array.from(
      new Set(memberIds.filter((id) => id && id !== currentUserId))
    );

    // Verify invited members exist in User table
    let validMembers = [];
    if (uniqueMemberIds.length > 0) {
      validMembers = await User.findAll({
        where: { id: { [Op.in]: uniqueMemberIds } },
        attributes: ['id', 'name', 'email'],
      });
    }

    // Atomically create Group conversation and members
    const group = await sequelize.transaction(async (t) => {
      const conv = await Conversation.create(
        {
          type: 'group',
          name: name.trim(),
          avatarUrl: avatarUrl || null,
          createdBy: currentUserId,
        },
        { transaction: t }
      );

      // Creator is OWNER
      await ConversationMember.create(
        {
          conversationId: conv.id,
          userId: currentUserId,
          role: 'OWNER',
        },
        { transaction: t }
      );

      // Initial members are 'MEMBER'
      if (validMembers.length > 0) {
        const memberRows = validMembers.map((u) => ({
          conversationId: conv.id,
          userId: u.id,
          role: 'MEMBER',
        }));
        await ConversationMember.bulkCreate(memberRows, { transaction: t });
      }

      return conv;
    });

    // Fetch full group with members
    const fullGroup = await Conversation.findByPk(group.id, {
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

    const formatted = formatGroup(fullGroup, currentUserId);

    // Socket real-time broadcast: notify invited members and join rooms
    const io = getIo();
    if (io) {
      addUserToRoom(currentUserId, group.id);
      validMembers.forEach((u) => {
        addUserToRoom(u.id, group.id);
        io.to(`user_${u.id}`).emit('group_created', {
          conversation: formatGroup(fullGroup, u.id),
        });
      });
    }

    return res.status(201).json({
      message: 'Group created successfully',
      group: formatted,
    });
  } catch (err) {
    console.error('createGroup error:', err);
    return res.status(500).json({ message: 'Failed to create group' });
  }
};

/**
 * Get group details with active members and roles
 * GET /api/groups/:id
 */
export const getGroupDetails = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { id } = req.params;

    const group = await Conversation.findByPk(id, {
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

    if (!group || group.type !== 'group') {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Verify user is an active member
    const activeMembers = group.members.filter((m) => !m.removedAt);
    const isMember = activeMembers.some((m) => m.userId === currentUserId);
    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this group' });
    }

    return res.status(200).json({ group: formatGroup(group, currentUserId) });
  } catch (err) {
    console.error('getGroupDetails error:', err);
    return res.status(500).json({ message: 'Failed to fetch group details' });
  }
};

/**
 * Update group name or avatar.
 * Permitted for: OWNER, ADMIN.
 * PATCH /api/groups/:id
 */
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, avatarUrl } = req.body;
    const group = req.group; // From requireAdminOrOwner middleware

    const updates = {};
    if (name && name.trim()) updates.name = name.trim();
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    await group.update(updates);

    // Notify room and user rooms
    const io = getIo();
    if (io) {
      io.to(`conv_${id}`).emit('group_updated', {
        conversationId: id,
        name: group.name,
        avatarUrl: group.avatarUrl,
        updatedBy: req.user.userId,
      });
    }

    return res.status(200).json({
      message: 'Group updated successfully',
      group,
    });
  } catch (err) {
    console.error('updateGroup error:', err);
    return res.status(500).json({ message: 'Failed to update group' });
  }
};

/**
 * Add members to group.
 * Permitted for: OWNER, ADMIN.
 * POST /api/groups/:id/members
 */
export const addMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const memberIds = req.body.memberIds || (req.body.userId ? [req.body.userId] : []);

    if (!memberIds || memberIds.length === 0) {
      return res.status(400).json({ message: 'memberIds are required' });
    }

    const users = await User.findAll({
      where: { id: { [Op.in]: memberIds } },
      attributes: ['id', 'name', 'email', 'avatarUrl'],
    });

    if (users.length === 0) {
      return res.status(404).json({ message: 'No valid users found to add' });
    }

    const addedUsers = [];

    for (const user of users) {
      const existing = await ConversationMember.findOne({
        where: { conversationId: id, userId: user.id },
      });

      if (existing) {
        if (existing.removedAt !== null) {
          // Reactivate member
          await existing.update({
            removedAt: null,
            joinedAt: new Date(),
            role: 'MEMBER',
          });
          addedUsers.push(user);
          addUserToRoom(user.id, id);
        }
      } else {
        await ConversationMember.create({
          conversationId: id,
          userId: user.id,
          role: 'MEMBER',
        });
        addedUsers.push(user);
        addUserToRoom(user.id, id);
      }
    }

    // Real-time broadcast
    const io = getIo();
    if (io && addedUsers.length > 0) {
      io.to(`conv_${id}`).emit('members_added', {
        conversationId: id,
        addedMembers: addedUsers,
        addedBy: req.user.userId,
      });

      // Also notify each added user personally
      addedUsers.forEach((u) => {
        io.to(`user_${u.id}`).emit('added_to_group', {
          conversationId: id,
          groupId: id,
        });
      });
    }

    return res.status(200).json({
      message: `${addedUsers.length} member(s) added successfully`,
      addedMembers: addedUsers,
    });
  } catch (err) {
    console.error('addMembers error:', err);
    return res.status(500).json({ message: 'Failed to add members' });
  }
};

/**
 * Remove a member from group.
 * Permitted for: OWNER, ADMIN.
 * Rules:
 * - Cannot remove the OWNER.
 * - ADMIN cannot remove another ADMIN or OWNER.
 * - OWNER can remove anyone.
 * - Removed member is evicted from socket room INSTANTLY without page refresh.
 * DELETE /api/groups/:id/members/:memberId
 */
export const removeMember = async (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;
    const requesterRole = req.membership.role; // From role middleware

    // Find the target member
    const targetMember = await ConversationMember.findOne({
      where: {
        conversationId: groupId,
        userId: memberId,
        removedAt: null,
      },
    });

    if (!targetMember) {
      return res.status(404).json({ message: 'Member not found or already removed from this group' });
    }

    // Role check 1: Cannot remove the Owner!
    if (targetMember.role === 'OWNER') {
      return res.status(403).json({ message: 'Forbidden: Cannot remove the group Owner' });
    }

    // Role check 2: Admins cannot remove other Admins or Owner! Only Owner can remove Admins.
    if (requesterRole === 'ADMIN' && targetMember.role === 'ADMIN') {
      return res.status(403).json({
        message: 'Forbidden: Admins cannot remove other Admins. Only the Owner can remove an Admin.',
      });
    }

    // Mark as removed in database
    await targetMember.update({ removedAt: new Date() });

    // ── REAL-TIME INSTANT EVICTION ──────────────────────────────────────────
    // 1. Force all active sockets belonging to this user to leave the group room immediately
    removeUserFromRoom(memberId, groupId);

    const io = getIo();
    if (io) {
      // 2. Notify the removed user privately so their UI updates immediately without refresh
      io.to(`user_${memberId}`).emit('removed_from_group', {
        conversationId: groupId,
        message: 'You have been removed from this group',
      });

      // 3. Notify the remaining group members in the room
      io.to(`conv_${groupId}`).emit('member_removed', {
        conversationId: groupId,
        userId: memberId,
        removedBy: req.user.userId,
      });
    }

    return res.status(200).json({ message: 'Member removed successfully from group' });
  } catch (err) {
    console.error('removeMember error:', err);
    return res.status(500).json({ message: 'Failed to remove member' });
  }
};

/**
 * Promote or demote an Admin.
 * Permitted for: OWNER only.
 * PATCH /api/groups/:id/members/:memberId/role
 * Body: { role: 'ADMIN' | 'MEMBER' }
 */
export const updateMemberRole = async (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'MEMBER'].includes(role)) {
      return res.status(400).json({ message: "Role must be 'ADMIN' or 'MEMBER'" });
    }

    const targetMember = await ConversationMember.findOne({
      where: {
        conversationId: groupId,
        userId: memberId,
        removedAt: null,
      },
    });

    if (!targetMember) {
      return res.status(404).json({ message: 'Active group member not found' });
    }

    if (targetMember.role === 'OWNER') {
      return res.status(400).json({ message: 'Cannot change the role of the Owner. Use transfer-ownership instead.' });
    }

    await targetMember.update({ role });

    // Real-time broadcast
    const io = getIo();
    if (io) {
      io.to(`conv_${groupId}`).emit('member_role_updated', {
        conversationId: groupId,
        userId: memberId,
        role,
        updatedBy: req.user.userId,
      });

      io.to(`user_${memberId}`).emit('your_role_updated', {
        conversationId: groupId,
        role,
      });
    }

    return res.status(200).json({
      message: `Member role updated to ${role} successfully`,
      member: targetMember,
    });
  } catch (err) {
    console.error('updateMemberRole error:', err);
    return res.status(500).json({ message: 'Failed to update member role' });
  }
};

/**
 * Transfer group ownership.
 * Permitted for: OWNER only.
 * POST /api/groups/:id/transfer-ownership
 * Body: { newOwnerId }
 */
export const transferOwnership = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { id: groupId } = req.params;
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ message: 'newOwnerId is required' });
    }

    if (newOwnerId === currentUserId) {
      return res.status(400).json({ message: 'You are already the owner of this group' });
    }

    const targetMember = await ConversationMember.findOne({
      where: {
        conversationId: groupId,
        userId: newOwnerId,
        removedAt: null,
      },
    });

    if (!targetMember) {
      return res.status(404).json({ message: 'Target user is not an active member of this group' });
    }

    const currentOwnerMember = req.membership;

    await sequelize.transaction(async (t) => {
      // Demote current owner to ADMIN
      await currentOwnerMember.update({ role: 'ADMIN' }, { transaction: t });

      // Promote new owner to OWNER
      await targetMember.update({ role: 'OWNER' }, { transaction: t });

      // Update Conversation createdBy
      await req.group.update({ createdBy: newOwnerId }, { transaction: t });
    });

    // Real-time broadcast
    const io = getIo();
    if (io) {
      io.to(`conv_${groupId}`).emit('ownership_transferred', {
        conversationId: groupId,
        previousOwnerId: currentUserId,
        newOwnerId,
      });
    }

    return res.status(200).json({
      message: 'Group ownership transferred successfully',
      newOwnerId,
    });
  } catch (err) {
    console.error('transferOwnership error:', err);
    return res.status(500).json({ message: 'Failed to transfer ownership' });
  }
};

/**
 * Delete a group.
 * Permitted for: OWNER only.
 * DELETE /api/groups/:id
 */
export const deleteGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const group = req.group;

    // Notify room before deleting
    const io = getIo();
    if (io) {
      io.to(`conv_${groupId}`).emit('group_deleted', {
        conversationId: groupId,
        deletedBy: req.user.userId,
      });
    }

    // Find all active members and evict their sockets
    const members = await ConversationMember.findAll({
      where: { conversationId: groupId },
    });
    members.forEach((m) => removeUserFromRoom(m.userId, groupId));

    // Destroy conversation (cascade deletes members, messages)
    await group.destroy();

    return res.status(200).json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('deleteGroup error:', err);
    return res.status(500).json({ message: 'Failed to delete group' });
  }
};

/**
 * Leave a group.
 * Any member or admin can leave.
 * Owners must transfer ownership or delete the group.
 * POST /api/groups/:id/leave
 */
export const leaveGroup = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { id: groupId } = req.params;

    const membership = await ConversationMember.findOne({
      where: {
        conversationId: groupId,
        userId: currentUserId,
        removedAt: null,
      },
    });

    if (!membership) {
      return res.status(404).json({ message: 'You are not an active member of this group' });
    }

    if (membership.role === 'OWNER') {
      return res.status(400).json({
        message: 'Group Owner cannot leave the group. You must transfer ownership or delete the group.',
      });
    }

    await membership.update({ removedAt: new Date() });

    // Evict socket
    removeUserFromRoom(currentUserId, groupId);

    const io = getIo();
    if (io) {
      io.to(`conv_${groupId}`).emit('member_left', {
        conversationId: groupId,
        userId: currentUserId,
      });
    }

    return res.status(200).json({ message: 'You have left the group successfully' });
  } catch (err) {
    console.error('leaveGroup error:', err);
    return res.status(500).json({ message: 'Failed to leave group' });
  }
};
