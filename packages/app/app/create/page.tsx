'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { GameConfig, BoardType } from '@catan/shared';
import { BOARD_VARIANTS } from '@catan/shared';
import { getSocket } from '@/lib/socket';

const baseVariants = Object.values(BOARD_VARIANTS).filter((v) => v.expansion === 'base');
const seafarerVariants = Object.values(BOARD_VARIANTS).filter((v) => v.expansion === 'seafarers');

export default function CreateGamePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const [config, setConfig] = useState<GameConfig>({
    boardType: 'random-balanced',
    variantId: 'base-3-4',
    maxPlayers: 4,
    victoryPoints: 10,
    turnTimerSeconds: null,
    setupTimerSeconds: null,
    friendlyRobber: false,
    tradeWithInactive: true,
  });

  const selectedVariant = BOARD_VARIANTS[config.variantId];

  const updateConfig = useCallback(<K extends keyof GameConfig>(key: K, value: GameConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const selectVariant = useCallback((variantId: string) => {
    const variant = BOARD_VARIANTS[variantId];
    if (!variant) return;
    setConfig((prev) => ({
      ...prev,
      variantId,
      maxPlayers: variant.playerRange[1] as GameConfig['maxPlayers'],
      victoryPoints: variant.defaultVictoryPoints,
    }));
  }, []);

  const handleCreate = useCallback(() => {
    setCreating(true);
    const socket = getSocket();
    socket.emit('game:create', config, (response) => {
      if ('error' in response) {
        setCreating(false);
        return;
      }
      router.push(`/lobby/${response.gameId}`);
    });
  }, [config, router]);

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-8">Nyt Spil</h1>

      <div className="w-full max-w-md space-y-6">
        {/* Board Variant */}
        <Section title="Board">
          <div className="space-y-2">
            <label className="text-xs text-white/50 uppercase tracking-wide">Base Game</label>
            <div className="flex flex-wrap gap-2">
              {baseVariants.map((v) => (
                <VariantButton
                  key={v.id}
                  label={v.name}
                  selected={config.variantId === v.id}
                  onClick={() => selectVariant(v.id)}
                />
              ))}
            </div>
            <label className="text-xs text-white/50 uppercase tracking-wide mt-3 block">Seafarers</label>
            <div className="flex flex-wrap gap-2">
              {seafarerVariants.map((v) => (
                <VariantButton
                  key={v.id}
                  label={v.name}
                  selected={config.variantId === v.id}
                  onClick={() => selectVariant(v.id)}
                />
              ))}
            </div>
          </div>
        </Section>

        {/* Board Type */}
        <Section title="Board Generation">
          <div className="flex gap-2">
            {(['random-balanced', 'beginner'] as BoardType[]).map((bt) => (
              <OptionButton
                key={bt}
                label={bt === 'random-balanced' ? 'Random Balanced' : 'Beginner'}
                selected={config.boardType === bt}
                onClick={() => updateConfig('boardType', bt)}
              />
            ))}
          </div>
        </Section>

        {/* Victory Points */}
        <Section title="Sejrspoint">
          <div className="flex gap-2">
            {[10, 12, 14, 15].map((vp) => (
              <OptionButton
                key={vp}
                label={`${vp} VP`}
                selected={config.victoryPoints === vp}
                onClick={() => updateConfig('victoryPoints', vp)}
              />
            ))}
          </div>
        </Section>

        {/* Turn Timer */}
        <Section title="Turn Timer">
          <div className="flex flex-wrap gap-2">
            {[null, 60, 90, 120, 180].map((t) => (
              <OptionButton
                key={t ?? 'off'}
                label={t === null ? 'Off' : `${t}s`}
                selected={config.turnTimerSeconds === t}
                onClick={() => updateConfig('turnTimerSeconds', t)}
              />
            ))}
          </div>
        </Section>

        {/* Friendly Robber */}
        <Section title="Regler">
          <div className="space-y-2">
            <ToggleOption
              label="Friendly Robber"
              description="Robber kan ikke placeres på spillere med 2 VP eller mindre"
              checked={config.friendlyRobber}
              onChange={(v) => updateConfig('friendlyRobber', v)}
            />
            <ToggleOption
              label="Handel med inaktive"
              description="Alle spillere kan handle, ikke kun den aktive"
              checked={config.tradeWithInactive}
              onChange={(v) => updateConfig('tradeWithInactive', v)}
            />
          </div>
        </Section>

        {/* Info */}
        {selectedVariant && (
          <div className="text-xs text-white/40 text-center">
            {selectedVariant.playerRange[0]}-{selectedVariant.playerRange[1]} spillere
            {selectedVariant.specialBuildingPhase && ' · Special Building Phase'}
            {selectedVariant.hasShips && ' · Ships'}
            {selectedVariant.hasPirate && ' · Pirate'}
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 text-white font-bold rounded-xl text-lg transition-colors cursor-pointer"
        >
          {creating ? 'Opretter...' : 'Opret Spil'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white/70 mb-2">{title}</h2>
      {children}
    </div>
  );
}

function VariantButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
        selected ? 'bg-amber-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
      }`}
    >
      {label}
    </button>
  );
}

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
        selected ? 'bg-white/20 text-white ring-1 ring-amber-500' : 'bg-white/5 text-white/50 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        className={`mt-0.5 w-9 h-5 rounded-full transition-colors flex items-center ${
          checked ? 'bg-amber-600' : 'bg-white/20'
        }`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </div>
      <div>
        <div className="text-sm text-white/80 group-hover:text-white">{label}</div>
        <div className="text-xs text-white/40">{description}</div>
      </div>
    </label>
  );
}
