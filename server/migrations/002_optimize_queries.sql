-- Optimization for N+1 query problems
-- Add composite indexes for common filter combinations

CREATE INDEX IF NOT EXISTS idx_properties_region_class 
ON properties (region_id, property_class_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_properties_price_range 
ON properties (price, price_per_sqm) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_properties_rooms_area 
ON properties (rooms, area) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_properties_market_type 
ON properties (market_type, property_type) 
WHERE is_active = true;

-- Optimize analytics queries
CREATE INDEX IF NOT EXISTS idx_property_analytics_property_roi 
ON property_analytics (property_id, roi DESC) 
WHERE roi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_property_analytics_liquidity 
ON property_analytics (liquidity_score DESC) 
WHERE liquidity_score IS NOT NULL;

-- Add materialized view for frequently accessed property data
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_property_summary AS
SELECT 
  p.id,
  p.title,
  p.price,
  p.price_per_sqm,
  p.area,
  p.rooms,
  p.address,
  p.coordinates,
  p.location,
  p.property_type,
  p.market_type,
  p.is_active,
  r.name as region_name,
  pc.name as property_class_name,
  pa.roi,
  pa.liquidity_score,
  pa.investment_rating
FROM properties p
LEFT JOIN regions r ON p.region_id = r.id
LEFT JOIN property_classes pc ON p.property_class_id = pc.id
LEFT JOIN property_analytics pa ON p.id = pa.property_id
WHERE p.is_active = true;

-- Index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_property_summary_id 
ON mv_property_summary (id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_property_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_property_summary;
END;
$$ LANGUAGE plpgsql;