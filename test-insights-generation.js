import { generateInsightFromDataSources } from './server/services/perplexity.js';

async function testInsightsGeneration() {
  try {
    console.log('Testing insights generation service...');
    
    // Test data sources from the database
    const testSourceData = [
      {
        id: 1,
        name: "ЦИАН API",
        url: "https://www.cian.ru/",
        description: "Крупнейшая платформа недвижимости России",
        type: "api",
        status: "active"
      },
      {
        id: 2,
        name: "Авито Недвижимость", 
        url: "https://www.avito.ru/rossiya/nedvizhimost",
        description: "Популярная площадка объявлений о недвижимости",
        type: "scraping",
        status: "active"
      }
    ];

    const insight = await generateInsightFromDataSources(testSourceData);
    
    console.log('✅ Insights generation test successful!');
    console.log('Generated insight:');
    console.log('Title:', insight.title);
    console.log('Content length:', insight.content.length, 'characters');
    console.log('Tags:', insight.tags);
    console.log('Key insights:', insight.insights);
    
  } catch (error) {
    console.error('❌ Insights generation test failed:', error.message);
    return false;
  }
  
  return true;
}

testInsightsGeneration().then(success => {
  process.exit(success ? 0 : 1);
});