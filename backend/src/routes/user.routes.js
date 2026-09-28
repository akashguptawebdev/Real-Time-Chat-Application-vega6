import { Router } from 'express';
import { searchUsers } from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/search', searchUsers);
router.get('/', searchUsers);

export default router;
