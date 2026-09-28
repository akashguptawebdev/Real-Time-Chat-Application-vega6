import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const RefreshToken = sequelize.define('RefreshToken', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  tokenHash: { type: DataTypes.STRING, allowNull: false, field: 'token_hash' },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  revokedAt: { type: DataTypes.DATE, allowNull: true, field: 'revoked_at' },
}, {
  tableName: 'refresh_tokens',
  timestamps: true, createdAt: 'created_at', updatedAt: false,
  indexes: [{ fields: ['user_id'] }, { fields: ['token_hash'] }],
});

export default RefreshToken;
