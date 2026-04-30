CREATE OR REPLACE FUNCTION find_libraries_near(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 5,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id INTEGER,
  name VARCHAR(128),
  address VARCHAR(256),
  region VARCHAR(64),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_m DOUBLE PRECISION
) AS $$
  SELECT
    l.id, l.name, l.address, l.region, l.lat, l.lng,
    ST_Distance(
      l.location,
      ST_MakePoint(user_lng, user_lat)::geography
    ) AS distance_m
  FROM libraries AS l
  WHERE ST_DWithin(
    l.location,
    ST_MakePoint(user_lng, user_lat)::geography,
    radius_km * 1000
  )
  ORDER BY distance_m
  LIMIT limit_count;
$$ LANGUAGE SQL STABLE;
