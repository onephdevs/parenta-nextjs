# Cursor prompt — Landing nearby map (weekly OSM cache)

Copy/paste into Cursor when changing nearby map behavior.

---

Implement / maintain the landing **What’s nearby** feature with these constraints:

## Goal
Show schools, markets, stores, parks, barber/salons, restaurants, malls, and hospitals around a selected apartment on the public landing page. Draw a street path from the apartment to a tapped place.

## API usage (critical)
- Call OpenStreetMap Overpass **at most once per building per refresh window**.
- **No cron job.** On each `GET /api/public/nearby`:
  1. Load `building_nearby_snapshots` for that building.
  2. If row exists and `now - fetched_at < nearby_refresh_days` (default **7**, from `app_settings`) and building lat/lng still match → return stored places (filter by requested category in app).
  3. Else → live Overpass fetch → upsert snapshot (`places` JSONB, `origin_latitude/longitude`, `fetched_at = now()`) → return.
- Admin force refresh: `POST /api/admin/nearby/refresh` (clears snapshot then refetches).

## Radius (do NOT use 100m)
100m is too tight for real PH neighborhoods (schools often 120m–1.1km; mall/hospital often 2–5km).

**Tiered radius + one expansion if fewer than 3 results:**

- **1km base** (expand to **2km** if &lt; 3): school, market, store, park, barber/salon, restaurant
- **3km base** (expand to **6km** if &lt; 3): mall, hospital

Implementation preference: one Overpass query at **6km**, then apply base/expand filters per category in TypeScript. Cap ~8 places per category, nearest first.

## Stack already in repo
- Geocode: Nominatim → persist `buildings.latitude/longitude`
- Places: Overpass → `src/lib/maps/nearby-amenities.ts` + `nearby-snapshot.ts`
- Routes: OSRM → `building_nearby_routes` via `/api/public/place-route`
- UI: `NearbyAmenitiesSection` + `NearbyMap` on landing
- Setting: Admin → Settings → System → “Refresh nearby places every (days)”

## UX rules
- Nearby | Commute segmented toggle (same tool, two modes).
- Category **icon grid** (4×2, all 8 visible) filters list + map pins (instant from DB snapshot).
- List ↔ map sync: selected row and pin share category color; map pans to the place. Other pins stay visible (dimmed). Street polyline only (no straight-line preview).
- Desktop sticky map beside the scrolling list. Mobile: View map overlay.
- Commute: From is the property (read-only); stacked walk / drive / transit, fastest first, Best marked.
- Apartment marker uses `/brand/logo-mark.png`; show Leaflet zoom controls.

## Out of scope
Google Places, Mapbox billing, cron schedulers, freeform trip planners.
