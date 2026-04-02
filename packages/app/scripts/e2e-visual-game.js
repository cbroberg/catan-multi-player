/**
 * E2E Visual Game Test — Playwright
 *
 * 4 separate browser windows on 3440×1440 ultrawide:
 *   Left 60%:  Big Screen / Host (2064px)
 *   Right 40%: 3 mobile players stacked or side by side (458px each)
 *
 * Runs a complete Catan game autonomously:
 *   1. Host creates game (base-3-4, 4 players, 10 VP)
 *   2. 3 players join via code
 *   3. All players ready → host starts
 *   4. Setup: each player places 2 settlements + 2 roads
 *   5. Main game: AI-driven actions (roll, build, trade, dev cards)
 *   6. Game plays until someone wins
 *
 * Usage: node scripts/e2e-visual-game.js
 * Requires: server running on localhost:3030
 */

import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const BASE = 'http://localhost:3030';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Window Management ──────────────────────────────────────────────────────

function minimizeAllWindows() {
  console.log('🪟 Minimizing all windows...');
  try {
    execSync(`osascript -e '
      tell application "System Events"
        set appList to name of every application process whose visible is true
        repeat with appName in appList
          try
            tell application process appName
              set miniaturized of every window to true
            end tell
          end try
        end repeat
      end tell
    '`);
  } catch {}
}

async function launchWindow(x, y, w, h) {
  const browser = await chromium.launch({
    headless: false,
    args: [`--window-position=${x},${y}`, `--window-size=${w},${h}`],
  });
  const ctx = await browser.newContext({ viewport: { width: w - 16, height: h - 80 } });
  const page = await ctx.newPage();
  return { browser, page };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function waitForText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (t) => document.body.innerText.includes(t),
    text,
    { timeout }
  );
}

async function clickButton(page, textMatch) {
  const btn = page.locator(`button:has-text("${textMatch}")`).first();
  await btn.waitFor({ timeout: 5000 });
  await btn.click();
}

async function clickIfVisible(page, selector, timeout = 1000) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ timeout });
    await el.click();
    return true;
  } catch { return false; }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🎲 CATAN E2E Visual Test — 3 Players + Host\n');

  minimizeAllWindows();
  await sleep(500);

  // Layout: Host left half, 3 players side-by-side right half (full height)
  // 3440×1440 ultrawide: 1720 + 573×3 = 3439
  const H = 1380;
  const hostW = 1720;
  const playerW = 573;

  const host = await launchWindow(0, 25, hostW, H);
  const p1 = await launchWindow(hostW, 25, playerW, H);
  const p2 = await launchWindow(hostW + playerW, 25, playerW, H);
  const p3 = await launchWindow(hostW + playerW * 2, 25, playerW, H);

  // Minimize terminal
  try { execSync(`osascript -e 'tell application "System Events" to tell application process "Ghostty" to set miniaturized of every window to true'`); } catch {}

  const players = [p1.page, p2.page, p3.page];
  const names = ['Alice', 'Bob', 'Charlie'];
  const colors = ['red', 'blue', 'green'];
  const browsers = [host.browser, p1.browser, p2.browser, p3.browser];

  try {
    // ─── Step 1: Host creates game ──────────────────────────
    console.log('📺 Host: Creating game...');
    await host.page.goto(`${BASE}/create`);
    await sleep(2000);

    // Click "Opret Spil" button
    await clickButton(host.page, 'Opret Spil');
    console.log('📺 Host: Game created, waiting for lobby...');
    await sleep(3000);

    // Extract game code from lobby page
    const gameCode = await host.page.evaluate(() => {
      // Look for the 5-char code in the big text
      const codeEl = document.querySelector('.font-mono.font-bold.tracking-\\[0\\.3em\\]');
      if (codeEl) return codeEl.textContent.trim();
      // Fallback: find 5-char uppercase in body
      const match = document.body.innerText.match(/[A-Z0-9]{5}/);
      return match ? match[0] : '';
    });

    if (!gameCode || gameCode.length !== 5) {
      // Try alternative extraction
      const url = host.page.url();
      console.log(`📺 Current URL: ${url}`);
      console.error('❌ Could not extract game code');
      return;
    }

    console.log(`📺 Game code: ${gameCode}\n`);

    // ─── Step 2: Players join ───────────────────────────────
    for (let i = 0; i < 3; i++) {
      console.log(`🎮 ${names[i]} joining...`);
      await players[i].goto(`${BASE}/join?code=${gameCode}`);
      await sleep(1500);

      // Should auto-advance to setup screen since code is in URL
      // Fill name
      await players[i].fill('input[type="text"]', names[i]);
      await sleep(300);

      // Select color (click the color circle)
      const colorBtns = await players[i].$$('button[title]');
      if (colorBtns.length > i) {
        await colorBtns[i].click();
      }
      await sleep(300);

      // Click Join button
      await clickButton(players[i], 'Join Spil');
      await sleep(2000);

      console.log(`🎮 ${names[i]} joined!`);
    }

    await sleep(2000);

    // ─── Step 3: All players ready ──────────────────────────
    console.log('\n✅ All players clicking Ready...');
    for (let i = 0; i < 3; i++) {
      await clickButton(players[i], 'Klar')
        .catch(() => clickButton(players[i], 'Klar?'));
      await sleep(500);
    }
    await sleep(2000);

    // ─── Step 4: Host starts game ───────────────────────────
    console.log('📺 Host: Starting game...');
    await clickButton(host.page, 'Start Spil');
    await sleep(3000);

    console.log('🎲 Game started!\n');

    // ─── Step 5: Setup phase — place settlements & roads ────
    console.log('🏠 Setup phase...');

    // Setup round 1: forward order (p1, p2, p3)
    // Setup round 2: reverse order (p3, p2, p1)
    // Each player needs to click a highlighted vertex then a highlighted edge

    for (let round = 0; round < 2; round++) {
      const order = round === 0 ? [0, 1, 2] : [2, 1, 0];
      for (const pi of order) {
        await sleep(1500);

        // Click a highlighted settlement spot (yellow circle on SVG)
        const placed = await tryClickSVGHighlight(players[pi], 'circle[fill="#fbbf24"]');
        if (placed) {
          console.log(`🏠 ${names[pi]}: Placed settlement (round ${round + 1})`);
          await sleep(1000);

          // Click a highlighted road spot (yellow line on SVG)
          const roadPlaced = await tryClickSVGHighlight(players[pi], 'line[stroke="#fbbf24"]');
          if (roadPlaced) {
            console.log(`🛤️ ${names[pi]}: Placed road (round ${round + 1})`);
          }
        }
        await sleep(500);
      }
    }

    await sleep(2000);
    console.log('\n🎲 Setup complete! Main game starting...\n');

    // ─── Step 6: Main game loop ─────────────────────────────
    // Each turn: find whose turn it is, perform actions

    let turn = 0;
    const maxTurns = 200;

    while (turn < maxTurns) {
      turn++;

      // Find the active player (the one who can roll dice or needs to act)
      let acted = false;
      for (let i = 0; i < 3; i++) {
        const page = players[i];

        // Try rolling dice
        if (await clickIfVisible(page, 'button:has-text("Kast Terninger")', 300)) {
          console.log(`🎲 T${turn}: ${names[i]} rolled dice`);
          acted = true;
          await sleep(1500);

          // Handle discard if needed
          if (await clickIfVisible(page, 'button:has-text("Kassér")', 500)) {
            console.log(`🗑️ T${turn}: ${names[i]} discarded`);
            await sleep(500);
          }

          // Handle robber
          if (await tryClickSVGHighlight(page, 'polygon[stroke="#fbbf24"]')) {
            console.log(`👤 T${turn}: ${names[i]} moved robber`);
            await sleep(800);
            // Click steal target if present
            await clickIfVisible(page, 'button:has-text("kort")', 500);
            await sleep(500);
          }

          // Build phase: try to build stuff
          await tryBuildActions(page, names[i], turn);

          // End turn
          if (await clickIfVisible(page, 'button:has-text("Afslut tur")', 500)) {
            console.log(`⏭️ T${turn}: ${names[i]} ended turn`);
          }

          await sleep(800);
          break;
        }

        // Check for discard obligation (not our turn but 7 was rolled)
        if (await clickIfVisible(page, 'button:has-text("Kassér")', 200)) {
          console.log(`🗑️ T${turn}: ${names[i]} discarded (7 roll)`);
          await sleep(500);
        }
      }

      if (!acted) {
        // No player could act — might be game over or stuck
        await sleep(500);
      }

      // Check for victory
      const isGameOver = await checkGameOver(host.page);
      if (isGameOver) {
        console.log(`\n👑 GAME OVER after ${turn} turns!`);
        break;
      }

      // Print status every 10 turns
      if (turn % 10 === 0) {
        console.log(`   ... Turn ${turn}`);
      }
    }

    if (turn >= maxTurns) {
      console.log(`\n⏰ Reached ${maxTurns} turns without winner.`);
    }

    // ─── Screenshot final state ─────────────────────────────
    execSync('mkdir -p recordings');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    await host.page.screenshot({ path: `recordings/catan-final-host-${ts}.png` });
    for (let i = 0; i < 3; i++) {
      await players[i].screenshot({ path: `recordings/catan-final-${names[i]}-${ts}.png` });
    }
    console.log(`\n📸 Screenshots saved to recordings/`);

    console.log('\n✅ E2E Visual Test Complete!\n');
    console.log('Windows will close in 15 seconds...');
    await sleep(15000);

  } catch (err) {
    console.error('❌ Error:', err.message);
    await sleep(5000);
  } finally {
    for (const b of browsers) {
      try { await b.close(); } catch {}
    }
  }
}

// ─── Build Actions ───────────────────────────────────────────────────────────

async function tryBuildActions(page, name, turn) {
  // Try to build settlement
  if (await clickIfVisible(page, 'button:has-text("Settlement"):not([class*="cursor-not-allowed"])', 200)) {
    await sleep(500);
    if (await tryClickSVGHighlight(page, 'circle[fill="#fbbf24"]')) {
      console.log(`🏠 T${turn}: ${name} built settlement`);
      await sleep(500);
    }
  }

  // Try to build city
  if (await clickIfVisible(page, 'button:has-text("City"):not([class*="cursor-not-allowed"])', 200)) {
    await sleep(500);
    if (await tryClickSVGHighlight(page, 'circle[fill="#fbbf24"]')) {
      console.log(`🏙️ T${turn}: ${name} built city`);
      await sleep(500);
    }
  }

  // Try to build road
  if (await clickIfVisible(page, 'button:has-text("Road"):not([class*="cursor-not-allowed"])', 200)) {
    await sleep(500);
    if (await tryClickSVGHighlight(page, 'line[stroke="#fbbf24"]')) {
      console.log(`🛤️ T${turn}: ${name} built road`);
      await sleep(500);
    }
  }

  // Try to buy dev card
  if (await clickIfVisible(page, 'button:has-text("Dev Card"):not([class*="cursor-not-allowed"])', 200)) {
    console.log(`🃏 T${turn}: ${name} bought dev card`);
    await sleep(500);
  }

  // Try maritime trade
  if (await clickIfVisible(page, 'button:has-text("Maritime"):not([class*="cursor-not-allowed"])', 200)) {
    console.log(`🚢 T${turn}: ${name} maritime trade`);
    await sleep(500);
  }
}

async function tryClickSVGHighlight(page, selector) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ timeout: 1000 });
    // SVG elements need force click sometimes
    await el.click({ force: true });
    return true;
  } catch {
    return false;
  }
}

async function checkGameOver(hostPage) {
  try {
    const text = await hostPage.innerText('body', { timeout: 100 });
    return text.includes('vinder!') || text.includes('WINNER');
  } catch {
    return false;
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────

main().catch(console.error);
