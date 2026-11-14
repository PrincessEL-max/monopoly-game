import { getSquaresForMap } from '../constants/squares.js';

export const calcNewPosition = (currentPos, steps, map = 'nusantara') => {
  const route = getSquaresForMap(map);
  const currentIndex = route.findIndex((square) => square.id === currentPos);
  if (currentIndex < 0) {
    throw new RangeError(`Posisi ${currentPos} tidak ada di peta ${map}.`);
  }
  const rawIndex = currentIndex + steps;
  const newIndex = ((rawIndex % route.length) + route.length) % route.length;
  return {
    newPos: route[newIndex].id,
    passedGo: steps > 0 && rawIndex >= route.length,
  };
};

export const findNearest = (currentPos, type, map = 'nusantara') => {
  const route = getSquaresForMap(map);
  const currentIndex = route.findIndex((square) => square.id === currentPos);
  if (currentIndex < 0) {
    throw new RangeError(`Posisi ${currentPos} tidak ada di peta ${map}.`);
  }
  const destinations = route.filter((square) => square.type === type);
  let nearest = destinations[0]?.id;
  let minDist = Infinity;

  for (const square of destinations) {
    const targetIndex = route.findIndex((candidate) => candidate.id === square.id);
    const dist = (targetIndex - currentIndex + route.length) % route.length;
    if (dist < minDist) {
      minDist = dist;
      nearest = square.id;
    }
  }
  return nearest;
};

export const positionComesAfter = (fromPos, toPos, map = 'nusantara') => {
  const route = getSquaresForMap(map);
  const fromIndex = route.findIndex((square) => square.id === fromPos);
  const toIndex = route.findIndex((square) => square.id === toPos);
  if (fromIndex < 0 || toIndex < 0) {
    throw new RangeError(`Posisi tidak valid untuk peta ${map}: ${fromPos} → ${toPos}.`);
  }
  return toIndex < fromIndex;
};
