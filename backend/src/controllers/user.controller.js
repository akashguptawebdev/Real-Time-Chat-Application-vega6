import { Op } from 'sequelize';
import { User } from '../models/index.js';

/**
 * Search users by name or email (excluding current user)
 * GET /api/users/search?q=...
 */
export const searchUsers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const query = (req.query.q || req.query.search || '').trim();

    const whereClause = {
      id: { [Op.ne]: currentUserId },
    };

    if (query) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } },
      ];
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'avatarUrl', 'lastSeenAt'],
      limit: 20,
      order: [['name', 'ASC']],
    });

    return res.status(200).json({ users });
  } catch (err) {
    console.error('searchUsers error:', err);
    return res.status(500).json({ message: 'Failed to search users' });
  }
};
