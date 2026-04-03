/**
 * Bot Visual Simulation — Playwright
 *
 * Opens browser windows to watch bots play Catan:
 *   - 1 big screen (1720x900) showing the game board + sidebar
 *   - 3 smaller windows (573x900) showing bot player hands
 *
 * Uses slower bot speed (800ms) so you can watch the game unfold.
 * Takes screenshots at key moments.
 *
 * Usage: node scripts/bot-visual-simulation.js
 * Requires: server running on localhost:3030
 */

import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3030';
const SCREENSHOTS_DIR = join(__dirname, 'screenshots');
const LOG_FILE = join(__dirname, 'simulation-log.txt');
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes for visual (slower)
const BOT_SPEED_MULTIPLIER = 1; // 1x = 800ms think time

mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── State tracking ─────────────────────────────────────────────────────────

let gameStartTime = null;
let lastSeenFingerprint = null;
let totalLogEntriesSeen = 0;
let viewCount = 0;
let lastView = null;

const diceDistribution = {};
for (let i = 2; i <= 12; i++) diceDistribution[i] = 0;

const stats = {
  maritimeTrades: 0,
  robberies: 0,
  devCardsBought: 0,
  devCardsPlayed: 0,
  totalTurns: 0,
};

const turnLog = [];

function logTurn(turn, player, action, details) {
  const entry = `T${String(turn).padStart(3)} | ${player.padEnd(14)} | ${action.padEnd(20)} | ${details}`;
  turnLog.push(entry);
  console.log(`  ${entry}`);
}

// ─── Browser helpers ─────────────────────────────────────────────────────────

async function launchWindow(x, y, w, h) {
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--window-position=${x},${y}`,
      `--window-size=${w},${h}`,
      '--disable-features=TranslateUI',
      '--lang=da',
      '--disable-gpu',
      '--no-sandbox',
    ],
  });
  const ctx = await browser.newContext({ viewport: { width: w - 16, height: h - 80 } });
  const page = await ctx.newPage();
  return { browser, page };
}

async function takeScreenshot(page, name) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const path = join(SCREENSHOTS_DIR, `${name}-${ts}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`  Screenshot: ${path}`);
  return path;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nCATAN BOT VISUAL SIMULATION\n');

  // Minimize other windows
  try {
    execSync(`osascript -e '
      tell application "System Events"
        set appList to name of every application process whose visible is true
        repeat with appName in appList
          try
            tell application process appName to set miniaturized of every window to true
          end try
        end repeat
      end tell
    '`);
  } catch {}
  await sleep(500);

  // ─── Connect socket for game setup ────────────────────────────────────

  console.log('Connecting to server...');
  const socket = io(BASE, { transports: ['websocket'], path: '/api/socket' });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', (err) => reject(new Error(`Cannot connect: ${err.message}`)));
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });

  console.log(`Connected: ${socket.id}`);

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
  const gameId = createResult.gameId;
  console.log(`Game created: ${gameId} (code: ${createResult.code})`);

  // ─── Observe the game ─────────────────────────────────────────────────

  const observeResult = await emitCb(socket, 'game:observe', gameId);
  if (observeResult.error) throw new Error(`Observe failed: ${observeResult.error}`);

  // ─── Add 4 bots ───────────────────────────────────────────────────────

  const botIds = [];
  for (let i = 0; i < 4; i++) {
    const botResult = await emitCb(socket, 'game:add-bot', gameId);
    if (botResult.error) throw new Error(`Add bot failed: ${botResult.error}`);
    botIds.push(botResult.playerId);
    console.log(`Added bot ${i + 1}: ${botResult.playerId}`);
  }

  // ─── Set bot speed (visual pace) ──────────────────────────────────────

  socket.emit('game:set-bot-speed', gameId, BOT_SPEED_MULTIPLIER);
  console.log(`Bot speed: ${BOT_SPEED_MULTIPLIER}x (${Math.round(800 / BOT_SPEED_MULTIPLIER)}ms think time)`);

  // ─── Launch browser windows ───────────────────────────────────────────

  console.log('\nLaunching browser windows...');

  // 3440x1440 ultrawide: host gets ~1720px, 3 players split the rest
  const H = 1440;
  const hostW = 1720;
  const playerW = Math.floor((3440 - hostW) / 3); // ~573px each

  const host = await launchWindow(0, 0, hostW, H);
  const p1 = await launchWindow(hostW, 0, playerW, H);
  const p2 = await launchWindow(hostW + playerW, 0, playerW, H);
  const p3 = await launchWindow(hostW + playerW * 2, 0, playerW, H);

  const browsers = [host.browser, p1.browser, p2.browser, p3.browser];

  // ─── Set up event listeners ───────────────────────────────────────────

  let setupComplete = false;
  let firstCityBuilt = false;
  let gameOver = false;

  const gameOverPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Game timeout')), TIMEOUT_MS);

    socket.on('game:starting', (data) => {
      gameStartTime = Date.now();
      console.log(`\nGame starting! Turn order: ${data.turnOrder.join(', ')}`);
    });

    socket.on('game:dice-result', (data) => {
      diceDistribution[data.total]++;
    });

    socket.on('game:view', (view) => {
      viewCount++;
      processView(view);

      // Track phase transitions for screenshots
      if (!setupComplete && view.phase === 'PLAYING') {
        setupComplete = true;
        console.log('\n  Setup complete! Taking screenshot...');
        takeScreenshot(host.page, 'setup-complete').catch(() => {});
      }

      if (!firstCityBuilt && view.buildings?.some(b => b.type === 'city')) {
        firstCityBuilt = true;
        console.log('\n  First city built! Taking screenshot...');
        takeScreenshot(host.page, 'first-city').catch(() => {});
      }

      if (view.winner && !gameOver) {
        gameOver = true;
        clearTimeout(timeout);
        // Short delay for the final state to render
        setTimeout(() => resolve(view), 2000);
      }

      lastView = view;
    });
  });

  // ─── Navigate browser windows ─────────────────────────────────────────

  // Start the game first
  console.log('\nStarting game...');
  const startResult = await emitCb(socket, 'game:start', gameId);
  if (startResult.error) throw new Error(`Start failed: ${startResult.error}`);
  console.log('Game started!\n');

  // Navigate windows sequentially with delays to avoid crashes
  await host.page.goto(`${BASE}/game/${gameId}`, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await p1.page.goto(`${BASE}/play/${gameId}?bot=${botIds[0]}`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  await p2.page.goto(`${BASE}/play/${gameId}?bot=${botIds[1]}`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  await p3.page.goto(`${BASE}/play/${gameId}?bot=${botIds[2]}`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);

  console.log('All browser windows loaded.\n');

  // ─── Wait for game over ───────────────────────────────────────────────

  let finalView;
  try {
    finalView = await gameOverPromise;
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    await takeScreenshot(host.page, 'error-state');
    writeLogFile(lastView);
    for (const b of browsers) { try { await b.close(); } catch {} }
    socket.disconnect();
    process.exit(1);
  }

  // ─── Game over screenshots ────────────────────────────────────────────

  const duration = ((Date.now() - gameStartTime) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(70));
  console.log(`GAME OVER after ${finalView.turnNumber} turns (${duration}s)`);
  console.log(`WINNER: ${finalView.winnerName}!`);
  console.log('='.repeat(70));

  for (const p of finalView.players) {
    const lr = p.hasLongestRoad ? 'LR' : '';
    const la = p.hasLargestArmy ? 'LA' : '';
    const badges = [lr, la].filter(Boolean).join(', ');
    console.log(`  ${p.name} (${p.color}) - ${p.vp} VP | S:${p.settlements.length} C:${p.cities.length} R:${p.roads.length} ${badges}`);
  }

  await takeScreenshot(host.page, 'game-over-board');
  await takeScreenshot(p1.page, 'game-over-player1');
  await takeScreenshot(p2.page, 'game-over-player2');
  await takeScreenshot(p3.page, 'game-over-player3');

  writeLogFile(finalView);

  console.log('\nClosing in 15s...');
  await sleep(15000);

  for (const b of browsers) { try { await b.close(); } catch {} }
  socket.disconnect();
  console.log('Done.');
}

function fingerprint(entry) {
  return `${entry.player}|${entry.action}|${entry.details}`;
}

// ─── Process game:view events ────────────────────────────────────────────────

function processView(view) {
  const recentLog = view.recentLog || [];
  if (recentLog.length === 0) return;

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
    const newEntries = recentLog.slice(newStartIdx);
    for (const entry of newEntries) {
      totalLogEntriesSeen++;
      const turn = view.turnNumber;
      const action = entry.action;
      const details = entry.details;

      switch (action) {
        case 'dice-roll': {
          const match = details.match(/(\d+)\+(\d+)=(\d+)/);
          if (match) diceDistribution[parseInt(match[3], 10)]++;
          break;
        }
        case 'buy-dev-card': stats.devCardsBought++; break;
        case 'play-knight': stats.devCardsPlayed++; break;
        case 'maritime-trade': stats.maritimeTrades++; break;
        case 'move-robber': stats.robberies++; break;
        case 'end-turn': stats.totalTurns++; break;
      }

      logTurn(turn, entry.player, action, details);
    }
    lastSeenFingerprint = fingerprint(recentLog[recentLog.length - 1]);
  }
}

// ─── Write log file ──────────────────────────────────────────────────────────

function writeLogFile(view) {
  if (!view) {
    writeFileSync(LOG_FILE, 'Simulation failed.\n');
    return;
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const duration = gameStartTime ? ((Date.now() - gameStartTime) / 1000).toFixed(1) : '?';

  const lrPlayer = view.players.find(p => p.hasLongestRoad);
  const laPlayer = view.players.find(p => p.hasLargestArmy);

  const lines = [];
  lines.push('='.repeat(70));
  lines.push(`  CATAN BOT VISUAL SIMULATION -- ${now}`);
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
  for (const entry of turnLog) lines.push(entry);
  lines.push('');

  lines.push('='.repeat(70));
  lines.push(`GAME OVER -- Turn ${view.turnNumber}`);
  lines.push('='.repeat(70));
  lines.push('');

  if (view.winner) {
    lines.push(`WINNER: ${view.winnerName} with ${view.victoryPoints} Victory Points!`);
  } else {
    lines.push('NO WINNER (game timed out)');
  }
  lines.push('');

  lines.push('FINAL STANDINGS:');
  const sorted = [...view.players].sort((a, b) => b.vp - a.vp);
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    lines.push(`  ${i + 1}. ${p.name} -- ${p.vp} VP (S:${p.settlements.length} C:${p.cities.length} LR:${p.hasLongestRoad} LA:${p.hasLargestArmy})`);
  }
  lines.push('');

  lines.push('STATISTICS:');
  lines.push(`  Total turns: ${stats.totalTurns}`);
  lines.push(`  Game duration: ${duration}s`);
  lines.push(`  Dice distribution: ${Object.entries(diceDistribution).map(([k, v]) => `${k}:${v}`).join(', ')}`);
  lines.push(`  Maritime trades: ${stats.maritimeTrades}`);
  lines.push(`  Robberies: ${stats.robberies}`);
  lines.push(`  Dev cards bought: ${stats.devCardsBought}`);
  lines.push(`  Dev cards played: ${stats.devCardsPlayed}`);
  lines.push(`  Longest road: ${lrPlayer ? lrPlayer.name : 'none'}`);
  lines.push(`  Largest army: ${laPlayer ? `${laPlayer.name} (${laPlayer.knightsPlayed} knights)` : 'none'}`);
  lines.push(`  Game views received: ${viewCount}`);
  lines.push('');

  writeFileSync(LOG_FILE, lines.join('\n'));
  console.log(`\nLog written to ${LOG_FILE}`);
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
