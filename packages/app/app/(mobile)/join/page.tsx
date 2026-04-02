'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import type { PlayerColor } from '@catan/shared';
import { getSocket } from '@/lib/socket';

const COLORS: { id: PlayerColor; label: string; hex: string }[] = [
  { id: 'red', label: 'Rød', hex: '#ef4444' },
  { id: 'blue', label: 'Blå', hex: '#3b82f6' },
  { id: 'white', label: 'Hvid', hex: '#f5f5f5' },
  { id: 'orange', label: 'Orange', hex: '#f97316' },
  { id: 'green', label: 'Grøn', hex: '#22c55e' },
  { id: 'brown', label: 'Brun', hex: '#92400e' },
];

const AVATARS = ['⚔️', '🛡️', '🏰', '⛵', '🐑', '🌾', '⛏️', '🪵'];

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<'code' | 'setup' | 'joining'>('code');
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [name, setName] = useState('');
  const [color, setColor] = useState<PlayerColor>('red');
  const [avatar, setAvatar] = useState('⚔️');
  const [error, setError] = useState('');

  // Auto-advance if code is from QR
  useEffect(() => {
    if (searchParams.get('code') && code.length === 5) {
      setStep('setup');
    }
  }, [searchParams, code]);

  const handleCodeSubmit = useCallback(() => {
    if (code.length !== 5) {
      setError('Koden skal være 5 tegn');
      return;
    }
    setError('');
    setStep('setup');
  }, [code]);

  const handleJoin = useCallback(() => {
    if (!name.trim()) {
      setError('Indtast dit navn');
      return;
    }
    setError('');
    setStep('joining');

    const socket = getSocket();
    socket.emit(
      'game:join',
      { code: code.toUpperCase(), name: name.trim(), color, avatar },
      (response) => {
        if ('error' in response) {
          setError(response.error);
          setStep('setup');
          return;
        }
        // Store player info and redirect to mobile play view
        sessionStorage.setItem('playerId', response.playerId);
        sessionStorage.setItem('gameId', response.gameId);
        router.push(`/play/${response.gameId}`);
      }
    );
  }, [code, name, color, avatar, router]);

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-8">Join Catan</h1>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 'code' && (
        <div className="w-full max-w-xs space-y-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wide block mb-1">Game Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))}
              placeholder="XXXXX"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-center text-2xl font-mono tracking-[0.4em] placeholder:text-white/20 focus:outline-none focus:border-amber-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
            />
          </div>
          <button
            onClick={handleCodeSubmit}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Næste
          </button>
        </div>
      )}

      {step === 'setup' && (
        <div className="w-full max-w-xs space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wide block mb-1">Navn</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder="Dit navn"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-lg focus:outline-none focus:border-amber-500"
              autoFocus
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wide block mb-1">Farve</label>
            <div className="flex gap-2 justify-center">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`w-10 h-10 rounded-full transition-transform cursor-pointer ${
                    color === c.id ? 'scale-125 ring-2 ring-amber-400' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Avatar */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wide block mb-1">Avatar</label>
            <div className="flex gap-2 justify-center flex-wrap">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-transform cursor-pointer ${
                    avatar === a
                      ? 'scale-125 bg-white/20 ring-2 ring-amber-400'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleJoin}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Join Spil
          </button>
        </div>
      )}

      {step === 'joining' && (
        <div className="text-white/50 text-lg">Joiner spil...</div>
      )}
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0e1a2e]" />}>
      <JoinContent />
    </Suspense>
  );
}
