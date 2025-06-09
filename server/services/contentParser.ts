import Parser from 'rss-parser';
import TelegramBot from 'node-telegram-bot-api';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { db } from '../db';
import { dataSources } from '../../shared/schema';
import { eq, and, gte } from 'drizzle-orm';

interface ParsedContent {
  title: string;
  content: string;
  summary: string;
  publishedAt: Date;
  sourceUrl?: string;
  author?: string;
  tags: string[];
  type: 'article' | 'news' | 'analysis' | 'report';
}

interface SourceSyncResult {
  sourceId: number;
  sourceName: string;
  itemsFound: number;
  itemsProcessed: number;
  errors: string[];
}

export class ContentParser {
  private rssParser: Parser;
  private telegramBot?: TelegramBot;

  constructor() {
    this.rssParser = new Parser({
      customFields: {
        feed: ['language', 'category'],
        item: ['category', 'media:content', 'enclosure']
      }
    });

    // Initialize Telegram bot if token is available
    if (process.env.TELEGRAM_BOT_TOKEN) {
      this.telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    }
  }

  async syncAllSources(): Promise<SourceSyncResult[]> {
    const activeSources = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.isActive, true));

    const results: SourceSyncResult[] = [];

    for (const source of activeSources) {
      try {
        const result = await this.syncSource(source);
        results.push(result);
      } catch (error) {
        console.error(`Error syncing source ${source.name}:`, error);
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          itemsFound: 0,
          itemsProcessed: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    return results;
  }

  private async syncSource(source: any): Promise<SourceSyncResult> {
    const result: SourceSyncResult = {
      sourceId: source.id,
      sourceName: source.name,
      itemsFound: 0,
      itemsProcessed: 0,
      errors: []
    };

    try {
      let parsedItems: ParsedContent[] = [];

      switch (source.type) {
        case 'rss_feed':
          parsedItems = await this.parseRSSFeed(source);
          break;
        case 'telegram_channel':
          parsedItems = await this.parseTelegramChannel(source);
          break;
        case 'website':
          parsedItems = await this.parseWebsite(source);
          break;
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }

      result.itemsFound = parsedItems.length;

      // Filter new items based on lastUpdated
      const lastSync = source.lastUpdated ? new Date(source.lastUpdated) : new Date(0);
      const newItems = parsedItems.filter(item => item.publishedAt > lastSync);

      // Process each new item
      for (const item of newItems) {
        try {
          await this.processContentItem(item, source);
          result.itemsProcessed++;
        } catch (error) {
          result.errors.push(`Failed to process item "${item.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update source lastUpdated timestamp
      await db
        .update(dataSources)
        .set({ lastUpdated: new Date() })
        .where(eq(dataSources.id, source.id));

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  private async parseRSSFeed(source: any): Promise<ParsedContent[]> {
    const config = source.config || {};
    const feedUrl = config.rssUrl || config.url;

    if (!feedUrl) {
      throw new Error('RSS URL not configured');
    }

    const feed = await this.rssParser.parseURL(feedUrl);
    const items: ParsedContent[] = [];

    for (const item of feed.items) {
      if (!item.title || !item.pubDate) continue;

      // Extract content
      let content = item.content || item.contentSnippet || item.summary || '';
      let summary = item.contentSnippet || '';

      // Clean HTML if present
      if (content.includes('<')) {
        const $ = cheerio.load(content);
        content = $.text().trim();
      }

      // Generate summary if not available
      if (!summary && content) {
        summary = content.slice(0, 300) + (content.length > 300 ? '...' : '');
      }

      // Extract tags from categories
      const tags = [
        ...(item.categories || []),
        ...(source.tags || []),
        this.extractTagsFromContent(item.title + ' ' + content)
      ].filter(Boolean);

      // Determine content type
      const type = this.determineContentType(item.title, content, tags);

      items.push({
        title: item.title,
        content,
        summary,
        publishedAt: new Date(item.pubDate),
        sourceUrl: item.link,
        author: item.creator || item.author,
        tags: [...new Set(tags)], // Remove duplicates
        type
      });
    }

    return items;
  }

  private async parseTelegramChannel(source: any): Promise<ParsedContent[]> {
    if (!this.telegramBot) {
      throw new Error('Telegram bot not configured');
    }

    const config = source.config || {};
    const channelId = config.channelId || config.username;

    if (!channelId) {
      throw new Error('Telegram channel ID not configured');
    }

    // Get recent messages from channel
    const updates = await this.telegramBot.getUpdates({
      offset: config.lastMessageId || 0,
      limit: 100
    });

    const items: ParsedContent[] = [];

    for (const update of updates) {
      const message = update.message;
      if (!message || !message.text || !message.date) continue;

      // Skip if message is from different chat
      if (message.chat.id.toString() !== channelId.toString()) continue;

      const content = message.text;
      const summary = content.slice(0, 200) + (content.length > 200 ? '...' : '');
      
      // Extract hashtags as tags
      const hashtagMatches = content.match(/#\w+/g) || [];
      const tags = [
        ...hashtagMatches.map(tag => tag.slice(1)),
        ...(source.tags || []),
        this.extractTagsFromContent(content)
      ].filter(Boolean);

      // Generate title from first line or summary
      const title = content.split('\n')[0].slice(0, 100) || `Сообщение от ${message.date}`;

      items.push({
        title,
        content,
        summary,
        publishedAt: new Date(message.date * 1000),
        author: message.from?.username || message.chat.title,
        tags: [...new Set(tags)],
        type: this.determineContentType(title, content, tags)
      });
    }

    return items;
  }

  private async parseWebsite(source: any): Promise<ParsedContent[]> {
    const config = source.config || {};
    const websiteUrl = config.websiteUrl || config.url;

    if (!websiteUrl) {
      throw new Error('Website URL not configured');
    }

    try {
      const response = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SREDA-MARKET-BOT/1.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html, { url: websiteUrl });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        throw new Error('Could not extract readable content from website');
      }

      // Extract tags from meta keywords and content
      const $ = cheerio.load(html);
      const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
      const tags = [
        ...metaKeywords.split(',').map(k => k.trim()).filter(Boolean),
        ...(source.tags || []),
        this.extractTagsFromContent(article.title + ' ' + article.textContent)
      ].filter(Boolean);

      return [{
        title: article.title || 'Untitled',
        content: article.textContent || '',
        summary: article.excerpt || article.textContent?.slice(0, 300) + '...' || '',
        publishedAt: new Date(), // Use current date for websites
        sourceUrl: websiteUrl,
        tags: [...new Set(tags)],
        type: this.determineContentType(article.title || '', article.textContent || '', tags)
      }];

    } catch (error) {
      throw new Error(`Failed to parse website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractTagsFromContent(text: string): string[] {
    const keywords = [
      'недвижимость', 'инвестиции', 'москва', 'спб', 'квартира', 'дом',
      'ипотека', 'новостройка', 'вторичка', 'коммерческая', 'офис',
      'аналитика', 'прогноз', 'рынок', 'цены', 'тренд', 'девелопер',
      'жк', 'метро', 'район', 'локация', 'доходность', 'ликвидность'
    ];

    const foundTags = [];
    const lowerText = text.toLowerCase();

    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        foundTags.push(keyword);
      }
    }

    return foundTags;
  }

  private determineContentType(title: string, content: string, tags: string[]): 'article' | 'news' | 'analysis' | 'report' {
    const text = (title + ' ' + content).toLowerCase();
    
    if (text.includes('анализ') || text.includes('исследование') || tags.includes('аналитика')) {
      return 'analysis';
    }
    
    if (text.includes('отчет') || text.includes('статистика') || text.includes('данные')) {
      return 'report';
    }
    
    if (text.includes('новости') || text.includes('сегодня') || text.includes('вчера')) {
      return 'news';
    }
    
    return 'article';
  }

  private async processContentItem(item: ParsedContent, source: any): Promise<void> {
    // Here you could save to database, generate insights, etc.
    console.log(`Processing content item: ${item.title} from ${source.name}`);
    
    // Example: Save raw content for later processing
    // await this.saveRawContent(item, source);
    
    // Example: Generate insights using Perplexity
    // await this.generateInsightsFromContent(item, source);
  }
}

export const contentParser = new ContentParser();