'use client';

import { use } from 'react';
import { useLobby } from '@/lib/use-socket';

export default function MobilePlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { lobby, connected, toggleReady } = useLobby(gameId, 'player');
  const playerId = typeof window !== 'undefined' ? sessionStorage.getItem('playerId') : null;

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center">
        <div className="text-white/50">Forbinder...</div>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="min-h-screen bg-[#0e1a2e] text-white flex items-center justify-center">
        <div className="text-white/50">Indlæser...</div>
      </div>
    );
  }

  const me = lobby.players.find((p) => p.id === playerId);

  if (lobby.phase === 'starting' || lobby.phase === 'started') {
    return (
      <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col items-center justify-center p-6">
        <div className="text-4xl mb-4">🎲</div>
        <div className="text-xl font-bold">Spillet starter!</div>
        <div className="text-white/50 mt-2">Gameplay kommer i Phase 3...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="text-4xl">{me?.avatar ?? '🎮'}</div>
        <h1 className="text-2xl font-bold">{me?.name ?? 'Spiller'}</h1>
        <div className="text-white/50 text-sm">
          Game: <span className="font-mono text-amber-400">{lobby.code}</span>
        </div>

        <div className="text-sm text-white/40">
          {lobby.players.length}/{lobby.maxPlayers} spillere
        </div>

        {/* Player list */}
        <div className="space-y-1 text-sm">
          {lobby.players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 justify-center">
              <span>{p.avatar}</span>
              <span className={p.id === playerId ? 'font-bold' : ''}>{p.name}</span>
              {p.isReady && <span className="text-emerald-400">✓</span>}
              {p.isHost && <span className="text-amber-400 text-xs">(Host)</span>}
            </div>
          ))}
        </div>

        {/* Ready button */}
        <button
          onClick={toggleReady}
          className={`px-8 py-3 rounded-xl font-bold text-lg transition-colors cursor-pointer ${
            me?.isReady
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          {me?.isReady ? '✓ Klar!' : 'Klar?'}
        </button>
      </div>
    </div>
  );
}
