'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { GameConfig, BoardType } from '@catan/shared';
import { BOARD_VARIANTS } from '@catan/shared';
import { getSocket } from '@/lib/socket';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const baseVariants = Object.values(BOARD_VARIANTS).filter((v) => v.expansion === 'base');
const seafarerVariants = Object.values(BOARD_VARIANTS).filter((v) => v.expansion === 'seafarers');

export default function CreateGamePage() {
  const router = useRouter();
  const t = useTranslations();
  const [creating, setCreating] = useState(false);
  const [botCount, setBotCount] = useState(0);
  const [botThinkTimeMs, setBotThinkTimeMs] = useState(800);
  const [simulationMode, setSimulationMode] = useState(false);

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

  const maxBots = (selectedVariant?.playerRange[1] ?? 4) - 1; // Leave room for at least 1 human (or 0 in sim mode)
  const maxBotsAllowed = simulationMode ? (selectedVariant?.playerRange[1] ?? 4) : maxBots;

  const handleCreate = useCallback(() => {
    setCreating(true);
    const socket = getSocket();
    socket.emit('game:create', config, (response) => {
      if ('error' in response) {
        setCreating(false);
        return;
      }

      const gameId = response.gameId;

      // Add bots sequentially
      let botsAdded = 0;
      const addNextBot = () => {
        if (botsAdded >= botCount) {
          // Set bot speed if in simulation mode
          if (simulationMode && botCount >= 2) {
            const speedMultiplier = botThinkTimeMs === 0 ? 100 : Math.round(800 / Math.max(50, botThinkTimeMs));
            socket.emit('game:set-bot-speed', gameId, speedMultiplier);
          }
          router.push(`/lobby/${gameId}`);
          return;
        }
        socket.emit('game:add-bot', gameId, (botResponse: { playerId: string } | { error: string }) => {
          botsAdded++;
          addNextBot();
        });
      };

      addNextBot();
    });
  }, [config, router, botCount, botThinkTimeMs, simulationMode]);

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-8">{t('create.title')}</h1>

      <div className="w-full max-w-md space-y-6">
        {/* Board Variant */}
        <Section title={t('create.board')}>
          <div className="space-y-2">
            <label className="text-xs text-white/50 uppercase tracking-wide">{t('create.baseGame')}</label>
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
            <label className="text-xs text-white/50 uppercase tracking-wide mt-3 block">{t('create.seafarers')}</label>
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
        <Section title={t('create.boardGeneration')}>
          <div className="flex gap-2">
            {(['random-balanced', 'beginner'] as BoardType[]).map((bt) => (
              <OptionButton
                key={bt}
                label={bt === 'random-balanced' ? t('create.randomBalanced') : t('create.beginner')}
                selected={config.boardType === bt}
                onClick={() => updateConfig('boardType', bt)}
              />
            ))}
          </div>
        </Section>

        {/* Victory Points */}
        <Section title={t('create.victoryPoints')}>
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
        <Section title={t('create.turnTimer')}>
          <div className="flex flex-wrap gap-2">
            {[null, 60, 90, 120, 180].map((timer) => (
              <OptionButton
                key={timer ?? 'off'}
                label={timer === null ? t('create.off') : `${timer}s`}
                selected={config.turnTimerSeconds === timer}
                onClick={() => updateConfig('turnTimerSeconds', timer)}
              />
            ))}
          </div>
        </Section>

        {/* Friendly Robber */}
        <Section title={t('create.rules')}>
          <div className="space-y-2">
            <ToggleOption
              label={t('create.friendlyRobber')}
              description={t('create.friendlyRobberDesc')}
              checked={config.friendlyRobber}
              onChange={(v) => updateConfig('friendlyRobber', v)}
            />
            <ToggleOption
              label={t('create.tradeWithInactive')}
              description={t('create.tradeWithInactiveDesc')}
              checked={config.tradeWithInactive}
              onChange={(v) => updateConfig('tradeWithInactive', v)}
            />
          </div>
        </Section>

        {/* Bot Players */}
        <Section title={t('create.botPlayers')}>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBotCount((c) => Math.max(0, c - 1))}
                className="w-8 h-8 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center cursor-pointer text-lg font-bold"
              >
                -
              </button>
              <span className="text-lg font-medium w-16 text-center">
                {botCount} {botCount === 1 ? 'bot' : 'bots'}
              </span>
              <button
                onClick={() => setBotCount((c) => Math.min(maxBotsAllowed, c + 1))}
                className="w-8 h-8 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center cursor-pointer text-lg font-bold"
              >
                +
              </button>
            </div>

            {botCount >= 2 && (
              <ToggleOption
                label={t('create.simulationMode')}
                description={t('create.simulationModeDesc')}
                checked={simulationMode}
                onChange={(v) => setSimulationMode(v)}
              />
            )}

            {botCount > 0 && (
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wide">{t('create.botSpeed')}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    { label: t('create.botSpeedInstant'), ms: 0 },
                    { label: t('create.botSpeedFast'), ms: 200 },
                    { label: t('create.botSpeedNormal'), ms: 800 },
                    { label: t('create.botSpeedSlow'), ms: 2000 },
                  ].map(({ label, ms }) => (
                    <OptionButton
                      key={ms}
                      label={label}
                      selected={botThinkTimeMs === ms}
                      onClick={() => setBotThinkTimeMs(ms)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Info */}
        {selectedVariant && (
          <div className="text-xs text-white/40 text-center">
            {selectedVariant.playerRange[0]}-{selectedVariant.playerRange[1]} {t('create.players')}
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
          {creating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              {t('create.creating')}
            </span>
          ) : t('create.createGame')}
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
