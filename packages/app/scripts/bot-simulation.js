/**
 * Bot Simulation — Headless Catan game with 4 bot players
 *
 * Connects via socket.io-client (no browser needed), creates a game,
 * adds 4 bots, and watches them play to completion.
 *
 * Log is IMMUTABLE — timestamped filename, append-only during game.
 *
 * Usage: node scripts/bot-simulation.js
 * Requires: server running on localhost:3030
 */

import { io } from 'socket.io-client';
import { appendFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3030';
const TIMEOUT_MS = 5 * 60 * 1000;

// Timestamped log file — never overwritten
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const LOG_FILE = join(__dirname, `logs/sim-${timestamp}.log`);

// Ensure logs dir exists
import { mkdirSync } from 'node:fs';
mkdirSync(join(__dirname, 'logs'), { recursive: true });

// ─── State ──────────────────────────────────────────────────────────────────

let gameId = null;
let gameStartTime = null;
let lastView = null;
let viewCount = 0;
let lastSeenFingerprint = null;
let totalLogEntries = 0;
let playerNames = {};  // playerId → name

const diceDistribution = {};
for (let i = 2; i <= 12; i++) diceDistribution[i] = 0;

const stats = {
  maritimeTrades: 0,
  robberies: 0,
  devCardsBought: 0,
  devCardsPlayed: 0,
  totalTurns: 0,
  forcedDiscards: 0,
  settlementsBuilt: 0,
  citiesBuilt: 0,
  roadsBuilt: 0,
};

// ─── Logging (append-only) ──────────────────────────────────────────────────

function log(line) {
  console.log(line);
}

function appendLog(line) {
  appendFileSync(LOG_FILE, line + '\n');
}

function logTurn(phase, turn, player, action, details) {
  const prefix = phase === 'setup' ? `S${turn}` : `T${String(turn).padStart(3)}`;
  const entry = `${prefix.padStart(4)} | ${player.padEnd(14)} | ${action.padEnd(20)} | ${details}`;
  log(`  ${entry}`);
  appendLog(entry);
}

function fingerprint(entry) {
  return `${entry.player}|${entry.action}|${entry.details}`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  log('\nCATAN BOT SIMULATION\n');
  log(`Log file: ${LOG_FILE}\n`);

  const socket = io(BASE, { transports: ['websocket'], path: '/api/socket' });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', (err) => reject(new Error(`Cannot connect: ${err.message}`)));
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });

  log(`Connected: ${socket.id}`);

  // ─── Create game ────────────────────────────────────────────────────

  const config = {
    boardType: 'random-balanced',
    variantId: 'base-3-4',
    maxPlayers: 4,
    victoryPoints: 10,
    turnTimerSeconds: null,
    setupTimerSeconds: null,
    friendlyRobber: false,
    tradeWithInactive: true,
  };

  const createResult = await emitCb(socket, 'game:create', config);
  gameId = createResult.gameId;
  log(`Game created: ${gameId} (code: ${createResult.code})`);

  await emitCb(socket, 'game:observe', gameId);

  // ─── Add 4 bots ─────────────────────────────────────────────────────

  const botIds = [];
  for (let i = 0; i < 4; i++) {
    const r = await emitCb(socket, 'game:add-bot', gameId);
    botIds.push(r.playerId);
    log(`Added bot ${i + 1}: ${r.playerId}`);
  }

  socket.emit('game:set-bot-speed', gameId, 100);
  log('Bot speed: instant\n');

  // ─── Write log header ───────────────────────────────────────────────

  writeFileSync(LOG_FILE, [
    '═'.repeat(70),
    `  CATAN BOT SIMULATION — ${new Date().toISOString()}`,
    `  Variant: ${config.variantId} | Players: 4 | VP Target: ${config.victoryPoints}`,
    '═'.repeat(70),
    '',
  ].join('\n') + '\n');

  // ─── Listen for events ──────────────────────────────────────────────

  let setupRound = 1;

  const gameOverPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Game timeout (5min)')), TIMEOUT_MS);

    socket.on('game:starting', (data) => {
      gameStartTime = Date.now();
      log(`Game starting! Turn order: ${data.turnOrder.join(', ')}\n`);
      appendLog('');
      appendLog('─'.repeat(70));
      appendLog('SETUP PHASE');
      appendLog('─'.repeat(70));
      appendLog('');
    });

    socket.on('game:view', (view) => {
      viewCount++;

      // Capture player names on first view
      if (Object.keys(playerNames).length === 0) {
        for (const p of view.players) {
          playerNames[p.id] = p.name;
        }
        appendLog('PLAYERS:');
        for (let i = 0; i < view.players.length; i++) {
          const p = view.players[i];
          appendLog(`  ${i + 1}. ${p.name} (${p.color})`);
        }
        appendLog('');
      }

      // Detect setup → playing transition
      if (lastView && (lastView.phase === 'SETUP_ROUND_1' || lastView.phase === 'SETUP_ROUND_2') && view.phase === 'PLAYING') {
        appendLog('');
        appendLog('─'.repeat(70));
        appendLog('PLAYING PHASE');
        appendLog('─'.repeat(70));
        appendLog('');
      }

      if (view.phase === 'SETUP_ROUND_2' && lastView?.phase === 'SETUP_ROUND_1') {
        setupRound = 2;
      }

      processView(view, setupRound);

      if (view.winner) {
        clearTimeout(timeout);
        resolve(view);
      }
    });
  });

  // ─── Start ──────────────────────────────────────────────────────────

  log('Starting game...');
  const startResult = await emitCb(socket, 'game:start', gameId);
  if (startResult.error) throw new Error(`Start failed: ${startResult.error}`);
  log('Game started!\n');

  // ─── Wait ───────────────────────────────────────────────────────────

  let finalView;
  try {
    finalView = await gameOverPromise;
  } catch (err) {
    log(`\nERROR: ${err.message}`);
    appendLog(`\nERROR: ${err.message}`);
    if (lastView) {
      for (const p of lastView.players) {
        appendLog(`  ${p.name}: ${p.vp} VP, ${p.resourceCount} cards`);
      }
    }
    socket.disconnect();
    process.exit(1);
  }

  // ─── Final summary ──────────────────────────────────────────────────

  const duration = ((Date.now() - gameStartTime) / 1000).toFixed(1);

  const summary = [];
  summary.push('');
  summary.push('═'.repeat(70));
  summary.push(`  GAME OVER — Turn ${finalView.turnNumber} — ${duration}s`);
  summary.push('═'.repeat(70));
  summary.push('');
  summary.push(`WINNER: ${finalView.winnerName} — ${finalView.victoryPoints} VP`);
  summary.push('');
  summary.push('FINAL STANDINGS:');

  const sorted = [...finalView.players].sort((a, b) => b.vp - a.vp);
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const flags = [p.hasLongestRoad && 'LR', p.hasLargestArmy && 'LA'].filter(Boolean).join(' ');
    summary.push(`  ${i + 1}. ${p.name} (${p.color}) — ${p.vp} VP | S:${p.settlements?.length ?? '?'} C:${p.cities?.length ?? '?'} R:${p.roads?.length ?? '?'} ${flags}`);
  }

  summary.push('');
  summary.push('STATISTICS:');
  summary.push(`  Turns: ${stats.totalTurns}`);
  summary.push(`  Duration: ${duration}s`);
  summary.push(`  Dice: ${Object.entries(diceDistribution).map(([k, v]) => `${k}:${v}`).join(', ')}`);
  summary.push(`  Settlements built: ${stats.settlementsBuilt}`);
  summary.push(`  Cities built: ${stats.citiesBuilt}`);
  summary.push(`  Roads built: ${stats.roadsBuilt}`);
  summary.push(`  Maritime trades: ${stats.maritimeTrades}`);
  summary.push(`  Robberies: ${stats.robberies}`);
  summary.push(`  Forced discards: ${stats.forcedDiscards}`);
  summary.push(`  Dev cards bought: ${stats.devCardsBought}`);
  summary.push(`  Dev cards played: ${stats.devCardsPlayed}`);

  const lrPlayer = finalView.players.find(p => p.hasLongestRoad);
  const laPlayer = finalView.players.find(p => p.hasLargestArmy);
  if (lrPlayer) summary.push(`  Longest road: ${lrPlayer.name}`);
  if (laPlayer) summary.push(`  Largest army: ${laPlayer.name} (${laPlayer.knightsPlayed} knights)`);

  summary.push(`  Views received: ${viewCount}`);
  summary.push(`  Log entries: ${totalLogEntries}`);
  summary.push('');

  for (const line of summary) {
    log(line);
    appendLog(line);
  }

  log(`Log: ${LOG_FILE}`);
  socket.disconnect();
}

// ─── Process views ──────────────────────────────────────────────────────────

function processView(view, setupRound) {
  const recentLog = view.recentLog || [];
  if (recentLog.length === 0) { lastView = view; return; }

  let newStartIdx = 0;
  if (lastSeenFingerprint) {
    for (let i = recentLog.length - 1; i >= 0; i--) {
      if (fingerprint(recentLog[i]) === lastSeenFingerprint) {
        newStartIdx = i + 1;
        break;
      }
    }
  }

  if (newStartIdx < recentLog.length) {
    const isSetup = view.phase === 'SETUP_ROUND_1' || view.phase === 'SETUP_ROUND_2';
    for (const entry of recentLog.slice(newStartIdx)) {
      totalLogEntries++;
      processLogEntry(isSetup ? 'setup' : 'playing', isSetup ? setupRound : view.turnNumber, entry);
    }
    lastSeenFingerprint = fingerprint(recentLog[recentLog.length - 1]);
  }

  lastView = view;
}

function processLogEntry(phase, turn, entry) {
  const { action, details } = entry;

  switch (action) {
    case 'dice-roll': {
      const m = details.match(/(\d+)\+(\d+)=(\d+)/);
      if (m) diceDistribution[parseInt(m[3], 10)]++;
      break;
    }
    case 'maritime-trade': stats.maritimeTrades++; break;
    case 'move-robber': stats.robberies++; break;
    case 'buy-dev-card': stats.devCardsBought++; break;
    case 'play-knight':
    case 'play-road-building':
    case 'play-year-of-plenty':
    case 'play-monopoly': stats.devCardsPlayed++; break;
    case 'end-turn': stats.totalTurns++; break;
    case 'discard': stats.forcedDiscards++; break;
    case 'build-settlement':
    case 'setup-settlement': stats.settlementsBuilt++; break;
    case 'build-city': stats.citiesBuilt++; break;
    case 'build-road':
    case 'setup-road': stats.roadsBuilt++; break;
  }

  logTurn(phase, turn, entry.player, action, details);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function emitCb(socket, event, ...args) {
  return new Promise((resolve) => {
    socket.emit(event, ...args, (response) => resolve(response));
  });
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
