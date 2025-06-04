import { storage } from "../storage";

export class DailyUpdateService {
  private updateInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startDailyUpdates();
  }

  private startDailyUpdates() {
    // Run immediately on startup
    this.performDailyUpdate();
    
    // Schedule daily updates at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Set timeout for first midnight update
    setTimeout(() => {
      this.performDailyUpdate();
      
      // Then set interval for daily updates
      this.updateInterval = setInterval(() => {
        this.performDailyUpdate();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntilMidnight);
    
    console.log(`Daily updates scheduled. Next update in ${Math.round(timeUntilMidnight / (1000 * 60 * 60))} hours`);
  }

  private async performDailyUpdate() {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Performing daily properties update...`);
      
      // Calculate new properties count for the last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const totalNewProperties = await storage.getNewPropertiesCount(twentyFourHoursAgo);
      
      console.log(`[${timestamp}] Daily update completed. New properties in last 24h: ${totalNewProperties}`);
      
      // Here you could store the daily statistics in a separate table if needed
      // For now, we rely on real-time calculation from the database
      
    } catch (error) {
      console.error("Error during daily update:", error);
    }
  }

  public async getUpdateStatus() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const newPropertiesCount = await storage.getNewPropertiesCount(twentyFourHoursAgo);
    
    return {
      lastUpdate: new Date().toISOString(),
      newPropertiesLast24h: newPropertiesCount,
      updateFrequency: "daily",
      nextUpdate: this.getNextUpdateTime()
    };
  }

  private getNextUpdateTime(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return tomorrow.toISOString();
  }

  public stopDailyUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log("Daily updates stopped");
    }
  }
}

export const dailyUpdateService = new DailyUpdateService();