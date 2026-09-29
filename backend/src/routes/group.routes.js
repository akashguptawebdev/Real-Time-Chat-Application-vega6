import { Router } from 'express';
import {
  createGroup,
  getGroupDetails,
  updateGroup,
  addMembers,
  removeMember,
  updateMemberRole,
  transferOwnership,
  deleteGroup,
  leaveGroup,
} from '../controllers/group.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import {
  requireOwner,
  requireAdminOrOwner,
} from '../middlewares/role.middleware.js';

const router = Router();

// Protect all group routes
router.use(protect);

// Group Creation: Any user can create a group and becomes its Owner
router.post('/', createGroup);

// Get group details
router.get('/:id', getGroupDetails);

// Leave group
router.post('/:id/leave', leaveGroup);

// Admin / Owner Actions: Update group info, add members, remove members
router.patch('/:id', requireAdminOrOwner, updateGroup);
router.post('/:id/members', requireAdminOrOwner, addMembers);
router.delete('/:id/members/:memberId', requireAdminOrOwner, removeMember);

// Owner-Only Actions: Promote/demote admins, transfer ownership, delete group
router.patch('/:id/members/:memberId/role', requireOwner, updateMemberRole);
router.post('/:id/transfer-ownership', requireOwner, transferOwnership);
router.delete('/:id', requireOwner, deleteGroup);

export default router;
