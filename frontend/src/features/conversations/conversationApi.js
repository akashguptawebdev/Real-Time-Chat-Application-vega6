import api from '../../lib/api.js';

/**
 * Search users by name or email
 */
export const searchUsers = async (query = '') => {
  const { data } = await api.get('/users/search', {
    params: { q: query },
  });
  return data.users;
};

/**
 * Get or create a 1-to-1 conversation with a participant
 */
export const getOrCreateDirectConversation = async (participantId) => {
  const { data } = await api.post('/conversations/direct', { participantId });
  return data.conversation;
};

/**
 * Get all conversations (direct + group) for current user (includes unreadCount)
 */
export const fetchConversations = async () => {
  const { data } = await api.get('/conversations');
  return data.conversations;
};

/**
 * Load conversation messages with cursor-based pagination
 * @param {string} conversationId
 * @param {string|null} before - cursor (message ID); omit for initial load
 * @param {number} limit - default 40
 * @returns {{ messages: Array, nextCursor: string|null, hasMore: boolean }}
 */
export const fetchMessages = async (conversationId, before = null, limit = 40) => {
  const params = { limit };
  if (before) params.before = before;
  const { data } = await api.get(`/conversations/${conversationId}/messages`, { params });
  return data; // { messages, nextCursor, hasMore }
};

/**
 * Mark a conversation as fully read (zeroes unread count)
 */
export const markConversationReadApi = async (conversationId) => {
  const { data } = await api.post(`/conversations/${conversationId}/read`);
  return data;
};

/**
 * Send a message to a conversation
 * @param {string} conversationId
 * @param {string} content
 * @param {string} clientMessageId - client-generated UUID for deduplication
 */
export const sendMessageApi = async (conversationId, content, clientMessageId) => {
  const { data } = await api.post(`/conversations/${conversationId}/messages`, {
    content,
    clientMessageId,
  });
  return data.message;
};

/**
 * Edit own message content
 */
export const editMessageApi = async (conversationId, messageId, content) => {
  const { data } = await api.patch(`/conversations/${conversationId}/messages/${messageId}`, { content });
  return data.message;
};

/**
 * Delete own message (within 10 minutes)
 */
export const deleteMessageApi = async (conversationId, messageId) => {
  const { data } = await api.delete(`/conversations/${conversationId}/messages/${messageId}`);
  return data;
};

/**
 * Toggle emoji reaction on a message
 */
export const toggleReactionApi = async (conversationId, messageId, emoji) => {
  const { data } = await api.post(`/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji });
  return data;
};

// ── Group Chat API Endpoints ────────────────────────────────────────────────

/**
 * Create a new group (creator becomes Owner)
 */
export const createGroupApi = async ({ name, avatarUrl, memberIds = [] }) => {
  const { data } = await api.post('/groups', { name, avatarUrl, memberIds });
  return data.group;
};

/**
 * Get group details including active members and roles
 */
export const getGroupDetailsApi = async (groupId) => {
  const { data } = await api.get(`/groups/${groupId}`);
  return data.group;
};

/**
 * Update group name or avatar (OWNER or ADMIN)
 */
export const updateGroupApi = async (groupId, { name, avatarUrl }) => {
  const { data } = await api.patch(`/groups/${groupId}`, { name, avatarUrl });
  return data.group;
};

/**
 * Add members to group (OWNER or ADMIN)
 */
export const addGroupMembersApi = async (groupId, memberIds) => {
  const { data } = await api.post(`/groups/${groupId}/members`, { memberIds });
  return data.addedMembers;
};

/**
 * Remove a member from group (OWNER or ADMIN)
 */
export const removeGroupMemberApi = async (groupId, memberId) => {
  const { data } = await api.delete(`/groups/${groupId}/members/${memberId}`);
  return data;
};

/**
 * Promote or demote an Admin (OWNER only)
 * role: 'ADMIN' | 'MEMBER'
 */
export const updateMemberRoleApi = async (groupId, memberId, role) => {
  const { data } = await api.patch(`/groups/${groupId}/members/${memberId}/role`, { role });
  return data.member;
};

/**
 * Transfer group ownership (OWNER only)
 */
export const transferOwnershipApi = async (groupId, newOwnerId) => {
  const { data } = await api.post(`/groups/${groupId}/transfer-ownership`, { newOwnerId });
  return data;
};

/**
 * Delete a group (OWNER only)
 */
export const deleteGroupApi = async (groupId) => {
  const { data } = await api.delete(`/groups/${groupId}`);
  return data;
};

/**
 * Leave a group (MEMBER or ADMIN)
 */
export const leaveGroupApi = async (groupId) => {
  const { data } = await api.post(`/groups/${groupId}/leave`);
  return data;
};

/**
 * Upload an image or file attachment to a conversation
 * @param {string} conversationId
 * @param {FormData} formData - contains 'file', and optionally 'content', 'clientMessageId'
 */
export const uploadFileApi = async (conversationId, formData) => {
  const { data } = await api.post(`/conversations/${conversationId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.message;
};
