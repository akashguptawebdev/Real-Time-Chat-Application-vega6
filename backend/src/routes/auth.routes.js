import { Router } from 'express';
import { signup, login, logout, refresh, getMe, googleAuth } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/signup', signup);
router.post('/login',  login);
router.post('/google', googleAuth);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/me',      protect, getMe);

export default router;
