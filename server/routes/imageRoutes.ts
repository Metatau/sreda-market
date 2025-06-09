import { Router } from 'express';
import { storage } from '../storage';
import path from 'path';
import fs from 'fs';

const router = Router();

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Image Service',
      endpoints: [
        'GET /properties/:id/image - Get property image'
      ],
      status: 'active'
    }
  });
});

// Default property images
const DEFAULT_IMAGES = [
  'property-default-1.jpg',
  'property-default-2.jpg', 
  'property-default-3.jpg',
  'property-default-4.jpg'
];

// Serve property images
router.get('/properties/:id/image', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    
    if (isNaN(propertyId)) {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    // Get property from database
    const property = await storage.getProperty(propertyId);
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Use property's imageUrl if available
    if (property.imageUrl) {
      return res.redirect(property.imageUrl);
    }

    // Use first image from images array
    if (property.images && property.images.length > 0) {
      return res.redirect(property.images[0]);
    }

    // Fall back to default image based on property ID
    const defaultImage = DEFAULT_IMAGES[propertyId % DEFAULT_IMAGES.length];
    return res.redirect(`/api/images/${defaultImage}`);
    
  } catch (error) {
    console.error('Error serving property image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Serve default images
router.get('/images/:filename', (req, res) => {
  const { filename } = req.params;
  
  // Validate filename to prevent directory traversal
  if (!filename.match(/^[a-zA-Z0-9-_.]+\.(jpg|jpeg|png|webp)$/)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const imagePath = path.join(process.cwd(), 'assets', 'images', filename);
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    // Return a simple 1x1 pixel placeholder
    const placeholder = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(placeholder);
  }

  // Set appropriate headers
  res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
  res.sendFile(imagePath);
});

export { router as imageRoutes };