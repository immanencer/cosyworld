import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

const TERRAIN_TYPES = {
  DEEP_WATER: { name: 'Deep Water', color: '#0000FF', description: 'Vast, deep blue waters stretch as far as the eye can see.' },
  SHALLOW_WATER: { name: 'Shallow Water', color: '#4B9CD3', description: 'Crystal clear shallow waters reveal the sandy bottom below.' },
  BEACH: { name: 'Beach', color: '#FFF5BA', description: 'A sandy beach with gentle waves lapping at the shore.' },
  GRASSLAND: { name: 'Grassland', color: '#90EE90', description: 'Rolling hills of lush green grass sway in the breeze.' },
  FOREST: { name: 'Forest', color: '#228B22', description: 'A dense forest of towering trees and lush undergrowth.' },
  MOUNTAIN: { name: 'Mountain', color: '#A0522D', description: 'Rugged mountain peaks reach towards the sky.' },
  SNOW: { name: 'Snow', color: '#FFFAFA', description: 'A pristine blanket of snow covers everything in sight.' },
};

function generateWorld(size) {
  const world = Array(size).fill().map(() => Array(size).fill(null));
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = (noise2D(x / 50, y / 50) + 1) / 2; // Normalize to 0-1
      world[y][x] = getTerrainType(value);
    }
  }
  
  return world;
}

function getTerrainType(value) {
  if (value < 0.2) return TERRAIN_TYPES.DEEP_WATER;
  if (value < 0.3) return TERRAIN_TYPES.SHALLOW_WATER;
  if (value < 0.33) return TERRAIN_TYPES.BEACH;
  if (value < 0.6) return TERRAIN_TYPES.GRASSLAND;
  if (value < 0.8) return TERRAIN_TYPES.FOREST;
  if (value < 0.95) return TERRAIN_TYPES.MOUNTAIN;
  return TERRAIN_TYPES.SNOW;
}

function exploreLocation(x, y) {
  // We're using a fixed seed here for consistency, but you could use a random seed for more variety
  const value = (noise2D(x / 50, y / 50) + 1) / 2;
  const terrain = getTerrainType(value);
  
  return {
    x,
    y,
    terrain: terrain.name,
    color: terrain.color,
    description: terrain.description,
    // You could add more properties here, like resources, enemies, etc.
  };
}

// Helper function to get neighboring cells
function getNeighbors(x, y, size) {
  const neighbors = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (const [dx, dy] of directions) {
    const newX = x + dx;
    const newY = y + dy;
    if (newX >= 0 && newX < size && newY >= 0 && newY < size) {
      neighbors.push({ x: newX, y: newY });
    }
  }
  
  return neighbors;
}

export { generateWorld, exploreLocation, getNeighbors, TERRAIN_TYPES };