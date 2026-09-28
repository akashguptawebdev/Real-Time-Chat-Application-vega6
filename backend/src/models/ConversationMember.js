import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ConversationMember = sequelize.define('ConversationMember', {
  conversationId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'conversation_id' },
  userId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'user_id' },
  role: { type: DataTypes.ENUM('OWNER', 'ADMIN', 'MEMBER'), allowNull: false, defaultValue: 'MEMBER' },
  joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'joined_at' },
  removedAt: { type: DataTypes.DATE, allowNull: true, field: 'removed_at' },
  lastReadAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'last_read_at' },
}, { tableName: 'conversation_members', timestamps: false });

export default ConversationMember;
