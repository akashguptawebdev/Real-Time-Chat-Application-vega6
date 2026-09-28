import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Message = sequelize.define('Message', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  conversationId: { type: DataTypes.UUID, allowNull: false, field: 'conversation_id' },
  senderId: { type: DataTypes.UUID, allowNull: false, field: 'sender_id' },
  clientMessageId: { type: DataTypes.STRING, allowNull: false, field: 'client_message_id' },
  content: { type: DataTypes.TEXT, allowNull: false },
  editedAt: { type: DataTypes.DATE, allowNull: true, field: 'edited_at' },
  deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
}, {
  tableName: 'messages',
  timestamps: true, createdAt: 'created_at', updatedAt: false,
  indexes: [
    { unique: true, fields: ['sender_id', 'client_message_id'] },
    { fields: ['conversation_id', 'created_at', 'id'] },
  ],
});

export default Message;
