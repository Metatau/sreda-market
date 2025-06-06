// Utility functions for handling property images

const DEFAULT_PROPERTY_IMAGES = [
  '/api/images/property-default-1.jpg',
  '/api/images/property-default-2.jpg', 
  '/api/images/property-default-3.jpg',
  '/api/images/property-default-4.jpg'
];

/**
 * Get property image URL with fallback to default images
 */
export function getPropertyImageUrl(property: { 
  id: number; 
  imageUrl?: string; 
  images?: string[];
  propertyType?: string;
}): string {
  // Priority 1: Use specific imageUrl if available
  if (property.imageUrl && isValidImageUrl(property.imageUrl)) {
    return property.imageUrl;
  }
  
  // Priority 2: Use first image from images array
  if (property.images && property.images.length > 0) {
    const validImage = property.images.find(img => isValidImageUrl(img));
    if (validImage) return validImage;
  }
  
  // Priority 3: Use property-type specific default or general default
  return getDefaultImageForPropertyType(property.propertyType) || 
         DEFAULT_PROPERTY_IMAGES[property.id % DEFAULT_PROPERTY_IMAGES.length];
}

/**
 * Check if image URL is valid and accessible
 */
function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Check if it's a valid URL format
  try {
    new URL(url);
    return true;
  } catch {
    // Check if it's a relative path
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
  }
}

/**
 * Get default image based on property type
 */
function getDefaultImageForPropertyType(propertyType?: string): string | null {
  const typeImages: Record<string, string> = {
    'apartment': '/api/images/apartment-default.jpg',
    'house': '/api/images/house-default.jpg', 
    'studio': '/api/images/studio-default.jpg',
    'penthouse': '/api/images/penthouse-default.jpg'
  };
  
  return propertyType ? typeImages[propertyType] || null : null;
}

/**
 * Generate property image gallery
 */
export function getPropertyImageGallery(property: {
  id: number;
  imageUrl?: string;
  images?: string[];
  propertyType?: string;
}): string[] {
  const images: string[] = [];
  
  // Add main image
  const mainImage = getPropertyImageUrl(property);
  images.push(mainImage);
  
  // Add additional images from property.images
  if (property.images && property.images.length > 0) {
    property.images.forEach(img => {
      if (isValidImageUrl(img) && !images.includes(img)) {
        images.push(img);
      }
    });
  }
  
  // Ensure we have at least 3 images for gallery
  while (images.length < 3) {
    const defaultImg = DEFAULT_PROPERTY_IMAGES[images.length % DEFAULT_PROPERTY_IMAGES.length];
    if (!images.includes(defaultImg)) {
      images.push(defaultImg);
    } else {
      break;
    }
  }
  
  return images.slice(0, 10); // Max 10 images
}

/**
 * Preload image to check if it exists
 */
export function preloadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/**
 * Get optimized image URL with size parameters
 */
export function getOptimizedImageUrl(
  originalUrl: string, 
  width?: number, 
  height?: number,
  quality = 80
): string {
  if (!originalUrl) return getPropertyImageUrl({ id: 0 });
  
  // If it's our API endpoint, add optimization parameters
  if (originalUrl.startsWith('/api/images/')) {
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    params.set('q', quality.toString());
    
    return `${originalUrl}?${params.toString()}`;
  }
  
  return originalUrl;
}