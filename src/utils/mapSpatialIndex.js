import Supercluster from 'supercluster';

export const MAP_VIRTUALIZATION_THRESHOLD = 1600;
export const MAP_CLUSTER_OPTIONS = Object.freeze({
  radius: 80,
  maxZoom: 17,
});

export function isMexicoCoordinate({ lat, lng } = {}, bounds) {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= bounds.south && lat <= bounds.north &&
    lng >= bounds.west && lng <= bounds.east;
}

export function createMapSpatialIndex({ obras = [], getCoordinates, getMarkerKey, bounds }) {
  const entriesByKey = new Map();
  const features = [];
  const positions = [];

  obras.forEach((obra, index) => {
    const coordinates = getCoordinates(obra);
    if (!isMexicoCoordinate(coordinates, bounds)) return;

    const markerKey = getMarkerKey(obra, index);
    // El mapa ya usa esta llave como identidad de interacción. Conservarla en
    // el índice hace que rutas, ficha y selección continúen funcionando igual.
    if (entriesByKey.has(markerKey)) return;

    const entry = { obra, index, markerKey, coordinates };
    entriesByKey.set(markerKey, entry);
    positions.push(coordinates);
    features.push({
      type: 'Feature',
      properties: { markerKey },
      geometry: {
        type: 'Point',
        coordinates: [coordinates.lng, coordinates.lat],
      },
    });
  });

  const index = new Supercluster(MAP_CLUSTER_OPTIONS);
  index.load(features);

  return {
    index,
    entriesByKey,
    positions,
    markerKeys: new Set(entriesByKey.keys()),
    count: features.length,
  };
}

export function getSpatialClusters(index, bounds, zoom) {
  if (!index || !bounds) return [];
  const southWest = bounds.getSouthWest?.();
  const northEast = bounds.getNorthEast?.();
  const west = Number(southWest?.lng?.());
  const south = Number(southWest?.lat?.());
  const east = Number(northEast?.lng?.());
  const north = Number(northEast?.lat?.());

  if (![west, south, east, north].every(Number.isFinite)) return [];

  return index.getClusters(
    [west, south, east, north],
    Math.max(0, Math.min(MAP_CLUSTER_OPTIONS.maxZoom + 1, Math.floor(zoom)))
  );
}

export function isSpatialCluster(feature) {
  return feature?.properties?.cluster === true;
}
