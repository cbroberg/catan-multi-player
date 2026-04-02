import type { BoardPreset, TerrainType, HarborType } from '@catan/shared';
import { HARBOR_EDGE_POSITIONS } from '@catan/shared';

/**
 * Official Catan beginner layout (base-3-4).
 * Terrain and numbers follow the recommended first-game setup from the rulebook.
 */
export const BEGINNER_PRESET: BoardPreset = {
  id: 'beginner',
  name: 'Beginner',
  description: 'The official recommended layout for your first game of Catan.',
  difficulty: 'beginner',
  variantId: 'base-3-4',
  terrains: [
    'mountains', 'pasture', 'forest',
    'fields', 'hills', 'pasture', 'hills',
    'fields', 'forest', 'desert', 'forest', 'mountains',
    'forest', 'mountains', 'fields', 'pasture',
    'hills', 'fields', 'pasture',
  ] as TerrainType[],
  numbers: [
    10, 2, 9,
    12, 6, 4, 10,
    9, 11, null, 3, 8,
    8, 3, 4, 5,
    5, 6, 11,
  ],
  harbors: [
    { type: '3:1' as HarborType, edgeIndex: 0 },
    { type: 'grain' as HarborType, edgeIndex: 1 },
    { type: 'ore' as HarborType, edgeIndex: 2 },
    { type: '3:1' as HarborType, edgeIndex: 3 },
    { type: 'wool' as HarborType, edgeIndex: 4 },
    { type: '3:1' as HarborType, edgeIndex: 5 },
    { type: '3:1' as HarborType, edgeIndex: 6 },
    { type: 'brick' as HarborType, edgeIndex: 7 },
    { type: 'lumber' as HarborType, edgeIndex: 8 },
  ],
  balanceScore: 72,
};

export const BOARD_PRESETS: BoardPreset[] = [BEGINNER_PRESET];

export function getPresetById(id: string): BoardPreset | undefined {
  return BOARD_PRESETS.find((p) => p.id === id);
}
