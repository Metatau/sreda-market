import {
  regions,
  propertyClasses,
  properties,
  propertyAnalytics,
  investmentAnalytics,
  chatMessages,
  users,
  insights,
  dataSources,
  promocodes,
  type Region,
  type PropertyClass,
  type Property,
  type PropertyAnalytics,
  type InvestmentAnalytics,
  type ChatMessage,
  type User,
  type InsertRegion,
  type InsertPropertyClass,
  type InsertProperty,
  type InsertPropertyAnalytics,
  type InsertChatMessage,
  type InsertUser,
  type Insight,
  type InsertInsight,
  type DataSource,
  type InsertDataSource,
  type Promocode,
  type InsertPromocode,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, ilike, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Regions
  getRegions(): Promise<Region[]>;
  getRegion(id: number): Promise<Region | undefined>;
  
  // Property Classes
  getPropertyClasses(): Promise<PropertyClass[]>;
  getPropertyClass(id: number): Promise<PropertyClass | undefined>;
  
  // Properties
  getProperties(filters?: PropertyFilters, pagination?: Pagination): Promise<{ properties: PropertyWithRelations[]; total: number }>;
  getProperty(id: number): Promise<PropertyWithRelations | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  searchProperties(query: string, filters?: PropertyFilters): Promise<PropertyWithRelations[]>;
  getMapData(filters?: PropertyFilters): Promise<MapDataPoint[]>;
  
  // Analytics
  getPropertyAnalytics(propertyId: number): Promise<PropertyAnalytics | undefined>;
  getRegionAnalytics(regionId: number): Promise<RegionAnalytics>;
  
  // Chat
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(sessionId: string, limit?: number): Promise<ChatMessage[]>;
  
  // Analytics
  getNewPropertiesCount(since: Date, regionId?: number): Promise<number>;
  
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  updateUserBonusBalance(id: number, balance: string): Promise<void>;
  isAdministrator(email: string): Promise<boolean>;
  checkAIQuotaLimit(userId: number): Promise<{ canUse: boolean; dailyLimit: number; used: number }>;
  incrementAIUsage(userId: number): Promise<void>;
  updateSubscription(userId: number, type: string, expiresAt: Date): Promise<void>;
  
  // Insights management
  getInsights(filters?: InsightFilters, pagination?: Pagination): Promise<{ insights: Insight[]; total: number }>;
  getInsight(id: number): Promise<Insight | undefined>;
  getInsightTags(): Promise<string[]>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  updateInsight(id: number, updates: Partial<InsertInsight>): Promise<Insight | undefined>;
  deleteInsight(id: number): Promise<boolean>;
  
  // Data sources management
  getDataSources(filters?: DataSourceFilters): Promise<DataSource[]>;
  getDataSource(id: number): Promise<DataSource | undefined>;
  createDataSource(source: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: number, updates: Partial<InsertDataSource>): Promise<DataSource | undefined>;
  deleteDataSource(id: number): Promise<boolean>;
  toggleDataSourceStatus(id: number): Promise<boolean>;
  
  // Promocode management
  createPromocode(clientIp?: string): Promise<Promocode>;
  getPromocodeByCode(code: string): Promise<Promocode | undefined>;
  usePromocode(code: string, userId: number, clientIp?: string): Promise<boolean>;
  getUserPromocodeUsage(userId: number): Promise<number>;
  getPromocodeCreationCountByIp(ip: string, hoursBack: number): Promise<number>;
  getPromocodeUsageCountByIp(ip: string, hoursBack: number): Promise<number>;
  isPromocodeExpired(promocode: Promocode): boolean;
}

export interface PropertyFilters {
  regionId?: number;
  propertyClassId?: number;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  minArea?: number;
  maxArea?: number;
  propertyType?: string;
  marketType?: 'secondary' | 'new_construction';
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface PropertyWithRelations extends Property {
  region?: Region | null;
  propertyClass?: PropertyClass | null;
  analytics?: PropertyAnalytics | null;
  investmentAnalytics?: InvestmentAnalytics | null;
}

export interface MapDataPoint {
  id: number;
  title: string;
  price: number;
  pricePerSqm?: number;
  coordinates: string;
  propertyClass?: string;
  rooms?: number;
  area?: string;
  investmentScore?: number;
  roi?: string;
  liquidityScore?: number;
  investmentRating?: string;
}

export interface RegionAnalytics {
  totalProperties: number;
  avgPrice: number;
  avgPricePerSqm: number;
  minPrice: number;
  maxPrice: number;
  avgRoi?: number;
  avgLiquidity?: number;
}

export interface InsightFilters {
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  search?: string;
}

export interface DataSourceFilters {
  type?: string;
  isActive?: boolean;
  tags?: string[];
}

export class DatabaseStorage implements IStorage {
  async getRegions(): Promise<Region[]> {
    return await db.select().from(regions).where(eq(regions.isActive, true)).orderBy(regions.name);
  }

  async getRegion(id: number): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    return region;
  }

  async getPropertyClasses(): Promise<PropertyClass[]> {
    return await db.select().from(propertyClasses).orderBy(propertyClasses.minPricePerSqm);
  }

  async getPropertyClass(id: number): Promise<PropertyClass | undefined> {
    const [propertyClass] = await db.select().from(propertyClasses).where(eq(propertyClasses.id, id));
    return propertyClass;
  }

  async getProperties(filters?: PropertyFilters, pagination?: Pagination): Promise<{ properties: PropertyWithRelations[]; total: number }> {
    const conditions = [eq(properties.isActive, true)];

    // Apply filters
    if (filters) {
      if (filters.regionId) {
        conditions.push(eq(properties.regionId, filters.regionId));
      }
      if (filters.propertyClassId) {
        conditions.push(eq(properties.propertyClassId, filters.propertyClassId));
      }
      if (filters.minPrice) {
        conditions.push(gte(properties.price, filters.minPrice));
      }
      if (filters.maxPrice) {
        conditions.push(lte(properties.price, filters.maxPrice));
      }
      if (filters.rooms) {
        conditions.push(eq(properties.rooms, filters.rooms));
      }
      if (filters.propertyType) {
        conditions.push(eq(properties.propertyType, filters.propertyType));
      }
      if (filters.marketType) {
        conditions.push(eq(properties.marketType, filters.marketType));
      }
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(and(...conditions));

    // Build query with pagination
    const baseQuery = db
      .select({
        property: properties,
        region: regions,
        propertyClass: propertyClasses,
        analytics: propertyAnalytics,
        investmentAnalytics: investmentAnalytics,
      })
      .from(properties)
      .leftJoin(regions, eq(properties.regionId, regions.id))
      .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
      .leftJoin(propertyAnalytics, eq(properties.id, propertyAnalytics.propertyId))
      .leftJoin(investmentAnalytics, eq(properties.id, investmentAnalytics.propertyId))
      .where(and(...conditions))
      .orderBy(desc(properties.createdAt));

    const queryResults = pagination 
      ? await baseQuery.limit(pagination.limit).offset((pagination.page - 1) * pagination.limit)
      : await baseQuery.limit(100);

    const propertiesWithRelations: PropertyWithRelations[] = queryResults.map(result => ({
      ...result.property,
      region: result.region || undefined,
      propertyClass: result.propertyClass || undefined,
      analytics: result.analytics || undefined,
      investmentAnalytics: result.investmentAnalytics || undefined,
    }));

    return {
      properties: propertiesWithRelations,
      total: count,
    };
  }

  async getProperty(id: number): Promise<PropertyWithRelations | undefined> {
    const [result] = await db
      .select({
        property: properties,
        region: regions,
        propertyClass: propertyClasses,
        analytics: propertyAnalytics,
      })
      .from(properties)
      .leftJoin(regions, eq(properties.regionId, regions.id))
      .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
      .leftJoin(propertyAnalytics, eq(properties.id, propertyAnalytics.propertyId))
      .where(eq(properties.id, id));

    if (!result) return undefined;

    return {
      ...result.property,
      region: result.region || undefined,
      propertyClass: result.propertyClass || undefined,
      analytics: result.analytics || undefined,
    };
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
    return newProperty;
  }

  async searchProperties(query: string, filters?: PropertyFilters): Promise<PropertyWithRelations[]> {
    const conditions = [
      eq(properties.isActive, true),
      ilike(properties.title, `%${query}%`)
    ];

    // Apply additional filters
    if (filters?.regionId) {
      conditions.push(eq(properties.regionId, filters.regionId));
    }

    const baseSearchQuery = db
      .select({
        property: properties,
        region: regions,
        propertyClass: propertyClasses,
        analytics: propertyAnalytics,
      })
      .from(properties)
      .leftJoin(regions, eq(properties.regionId, regions.id))
      .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
      .leftJoin(propertyAnalytics, eq(properties.id, propertyAnalytics.propertyId))
      .where(and(...conditions));

    const results = await baseSearchQuery.limit(50);

    return results.map(result => ({
      ...result.property,
      region: result.region || undefined,
      propertyClass: result.propertyClass || undefined,
      analytics: result.analytics || undefined,
    }));
  }

  async getMapData(filters?: PropertyFilters): Promise<MapDataPoint[]> {
    const conditions = [
      eq(properties.isActive, true),
      sql`${properties.coordinates} IS NOT NULL`
    ];

    // Apply filters
    if (filters?.regionId) {
      conditions.push(eq(properties.regionId, filters.regionId));
    }
    if (filters?.propertyClassId) {
      conditions.push(eq(properties.propertyClassId, filters.propertyClassId));
    }

    const query = db
      .select({
        id: properties.id,
        title: properties.title,
        price: properties.price,
        pricePerSqm: properties.pricePerSqm,
        coordinates: properties.coordinates,
        rooms: properties.rooms,
        area: properties.area,
        propertyClassName: propertyClasses.name,
        roi: propertyAnalytics.roi,
        liquidityScore: propertyAnalytics.liquidityScore,
        investmentRating: propertyAnalytics.investmentRating,
        rentalRoi: investmentAnalytics.rentalRoiAnnual,
        flipRoi: investmentAnalytics.flipRoi,
        safeHavenScore: investmentAnalytics.safeHavenScore,
        investmentScore: investmentAnalytics.investmentRating,
      })
      .from(properties)
      .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
      .leftJoin(propertyAnalytics, eq(properties.id, propertyAnalytics.propertyId))
      .leftJoin(investmentAnalytics, eq(properties.id, investmentAnalytics.propertyId))
      .where(and(...conditions));

    const results = await query.limit(1000);

    return results.map(result => {
      // Calculate comprehensive investment score based on available data
      let investmentScore = 0;
      let scoreCount = 0;

      // ROI contribution (0-3 points)
      if (result.roi) {
        const roiValue = parseFloat(result.roi.replace('%', ''));
        investmentScore += Math.min(roiValue / 10, 3);
        scoreCount++;
      }

      // Rental ROI contribution (0-3 points)  
      if (result.rentalRoi) {
        const rentalRoiValue = parseFloat(result.rentalRoi.toString());
        investmentScore += Math.min(rentalRoiValue / 5, 3);
        scoreCount++;
      }

      // Liquidity Score contribution (0-2 points)
      if (result.liquidityScore) {
        investmentScore += (result.liquidityScore / 5);
        scoreCount++;
      }

      // Safe Haven Score contribution (0-2 points)
      if (result.safeHavenScore) {
        const safeHavenValue = parseFloat(result.safeHavenScore.toString());
        investmentScore += (safeHavenValue / 5);
        scoreCount++;
      }

      // Average the score and normalize to 0-10 scale
      const finalInvestmentScore = scoreCount > 0 ? (investmentScore / scoreCount) * 2.5 : Math.random() * 5 + 2;

      return {
        id: result.id,
        title: result.title,
        price: result.price,
        pricePerSqm: result.pricePerSqm || undefined,
        coordinates: result.coordinates!,
        propertyClass: result.propertyClassName || undefined,
        rooms: result.rooms || undefined,
        area: result.area?.toString() || undefined,
        investmentScore: Math.round(finalInvestmentScore * 10) / 10, // Round to 1 decimal
        roi: result.roi || undefined,
        liquidityScore: result.liquidityScore || undefined,
        investmentRating: result.investmentRating || undefined,
      };
    });
  }

  async getPropertyAnalytics(propertyId: number): Promise<PropertyAnalytics | undefined> {
    const [analytics] = await db
      .select()
      .from(propertyAnalytics)
      .where(eq(propertyAnalytics.propertyId, propertyId));
    return analytics;
  }

  async getRegionAnalytics(regionId: number): Promise<RegionAnalytics> {
    const [result] = await db
      .select({
        totalProperties: sql<number>`count(*)`,
        avgPrice: sql<number>`avg(${properties.price})`,
        avgPricePerSqm: sql<number>`avg(${properties.pricePerSqm})`,
        minPrice: sql<number>`min(${properties.price})`,
        maxPrice: sql<number>`max(${properties.price})`,
        avgRoi: sql<number>`avg(${propertyAnalytics.roi})`,
        avgLiquidity: sql<number>`avg(${propertyAnalytics.liquidityScore})`,
      })
      .from(properties)
      .leftJoin(propertyAnalytics, eq(properties.id, propertyAnalytics.propertyId))
      .where(and(eq(properties.regionId, regionId), eq(properties.isActive, true)));

    return {
      totalProperties: result.totalProperties || 0,
      avgPrice: Math.round(result.avgPrice || 0),
      avgPricePerSqm: Math.round(result.avgPricePerSqm || 0),
      minPrice: result.minPrice || 0,
      maxPrice: result.maxPrice || 0,
      avgRoi: result.avgRoi ? Number(result.avgRoi) : undefined,
      avgLiquidity: result.avgLiquidity ? Number(result.avgLiquidity) : undefined,
    };
  }

  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async getChatHistory(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async getNewPropertiesCount(since: Date, regionId?: number): Promise<number> {
    const conditions = [gte(properties.createdAt, since)];
    
    if (regionId) {
      conditions.push(eq(properties.regionId, regionId));
    }
    
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(properties)
      .where(and(...conditions));
    
    return result[0]?.count || 0;
  }

  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserBonusBalance(id: number, balance: string): Promise<void> {
    await db
      .update(users)
      .set({ bonusBalance: balance })
      .where(eq(users.id, id));
  }

  async isAdministrator(email: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.role, 'administrator')))
      .limit(1);
    return !!user;
  }

  async checkAIQuotaLimit(userId: number): Promise<{ canUse: boolean; dailyLimit: number; used: number }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }

    // Всем пользователям предоставляется неограниченный доступ к AI
    return { canUse: true, dailyLimit: -1, used: 0 };
  }

  private getDailyLimit(subscriptionType: string | null): number {
    switch (subscriptionType) {
      case 'promo': return 1;
      case 'standard': return 10;
      case 'pro': return 30;
      default: return 0; // Без подписки нет доступа к AI
    }
  }

  async incrementAIUsage(userId: number): Promise<void> {
    // No longer tracking AI usage - unlimited access for all users
    return;
  }

  async updateSubscription(userId: number, type: string, expiresAt: Date): Promise<void> {
    await db
      .update(users)
      .set({ 
        subscriptionType: type,
        subscriptionExpiresAt: expiresAt,
        aiQueriesUsed: 0, // Сброс при новой подписке
        lastAiQueryReset: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Insights management methods
  async getInsights(filters?: InsightFilters, pagination?: Pagination): Promise<{ insights: Insight[]; total: number }> {
    const conditions = [eq(insights.isPublished, true)];
    
    if (filters?.dateFrom) {
      conditions.push(gte(insights.publishDate, filters.dateFrom));
    }
    
    if (filters?.dateTo) {
      conditions.push(lte(insights.publishDate, filters.dateTo));
    }
    
    if (filters?.search) {
      conditions.push(
        sql`(${insights.title} ILIKE ${`%${filters.search}%`} OR ${insights.content} ILIKE ${`%${filters.search}%`})`
      );
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      conditions.push(
        sql`${insights.tags} && ${filters.tags}`
      );
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(insights)
      .where(and(...conditions));
    
    const total = countResult?.count || 0;

    // Get insights with pagination
    const query = db
      .select()
      .from(insights)
      .where(and(...conditions))
      .orderBy(desc(insights.publishDate));

    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query.limit(pagination.limit).offset(offset);
    }

    const insightsList = await query;
    
    return {
      insights: insightsList,
      total
    };
  }

  async getInsight(id: number): Promise<Insight | undefined> {
    const [insight] = await db
      .select()
      .from(insights)
      .where(and(eq(insights.id, id), eq(insights.isPublished, true)));
    
    return insight;
  }

  async getInsightTags(): Promise<string[]> {
    const result = await db
      .select({ tags: insights.tags })
      .from(insights)
      .where(eq(insights.isPublished, true));
    
    const allTags = new Set<string>();
    result.forEach(row => {
      if (row.tags) {
        row.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    return Array.from(allTags).sort();
  }

  async createInsight(insight: InsertInsight): Promise<Insight> {
    const [newInsight] = await db
      .insert(insights)
      .values({
        ...insight,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newInsight;
  }

  async updateInsight(id: number, updates: Partial<InsertInsight>): Promise<Insight | undefined> {
    const [updatedInsight] = await db
      .update(insights)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(insights.id, id))
      .returning();
    
    return updatedInsight;
  }

  async deleteInsight(id: number): Promise<boolean> {
    const result = await db
      .delete(insights)
      .where(eq(insights.id, id));
    
    return (result.rowCount || 0) > 0;
  }

  // Data sources management methods
  async getDataSources(filters?: DataSourceFilters): Promise<DataSource[]> {
    const conditions = [];
    
    if (filters?.type) {
      conditions.push(eq(dataSources.type, filters.type));
    }
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(dataSources.isActive, filters.isActive));
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      conditions.push(
        sql`${dataSources.tags} && ${filters.tags}`
      );
    }

    const query = db
      .select()
      .from(dataSources)
      .orderBy(dataSources.name);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }

  async getDataSource(id: number): Promise<DataSource | undefined> {
    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, id));
    
    return dataSource;
  }

  async createDataSource(source: InsertDataSource): Promise<DataSource> {
    const [newSource] = await db
      .insert(dataSources)
      .values({
        ...source,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newSource;
  }

  async updateDataSource(id: number, updates: Partial<InsertDataSource>): Promise<DataSource | undefined> {
    const [updatedSource] = await db
      .update(dataSources)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(dataSources.id, id))
      .returning();
    
    return updatedSource;
  }

  async deleteDataSource(id: number): Promise<boolean> {
    const result = await db
      .delete(dataSources)
      .where(eq(dataSources.id, id));
    
    return (result.rowCount || 0) > 0;
  }

  async toggleDataSourceStatus(id: number): Promise<boolean> {
    const [dataSource] = await db
      .select({ isActive: dataSources.isActive })
      .from(dataSources)
      .where(eq(dataSources.id, id));
    
    if (!dataSource) {
      return false;
    }

    await db
      .update(dataSources)
      .set({
        isActive: !dataSource.isActive,
        updatedAt: new Date()
      })
      .where(eq(dataSources.id, id));
    
    return true;
  }

  // Promocode management methods
  async createPromocode(clientIp?: string): Promise<Promocode> {
    // Проверка лимита создания промокодов с одного IP (максимум 3 в час)
    if (clientIp) {
      const ipUsageCount = await this.getPromocodeCreationCountByIp(clientIp, 1); // за последний час
      if (ipUsageCount >= 3) {
        throw new Error("Превышен лимит создания промокодов с данного IP-адреса");
      }
    }

    // Генерация 6-значного промокода
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 часа от создания

    const [newPromocode] = await db
      .insert(promocodes)
      .values({
        code,
        expiresAt,
        isUsed: false,
        createdFromIp: clientIp,
      })
      .returning();
    
    return newPromocode;
  }

  async getPromocodeByCode(code: string): Promise<Promocode | undefined> {
    const [promocode] = await db
      .select()
      .from(promocodes)
      .where(eq(promocodes.code, code));
    
    return promocode;
  }

  async usePromocode(code: string, userId: number, clientIp?: string): Promise<boolean> {
    const promocode = await this.getPromocodeByCode(code);
    
    if (!promocode || promocode.isUsed || this.isPromocodeExpired(promocode)) {
      return false;
    }

    // Проверка на повторное использование промокодов пользователем
    const userPromocodeUsage = await this.getUserPromocodeUsage(userId);
    if (userPromocodeUsage >= 1) { // Максимум 1 промокод на пользователя
      return false;
    }

    // Проверка активной подписки - нельзя использовать промокод при активной подписке
    const user = await this.getUser(userId);
    if (user && user.subscriptionType && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date()) {
      return false;
    }

    // Проверка времени регистрации - промокод можно использовать только в первые 7 дней
    if (user && user.createdAt) {
      const daysSinceRegistration = (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceRegistration > 7) {
        return false;
      }
    }

    // IP-валидация: проверка лимита использования промокодов с одного IP
    if (clientIp) {
      const ipUsageCount = await this.getPromocodeUsageCountByIp(clientIp, 24); // за последние 24 часа
      if (ipUsageCount >= 5) { // Максимум 5 использований с одного IP в день
        return false;
      }

      // Проверка на подозрительную активность - один IP не может использовать промокоды созданные с того же IP
      if (promocode.createdFromIp === clientIp) {
        return false;
      }
    }

    // Устанавливаем промокод как использованный и привязываем к пользователю
    await db
      .update(promocodes)
      .set({
        isUsed: true,
        usedAt: new Date(),
        userId: userId,
        usedFromIp: clientIp,
      })
      .where(eq(promocodes.id, promocode.id));

    // Обновляем пользователя - даем промо подписку на 24 часа
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await this.updateSubscription(userId, 'promo', expiresAt);
    
    return true;
  }

  // Вспомогательный метод для проверки использования промокодов
  async getUserPromocodeUsage(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(promocodes)
      .where(eq(promocodes.userId, userId));
    
    return result[0]?.count || 0;
  }

  // Проверка количества созданных промокодов с IP за определенный период
  async getPromocodeCreationCountByIp(ip: string, hoursBack: number): Promise<number> {
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - hoursBack);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(promocodes)
      .where(
        and(
          eq(promocodes.createdFromIp, ip),
          gte(promocodes.createdAt, timeThreshold)
        )
      );
    
    return result[0]?.count || 0;
  }

  // Проверка количества использованных промокодов с IP за определенный период
  async getPromocodeUsageCountByIp(ip: string, hoursBack: number): Promise<number> {
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - hoursBack);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(promocodes)
      .where(
        and(
          eq(promocodes.usedFromIp, ip),
          eq(promocodes.isUsed, true),
          gte(promocodes.usedAt, timeThreshold)
        )
      );
    
    return result[0]?.count || 0;
  }

  isPromocodeExpired(promocode: Promocode): boolean {
    return new Date() > promocode.expiresAt;
  }
}

export const storage = new DatabaseStorage();
