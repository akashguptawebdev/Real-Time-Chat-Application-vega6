import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Conversation = sequelize.define('Conversation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.ENUM('direct', 'group'), allowNull: false, defaultValue: 'direct' },
  name: { type: DataTypes.STRING, allowNull: true },
  avatarUrl: { type: DataTypes.STRING, allowNull: true, field: 'avatar_url' },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
}, { tableName: 'conversations', timestamps: true, createdAt: 'created_at', updatedAt: false });

export default Conversation;
