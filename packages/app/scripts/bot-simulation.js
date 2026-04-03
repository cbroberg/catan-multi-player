/**
 * Bot Simulation — Headless Catan game with 4 bot players
 *
 * Connects via socket.io-client (no browser needed), creates a game,
 * adds 4 bots, and watches them play to completion.
 * Logs everything to console and simulation-log.txt.
 *
 * Usage: node scripts/bot-simulation.js
 * Requires: server running on localhost:3030
 */

import { io } from 'socket.io-client';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3030';
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max
const LOG_FILE = join(__dirname, 'simulation-log.txt');

// ─── State tracking ─────────────────────────────────────────────────────────

let gameId = null;
let gameStartTime = null;
let lastView = null;
let viewCount = 0;

/**
 * recentLog is a sliding window of the last 20 entries from the engine.
 * To track all entries across the entire game, we fingerprint the last
 * seen entry and only process entries that appear after it in each new view.
 */
let lastSeenFingerprint = null;
let totalLogEntriesSeen = 0;

// Tracking stats
const diceDistribution = {};
for (let i = 2; i <= 12; i++) diceDistribution[i] = 0;

const stats = {
  maritimeTrades: 0,
  robberies: 0,
  devCardsBought: 0,
  devCardsPlayed: 0,
  totalTurns: 0,
};

// Collected log lines
const turnLog = [];

function log(line) {
  console.log(line);
}

function logTurn(turn, player, action, details) {
  const entry = `T${String(turn).padStart(3)} | ${player.padEnd(14)} | ${action.padEnd(20)} | ${details}`;
  turnLog.push(entry);
}

function fingerprint(entry) {
  return `${entry.player}|${entry.action}|${entry.details}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log('');
  log('Connecting to server...');

  const socket = io(BASE, { transports: ['websocket'], path: '/api/socket' });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', (err) => reject(new Error(`Cannot connect to ${BASE}: ${err.message}`)));
    setTimeout(() => reject(new Error(`Connection timeout after 5s`)), 5000);
  });

  log(`Connected: ${socket.id}`);

  // ─── Create game ──────────────────────────────────────────────────────

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
  if (createResult.error) throw new Error(`Create failed: ${createResult.error}`);
  gameId = createResult.gameId;
  log(`Game created: ${gameId} (code: ${createResult.code})`);

  // ─── Observe the game (join the room) ─────────────────────────────────

  const observeResult = await emitCb(socket, 'game:observe', gameId);
  if (observeResult.error) throw new Error(`Observe failed: ${observeResult.error}`);
  log('Joined game room as observer');

  // ─── Add 4 bots ───────────────────────────────────────────────────────

  const botIds = [];
  for (let i = 0; i < 4; i++) {
    const botResult = await emitCb(socket, 'game:add-bot', gameId);
    if (botResult.error) throw new Error(`Add bot failed: ${botResult.error}`);
    botIds.push(botResult.playerId);
    log(`Added bot ${i + 1}: ${botResult.playerId}`);
  }

  // ─── Set bot speed to max (instant) ───────────────────────────────────

  socket.emit('game:set-bot-speed', gameId, 100); // 100x = ~8ms think time
  log('Bot speed set to instant');

  // ─── Listen for events ────────────────────────────────────────────────

  const gameOverPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Game did not finish within ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    socket.on('game:starting', (data) => {
      gameStartTime = Date.now();
      log(`\nGame starting! Turn order: ${data.turnOrder.join(', ')}\n`);
    });

    socket.on('game:dice-result', (data) => {
      // Bot dice results may not come through here (bots use engine directly),
      // so we also parse dice from recentLog entries
      diceDistribution[data.total]++;
    });

    socket.on('game:view', (view) => {
      viewCount++;
      processView(view);

      if (view.winner) {
        clearTimeout(timeout);
        resolve(view);
      }
    });

    socket.on('game:timer-expired', (data) => {
      log(`  [TIMER EXPIRED] Player: ${data.playerId}`);
    });

    socket.on('game:action-error', (error) => {
      log(`  [ACTION ERROR] ${error}`);
    });
  });

  // ─── Start the game ───────────────────────────────────────────────────

  log('');
  log('Starting game...');
  const startResult = await emitCb(socket, 'game:start', gameId);
  if (startResult.error) throw new Error(`Start failed: ${startResult.error}`);
  log('Game started!');

  // ─── Wait for completion ──────────────────────────────────────────────

  let finalView;
  try {
    finalView = await gameOverPromise;
  } catch (err) {
    log(`\nERROR: ${err.message}`);
    if (lastView) {
      log(`Last known state: phase=${lastView.phase}, turn=${lastView.turnNumber}, turnPhase=${lastView.turnPhase}`);
      log(`Current player: ${lastView.currentPlayerId}`);
      for (const p of lastView.players) {
        log(`  ${p.name} (${p.color}): ${p.vp} VP, ${p.resourceCount} cards`);
      }
    }
    writeLogFile(lastView);
    socket.disconnect();
    process.exit(1);
  }

  const duration = ((Date.now() - gameStartTime) / 1000).toFixed(1);
  log('');
  log('='.repeat(70));
  log(`GAME OVER after ${finalView.turnNumber} turns (${duration}s)`);
  log(`WINNER: ${finalView.winnerName} with ${finalView.victoryPoints} VP!`);
  log('='.repeat(70));

  for (const p of finalView.players) {
    const lr = p.hasLongestRoad ? 'LR' : '';
    const la = p.hasLargestArmy ? 'LA' : '';
    const badges = [lr, la].filter(Boolean).join(', ');
    log(`  ${p.name} (${p.color}) - ${p.vp} VP | S:${p.settlements.length} C:${p.cities.length} R:${p.roads.length} ${badges}`);
  }

  log(`\nReceived ${viewCount} game:view events`);
  log(`Turn log entries: ${turnLog.length}`);

  writeLogFile(finalView);

  socket.disconnect();
  log('\nDone.');
}

// ─── Process game:view events ────────────────────────────────────────────────

function processView(view) {
  const recentLog = view.recentLog || [];
  if (recentLog.length === 0) {
    lastView = view;
    return;
  }

  // Find where the new entries start in the recentLog window
  let newStartIdx = 0;

  if (lastSeenFingerprint) {
    // Search for the last fingerprint in the current window
    for (let i = recentLog.length - 1; i >= 0; i--) {
      if (fingerprint(recentLog[i]) === lastSeenFingerprint) {
        newStartIdx = i + 1;
        break;
      }
    }
    // If fingerprint not found at all, it scrolled out of the 20-entry window.
    // In that case all entries in the window are new to us.
    // This means we may have missed some entries between calls, but with bots
    // running at ~8ms and socket events firing per action, this is unlikely.
  }

  if (newStartIdx < recentLog.length) {
    const newEntries = recentLog.slice(newStartIdx);
    for (const entry of newEntries) {
      totalLogEntriesSeen++;
      processLogEntry(view.turnNumber, entry);
    }
    // Update fingerprint to the last entry we processed
    lastSeenFingerprint = fingerprint(recentLog[recentLog.length - 1]);
  }

  lastView = view;

  // Periodic progress update (every 100 views)
  if (viewCount % 100 === 0) {
    const elapsed = gameStartTime ? ((Date.now() - gameStartTime) / 1000).toFixed(0) : '?';
    const vps = view.players.map(p => `${p.name.replace('Bot ', '')}:${p.vp}`).join(' ');
    log(`  [${elapsed}s] Turn ${view.turnNumber} | ${vps}`);
  }
}

function processLogEntry(turn, entry) {
  const action = entry.action;
  const details = entry.details;

  // Track stats
  switch (action) {
    case 'dice-roll': {
      // Parse dice from details string like "3+5=8"
      const match = details.match(/(\d+)\+(\d+)=(\d+)/);
      if (match) {
        const total = parseInt(match[3], 10);
        diceDistribution[total] = (diceDistribution[total] || 0) + 1;
      }
      break;
    }
    case 'buy-dev-card':
      stats.devCardsBought++;
      break;
    case 'play-knight':
      stats.devCardsPlayed++;
      break;
    case 'maritime-trade':
      stats.maritimeTrades++;
      break;
    case 'move-robber':
      stats.robberies++;
      break;
    case 'end-turn':
      stats.totalTurns++;
      break;
  }

  logTurn(turn, entry.player, action, details);
}

// ─── Write log file ──────────────────────────────────────────────────────────

function writeLogFile(view) {
  if (!view) {
    writeFileSync(LOG_FILE, 'Simulation failed -- no game view received.\n');
    log(`Log written to ${LOG_FILE}`);
    return;
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const duration = gameStartTime ? ((Date.now() - gameStartTime) / 1000).toFixed(1) : '?';

  // Find longest road and largest army holders
  const lrPlayer = view.players.find(p => p.hasLongestRoad);
  const laPlayer = view.players.find(p => p.hasLargestArmy);

  const lines = [];

  lines.push('='.repeat(70));
  lines.push(`  CATAN BOT SIMULATION -- ${now}`);
  lines.push(`  Variant: ${view.variantId}, Players: ${view.players.length}, VP Target: ${view.victoryPoints}`);
  lines.push('='.repeat(70));
  lines.push('');

  lines.push('PLAYERS:');
  for (let i = 0; i < view.players.length; i++) {
    const p = view.players[i];
    lines.push(`  ${i + 1}. ${p.name} (${p.color})`);
  }
  lines.push('');

  lines.push('-'.repeat(70));
  lines.push('TURN LOG:');
  lines.push('-'.repeat(70));
  lines.push('');

  for (const entry of turnLog) {
    lines.push(entry);
  }

  lines.push('');
  lines.push('='.repeat(70));
  lines.push(`GAME OVER -- Turn ${view.turnNumber}`);
  lines.push('='.repeat(70));
  lines.push('');

  if (view.winner) {
    lines.push(`WINNER: ${view.winnerName} with ${view.victoryPoints} Victory Points!`);
  } else {
    lines.push('NO WINNER (game timed out or errored)');
  }
  lines.push('');

  lines.push('FINAL STANDINGS:');
  const sorted = [...view.players].sort((a, b) => b.vp - a.vp);
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const lr = p.hasLongestRoad ? 'true' : 'false';
    const la = p.hasLargestArmy ? 'true' : 'false';
    lines.push(`  ${i + 1}. ${p.name} -- ${p.vp} VP (S:${p.settlements.length} C:${p.cities.length} LR:${lr} LA:${la})`);
  }
  lines.push('');

  lines.push('STATISTICS:');
  lines.push(`  Total turns: ${stats.totalTurns}`);
  lines.push(`  Game duration: ${duration}s`);

  const diceLine = Object.entries(diceDistribution)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
  lines.push(`  Dice distribution: ${diceLine}`);

  lines.push(`  Maritime trades: ${stats.maritimeTrades}`);
  lines.push(`  Robberies: ${stats.robberies}`);
  lines.push(`  Dev cards bought: ${stats.devCardsBought}`);
  lines.push(`  Dev cards played: ${stats.devCardsPlayed}`);
  lines.push(`  Longest road: ${lrPlayer ? `${lrPlayer.name}` : 'none'}`);
  lines.push(`  Largest army: ${laPlayer ? `${laPlayer.name} (${laPlayer.knightsPlayed} knights)` : 'none'}`);
  lines.push(`  Game views received: ${viewCount}`);
  lines.push(`  Log entries captured: ${totalLogEntriesSeen}`);
  lines.push('');

  const content = lines.join('\n');
  writeFileSync(LOG_FILE, content);
  log(`\nLog written to ${LOG_FILE}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emitCb(socket, event, ...args) {
  return new Promise((resolve) => {
    socket.emit(event, ...args, (response) => resolve(response));
  });
}

// ─── Run ─────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
