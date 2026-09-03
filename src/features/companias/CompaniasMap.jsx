import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';

const MAP_CENTER = Object.freeze({ lat: 23.6, lng: -102.0 });
const MAP_BOUNDS = Object.freeze({ north: 34.9, south: 12.0, west: -119, east: -84 });
const MAP_PADDING = Object.freeze({ top: 46, right: 36, bottom: 46, left: 36 });

function isMexicoCoordinate(lat, lng) {
  return lat >= MAP_BOUNDS.south && lat <= MAP_BOUNDS.north &&
    lng >= MAP_BOUNDS.west && lng <= MAP_BOUNDS.east;
}

function getProjectKey(obra, index) {
  return String(
    obra?.id || obra?.clave ||
    `${obra?.lat || 'lat'}-${obra?.lng || 'lng'}-${index}`
  );
}

function createProjectTargetMarker(title) {
  const content = document.createElement('div');
  content.setAttribute('aria-label', `Proyecto ${title}`);
  content.innerHTML = `
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <circle cx="18" cy="18" r="17" fill="rgba(255, 22, 52, .04)" stroke="#FF1634" stroke-width="1" />
      <circle cx="18" cy="18" r="12" fill="#FF1634" />
    </svg>`;
  Object.assign(content.style, {
    display: 'block',
    filter: 'drop-shadow(0 2px 4px rgba(83, 35, 21, .32))',
    height: '36px',
    width: '36px',
  });
  return content;
}

function clusterRenderer({ count, position }) {
  const element = document.createElement('div');
  const diameter = count >= 100 ? 44 : count >= 10 ? 38 : 32;
  Object.assign(element.style, {
    alignItems: 'center',
    background: '#374151',
    border: '2px solid #FFFFFF',
    borderRadius: '999px',
    boxShadow: '0 2px 8px rgba(17, 24, 39, .28)',
    boxSizing: 'border-box',
    color: '#FFFFFF',
    display: 'flex',
    fontFamily: 'Poppins, sans-serif',
    fontSize: '11px',
    fontWeight: '700',
    height: `${diameter}px`,
    justifyContent: 'center',
    width: `${diameter}px`,
  });
  element.textContent = String(count);

  return new window.google.maps.marker.AdvancedMarkerElement({
    position,
    content: element,
    zIndex: 100000 + count,
  });
}

export default function CompaniasMap({
  obras = [],
  isDataReady = true,
  selectedCompanyId = null,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const clustererRef = useRef(null);
  const markersRef = useRef(new Map());
  const activeKeysRef = useRef(new Set());
  const updateTokenRef = useRef(0);
  const markerLibraryRef = useRef(null);
  const selectionRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [status, setStatus] = useState('Cargando mapa…');
  const [progress, setProgress] = useState({ visible: 0, total: 0 });

  const points = useMemo(() => obras.reduce((result, obra, index) => {
    const lat = Number(obra?.lat);
    const lng = Number(obra?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isMexicoCoordinate(lat, lng)) return result;
    result.push({
      key: getProjectKey(obra, index),
      lat,
      lng,
      title: obra?.proyecto || obra?.clave || 'Proyecto',
    });
    return result;
  }, []), [obras]);

  useEffect(() => {
    let cancelled = false;
    const cachedMarkers = markersRef.current;

    async function createMap() {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey || !mapElementRef.current) {
        setStatus('El mapa estará disponible al configurar la llave de Google Maps.');
        return;
      }

      try {
        if (!globalThis.__construleadsGoogleMapsConfigured) {
          setOptions({ apiKey, version: 'weekly' });
          globalThis.__construleadsGoogleMapsConfigured = true;
        }

        const [{ Map }, markerLibrary] = await Promise.all([
          importLibrary('maps'),
          importLibrary('marker'),
        ]);
        if (cancelled || !mapElementRef.current) return;

        markerLibraryRef.current = markerLibrary;
        const map = new Map(mapElementRef.current, {
          center: MAP_CENTER,
          zoom: 5,
          minZoom: 4,
          maxZoom: 18,
          restriction: { latLngBounds: MAP_BOUNDS, strictBounds: false },
          mapId: 'DEMO_MAP_ID',
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });
        mapRef.current = map;
        clustererRef.current = new MarkerClusterer({
          map,
          markers: [],
          algorithm: new SuperClusterAlgorithm({ radius: 76, maxZoom: 17 }),
          renderer: { render: clusterRenderer },
        });
        setMapReady(true);
      } catch {
        if (!cancelled) setStatus('No fue posible cargar el mapa. Intenta recargar la página.');
      }
    }

    void createMap();
    return () => {
      cancelled = true;
      updateTokenRef.current += 1;
      clustererRef.current?.clearMarkers();
      cachedMarkers.forEach((marker) => { marker.map = null; });
      cachedMarkers.clear();
      activeKeysRef.current.clear();
      clustererRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !clustererRef.current || !markerLibraryRef.current) return undefined;
    const token = updateTokenRef.current + 1;
    updateTokenRef.current = token;
    let cancelled = false;
    const clusterer = clustererRef.current;
    const nextKeys = new Set(points.map((point) => point.key));
    const previousKeys = activeKeysRef.current;

    const removedMarkers = [...previousKeys]
      .filter((key) => !nextKeys.has(key))
      .map((key) => markersRef.current.get(key))
      .filter(Boolean);

    if (removedMarkers.length) clusterer.removeMarkers(removedMarkers, true);
    setProgress({ visible: 0, total: points.length });

    const appendMarkers = async () => {
      const additions = [];
      const { AdvancedMarkerElement } = markerLibraryRef.current;

      for (let index = 0; index < points.length; index += 1) {
        if (cancelled || updateTokenRef.current !== token) return;
        const point = points[index];
        let marker = markersRef.current.get(point.key);

        if (!marker) {
          marker = new AdvancedMarkerElement({
            position: { lat: point.lat, lng: point.lng },
            anchorLeft: '-50%',
            anchorTop: '-50%',
            content: createProjectTargetMarker(point.title),
            title: point.title,
          });
          markersRef.current.set(point.key, marker);
        }
        if (!previousKeys.has(point.key)) additions.push(marker);

        const atBatchEnd = (index + 1) % 180 === 0 || index === points.length - 1;
        if (atBatchEnd) {
          if (additions.length) {
            clusterer.addMarkers(additions, true);
            additions.length = 0;
          }
          setProgress({ visible: index + 1, total: points.length });
          await new Promise((resolve) => window.requestAnimationFrame(resolve));
        }
      }

      if (cancelled || updateTokenRef.current !== token) return;
      clusterer.render();
      activeKeysRef.current = nextKeys;

      const selectionChanged = selectionRef.current !== selectedCompanyId;
      selectionRef.current = selectedCompanyId;
      if (!selectionChanged || !mapRef.current) return;

      if (!selectedCompanyId) {
        mapRef.current.panTo(MAP_CENTER);
        mapRef.current.setZoom(5);
        return;
      }

      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((point) => bounds.extend({ lat: point.lat, lng: point.lng }));
      if (points.length === 1) {
        mapRef.current.panTo({ lat: points[0].lat, lng: points[0].lng });
        mapRef.current.setZoom(12);
      } else if (points.length > 1) {
        mapRef.current.fitBounds(bounds, MAP_PADDING);
      }
    };

    void appendMarkers();
    return () => { cancelled = true; };
  }, [mapReady, points, selectedCompanyId]);

  const isLoading = !mapReady || !isDataReady || progress.visible < progress.total;
  const message = !isDataReady
    ? 'Preparando datos de compañías…'
    : progress.total
      ? `${progress.visible.toLocaleString()} de ${progress.total.toLocaleString()} proyectos`
      : status;

  return (
    <Box position="relative" h="100%" minH="0" bg="#EEF3F5">
      <Box ref={mapElementRef} position="absolute" inset={0} />
      {isLoading && (
        <Flex
          position="absolute" top="16px" left="50%" transform="translateX(-50%)" zIndex={3}
          align="center" gap={2} px={3} py={2} bg="white" border="1px solid #E4E7EC"
          borderRadius="999px" boxShadow="0 4px 14px rgba(15, 23, 42, .12)" whiteSpace="nowrap"
        >
          <Spinner size="xs" color="#D95B27" />
          <Text fontSize="11px" color="#596273" fontWeight="600">{message}</Text>
        </Flex>
      )}
      {mapReady && !points.length && isDataReady && (
        <Flex position="absolute" inset={0} align="center" justify="center" pointerEvents="none">
          <Box px={4} py={3} borderRadius="10px" bg="rgba(255,255,255,.94)" border="1px solid #E4E7EC">
            <Text fontSize="12px" color="#596273">No hay proyectos georreferenciados para estos filtros.</Text>
          </Box>
        </Flex>
      )}
    </Box>
  );
}
