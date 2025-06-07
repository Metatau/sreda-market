interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
}

interface RegionCoordinates {
  id: number;
  name: string;
  coordinates: [number, number];
}

// Russian city coordinates
const RUSSIAN_CITIES: RegionCoordinates[] = [
  { id: 1, name: "Москва", coordinates: [55.7558, 37.6176] },
  { id: 2, name: "Санкт-Петербург", coordinates: [59.9311, 30.3609] },
  { id: 3, name: "Новосибирск", coordinates: [55.0084, 82.9357] },
  { id: 4, name: "Екатеринбург", coordinates: [56.8431, 60.6454] },
  { id: 5, name: "Нижний Новгород", coordinates: [56.2965, 43.9361] },
  { id: 6, name: "Казань", coordinates: [55.8304, 49.0661] },
  { id: 7, name: "Челябинск", coordinates: [55.1644, 61.4368] },
  { id: 8, name: "Омск", coordinates: [54.9884, 73.3242] },
  { id: 9, name: "Самара", coordinates: [53.2001, 50.15] },
  { id: 10, name: "Ростов-на-Дону", coordinates: [47.2357, 39.7015] },
  { id: 11, name: "Уфа", coordinates: [54.7388, 55.9721] },
  { id: 12, name: "Красноярск", coordinates: [56.0184, 92.8672] },
  { id: 13, name: "Воронеж", coordinates: [51.6720, 39.1843] },
  { id: 14, name: "Пермь", coordinates: [58.0105, 56.2502] },
  { id: 15, name: "Волгоград", coordinates: [48.7080, 44.5133] }
];

export class GeolocationService {
  private static instance: GeolocationService;
  private userLocation: GeolocationCoordinates | null = null;
  private nearestCity: RegionCoordinates | null = null;

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  async getUserLocation(): Promise<GeolocationCoordinates | null> {
    if (this.userLocation) {
      return this.userLocation;
    }

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          resolve(this.userLocation);
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  getRegionCoordinates(regionId: number): [number, number] | null {
    const region = RUSSIAN_CITIES.find(city => city.id === regionId);
    return region ? region.coordinates : null;
  }

  getRegionCoordinatesByName(regionName: string): [number, number] | null {
    const region = RUSSIAN_CITIES.find(city => 
      city.name.toLowerCase().includes(regionName.toLowerCase()) ||
      regionName.toLowerCase().includes(city.name.toLowerCase())
    );
    return region ? region.coordinates : null;
  }

  async getNearestCity(): Promise<RegionCoordinates | null> {
    if (this.nearestCity) {
      return this.nearestCity;
    }

    const userLocation = await this.getUserLocation();
    if (!userLocation) {
      // Default to Moscow if no geolocation
      this.nearestCity = RUSSIAN_CITIES[0];
      return this.nearestCity;
    }

    let nearestCity = RUSSIAN_CITIES[0];
    let minDistance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      nearestCity.coordinates[0],
      nearestCity.coordinates[1]
    );

    for (const city of RUSSIAN_CITIES) {
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        city.coordinates[0],
        city.coordinates[1]
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    }

    this.nearestCity = nearestCity;
    return this.nearestCity;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  getAllCities(): RegionCoordinates[] {
    return RUSSIAN_CITIES;
  }
}

export const geolocationService = GeolocationService.getInstance();