import { Router } from 'express';
import { storage } from '../storage';
import { requireSessionAuth, type SessionAuthenticatedRequest } from '../middleware/sessionAuth';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/unifiedAuth';
import { db } from '../db';
import { promocodes } from '@shared/schema';
import { sql, eq, desc } from 'drizzle-orm';

const router = Router();

// Создание нового промокода
router.post('/generate', async (req, res) => {
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
router.post('/use', requireSessionAuth, async (req: SessionAuthenticatedRequest, res) => {
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

    // Проверка времени регистрации
    if (user && user.createdAt) {
      const daysSinceRegistration = (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceRegistration > 7) {
        return res.status(400).json({ 
          success: false, 
          error: "Промокод можно использовать только в первые 7 дней после регистрации" 
        });
      }
    }

    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
    const success = await storage.usePromocode(code, req.user!.id, clientIp);
    
    if (!success) {
      return res.status(400).json({ 
        success: false, 
        error: "Не удалось применить промокод. Возможно, превышен лимит использования или нарушены правила безопасности" 
      });
    }

    res.json({ 
      success: true, 
      message: "Промокод успешно применен! Вы получили полный доступ на 24 часа" 
    });
  } catch (error) {
    console.error("Error using promocode:", error);
    res.status(500).json({ success: false, error: "Ошибка применения промокода" });
  }
});

// === ADMIN PROMOCODE MONITORING ROUTES ===

// Получение статистики промокодов для админ-панели
router.get('/stats', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    // Общая статистика промокодов
    const totalPromocodes = await db
      .select({ count: sql<number>`count(*)` })
      .from(promocodes);
    
    const usedPromocodes = await db
      .select({ count: sql<number>`count(*)` })
      .from(promocodes)
      .where(eq(promocodes.isUsed, true));
    
    const expiredPromocodes = await db
      .select({ count: sql<number>`count(*)` })
      .from(promocodes)
      .where(sql`${promocodes.expiresAt} < NOW() AND ${promocodes.isUsed} = false`);
    
    const activePromocodes = await db
      .select({ count: sql<number>`count(*)` })
      .from(promocodes)
      .where(sql`${promocodes.expiresAt} > NOW() AND ${promocodes.isUsed} = false`);

    // IP активность за последние 24 часа
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const ipCreationActivity = await db
      .select({ 
        ip: promocodes.createdFromIp,
        count: sql<number>`count(*)`
      })
      .from(promocodes)
      .where(sql`${promocodes.createdAt} > ${last24Hours}`)
      .groupBy(promocodes.createdFromIp)
      .having(sql`count(*) > 3`); // Подозрительная активность

    const ipUsageActivity = await db
      .select({ 
        ip: promocodes.usedFromIp,
        count: sql<number>`count(*)`
      })
      .from(promocodes)
      .where(sql`${promocodes.usedAt} > ${last24Hours}`)
      .groupBy(promocodes.usedFromIp)
      .having(sql`count(*) > 5`); // Подозрительная активность

    res.json({
      success: true,
      data: {
        total: totalPromocodes[0]?.count || 0,
        used: usedPromocodes[0]?.count || 0,
        expired: expiredPromocodes[0]?.count || 0,
        active: activePromocodes[0]?.count || 0,
        suspiciousCreationIPs: ipCreationActivity,
        suspiciousUsageIPs: ipUsageActivity
      }
    });
  } catch (error) {
    console.error("Error fetching promocode stats:", error);
    res.status(500).json({ success: false, error: "Failed to fetch promocode stats" });
  }
});

// Получение IP активности
router.get('/ip-activity', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const ipActivity = await db
      .select({
        ip: sql<string>`COALESCE(${promocodes.usedFromIp}, ${promocodes.createdFromIp})`,
        lastActivity: sql<Date>`MAX(COALESCE(${promocodes.usedAt}, ${promocodes.createdAt}))`,
        totalActions: sql<number>`count(*)`
      })
      .from(promocodes)
      .where(
        sql`COALESCE(${promocodes.usedFromIp}, ${promocodes.createdFromIp}) IS NOT NULL`
      )
      .groupBy(sql`COALESCE(${promocodes.usedFromIp}, ${promocodes.createdFromIp})`)
      .orderBy(desc(sql`MAX(COALESCE(${promocodes.usedAt}, ${promocodes.createdAt}))`));

    res.json({
      success: true,
      data: ipActivity
    });
  } catch (error) {
    console.error("Error fetching IP activity:", error);
    res.status(500).json({ success: false, error: "Failed to fetch IP activity" });
  }
});

export default router;