import api from '../../lib/api.js';

/**
 * Search users by name or email
 * Step 1: Search users
 */
export const searchUsers = async (query = '') => {
  const { data } = await api.get('/users/search', {
    params: { q: query },
  });
  return data.users;
};

/**
 * Get or create a 1-to-1 conversation with a participant
 * Step 2 & 3: Click Message -> Find or create conversation
 */
export const getOrCreateDirectConversation = async (participantId) => {
  const { data } = await api.post('/conversations/direct', { participantId });
  return data.conversation;
};

/**
 * Get all conversations for current user
 */
export const fetchConversations = async () => {
  const { data } = await api.get('/conversations');
  return data.conversations;
};

/**
 * Step 4: Load conversation messages
 */
export const fetchMessages = async (conversationId) => {
  const { data } = await api.get(`/conversations/${conversationId}/messages`);
  return data.messages;
};

/**
 * Send a message to a conversation
 */
export const sendMessageApi = async (conversationId, content) => {
  const { data } = await api.post(`/conversations/${conversationId}/messages`, { content });
  return data.message;
};
