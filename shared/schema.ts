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
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['administrator', 'client']);

// Property market type enum
export const propertyMarketTypeEnum = pgEnum('property_market_type', ['secondary', 'new_construction']);

// Regions table
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  regionType: varchar("region_type", { length: 20 }).notNull(),
  coordinates: text("coordinates"), // Will migrate to geometry in next release
  timezone: varchar("timezone", { length: 50 }).default("Europe/Moscow"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("idx_regions_name").on(table.name),
  activeIdx: index("idx_regions_active").on(table.isActive),
}));

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
  marketType: propertyMarketTypeEnum("market_type").default("secondary"),
  source: varchar("source", { length: 50 }).default("ads-api.ru"),
  url: varchar("url", { length: 1000 }),
  phone: varchar("phone", { length: 50 }),
  imageUrl: varchar("image_url", { length: 1000 }),
  images: jsonb("images").$type<string[]>().default([]),
  totalArea: decimal("total_area", { precision: 8, scale: 2 }),
  livingArea: decimal("living_area", { precision: 8, scale: 2 }),
  kitchenArea: decimal("kitchen_area", { precision: 8, scale: 2 }),
  floorsTotal: integer("floors_total"),
  metroDistance: integer("metro_distance"), // distance in meters
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

// Property analytics table - расширенная версия
export const propertyAnalytics = pgTable("property_analytics", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id),
  regionId: integer("region_id").references(() => regions.id),
  roi: decimal("roi", { precision: 5, scale: 2 }),
  rentalYield: decimal("rental_yield", { precision: 5, scale: 2 }),
  appreciation: decimal("appreciation", { precision: 5, scale: 2 }),
  liquidityScore: integer("liquidity_score"),
  investmentScore: integer("investment_score"),
  investmentRating: varchar("investment_rating", { length: 20 }),
  priceGrowthRate: decimal("price_growth_rate", { precision: 5, scale: 2 }),
  marketTrend: varchar("market_trend", { length: 20 }),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Таблица исторических данных цен
export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id),
  price: integer("price").notNull(),
  pricePerSqm: integer("price_per_sqm"),
  dateRecorded: timestamp("date_recorded").notNull(),
  source: varchar("source", { length: 50 }).default("ads-api.ru"),
  marketConditions: jsonb("market_conditions"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  propertyDateIdx: index("idx_price_history_property_date").on(table.propertyId, table.dateRecorded),
}));

// Таблица региональных расходов
export const regionalCosts = pgTable("regional_costs", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").references(() => regions.id),
  propertyClassId: integer("property_class_id").references(() => propertyClasses.id),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }), // Ставка налога на имущество
  maintenanceCostPerSqm: integer("maintenance_cost_per_sqm"), // Расходы на содержание за кв.м
  utilityCostPerSqm: integer("utility_cost_per_sqm"), // Коммунальные за кв.м
  managementFeePercent: decimal("management_fee_percent", { precision: 4, scale: 2 }), // Комиссия УК в %
  insuranceCostPerSqm: integer("insurance_cost_per_sqm"), // Страховка за кв.м
  repairReservePercent: decimal("repair_reserve_percent", { precision: 4, scale: 2 }), // Резерв на ремонт в %
  year: integer("year").default(2024),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  regionClassIdx: index("idx_regional_costs_region_class").on(table.regionId, table.propertyClassId),
}));

// Таблица инвестиционной аналитики
export const investmentAnalytics = pgTable("investment_analytics", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id),
  
  // Динамика цены
  priceChange1y: decimal("price_change_1y", { precision: 5, scale: 2 }), // Изменение цены за год в %
  priceChange3m: decimal("price_change_3m", { precision: 5, scale: 2 }), // За 3 месяца в %
  priceVolatility: decimal("price_volatility", { precision: 5, scale: 2 }), // Волатильность цены
  
  // Сценарий аренды
  rentalYield: decimal("rental_yield", { precision: 8, scale: 2 }), // Рентабельность аренды в %
  rentalIncomeMonthly: integer("rental_income_monthly"), // Ежемесячный доход
  rentalRoiAnnual: decimal("rental_roi_annual", { precision: 8, scale: 2 }), // ROI аренды годовой
  rentalPaybackYears: decimal("rental_payback_years", { precision: 8, scale: 2 }), // Срок окупаемости
  
  // Сценарий флиппинга
  flipPotentialProfit: integer("flip_potential_profit"), // Потенциальная прибыль
  flipRoi: decimal("flip_roi", { precision: 5, scale: 2 }), // ROI флиппинга
  flipTimeframeMonths: integer("flip_timeframe_months"), // Срок реализации
  renovationCostEstimate: integer("renovation_cost_estimate"), // Оценка затрат на ремонт
  
  // Сценарий "тихая гавань"
  safeHavenScore: integer("safe_haven_score"), // 1-10
  capitalPreservationIndex: decimal("capital_preservation_index", { precision: 5, scale: 2 }),
  liquidityScore: integer("liquidity_score"), // 1-10
  
  // Прогноз на 3 года
  priceForecast3y: decimal("price_forecast_3y", { precision: 5, scale: 2 }), // Прогноз роста цены
  infrastructureImpactScore: decimal("infrastructure_impact_score", { precision: 3, scale: 2 }), // Влияние инфраструктуры
  developmentRiskScore: decimal("development_risk_score", { precision: 3, scale: 2 }), // Риск новой застройки
  
  // Комплексные метрики
  investmentRating: varchar("investment_rating", { length: 10 }), // A+, A, B+, B, C+, C
  riskLevel: varchar("risk_level", { length: 20 }), // low, moderate, high
  recommendedStrategy: varchar("recommended_strategy", { length: 50 }), // rental, flip, hold
  
  calculatedAt: timestamp("calculated_at").defaultNow(),
  expiresAt: timestamp("expires_at").defaultNow(),
}, (table) => ({
  propertyIdx: index("idx_investment_analytics_property").on(table.propertyId),
  calculatedIdx: index("idx_investment_analytics_calculated").on(table.calculatedAt),
}));

// Таблица инфраструктурных проектов
export const infrastructureProjects = pgTable("infrastructure_projects", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").references(() => regions.id),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  projectType: varchar("project_type", { length: 100 }), // метро, дорога, школа, ТЦ и т.д.
  coordinates: text("coordinates"), // POINT coordinates
  impactRadius: integer("impact_radius"), // Радиус влияния в метрах
  completionDate: timestamp("completion_date"),
  investmentAmount: decimal("investment_amount", { precision: 15, scale: 2 }),
  impactCoefficient: decimal("impact_coefficient", { precision: 3, scale: 2 }), // Коэффициент влияния на цены
  status: varchar("status", { length: 50 }).default("planned"),
}, (table) => ({
  regionIdx: index("idx_infrastructure_projects_region").on(table.regionId),
  statusIdx: index("idx_infrastructure_projects_status").on(table.status),
}));

// Chat messages table for AI interactions
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  role: userRoleEnum("role").default('client').notNull(),
  telegramId: varchar("telegram_id", { length: 50 }).unique(),
  telegramHandle: varchar("telegram_handle", { length: 100 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  referralCode: varchar("referral_code", { length: 50 }).notNull().unique(),
  referredBy: integer("referred_by"),
  bonusBalance: decimal("bonus_balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  subscriptionType: varchar("subscription_type", { length: 50 }),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  aiQueriesUsed: integer("ai_queries_used").default(0).notNull(),
  lastAiQueryReset: timestamp("last_ai_query_reset").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const referralEarnings = pgTable("referral_earnings", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => users.id).notNull(),
  referredUserId: integer("referred_user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  subscriptionType: varchar("subscription_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bonusTransactions = pgTable("bonus_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'earned', 'spent'
  description: text("description").notNull(),
  referralEarningId: integer("referral_earning_id").references(() => referralEarnings.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Promocodes table
export const promocodes = pgTable("promocodes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  isUsed: boolean("is_used").default(false).notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdFromIp: varchar("created_from_ip", { length: 45 }), // IPv4/IPv6
  usedFromIp: varchar("used_from_ip", { length: 45 }), // IPv4/IPv6
}, (table) => ({
  codeIdx: index("idx_promocodes_code").on(table.code),
  userIdx: index("idx_promocodes_user").on(table.userId),
  createdIpIdx: index("idx_promocodes_created_ip").on(table.createdFromIp),
  usedIpIdx: index("idx_promocodes_used_ip").on(table.usedFromIp),
}));

// Favorites table
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userPropertyIdx: index("idx_favorites_user_property").on(table.userId, table.propertyId),
  userIdx: index("idx_favorites_user").on(table.userId),
  propertyIdx: index("idx_favorites_property").on(table.propertyId),
}));

// Relations
export const regionsRelations = relations(regions, ({ many }) => ({
  properties: many(properties),
  regionalCosts: many(regionalCosts),
  infrastructureProjects: many(infrastructureProjects),
}));

export const propertyClassesRelations = relations(propertyClasses, ({ many }) => ({
  properties: many(properties),
  regionalCosts: many(regionalCosts),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
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
  investmentAnalytics: one(investmentAnalytics, {
    fields: [properties.id],
    references: [investmentAnalytics.propertyId],
  }),
  priceHistory: many(priceHistory),
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

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  property: one(properties, {
    fields: [priceHistory.propertyId],
    references: [properties.id],
  }),
}));

export const regionalCostsRelations = relations(regionalCosts, ({ one }) => ({
  region: one(regions, {
    fields: [regionalCosts.regionId],
    references: [regions.id],
  }),
  propertyClass: one(propertyClasses, {
    fields: [regionalCosts.propertyClassId],
    references: [propertyClasses.id],
  }),
}));

export const investmentAnalyticsRelations = relations(investmentAnalytics, ({ one }) => ({
  property: one(properties, {
    fields: [investmentAnalytics.propertyId],
    references: [properties.id],
  }),
}));

export const infrastructureProjectsRelations = relations(infrastructureProjects, ({ one }) => ({
  region: one(regions, {
    fields: [infrastructureProjects.regionId],
    references: [regions.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  referrer: one(users, {
    fields: [users.referredBy],
    references: [users.id],
  }),
  referrals: many(users),
  referralEarnings: many(referralEarnings),
  bonusTransactions: many(bonusTransactions),
}));

export const referralEarningsRelations = relations(referralEarnings, ({ one, many }) => ({
  referrer: one(users, {
    fields: [referralEarnings.referrerId],
    references: [users.id],
  }),
  referredUser: one(users, {
    fields: [referralEarnings.referredUserId],
    references: [users.id],
  }),
  bonusTransactions: many(bonusTransactions),
}));

export const bonusTransactionsRelations = relations(bonusTransactions, ({ one }) => ({
  user: one(users, {
    fields: [bonusTransactions.userId],
    references: [users.id],
  }),
  referralEarning: one(referralEarnings, {
    fields: [bonusTransactions.referralEarningId],
    references: [referralEarnings.id],
  }),
}));

export const promocodesRelations = relations(promocodes, ({ one }) => ({
  user: one(users, {
    fields: [promocodes.userId],
    references: [users.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [favorites.propertyId],
    references: [properties.id],
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

export const insertPriceHistorySchema = createInsertSchema(priceHistory);
export const selectPriceHistorySchema = createSelectSchema(priceHistory);

export const insertRegionalCostsSchema = createInsertSchema(regionalCosts);
export const selectRegionalCostsSchema = createSelectSchema(regionalCosts);

export const insertInvestmentAnalyticsSchema = createInsertSchema(investmentAnalytics);
export const selectInvestmentAnalyticsSchema = createSelectSchema(investmentAnalytics);

export const insertInfrastructureProjectsSchema = createInsertSchema(infrastructureProjects);
export const selectInfrastructureProjectsSchema = createSelectSchema(infrastructureProjects);

export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const selectChatMessageSchema = createSelectSchema(chatMessages);

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertReferralEarningSchema = createInsertSchema(referralEarnings);
export const selectReferralEarningSchema = createSelectSchema(referralEarnings);

export const insertBonusTransactionSchema = createInsertSchema(bonusTransactions);
export const selectBonusTransactionSchema = createSelectSchema(bonusTransactions);

export const insertPromocodeSchema = createInsertSchema(promocodes);
export const selectPromocodeSchema = createSelectSchema(promocodes);

export const insertFavoriteSchema = createInsertSchema(favorites);
export const selectFavoriteSchema = createSelectSchema(favorites);

// Types
export type Region = typeof regions.$inferSelect;
export type InsertRegion = typeof regions.$inferInsert;

export type PropertyClass = typeof propertyClasses.$inferSelect;
export type InsertPropertyClass = typeof propertyClasses.$inferInsert;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

export type PropertyAnalytics = typeof propertyAnalytics.$inferSelect;
export type InsertPropertyAnalytics = typeof propertyAnalytics.$inferInsert;

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

export type RegionalCosts = typeof regionalCosts.$inferSelect;
export type InsertRegionalCosts = typeof regionalCosts.$inferInsert;

export type InvestmentAnalytics = typeof investmentAnalytics.$inferSelect;
export type InsertInvestmentAnalytics = typeof investmentAnalytics.$inferInsert;

export type InfrastructureProject = typeof infrastructureProjects.$inferSelect;
export type InsertInfrastructureProject = typeof infrastructureProjects.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type ReferralEarning = typeof referralEarnings.$inferSelect;
export type InsertReferralEarning = typeof referralEarnings.$inferInsert;

export type BonusTransaction = typeof bonusTransactions.$inferSelect;
export type InsertBonusTransaction = typeof bonusTransactions.$inferInsert;

export type Promocode = typeof promocodes.$inferSelect;
export type InsertPromocode = typeof promocodes.$inferInsert;

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

// Insights table for analytical notes
export const insights = pgTable("insights", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  summary: text("summary").notNull(),
  publishDate: timestamp("publish_date").defaultNow().notNull(),
  tags: varchar("tags", { length: 255 }).array().default([]),
  readTime: integer("read_time").default(5),
  sources: varchar("sources", { length: 255 }).array().default([]),
  chartData: jsonb("chart_data"),
  isPublished: boolean("is_published").default(true),
  authorId: integer("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  publishDateIdx: index("idx_insights_publish_date").on(table.publishDate),
  isPublishedIdx: index("idx_insights_published").on(table.isPublished),
  tagsIdx: index("idx_insights_tags").on(table.tags),
}));

export type Insight = typeof insights.$inferSelect;
export type InsertInsight = typeof insights.$inferInsert;

// Data sources table for admin management
export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // telegram_channel, website, rss_feed, uploaded_file, etc.
  config: jsonb("config").notNull(), // source-specific configuration
  tags: varchar("tags", { length: 255 }).array().default([]),
  isActive: boolean("is_active").default(true),
  frequency: varchar("frequency", { length: 20 }).default('daily'), // hourly, daily, weekly
  lastUpdated: timestamp("last_updated"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("idx_data_sources_name").on(table.name),
  typeIdx: index("idx_data_sources_type").on(table.type),
  isActiveIdx: index("idx_data_sources_active").on(table.isActive),
}));

export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = typeof dataSources.$inferInsert;

// Composite types with relations
export type PropertyWithRelations = Property & {
  region?: Region;
  propertyClass?: PropertyClass;
  analytics?: PropertyAnalytics;
  investmentAnalytics?: InvestmentAnalytics;
};
