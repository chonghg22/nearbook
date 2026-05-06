-- Step 02 post-migration:
-- drizzle-kit push 완료 후 1회 실행.
-- 위치 기반 도서관 검색 함수.

CREATE OR REPLACE FUNCTION nearbook.find_libraries_near(
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
    id, name, address, region, lat, lng,
    ST_Distance(
      location,
      ST_MakePoint(user_lng, user_lat)::geography
    ) AS distance_m
  FROM nearbook.libraries
  WHERE ST_DWithin(
    location,
    ST_MakePoint(user_lng, user_lat)::geography,
    radius_km * 1000
  )
  ORDER BY distance_m
  LIMIT limit_count;
$$ LANGUAGE SQL STABLE;