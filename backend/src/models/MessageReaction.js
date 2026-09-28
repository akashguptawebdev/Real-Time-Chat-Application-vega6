import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MessageReaction = sequelize.define('MessageReaction', {
  messageId: { type: DataTypes.UUID, primaryKey: true, field: 'message_id' },
  userId: { type: DataTypes.UUID, primaryKey: true, field: 'user_id' },
  emoji: { type: DataTypes.STRING(10), primaryKey: true, allowNull: false },
}, { tableName: 'message_reactions', timestamps: true, createdAt: 'created_at', updatedAt: false });

export default MessageReaction;
