import { generateRandomBalancedBoard } from '@catan/game-engine';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get('variant') || 'base-3-4';

  try {
    const result = generateRandomBalancedBoard(variantId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
