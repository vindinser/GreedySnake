// 浏览器端 E2E 验收：用 CDP 驱动 Chromium 跑一遍真实页面
// 覆盖 jsdom 测不到的部分——真实布局、真实 CSS、真实路由与历史记录
//
// 用法：先 npm run build:prod，再 node scripts/e2e.mjs
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const DIST_INDEX = resolve(HERE, '../dist/index.html')
const SHOT_DIR = resolve(HERE, '../output/playwright')
const PORT = 9333

const BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
]
const BROWSER = BROWSER_CANDIDATES.find(p => existsSync(p))
if (!BROWSER) {
  console.error('未找到可用的 Chromium 内核浏览器')
  process.exit(1)
}
if (!existsSync(DIST_INDEX)) {
  console.error('找不到 dist/index.html，请先执行 npm run build:prod')
  process.exit(1)
}

const PAGE_URL = 'file:///' + DIST_INDEX.replace(/\\/g, '/')

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`)
}

const userDataDir = mkdtempSync(join(tmpdir(), 'cdp-'))
const chrome = spawn(BROWSER, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--window-size=1280,900',
  PAGE_URL
], { stdio: 'ignore' })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function findPage() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await res.json()
      const page = list.find(t => t.type === 'page' && t.url.startsWith('file:'))
      if (page) return page
    } catch { /* 调试端口还没起来 */ }
    await sleep(250)
  }
  throw new Error('浏览器调试端口未就绪')
}

let ws
let msgId = 0
const pending = new Map()
const consoleErrors = []
const exceptions = []

function send(method, params = {}) {
  const id = ++msgId
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise(res => pending.set(id, res))
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.result?.exceptionDetails) {
    throw new Error('页面脚本异常: ' + JSON.stringify(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails))
  }
  return r.result?.result?.value
}

async function shot(name) {
  if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true })
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(SHOT_DIR, name), Buffer.from(r.result.data, 'base64'))
}

try {
  const page = await findPage()
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.addEventListener('open', res)
    ws.addEventListener('error', rej)
  })
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map(a => a.value ?? a.description).join(' '))
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params.exceptionDetails.exception?.description || 'unknown')
    }
  })
  await send('Runtime.enable')
  await send('Page.enable')
  await sleep(1200)

  // ========== 1. 主页 ==========
  const cardCount = await evaluate(`document.querySelectorAll('.game-card').length`)
  check('主页渲染出 4 张游戏卡片', cardCount === 4, `实际 ${cardCount}`)
  const cardNames = await evaluate(`[...document.querySelectorAll('.card-name')].map(e => e.textContent).join('|')`)
  check('卡片包含四款游戏', cardNames === '贪吃蛇|游龙52式|2048|扫雷', cardNames)
  const homeHash = await evaluate(`window.location.hash`)
  check('初始路由为空（视作主页）', homeHash === '', `hash=${homeHash}`)
  await shot('01-home.png')

  // ========== 2. 点击进入贪吃蛇：路由与挂载 ==========
  await evaluate(`document.querySelectorAll('.game-card')[0].click()`)
  await sleep(400)
  const snakeHash = await evaluate(`window.location.hash`)
  check('路由变为 #/snake', snakeHash === '#/snake', snakeHash)
  const snakeMounted = await evaluate(`!!document.querySelector('#gameContent .console')`)
  check('贪吃蛇挂载成功', snakeMounted === true)
  const noTheme = await evaluate(`![...document.body.classList].some(c => c.startsWith('theme-'))`)
  check('贪吃蛇不切换主题（沿用默认暗色）', noTheme === true)

  // ========== 3. 玩法 ==========
  await evaluate(`document.getElementById('startBtn').click()`)
  await sleep(700)
  const headLeft = await evaluate(`document.querySelector('.snake > div').offsetLeft`)
  check('蛇头已从 150px 移动', headLeft !== 150, `offsetLeft=${headLeft}`)
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowUp', bubbles:true}))`)
  await sleep(500)
  const headTop = await evaluate(`document.querySelector('.snake > div').offsetTop`)
  check('方向键 ArrowUp 生效（蛇头上移）', headTop < 150, `offsetTop=${headTop}`)
  await shot('02-snake-playing.png')

  // ========== 4. 返回主页 ==========
  await evaluate(`document.getElementById('backBtn').click()`)
  await sleep(400)
  const backHash = await evaluate(`window.location.hash`)
  check('返回后路由变为 #/home', backHash === '#/home', backHash)
  const homeShown = await evaluate(`!document.querySelector('#gameContent .console') && document.getElementById('homeView').classList.contains('show')`)
  check('游戏 DOM 已清空并回到主页', homeShown === true)

  // ========== 5. 浏览器后退不应重新进入刚退出的游戏 ==========
  await evaluate(`history.back()`)
  await sleep(500)
  const afterBackHash = await evaluate(`window.location.hash`)
  const afterBackInGame = await evaluate(`!!document.querySelector('#gameContent .console')`)
  check('浏览器后退停留在主页，没有重新进入游戏', afterBackInGame === false, `hash=${afterBackHash}`)

  // ========== 6. 深链直达 ==========
  await evaluate(`window.location.hash = '#/snake'`)
  await sleep(400)
  const deepLink = await evaluate(`!!document.querySelector('#gameContent .console')`)
  check('深链 #/snake 直达游戏', deepLink === true)

  // ========== 7. 最高分持久化 ==========
  await evaluate(`localStorage.setItem('gs:snake.best', '7')`)
  await evaluate(`location.reload()`)
  await sleep(1200)
  await evaluate(`window.location.hash = '#/snake'`)
  await sleep(500)
  const bestText = await evaluate(`document.querySelector('#bestSlot .gs-hud-value')?.textContent || ''`)
  check('最高分从存档恢复并显示', bestText === '7', `best=${bestText}`)
  await shot('03-snake-best.png')

  // ========== 8. 游龙52式与主题 ==========
  await evaluate(`window.location.hash = '#/home'`)
  await sleep(300)
  await evaluate(`document.querySelectorAll('.game-card')[1].click()`)
  await sleep(400)
  const dragonHash = await evaluate(`window.location.hash`)
  check('路由变为 #/dragon52', dragonHash === '#/dragon52', dragonHash)
  const themeOn = await evaluate(`document.body.classList.contains('theme-dragon52')`)
  check('游龙52式应用 theme-dragon52 主题', themeOn === true)
  const trackCells = await evaluate(`document.querySelectorAll('#trackGrid .track-cell').length`)
  check('牌堆轨道 52 格', trackCells === 52, `实际 ${trackCells}`)
  const dragonBest = await evaluate(`document.querySelector('#bestSlot .gs-hud-value')?.textContent || ''`)
  check('游龙52式显示历史最佳', /^\d+ : \d+$/.test(dragonBest), `best=${dragonBest}`)
  await shot('04-dragon52.png')

  await evaluate(`document.getElementById('drawBtn').click()`)
  await sleep(600)
  const cardNumber = await evaluate(`document.getElementById('cardNumber').textContent`)
  check('抽牌后牌号已显示', !!cardNumber && cardNumber.length > 0, `cardNumber=${cardNumber}`)
  const s0 = await evaluate(`document.getElementById('score0').textContent`)
  const s1 = await evaluate(`document.getElementById('score1').textContent`)
  check('抽牌后双方计分已更新', (Number(s0) + Number(s1)) > 0, `${s0} : ${s1}`)

  // ========== 9. 返回主页后主题复位 ==========
  await evaluate(`document.getElementById('backBtn').click()`)
  await sleep(400)
  const themeOff = await evaluate(`!document.body.classList.contains('theme-dragon52')`)
  check('返回主页后主题已移除', themeOff === true)
  const homeAgain = await evaluate(`document.getElementById('homeView').classList.contains('show')`)
  check('返回主页正常', homeAgain === true)

  // ========== 10. 未知路由回落 ==========
  await evaluate(`window.location.hash = '#/not-a-game'`)
  await sleep(500)
  const fallback = await evaluate(`document.getElementById('homeView').classList.contains('show')`)
  const fallbackHash = await evaluate(`window.location.hash`)
  check('未知路由回落到主页', fallback === true, `hash=${fallbackHash}`)

  // ========== 11. 2048 ==========
  await evaluate(`window.location.hash = '#/2048'`)
  await sleep(500)
  const g2048Mounted = await evaluate(`!!document.querySelector('#gameContent .g2048')`)
  check('2048 挂载成功', g2048Mounted === true)
  const theme2048 = await evaluate(`document.body.classList.contains('theme-2048')`)
  check('2048 应用 theme-2048 主题', theme2048 === true)
  const gridCells = await evaluate(`document.querySelectorAll('.g2048-cell').length`)
  check('棋盘 16 格', gridCells === 16, `实际 ${gridCells}`)
  const initialTiles = await evaluate(`document.querySelectorAll('.g2048-tile').length`)
  check('开局生成 2 个方块', initialTiles === 2, `实际 ${initialTiles}`)
  const scoreText = await evaluate(`document.querySelector('#hudSlot .gs-hud-value')?.textContent || ''`)
  check('分数信息条已渲染', scoreText === '0', `score=${scoreText}`)

  const readBoard = `[...document.querySelectorAll('.g2048-tile')].map(e => e.dataset.v + '@' + e.style.getPropertyValue('--x') + ',' + e.style.getPropertyValue('--y')).sort().join('|')`
  const beforeMove = await evaluate(readBoard)
  for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {key:'${key}', bubbles:true}))`)
    await sleep(220)
  }
  const afterMove = await evaluate(readBoard)
  check('方向键驱动方块移动', beforeMove !== afterMove, `before=${beforeMove} after=${afterMove}`)
  const tileCount = await evaluate(`document.querySelectorAll('.g2048-tile').length`)
  check('移动后棋盘方块数量合理', tileCount >= 2, `实际 ${tileCount}`)

  // 方块必须与对应的网格格严格对齐（纯 CSS 定位，逻辑测试发现不了）
  const alignment = await evaluate(`(() => {
    const cells = [...document.querySelectorAll('.g2048-cell')]
    const tiles = [...document.querySelectorAll('.g2048-tile:not(.g2048-tile--absorbed)')]
    if (!tiles.length) return 'no-tiles'
    for (const t of tiles) {
      const x = parseInt(t.style.getPropertyValue('--x'))
      const y = parseInt(t.style.getPropertyValue('--y'))
      const cell = cells[y * 4 + x]
      if (!cell) return 'missing-cell'
      const a = t.getBoundingClientRect()
      const b = cell.getBoundingClientRect()
      if (Math.abs(a.left - b.left) > 1 || Math.abs(a.top - b.top) > 1) return 'misaligned'
    }
    return 'aligned'
  })()`)
  check('方块与网格格严格对齐', alignment === 'aligned', alignment)
  await shot('05-2048.png')

  // 滑动操控：四个方向各滑一次。单个方向可能被堵住（2048 会忽略无效移动），
  // 所以不能断言某一次滑动一定改变棋盘 —— 只要有一个方向生效即可
  const beforeSwipe = await evaluate(readBoard)
  const swipes = [
    [100, 100, 100, 180],
    [180, 100, 100, 100],
    [100, 180, 100, 100],
    [100, 100, 180, 100]
  ]
  for (const [x1, y1, x2, y2] of swipes) {
    await evaluate(`(() => {
      const board = document.getElementById('board')
      board.dispatchEvent(new MouseEvent('pointerdown', {clientX: ${x1}, clientY: ${y1}, bubbles: true}))
      board.dispatchEvent(new MouseEvent('pointerup', {clientX: ${x2}, clientY: ${y2}, bubbles: true}))
    })()`)
    await sleep(220)
  }
  const afterSwipe = await evaluate(readBoard)
  check('滑动操控生效', beforeSwipe !== afterSwipe, `before=${beforeSwipe} after=${afterSwipe}`)

  await evaluate(`document.getElementById('backBtn').click()`)
  await sleep(400)
  const theme2048Off = await evaluate(`!document.body.classList.contains('theme-2048')`)
  check('返回主页后 2048 主题已移除', theme2048Off === true)

  // ========== 12. 扫雷 ==========
  await evaluate(`window.location.hash = '#/minesweeper'`)
  await sleep(500)
  const msMounted = await evaluate(`!!document.querySelector('#gameContent .ms')`)
  check('扫雷挂载成功', msMounted === true)
  const msTheme = await evaluate(`document.body.classList.contains('theme-minesweeper')`)
  check('扫雷应用 theme-minesweeper 主题', msTheme === true)
  const easyCells = await evaluate(`document.querySelectorAll('.ms-cell').length`)
  check('初级棋盘 81 格', easyCells === 81, `实际 ${easyCells}`)
  const minesCounter = await evaluate(`document.querySelector('#hudSlot .gs-hud-value')?.textContent || ''`)
  check('雷数计数显示 10', minesCounter === '10', `mines=${minesCounter}`)

  // 首击：必定安全，且会翻开一片
  await evaluate(`(() => {
    const cell = document.querySelector('.ms-cell')
    cell.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0}))
    cell.dispatchEvent(new MouseEvent('pointerup', {bubbles: true, button: 0}))
  })()`)
  await sleep(300)
  const revealedCount = await evaluate(`document.querySelectorAll('.ms-cell--revealed').length`)
  check('首击翻开了一片区域', revealedCount > 0, `翻开 ${revealedCount} 格`)
  const hitMine = await evaluate(`document.querySelectorAll('.ms-cell--hit').length`)
  check('首击不会踩到雷', hitMine === 0, `踩雷 ${hitMine} 处`)

  // 右键插旗
  await evaluate(`(() => {
    const cells = [...document.querySelectorAll('.ms-cell:not(.ms-cell--revealed)')]
    cells[0].dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true}))
  })()`)
  await sleep(200)
  const flagCount = await evaluate(`document.querySelectorAll('.ms-cell--flag').length`)
  check('右键可以插旗', flagCount === 1, `旗子 ${flagCount} 面`)
  const minesAfterFlag = await evaluate(`document.querySelector('#hudSlot .gs-hud-value')?.textContent || ''`)
  check('插旗后雷数减一', minesAfterFlag === '9', `mines=${minesAfterFlag}`)
  await shot('06-minesweeper.png')

  // 切换到中级：棋盘变成 16×16
  await evaluate(`document.querySelector('.ms-level[data-level="normal"]').click()`)
  await sleep(300)
  const normalCells = await evaluate(`document.querySelectorAll('.ms-cell').length`)
  check('切换中级后棋盘 256 格', normalCells === 256, `实际 ${normalCells}`)
  const minesNormal = await evaluate(`document.querySelector('#hudSlot .gs-hud-value')?.textContent || ''`)
  check('中级雷数显示 40', minesNormal === '40', `mines=${minesNormal}`)

  await evaluate(`document.getElementById('backBtn').click()`)
  await sleep(400)
  const msThemeOff = await evaluate(`!document.body.classList.contains('theme-minesweeper')`)
  check('返回主页后扫雷主题已移除', msThemeOff === true)

  // ========== 13. 全程无异常 ==========
  check('全程无未捕获异常', exceptions.length === 0, exceptions.join(' || '))
  check('全程无 console.error', consoleErrors.length === 0, consoleErrors.join(' || '))
} catch (err) {
  check('脚本执行完成', false, err.message)
} finally {
  try { ws?.close() } catch { /* ignore */ }
  chrome.kill()
}

const failed = results.filter(r => !r.ok)
console.log(`\n结果: ${results.length - failed.length}/${results.length} 通过`)
process.exit(failed.length === 0 ? 0 : 1)
