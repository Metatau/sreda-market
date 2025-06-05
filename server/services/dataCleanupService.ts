import { db } from '../db';
import { properties } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { PropertyValidationService } from './propertyValidationService';
import { storage } from '../storage';

export class DataCleanupService {
  private validationService = new PropertyValidationService();

  /**
   * Удаляет все объекты, не соответствующие критериям качества
   */
  async cleanupInvalidProperties(): Promise<{ removed: number; validated: number }> {
    console.log('Starting property cleanup validation...');
    
    // Получаем все активные объекты
    const allProperties = await storage.getProperties();
    const propertiesWithRelations = allProperties.properties;
    
    let removedCount = 0;
    let validatedCount = 0;

    for (const property of propertiesWithRelations) {
      validatedCount++;
      
      // Проверяем валидность объекта
      const isValid = await this.validationService.validateProperty(property);
      
      if (!isValid) {
        // Удаляем невалидный объект
        await this.removeProperty(property.id);
        removedCount++;
        console.log(`Removed invalid property ${property.id}: ${property.title}`);
      }
    }

    console.log(`Cleanup completed. Validated: ${validatedCount}, Removed: ${removedCount}`);
    
    return {
      removed: removedCount,
      validated: validatedCount
    };
  }

  /**
   * Удаляет объект из базы данных
   */
  private async removeProperty(propertyId: number): Promise<void> {
    try {
      // Удаляем связанные данные аналитики
      await db.delete(properties).where(eq(properties.id, propertyId));
    } catch (error) {
      console.error(`Error removing property ${propertyId}:`, error);
    }
  }

  /**
   * Показывает статистику качества данных
   */
  async getDataQualityStats(): Promise<{
    total: number;
    withImages: number;
    withoutImages: number;
    qualityScore: number;
  }> {
    const result = await db.execute(`
      SELECT 
        COUNT(*) as total_properties,
        COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as with_images,
        COUNT(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 END) as without_images
      FROM properties 
      WHERE is_active = true
    `);

    const stats = result.rows[0] as any;
    const total = parseInt(stats.total_properties);
    const withImages = parseInt(stats.with_images);
    const withoutImages = parseInt(stats.without_images);
    
    const qualityScore = total > 0 ? Math.round((withImages / total) * 100) : 0;

    return {
      total,
      withImages,
      withoutImages,
      qualityScore
    };
  }
}

export const dataCleanupService = new DataCleanupService();