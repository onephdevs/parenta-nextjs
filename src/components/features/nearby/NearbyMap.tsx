'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  ZoomControl,
  ScaleControl,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  CATEGORY_COLORS,
  type NearbyPlace,
} from '@/lib/maps/nearby-amenities';

import 'leaflet/dist/leaflet.css';

/** Apartment pin — Alfonso house mark from /public/brand/logo-mark.png */
const homeIcon = L.divIcon({
  className: 'nearby-home-marker',
  html: `
    <div style="
      width:44px;height:44px;border-radius:12px;
      background:#fff;border:2px solid #fff;
      box-shadow:0 2px 10px rgba(17,24,39,.35);
      overflow:hidden;display:flex;align-items:center;justify-center;
    ">
      <img
        src="/brand/logo-mark.png"
        alt=""
        width="44"
        height="44"
        style="display:block;width:44px;height:44px;object-fit:cover;"
        draggable="false"
      />
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -40],
});

function makePlaceIcon(color: string, selected: boolean): L.DivIcon {
  if (selected) {
    return L.divIcon({
      className: 'nearby-place-marker',
      html: `<div style="
        width:26px;height:26px;border-radius:50%;
        background:${color};border:3px solid #fff;
        box-shadow:0 2px 10px rgba(17,24,39,.4);
      "></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
  }
  return L.divIcon({
    className: 'nearby-place-marker',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:#fff;border:3px solid ${color};
      box-shadow:0 1px 4px rgba(17,24,39,.28);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function makeDestinationIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'nearby-dest-marker',
    html: `<div style="
      width:18px;height:18px;border-radius:50% 50% 50% 0;
      background:${color};border:2px solid #fff;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(17,24,39,.35);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
  });
}

const placeIcons = (() => {
  const map: Record<string, L.DivIcon> = {};
  for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
    map[`${cat}-0`] = makePlaceIcon(color, false);
    map[`${cat}-1`] = makePlaceIcon(color, true);
  }
  return map;
})();

function LocateHomeControl({
  home,
  onLocate,
}: {
  home: { latitude: number; longitude: number };
  onLocate?: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const container = L.DomUtil.create(
          'div',
          'leaflet-bar leaflet-control nearby-locate-control'
        );
        const button = L.DomUtil.create('a', '', container) as HTMLAnchorElement;
        button.href = '#';
        button.title = 'Locate apartment';
        button.setAttribute('aria-label', 'Locate apartment');
        button.role = 'button';
        button.innerHTML = `
          <span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#111827;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3"/>
              <path d="M12 19v3"/>
              <path d="M2 12h3"/>
              <path d="M19 12h3"/>
            </svg>
          </span>
        `;
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(button, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          onLocate?.();
          map.flyTo([home.latitude, home.longitude], Math.max(map.getZoom(), 17), {
            duration: 0.55,
          });
        });
        return container;
      },
    });

    const control = new Control({ position: 'bottomright' });
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [map, home.latitude, home.longitude, onLocate]);

  return null;
}

function InvalidateSize({ tick }: { tick: number }) {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => {
      map.invalidateSize({ animate: false });
    };
    const t1 = window.setTimeout(invalidate, 60);
    const t2 = window.setTimeout(invalidate, 320);
    const container = map.getContainer();
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => invalidate())
        : null;
    ro?.observe(container);
    window.addEventListener('resize', invalidate);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      window.removeEventListener('resize', invalidate);
    };
  }, [map, tick]);
  return null;
}

function MapViewport({
  home,
  places,
  selectedPlaceId,
  routeCoordinates,
  destination,
}: {
  home: { latitude: number; longitude: number };
  places: NearbyPlace[];
  selectedPlaceId: string | null;
  routeCoordinates: [number, number][] | null;
  destination: { latitude: number; longitude: number } | null;
}) {
  const map = useMap();
  const prevSelected = useRef<string | null>(null);

  useEffect(() => {
    map.invalidateSize();

    const streetPath =
      routeCoordinates && routeCoordinates.length >= 2 ? routeCoordinates : null;

    if (streetPath) {
      const bounds = L.latLngBounds(streetPath);
      const diagonalM = map.distance(bounds.getSouthWest(), bounds.getNorthEast());
      const maxZoom = diagonalM < 120 ? 19 : diagonalM < 400 ? 18 : 16;
      map.fitBounds(bounds, { padding: [56, 56], maxZoom, animate: true });
      prevSelected.current = selectedPlaceId;
      return;
    }

    const destLat = destination?.latitude;
    const destLng = destination?.longitude;
    if (destLat != null && destLng != null) {
      const bounds = L.latLngBounds(
        [home.latitude, home.longitude],
        [destLat, destLng]
      );
      map.fitBounds(bounds, { padding: [64, 64], maxZoom: 15, animate: true });
      return;
    }

    const selected = selectedPlaceId
      ? places.find((p) => p.id === selectedPlaceId)
      : null;

    if (selected) {
      const justSelected = prevSelected.current !== selected.id;
      prevSelected.current = selected.id;
      if (justSelected) {
        map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 16), {
          duration: 0.55,
        });
      }
      return;
    }

    prevSelected.current = null;
    const points: L.LatLngExpression[] = [
      [home.latitude, home.longitude],
      ...places.map((p) => [p.latitude, p.longitude] as L.LatLngExpression),
    ];
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    const bounds = L.latLngBounds(points);
    const diagonalM = map.distance(bounds.getSouthWest(), bounds.getNorthEast());
    const maxZoom = diagonalM < 120 ? 19 : diagonalM < 400 ? 18 : 16;
    map.fitBounds(bounds, { padding: [56, 56], maxZoom, animate: true });
  }, [
    map,
    home.latitude,
    home.longitude,
    places,
    routeCoordinates,
    selectedPlaceId,
    destination?.latitude,
    destination?.longitude,
  ]);

  return null;
}

export interface NearbyMapProps {
  home: { latitude: number; longitude: number; name: string };
  places: NearbyPlace[];
  selectedPlaceId?: string | null;
  /** Street route only — never a straight preview line */
  routeCoordinates?: [number, number][] | null;
  routeColor?: string;
  routeDashed?: boolean;
  /** Commute workplace/school pin */
  destination?: { latitude: number; longitude: number; name: string } | null;
  destinationColor?: string;
  onSelectPlace?: (place: NearbyPlace) => void;
  /** Bump when the container is shown (mobile overlay / resize) so Leaflet recaptures size */
  sizeTick?: number;
  /** Clear selection / route before recentering on the apartment */
  onLocateHome?: () => void;
  className?: string;
}

export default function NearbyMap({
  home,
  places,
  selectedPlaceId = null,
  routeCoordinates = null,
  routeColor = '#2563EB',
  routeDashed = false,
  destination = null,
  destinationColor = '#111827',
  onSelectPlace,
  sizeTick = 0,
  onLocateHome,
  className,
}: NearbyMapProps) {
  const destIcon = useMemo(
    () => makeDestinationIcon(destinationColor),
    [destinationColor]
  );

  const streetPath =
    routeCoordinates && routeCoordinates.length >= 2 ? routeCoordinates : null;

  return (
    <div className={className ?? 'h-full min-h-0 w-full'}>
      <MapContainer
        center={[home.latitude, home.longitude]}
        zoom={15}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full rounded-2xl [&_.leaflet-control-zoom]:border-slate-200 [&_.leaflet-control-zoom]:shadow-md [&_.leaflet-control-zoom-in]:text-lg [&_.leaflet-control-zoom-out]:text-lg"
        style={{ height: '100%', width: '100%', minHeight: 0, zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <LocateHomeControl home={home} onLocate={onLocateHome} />
        <ScaleControl position="bottomleft" imperial={false} />
        <InvalidateSize tick={sizeTick} />
        <MapViewport
          home={home}
          places={places}
          selectedPlaceId={selectedPlaceId}
          routeCoordinates={streetPath}
          destination={destination}
        />
        <Marker position={[home.latitude, home.longitude]} icon={homeIcon} zIndexOffset={800}>
          <Popup>
            <strong>{home.name}</strong>
            <br />
            Your apartment
          </Popup>
        </Marker>
        {destination && (
          <Marker
            position={[destination.latitude, destination.longitude]}
            icon={destIcon}
            zIndexOffset={750}
          >
            <Popup>
              <strong>{destination.name}</strong>
            </Popup>
          </Marker>
        )}
        {places.map((place) => {
          const selected = place.id === selectedPlaceId;
          const icon =
            placeIcons[`${place.category}-${selected ? '1' : '0'}`] ??
            placeIcons[`school-${selected ? '1' : '0'}`];
          return (
            <Marker
              key={place.id}
              position={[place.latitude, place.longitude]}
              icon={icon}
              zIndexOffset={selected ? 700 : 400}
              opacity={selectedPlaceId && !selected ? 0.55 : 1}
              eventHandlers={{
                click: () => onSelectPlace?.(place),
              }}
            >
              <Popup>
                <strong>{place.name}</strong>
                <br />
                {place.distanceMeters < 1000
                  ? `${place.distanceMeters} m`
                  : `${(place.distanceMeters / 1000).toFixed(1)} km`}{' '}
                · ~{place.walkMinutes} min walk
              </Popup>
            </Marker>
          );
        })}
        {streetPath && (
          <>
            <Polyline
              key={`outline-${selectedPlaceId}-${streetPath.length}`}
              positions={streetPath}
              pathOptions={{
                color: '#ffffff',
                weight: 10,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              key={`path-${selectedPlaceId}-${streetPath.length}-${routeColor}-${routeDashed}`}
              positions={streetPath}
              pathOptions={{
                color: routeColor,
                weight: 5,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: routeDashed ? '10 10' : undefined,
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
