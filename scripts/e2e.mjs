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
  check('主页渲染出 2 张游戏卡片', cardCount === 2, `实际 ${cardCount}`)
  const cardNames = await evaluate(`[...document.querySelectorAll('.card-name')].map(e => e.textContent).join('|')`)
  check('卡片包含贪吃蛇与游龙52式', cardNames === '贪吃蛇|游龙52式', cardNames)
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

  // ========== 11. 全程无异常 ==========
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
