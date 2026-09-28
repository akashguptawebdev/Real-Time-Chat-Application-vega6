import sequelize from '../config/database.js';
import User from './User.js';
import Conversation from './Conversation.js';
import DirectConversation from './DirectConversation.js';
import ConversationMember from './ConversationMember.js';
import Message from './Message.js';
import MessageReceipt from './MessageReceipt.js';
import MessageReaction from './MessageReaction.js';
import RefreshToken from './RefreshToken.js';

User.hasMany(Conversation, { foreignKey: 'createdBy', as: 'createdConversations' });
Conversation.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Conversation.hasOne(DirectConversation, { foreignKey: 'conversationId', as: 'directInfo', onDelete: 'CASCADE' });
DirectConversation.belongsTo(Conversation, { foreignKey: 'conversationId' });

User.hasMany(ConversationMember, { foreignKey: 'userId', as: 'memberships' });
ConversationMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Conversation.hasMany(ConversationMember, { foreignKey: 'conversationId', as: 'members', onDelete: 'CASCADE' });
ConversationMember.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

Message.hasMany(MessageReceipt, { foreignKey: 'messageId', as: 'receipts', onDelete: 'CASCADE' });
MessageReceipt.belongsTo(Message, { foreignKey: 'messageId' });
User.hasMany(MessageReceipt, { foreignKey: 'userId', as: 'messageReceipts', onDelete: 'CASCADE' });
MessageReceipt.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Message.hasMany(MessageReaction, { foreignKey: 'messageId', as: 'reactions', onDelete: 'CASCADE' });
MessageReaction.belongsTo(Message, { foreignKey: 'messageId' });
User.hasMany(MessageReaction, { foreignKey: 'userId', as: 'reactions', onDelete: 'CASCADE' });
MessageReaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { sequelize, User, Conversation, DirectConversation, ConversationMember, Message, MessageReceipt, MessageReaction, RefreshToken };
