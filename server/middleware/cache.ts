
import { Request, Response, NextFunction } from 'express';

export function cacheControl(maxAge: number = 300) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
}

export function etag(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  
  res.json = function(data) {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    
    res.setHeader('ETag', `"${hash}"`);
    
    if (req.headers['if-none-match'] === `"${hash}"`) {
      return res.status(304).end();
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}
