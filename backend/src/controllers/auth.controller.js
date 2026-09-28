import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, RefreshToken } from '../models/index.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../config/jwt.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id });

    await RefreshToken.create({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    setRefreshCookie(res, refreshToken);
    return res.status(201).json({
      message: 'Account created successfully',
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id });

    await RefreshToken.create({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await user.update({ lastSeenAt: new Date() });
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      message: 'Logged in successfully',
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token provided' });

    let payload;
    try { payload = verifyRefreshToken(token); }
    catch { return res.status(401).json({ message: 'Invalid or expired refresh token' }); }

    const stored = await RefreshToken.findOne({
      where: { tokenHash: hashToken(token), userId: payload.userId, revokedAt: null },
    });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token revoked or expired' });
    }

    await stored.update({ revokedAt: new Date() });

    const user = await User.findByPk(payload.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const newAccessToken = signAccessToken({ userId: user.id, email: user.email });
    const newRefreshToken = signRefreshToken({ userId: user.id });

    await RefreshToken.create({
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    setRefreshCookie(res, newRefreshToken);
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('refresh error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await RefreshToken.update(
        { revokedAt: new Date() },
        { where: { tokenHash: hashToken(token), revokedAt: null } }
      );
    }
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('logout error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'name', 'email', 'avatarUrl', 'lastSeenAt', 'created_at'],
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
