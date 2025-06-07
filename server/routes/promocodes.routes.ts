import { Router } from 'express';
import { storage } from '../storage';
import { requireSessionAuth, type SessionAuthenticatedRequest } from '../middleware/sessionAuth';

const router = Router();

// Создание нового промокода
router.post("/generate", async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
    const promocode = await storage.createPromocode(clientIp);
    res.json({ 
      success: true, 
      data: {
        code: promocode.code,
        expiresAt: promocode.expiresAt
      }
    });
  } catch (error) {
    console.error("Error generating promocode:", error);
    if (error instanceof Error && error.message.includes("лимит")) {
      res.status(429).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: "Failed to generate promocode" });
    }
  }
});

// Применение промокода (требует авторизации)
router.post("/use", requireSessionAuth, async (req: SessionAuthenticatedRequest, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, error: "Промокод обязателен" });
    }

    // Подробная валидация промокода
    const promocode = await storage.getPromocodeByCode(code);
    const user = await storage.getUser(req.user!.id);
    
    if (!promocode) {
      return res.status(400).json({ 
        success: false, 
        error: "Промокод не найден" 
      });
    }
    
    if (promocode.isUsed) {
      return res.status(400).json({ 
        success: false, 
        error: "Промокод уже использован" 
      });
    }
    
    if (storage.isPromocodeExpired(promocode)) {
      return res.status(400).json({ 
        success: false, 
        error: "Срок действия промокода истек" 
      });
    }

    // Проверка лимита использования промокодов
    const userPromocodeUsage = await storage.getUserPromocodeUsage(req.user!.id);
    if (userPromocodeUsage >= 1) {
      return res.status(400).json({ 
        success: false, 
        error: "Вы уже использовали промокод. Один промокод на пользователя" 
      });
    }

    // Проверка активной подписки
    if (user && user.subscriptionType && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date()) {
      return res.status(400).json({ 
        success: false, 
        error: "У вас уже есть активная подписка" 
      });
    }

    // Проверка времени регистрации (промокод доступен только в первые 7 дней)
    if (user && user.createdAt) {
      const daysSinceRegistration = (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceRegistration > 7) {
        return res.status(400).json({ 
          success: false, 
          error: "Промокоды доступны только в первые 7 дней после регистрации" 
        });
      }
    }

    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
    const success = await storage.usePromocode(code, req.user!.id, clientIp);
    
    if (success) {
      res.json({ 
        success: true, 
        message: "Промокод успешно применен! Вы получили полный доступ на 24 часа" 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: "Не удалось применить промокод. Возможно, превышены лимиты использования или нарушены правила безопасности" 
      });
    }
  } catch (error) {
    console.error("Error using promocode:", error);
    res.status(500).json({ success: false, error: "Ошибка применения промокода" });
  }
});

export default router;