import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Regions table
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  regionType: varchar("region_type", { length: 20 }).notNull(),
  coordinates: text("coordinates"), // PostGIS POINT stored as text for simplicity
  timezone: varchar("timezone", { length: 50 }).default("Europe/Moscow"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property classes table
export const propertyClasses = pgTable("property_classes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 20 }).notNull().unique(),
  minPricePerSqm: integer("min_price_per_sqm").notNull(),
  maxPricePerSqm: integer("max_price_per_sqm").notNull(),
  description: text("description"),
  criteria: jsonb("criteria"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Properties table
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 255 }).unique(),
  regionId: integer("region_id").references(() => regions.id),
  propertyClassId: integer("property_class_id").references(() => propertyClasses.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  pricePerSqm: integer("price_per_sqm"),
  area: decimal("area", { precision: 8, scale: 2 }),
  rooms: integer("rooms"),
  floor: integer("floor"),
  totalFloors: integer("total_floors"),
  address: varchar("address", { length: 500 }).notNull(),
  district: varchar("district", { length: 255 }),
  metroStation: varchar("metro_station", { length: 255 }),
  coordinates: text("coordinates"), // PostGIS POINT stored as text
  propertyType: varchar("property_type", { length: 50 }).default("apartment"),
  source: varchar("source", { length: 50 }).default("ads-api.ru"),
  url: varchar("url", { length: 1000 }),
  phone: varchar("phone", { length: 50 }),
  autoClassified: boolean("auto_classified").default(false),
  manualOverride: boolean("manual_override").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  regionIdx: index("idx_properties_region").on(table.regionId),
  classIdx: index("idx_properties_class").on(table.propertyClassId),
  priceIdx: index("idx_properties_price").on(table.price),
  activeIdx: index("idx_properties_active").on(table.isActive),
}));

// Property analytics table
export const propertyAnalytics = pgTable("property_analytics", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id),
  regionId: integer("region_id").references(() => regions.id),
  roi: decimal("roi", { precision: 5, scale: 2 }),
  liquidityScore: integer("liquidity_score"),
  investmentRating: varchar("investment_rating", { length: 10 }),
  priceGrowthRate: decimal("price_growth_rate", { precision: 5, scale: 2 }),
  marketTrend: varchar("market_trend", { length: 20 }),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

// Chat messages table for AI interactions
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const regionsRelations = relations(regions, ({ many }) => ({
  properties: many(properties),
}));

export const propertyClassesRelations = relations(propertyClasses, ({ many }) => ({
  properties: many(properties),
}));

export const propertiesRelations = relations(properties, ({ one }) => ({
  region: one(regions, {
    fields: [properties.regionId],
    references: [regions.id],
  }),
  propertyClass: one(propertyClasses, {
    fields: [properties.propertyClassId],
    references: [propertyClasses.id],
  }),
  analytics: one(propertyAnalytics, {
    fields: [properties.id],
    references: [propertyAnalytics.propertyId],
  }),
}));

export const propertyAnalyticsRelations = relations(propertyAnalytics, ({ one }) => ({
  property: one(properties, {
    fields: [propertyAnalytics.propertyId],
    references: [properties.id],
  }),
  region: one(regions, {
    fields: [propertyAnalytics.regionId],
    references: [regions.id],
  }),
}));

// Zod schemas
export const insertRegionSchema = createInsertSchema(regions);
export const selectRegionSchema = createSelectSchema(regions);

export const insertPropertyClassSchema = createInsertSchema(propertyClasses);
export const selectPropertyClassSchema = createSelectSchema(propertyClasses);

export const insertPropertySchema = createInsertSchema(properties);
export const selectPropertySchema = createSelectSchema(properties);

export const insertPropertyAnalyticsSchema = createInsertSchema(propertyAnalytics);
export const selectPropertyAnalyticsSchema = createSelectSchema(propertyAnalytics);

export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const selectChatMessageSchema = createSelectSchema(chatMessages);

// Types
export type Region = typeof regions.$inferSelect;
export type InsertRegion = typeof regions.$inferInsert;

export type PropertyClass = typeof propertyClasses.$inferSelect;
export type InsertPropertyClass = typeof propertyClasses.$inferInsert;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

export type PropertyAnalytics = typeof propertyAnalytics.$inferSelect;
export type InsertPropertyAnalytics = typeof propertyAnalytics.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
