/**
 * E2E Visual Game Test — Playwright
 *
 * 4 browser windows on 3440×1440 ultrawide:
 *   Left:  Big Screen / Host (1720px)
 *   Right: Alice, Bob, Charlie (573px each, side-by-side)
 *
 * Plays a complete Catan game autonomously via data-action selectors.
 *
 * Usage: node scripts/e2e-visual-game.js
 * Requires: server running on localhost:3030
 */

import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const BASE = 'http://localhost:3030';
const DELAY = 600;  // ms between actions (visual pace)
const MAX_TURNS = 300;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function launchWindow(x, y, w, h) {
  const browser = await chromium.launch({
    headless: false,
    args: [`--window-position=${x},${y}`, `--window-size=${w},${h}`],
  });
  const ctx = await browser.newContext({ viewport: { width: w - 16, height: h - 80 } });
  const page = await ctx.newPage();
  return { browser, page };
}

/** Click first matching data-action button, returns true if found */
async function act(page, action, timeout = 500) {
  try {
    const btn = page.locator(`[data-action="${action}"]`).first();
    await btn.waitFor({ state: 'attached', timeout });
    await btn.click({ force: true });
    return true;
  } catch { return false; }
}

/** Click first of any data-action=vertex/edge/hex (board overlays) */
async function actBoard(page, type, timeout = 500) {
  try {
    const btn = page.locator(`[data-action="${type}"]`).first();
    await btn.waitFor({ state: 'attached', timeout });
    await btn.click({ force: true });
    return true;
  } catch { return false; }
}

/** Check if text exists on page */
async function hasText(page, text) {
  try {
    const body = await page.innerText('body', { timeout: 200 });
    return body.includes(text);
  } catch { return false; }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🎲 CATAN E2E Visual Test — 3 Players + Host\n');

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

  // Layout: Host 1720px left, 3 players 573px each right
  // Height 1300 to stay above macOS dock
  const H = 1300;
  const hostW = 1720;
  const playerW = 573;

  const host = await launchWindow(0, 25, hostW, H);
  const p1 = await launchWindow(hostW, 25, playerW, H);
  const p2 = await launchWindow(hostW + playerW, 25, playerW, H);
  const p3 = await launchWindow(hostW + playerW * 2, 25, playerW, H);

  try { execSync(`osascript -e 'tell application "System Events" to tell application process "Ghostty" to set miniaturized of every window to true'`); } catch {}

  const players = [p1.page, p2.page, p3.page];
  const names = ['Alice', 'Bob', 'Charlie'];
  const browsers = [host.browser, p1.browser, p2.browser, p3.browser];

  try {
    // ═══ STEP 1: Host creates game ══════════════════════════════════════

    console.log('📺 Host: Creating game...');
    await host.page.goto(`${BASE}/create`);
    await sleep(2000);
    await host.page.locator('button:has-text("Opret Spil")').click();
    await sleep(3000);

    // Wait for lobby page to load and extract game code
    await host.page.locator('[data-testid="game-code"]').waitFor({ timeout: 10000 });
    const gameCode = await host.page.locator('[data-testid="game-code"]').innerText();
    const code = gameCode.trim().replace(/\s/g, '');

    if (!code || code.length < 4) {
      console.error('❌ Could not extract game code, got:', gameCode);
      return;
    }
    console.log(`📺 Game code: ${code}\n`);

    // ═══ STEP 2: Players join ═══════════════════════════════════════════

    for (let i = 0; i < 3; i++) {
      console.log(`🎮 ${names[i]} joining...`);
      await players[i].goto(`${BASE}/join?code=${code}`);
      await sleep(1500);

      // Fill name
      const nameInput = players[i].locator('input[type="text"]').first();
      await nameInput.fill(names[i]);
      await sleep(300);

      // Select a color (click i-th color button)
      const colorBtns = players[i].locator('button[title]');
      const count = await colorBtns.count();
      if (count > i) await colorBtns.nth(i).click();
      await sleep(300);

      // Join
      await players[i].locator('button:has-text("Join Spil")').click();
      await sleep(2000);
      console.log(`🎮 ${names[i]} joined!`);
    }

    await sleep(1500);

    // ═══ STEP 3: All players ready ══════════════════════════════════════

    console.log('\n✅ Players clicking Ready...');
    for (let i = 0; i < 3; i++) {
      await act(players[i], 'ready', 3000);
      await sleep(DELAY);
    }
    await sleep(2000);

    // ═══ STEP 4: Host starts game ═══════════════════════════════════════

    console.log('📺 Waiting for Start button to enable...');
    // Wait for the start button to become enabled (all players ready)
    await host.page.locator('[data-action="start-game"]:not([disabled])').waitFor({ timeout: 15000 });
    console.log('📺 Host: Starting game...');
    await host.page.locator('[data-action="start-game"]').click();
    await sleep(3000);
    console.log('🎲 Game started!\n');

    // ═══ STEP 5: Setup phase ════════════════════════════════════════════

    console.log('🏠 Setup phase — placing settlements and roads...');

    // Setup: 6 placement rounds. Each round one player places settlement + road.
    // We don't know the turn order, so poll all players until someone can act.
    for (let placement = 0; placement < 6; placement++) {
      let placed = false;

      for (let attempt = 0; attempt < 30 && !placed; attempt++) {
        for (let i = 0; i < 3; i++) {
          // Check if this player has vertex targets available
          const vertexCount = await players[i].locator('[data-action="vertex"]').count();
          if (vertexCount > 0) {
            await players[i].locator('[data-action="vertex"]').first().click({ force: true });
            console.log(`  🏠 ${names[i]} placed settlement (round ${Math.floor(placement / 3) + 1})`);
            await sleep(DELAY);

            // Now wait for edge targets
            for (let ea = 0; ea < 10; ea++) {
              const edgeCount = await players[i].locator('[data-action="edge"]').count();
              if (edgeCount > 0) {
                await players[i].locator('[data-action="edge"]').first().click({ force: true });
                console.log(`  🛤️ ${names[i]} placed road`);
                placed = true;
                break;
              }
              await sleep(300);
            }
            break;
          }
        }
        if (!placed) await sleep(500);
      }

      if (!placed) console.log(`  ⚠️ Placement ${placement + 1}/6 failed`);
      await sleep(DELAY);
    }

    await sleep(2000);
    console.log('\n🎲 Main game starting!\n');

    // ═══ STEP 6: Main game loop ═════════════════════════════════════════

    let turn = 0;

    while (turn < MAX_TURNS) {
      turn++;
      let acted = false;

      // Check all players for actions they can take
      for (let i = 0; i < 3; i++) {
        const page = players[i];

        // ── Discard (can happen for any player on a 7) ──
        if (await act(page, 'discard', 200)) {
          console.log(`🗑️ T${turn}: ${names[i]} discarded`);
          await sleep(DELAY);
        }

        // ── Roll dice ──
        if (await act(page, 'roll-dice', 200)) {
          console.log(`🎲 T${turn}: ${names[i]} rolled dice`);
          acted = true;
          await sleep(DELAY);

          // Handle any discards from other players
          for (let j = 0; j < 3; j++) {
            if (await act(players[j], 'discard', 300)) {
              console.log(`  🗑️ ${names[j]} discarded (7 roll)`);
              await sleep(DELAY / 2);
            }
          }

          // Handle robber
          if (await actBoard(page, 'hex', 500)) {
            console.log(`  👤 ${names[i]} moved robber`);
            await sleep(DELAY / 2);
            // Auto-steal first target
            await act(page, 'steal', 300);
            await sleep(DELAY / 2);
          }

          // ── Build phase: try all possible actions ──

          // Build settlement (toggle mode + click board)
          if (await act(page, 'build-settlement', 200)) {
            await sleep(300);
            if (await actBoard(page, 'vertex', 500)) {
              console.log(`  🏠 ${names[i]} built settlement`);
              await sleep(DELAY / 2);
            }
          }

          // Build city
          if (await act(page, 'build-city', 200)) {
            await sleep(300);
            if (await actBoard(page, 'vertex', 500)) {
              console.log(`  🏙️ ${names[i]} built city`);
              await sleep(DELAY / 2);
            }
          }

          // Build road
          if (await act(page, 'build-road', 200)) {
            await sleep(300);
            if (await actBoard(page, 'edge', 500)) {
              console.log(`  🛤️ ${names[i]} built road`);
              await sleep(DELAY / 2);
            }
          }

          // Buy dev card
          if (await act(page, 'buy-dev-card', 200)) {
            console.log(`  🃏 ${names[i]} bought dev card`);
            await sleep(DELAY / 2);
          }

          // Maritime trade
          if (await act(page, 'maritime-trade', 200)) {
            console.log(`  🚢 ${names[i]} maritime trade`);
            await sleep(DELAY / 2);
          }

          // End turn
          if (await act(page, 'end-turn', 300)) {
            console.log(`  ⏭️ ${names[i]} ended turn`);
          }

          await sleep(DELAY / 2);
          break;
        }
      }

      // Check for victory
      if (await hasText(host.page, 'vinder!')) {
        console.log(`\n👑 GAME OVER after ${turn} turns!`);
        const winner = await host.page.evaluate(() => {
          const el = document.querySelector('.text-amber-400.font-bold');
          return el?.textContent ?? 'Unknown';
        });
        console.log(`🏆 Winner: ${winner}`);
        break;
      }

      if (turn % 20 === 0) console.log(`   ... Turn ${turn}`);

      if (!acted) {
        // Nobody could act — might need more time for state sync
        await sleep(300);
      }
    }

    if (turn >= MAX_TURNS) console.log(`\n⏰ Reached ${MAX_TURNS} turns.`);

    // ═══ STEP 7: Screenshots ════════════════════════════════════════════

    execSync('mkdir -p recordings');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    await host.page.screenshot({ path: `recordings/catan-host-${ts}.png`, fullPage: true });
    for (let i = 0; i < 3; i++) {
      await players[i].screenshot({ path: `recordings/catan-${names[i]}-${ts}.png`, fullPage: true });
    }
    console.log(`\n📸 Screenshots saved to recordings/`);
    console.log('\n✅ E2E Complete! Closing in 10s...');
    await sleep(10000);

  } catch (err) {
    console.error('❌ Error:', err.message);
    await sleep(5000);
  } finally {
    for (const b of browsers) {
      try { await b.close(); } catch {}
    }
  }
}

main().catch(console.error);
