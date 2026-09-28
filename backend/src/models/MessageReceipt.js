import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MessageReceipt = sequelize.define('MessageReceipt', {
  messageId: { type: DataTypes.UUID, primaryKey: true, field: 'message_id' },
  userId: { type: DataTypes.UUID, primaryKey: true, field: 'user_id' },
  deliveredAt: { type: DataTypes.DATE, allowNull: true, field: 'delivered_at' },
  readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
}, { tableName: 'message_receipts', timestamps: false });

export default MessageReceipt;
