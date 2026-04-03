import { generateRandomBalancedBoard, generateBoardFromArrays, BEGINNER_PRESET } from '@catan/game-engine';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get('variant') || 'base-3-4';
  const beginner = searchParams.get('beginner') === '1';

  try {
    if (beginner && variantId === 'base-3-4') {
      const result = generateBoardFromArrays(
        BEGINNER_PRESET.terrains,
        BEGINNER_PRESET.numbers,
        BEGINNER_PRESET.harbors.map((h) => h.type),
        'base-3-4'
      );
      return NextResponse.json(result);
    }
    const result = generateRandomBalancedBoard(variantId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
