import {
  regions,
  propertyClasses,
  properties,
  propertyAnalytics,
  investmentAnalytics,
  chatMessages,
  type Region,
  type PropertyClass,
  type Property,
  type PropertyAnalytics,
  type InvestmentAnalytics,
  type ChatMessage,
  type InsertRegion,
  type InsertPropertyClass,
  type InsertProperty,
  type InsertPropertyAnalytics,
  type InsertChatMessage,
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
}

export interface Pagination {
  page: number;
  perPage: number;
}

export interface PropertyWithRelations extends Property {
  region?: Region;
  propertyClass?: PropertyClass;
  analytics?: PropertyAnalytics;
  investmentAnalytics?: InvestmentAnalytics;
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
      ? await baseQuery.limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage)
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
      })
      .from(properties)
      .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
      .where(and(...conditions));

    const results = await query.limit(1000);

    return results.map(result => ({
      id: result.id,
      title: result.title,
      price: result.price,
      pricePerSqm: result.pricePerSqm || undefined,
      coordinates: result.coordinates!,
      propertyClass: result.propertyClassName || undefined,
      rooms: result.rooms || undefined,
      area: result.area?.toString() || undefined,
    }));
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
}

export const storage = new DatabaseStorage();
