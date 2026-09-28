import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DirectConversation = sequelize.define('DirectConversation', {
  conversationId: { type: DataTypes.UUID, primaryKey: true, field: 'conversation_id' },
  userLowId: { type: DataTypes.UUID, allowNull: false, field: 'user_low_id' },
  userHighId: { type: DataTypes.UUID, allowNull: false, field: 'user_high_id' },
}, { tableName: 'direct_conversations', timestamps: false, indexes: [{ unique: true, fields: ['user_low_id', 'user_high_id'] }] });

export default DirectConversation;
