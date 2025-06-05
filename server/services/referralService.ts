import { db } from '../db';
import { users, referralEarnings, bonusTransactions } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export class ReferralService {
  // Генерация уникального реферального кода
  static generateReferralCode(username: string): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${username.substring(0, 6).toUpperCase()}${random}`;
  }

  // Получение информации о пользователе по реферальному коду
  static async getUserByReferralCode(referralCode: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode));
    
    return user || null;
  }

  // Начисление бонусов рефереру
  static async processReferralEarning(
    referrerId: number,
    referredUserId: number,
    subscriptionAmount: number,
    subscriptionType: string
  ) {
    const bonusAmount = subscriptionAmount * 0.2; // 20% от суммы

    // Создаем запись о реферальном доходе
    const [referralEarning] = await db
      .insert(referralEarnings)
      .values({
        referrerId,
        referredUserId,
        amount: bonusAmount.toString(),
        subscriptionType,
      })
      .returning();

    // Начисляем бонусы на счет реферера
    await db
      .update(users)
      .set({
        bonusBalance: db
          .select({ balance: users.bonusBalance })
          .from(users)
          .where(eq(users.id, referrerId))
          .then(([user]) => (parseFloat(user.balance) + bonusAmount).toString())
      })
      .where(eq(users.id, referrerId));

    // Создаем транзакцию начисления бонусов
    await db
      .insert(bonusTransactions)
      .values({
        userId: referrerId,
        amount: bonusAmount.toString(),
        type: 'earned',
        description: `Реферальный бонус за подписку ${subscriptionType}`,
        referralEarningId: referralEarning.id,
      });

    return bonusAmount;
  }

  // Расчет финальной цены с использованием бонусов
  static async calculateFinalPrice(userId: number, originalPrice: number): Promise<{
    finalPrice: number;
    bonusUsed: number;
    bonusAvailable: number;
  }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return {
        finalPrice: originalPrice,
        bonusUsed: 0,
        bonusAvailable: 0,
      };
    }

    const bonusAvailable = parseFloat(user.bonusBalance);
    const maxBonusUsage = originalPrice * 0.5; // Максимум 50% от стоимости
    const bonusToUse = Math.min(bonusAvailable, maxBonusUsage);
    const finalPrice = Math.max(0, originalPrice - bonusToUse);

    return {
      finalPrice,
      bonusUsed: bonusToUse,
      bonusAvailable,
    };
  }

  // Списание бонусов при оплате
  static async spendBonuses(userId: number, amount: number, description: string) {
    // Обновляем баланс пользователя
    await db
      .update(users)
      .set({
        bonusBalance: db
          .select({ balance: users.bonusBalance })
          .from(users)
          .where(eq(users.id, userId))
          .then(([user]) => Math.max(0, parseFloat(user.balance) - amount).toString())
      })
      .where(eq(users.id, userId));

    // Создаем транзакцию списания
    await db
      .insert(bonusTransactions)
      .values({
        userId,
        amount: (-amount).toString(),
        type: 'spent',
        description,
      });
  }

  // Получение статистики рефералов
  static async getReferralStats(userId: number) {
    const referrals = await db
      .select()
      .from(users)
      .where(eq(users.referredBy, userId));

    const earnings = await db
      .select()
      .from(referralEarnings)
      .where(eq(referralEarnings.referrerId, userId));

    const transactions = await db
      .select()
      .from(bonusTransactions)
      .where(eq(bonusTransactions.userId, userId));

    const totalEarned = earnings.reduce((sum, earning) => sum + parseFloat(earning.amount), 0);
    const totalSpent = transactions
      .filter(t => t.type === 'spent')
      .reduce((sum, transaction) => sum + Math.abs(parseFloat(transaction.amount)), 0);

    return {
      totalReferrals: referrals.length,
      paidReferrals: earnings.length,
      totalEarned,
      totalSpent,
    };
  }
}