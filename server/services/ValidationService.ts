/**
 * Centralized validation service to replace scattered validation logic
 */
import { z } from 'zod';
import { ValidationError } from '../utils/errors';

export class ValidationService {
  /**
   * Validate coordinates string format
   */
  static validateCoordinates(coordinates: string): [number, number] {
    if (!coordinates || typeof coordinates !== 'string') {
      throw new ValidationError('Coordinates must be a valid string');
    }

    const coords = coordinates.split(',').map(coord => parseFloat(coord.trim()));
    
    if (coords.length !== 2 || coords.some(isNaN)) {
      throw new ValidationError('Coordinates must be in format "lat,lng"');
    }

    const [lat, lng] = coords;
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new ValidationError('Coordinates are out of valid range');
    }

    return [lat, lng];
  }

  /**
   * Validate positive integer ID
   */
  static validateId(id: string | number, fieldName: string = 'ID'): number {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (isNaN(numId) || numId <= 0) {
      throw new ValidationError(`${fieldName} must be a positive integer`);
    }
    
    return numId;
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: string | number, perPage?: string | number) {
    const pageNum = page ? (typeof page === 'string' ? parseInt(page, 10) : page) : 1;
    const perPageNum = perPage ? (typeof perPage === 'string' ? parseInt(perPage, 10) : perPage) : 20;
    
    if (pageNum < 1) {
      throw new ValidationError('Page must be greater than 0');
    }
    
    if (perPageNum < 1 || perPageNum > 100) {
      throw new ValidationError('Per page must be between 1 and 100');
    }
    
    return { page: pageNum, perPage: perPageNum };
  }

  /**
   * Validate price range
   */
  static validatePriceRange(minPrice?: string | number, maxPrice?: string | number) {
    const min = minPrice ? (typeof minPrice === 'string' ? parseFloat(minPrice) : minPrice) : undefined;
    const max = maxPrice ? (typeof maxPrice === 'string' ? parseFloat(maxPrice) : maxPrice) : undefined;
    
    if (min !== undefined && (isNaN(min) || min < 0)) {
      throw new ValidationError('Minimum price must be a non-negative number');
    }
    
    if (max !== undefined && (isNaN(max) || max < 0)) {
      throw new ValidationError('Maximum price must be a non-negative number');
    }
    
    if (min !== undefined && max !== undefined && min > max) {
      throw new ValidationError('Minimum price cannot be greater than maximum price');
    }
    
    return { minPrice: min, maxPrice: max };
  }

  /**
   * Validate area range
   */
  static validateAreaRange(minArea?: string | number, maxArea?: string | number) {
    const min = minArea ? (typeof minArea === 'string' ? parseFloat(minArea) : minArea) : undefined;
    const max = maxArea ? (typeof maxArea === 'string' ? parseFloat(maxArea) : maxArea) : undefined;
    
    if (min !== undefined && (isNaN(min) || min <= 0)) {
      throw new ValidationError('Minimum area must be a positive number');
    }
    
    if (max !== undefined && (isNaN(max) || max <= 0)) {
      throw new ValidationError('Maximum area must be a positive number');
    }
    
    if (min !== undefined && max !== undefined && min > max) {
      throw new ValidationError('Minimum area cannot be greater than maximum area');
    }
    
    return { minArea: min, maxArea: max };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): string {
    const emailSchema = z.string().email();
    try {
      return emailSchema.parse(email);
    } catch {
      throw new ValidationError('Invalid email format');
    }
  }

  /**
   * Validate phone number format (Russian format)
   */
  static validatePhoneNumber(phone: string): string {
    const phoneRegex = /^(?:\+7|8)[\s\-]?\(?(?:9\d{2}|[348]\d{2})\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/;
    
    if (!phoneRegex.test(phone)) {
      throw new ValidationError('Invalid phone number format');
    }
    
    return phone;
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string, maxLength: number = 255): string {
    if (typeof input !== 'string') {
      throw new ValidationError('Input must be a string');
    }
    
    const sanitized = input.trim();
    
    if (sanitized.length === 0) {
      throw new ValidationError('Input cannot be empty');
    }
    
    if (sanitized.length > maxLength) {
      throw new ValidationError(`Input cannot exceed ${maxLength} characters`);
    }
    
    return sanitized;
  }
}