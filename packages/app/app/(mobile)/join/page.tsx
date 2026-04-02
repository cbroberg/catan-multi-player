'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import type { PlayerColor } from '@catan/shared';
import { getSocket } from '@/lib/socket';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const COLORS: { id: PlayerColor; hex: string }[] = [
  { id: 'red', hex: '#ef4444' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'white', hex: '#f5f5f5' },
  { id: 'orange', hex: '#f97316' },
  { id: 'green', hex: '#22c55e' },
  { id: 'brown', hex: '#92400e' },
];

const AVATARS = ['⚔️', '🛡️', '🏰', '⛵', '🐑', '🌾', '⛏️', '🪵'];

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();

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
      setError(t('join.codeError'));
      return;
    }
    setError('');
    setStep('setup');
  }, [code, t]);

  const handleJoin = useCallback(() => {
    if (!name.trim()) {
      setError(t('join.nameError'));
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
  }, [code, name, color, avatar, router, t]);

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-8">{t('join.title')}</h1>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 'code' && (
        <div className="w-full max-w-xs space-y-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wide block mb-1">{t('join.gameCodeLabel')}</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))}
              placeholder={t('join.gameCodePlaceholder')}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-center text-2xl font-mono tracking-[0.4em] placeholder:text-white/20 focus:outline-none focus:border-amber-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
            />
          </div>
          <button
            onClick={handleCodeSubmit}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 rounded-xl font-bold transition-colors cursor-pointer"
          >
            {t('join.next')}
          </button>
        </div>
      )}

      {step === 'setup' && (
        <div className="w-full max-w-xs space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wide block mb-1">{t('join.nameLabel')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder={t('join.namePlaceholder')}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-lg focus:outline-none focus:border-amber-500"
              autoFocus
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wide block mb-1">{t('join.colorLabel')}</label>
            <div className="flex gap-2 justify-center">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`w-10 h-10 rounded-full transition-transform cursor-pointer ${
                    color === c.id ? 'scale-125 ring-2 ring-amber-400' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={t(`join.colors.${c.id}`)}
                />
              ))}
            </div>
          </div>

          {/* Avatar */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wide block mb-1">{t('join.avatarLabel')}</label>
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
            {t('join.joinGame')}
          </button>
        </div>
      )}

      {step === 'joining' && (
        <LoadingSpinner message={t('common.joiningGame')} />
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
