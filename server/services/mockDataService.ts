import { storage } from '../storage';
import type { InsertProperty } from '../../shared/schema';

export class MockDataService {
  private mockProperties: Partial<InsertProperty>[] = [
    {
      externalId: "mock_1",
      regionId: 1, // Москва
      propertyClassId: 2,
      title: "Продам 2-комнатную квартиру в центре Москвы",
      description: "Просторная квартира в историческом центре. Высокие потолки, большие окна. Рядом метро.",
      price: 15500000,
      pricePerSqm: 250000,
      area: "62",
      rooms: 2,
      floor: 4,
      totalFloors: 8,
      address: "г. Москва, ул. Тверская, д. 15",
      coordinates: "POINT(37.6156 55.7558)",
      imageUrl: "https://via.placeholder.com/800x600/4285f4/ffffff?text=Квартира+в+Москве",
      images: ["https://via.placeholder.com/800x600/4285f4/ffffff?text=Гостиная", "https://via.placeholder.com/800x600/34a853/ffffff?text=Кухня"],
      propertyType: "квартира",
      marketType: "secondary",
      source: "demo-data",
      isActive: true
    },
    {
      externalId: "mock_2", 
      regionId: 2, // Санкт-Петербург
      propertyClassId: 3,
      title: "Продажа 3-комнатной квартиры на Невском проспекте",
      description: "Элитная квартира с видом на канал. Премиальная отделка, паркетные полы.",
      price: 22000000,
      pricePerSqm: 275000,
      area: "80",
      rooms: 3,
      floor: 6,
      totalFloors: 10,
      address: "г. Санкт-Петербург, Невский проспект, д. 42",
      coordinates: "POINT(30.3141 59.9311)",
      imageUrl: "https://via.placeholder.com/800x600/ea4335/ffffff?text=СПб+Квартира",
      images: ["https://via.placeholder.com/800x600/ea4335/ffffff?text=Зал", "https://via.placeholder.com/800x600/fbbc04/ffffff?text=Спальня"],
      propertyType: "квартира",
      marketType: "secondary",
      source: "demo-data",
      isActive: true
    },
    {
      externalId: "mock_3",
      regionId: 4, // Екатеринбург  
      propertyClassId: 1,
      title: "Продам 1-комнатную квартиру в новостройке",
      description: "Современная квартира в жилом комплексе. Готова к заселению. Развитая инфраструктура.",
      price: 4200000,
      pricePerSqm: 120000,
      area: "35",
      rooms: 1,
      floor: 12,
      totalFloors: 20,
      address: "г. Екатеринбург, ул. Ленина, д. 8",
      coordinates: "POINT(60.6057 56.8431)",
      imageUrl: "https://via.placeholder.com/800x600/9c27b0/ffffff?text=Екб+Студия",
      images: ["https://via.placeholder.com/800x600/9c27b0/ffffff?text=Комната", "https://via.placeholder.com/800x600/ff9800/ffffff?text=Кухня"],
      propertyType: "квартира",
      marketType: "new_construction",
      source: "demo-data",
      isActive: true
    }
  ];

  async loadDemoProperties(): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    try {
      console.log('Loading demo properties for testing...');
      
      for (const mockProperty of this.mockProperties) {
        try {
          // Проверяем что объект не существует
          const existingProperties = await storage.getProperties({});
          const exists = existingProperties.properties.some(p => p.externalId === mockProperty.externalId);
          
          if (!exists) {
            const propertyData: InsertProperty = {
              externalId: mockProperty.externalId!,
              regionId: mockProperty.regionId!,
              propertyClassId: mockProperty.propertyClassId!,
              title: mockProperty.title!,
              description: mockProperty.description!,
              price: mockProperty.price!,
              pricePerSqm: mockProperty.pricePerSqm!,
              area: mockProperty.area!,
              rooms: mockProperty.rooms!,
              floor: mockProperty.floor!,
              totalFloors: mockProperty.totalFloors!,
              address: mockProperty.address!,
              coordinates: mockProperty.coordinates!,
              imageUrl: mockProperty.imageUrl,
              images: mockProperty.images || [],
              propertyType: mockProperty.propertyType!,
              marketType: mockProperty.marketType as 'secondary' | 'new_construction',
              url: null,
              source: mockProperty.source!,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const newProperty = await storage.createProperty(propertyData);
            imported++;
            
            // Автоматически рассчитываем инвестиционный рейтинг
            try {
              const { schedulerService } = await import('./schedulerService');
              await schedulerService.calculatePropertyAnalytics(newProperty.id);
              console.log(`Investment analytics calculated for demo property ${newProperty.id}`);
            } catch (analyticsError) {
              console.error(`Failed to calculate analytics for demo property ${newProperty.id}:`, analyticsError);
            }
          }
        } catch (error) {
          console.error(`Error creating demo property:`, error);
          errors.push(`Demo property: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      console.log(`Demo data loading completed: ${imported} properties imported`);
    } catch (error) {
      console.error('Demo data loading failed:', error);
      errors.push(`Demo loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { imported, errors };
  }
}

export const mockDataService = new MockDataService();