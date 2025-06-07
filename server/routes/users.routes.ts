import { Router } from 'express';
import { storage } from '../storage';
import { requireSessionAuth, type SessionAuthenticatedRequest } from '../middleware/sessionAuth';
import { UserService } from '../services/userService';
import { generalRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Get user profile with session authentication
router.get('/profile',
  generalRateLimit,
  requireSessionAuth,
  async (req: SessionAuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const subscriptionStatus = await UserService.checkSubscriptionStatus(user.id);
      const aiLimits = await UserService.getAILimits(user.id);

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        telegramHandle: user.telegramHandle,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        bonusBalance: user.bonusBalance,
        subscription: subscriptionStatus,
        aiLimits
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;