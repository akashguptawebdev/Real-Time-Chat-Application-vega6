import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING, allowNull: false, field: 'password_hash' },
  avatarUrl: { type: DataTypes.STRING, allowNull: true, field: 'avatar_url' },
  lastSeenAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'last_seen_at' },
}, { tableName: 'users', timestamps: true, createdAt: 'created_at', updatedAt: false });

export default User;
