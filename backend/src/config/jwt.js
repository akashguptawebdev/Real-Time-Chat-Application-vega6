import jwt from 'jsonwebtoken';

const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET || 'access_secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

export const signAccessToken = (payload) =>
  jwt.sign(payload, jwtConfig.accessSecret, { expiresIn: jwtConfig.accessExpiresIn });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiresIn });

export const verifyAccessToken = (token) => jwt.verify(token, jwtConfig.accessSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, jwtConfig.refreshSecret);
