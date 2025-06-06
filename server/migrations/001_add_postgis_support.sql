-- Enable PostGIS extension for advanced geospatial functionality
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry columns for improved spatial queries
ALTER TABLE properties ADD COLUMN IF NOT EXISTS location GEOMETRY(POINT, 4326);

-- Create spatial index for performance
CREATE INDEX IF NOT EXISTS idx_properties_location 
ON properties USING GIST (location);

-- Update existing properties with geometry from coordinates text
UPDATE properties 
SET location = ST_SetSRID(ST_MakePoint(
  CAST(split_part(coordinates, ',', 2) AS DOUBLE PRECISION),
  CAST(split_part(coordinates, ',', 1) AS DOUBLE PRECISION)
), 4326)
WHERE coordinates IS NOT NULL 
  AND coordinates != '' 
  AND location IS NULL;

-- Add function to automatically update location when coordinates change
CREATE OR REPLACE FUNCTION update_property_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.coordinates IS NOT NULL AND NEW.coordinates != '' THEN
    NEW.location = ST_SetSRID(ST_MakePoint(
      CAST(split_part(NEW.coordinates, ',', 2) AS DOUBLE PRECISION),
      CAST(split_part(NEW.coordinates, ',', 1) AS DOUBLE PRECISION)
    ), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update location
DROP TRIGGER IF EXISTS tr_update_property_location ON properties;
CREATE TRIGGER tr_update_property_location
  BEFORE INSERT OR UPDATE OF coordinates ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_property_location();