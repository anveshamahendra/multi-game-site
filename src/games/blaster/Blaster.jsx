import { useCallback, useEffect, useRef, useState } from 'react'
import GameFrame from '../../components/GameFrame.jsx'
import { useGameLoop } from '../../utils/useGameLoop.js'
import { getHighScore, setHighScoreIfBetter } from '../../utils/storage.js'
import { playSfx } from '../../utils/sound.js'
import './blaster.css'

// ============================================================
// BLASTER — Space-Invaders-style fixed shooter.
// The enemy formation moves as one block (classic Invaders
// behavior): step sideways every tick, and when any member of the
// formation touches a wall, the WHOLE formation drops a row,
// reverses direction, and speeds up slightly. That single rule is
// what gives this genre its rising tension, and it's simple to
// implement and explain.
// ============================================================
const GAME_ID = 'blaster'
const WIDTH = 440
const HEIGHT = 520
const PLAYER_W = 34
const PLAYER_H = 14
const PLAYER_Y = HEIGHT - 34
const BULLET_SPEED = 380
const ENEMY_BULLET_SPEED = 200
const ENEMY_ROWS = 4
const ENEMY_COLS = 8
const ENEMY_W = 28
const ENEMY_H = 16
const ENEMY_GAP = 10
const ENEMY_TOP = 50
const ROW_COLORS = ['#ff5d73', '#ffb627', '#21c4b6', '#9b6bff']
const ROW_POINTS = [40, 30, 20, 10]

function makeWave(speed) {
  const enemies = []
  const totalW = ENEMY_COLS * (ENEMY_W + ENEMY_GAP) - ENEMY_GAP
  const startX = (WIDTH - totalW) / 2
  for (let r = 0; r < ENEMY_ROWS; r++) {
    for (let c = 0; c < ENEMY_COLS; c++) {
      enemies.push({
        x: startX + c * (ENEMY_W + ENEMY_GAP),
        y: ENEMY_TOP + r * (ENEMY_H + ENEMY_GAP),
        row: r,
        alive: true,
      })
    }
  }
  return { enemies, dir: 1, speed }
}

export default function Blaster() {
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('start')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [best, setBest] = useState(() => getHighScore(GAME_ID))
  const [pulse, setPulse] = useState(false)

  const stateRef = useRef(null)
  const keysRef = useRef({ left: false, right: false })
  const shootRef = useRef(false)
  const shootCooldownRef = useRef(0)

  const resetRun = useCallback(() => {
    stateRef.current = {
      player: { x: WIDTH / 2 - PLAYER_W / 2 },
      bullets: [],
      enemyBullets: [],
      wave: makeWave(60),
      waveNumber: 1,
    }
    setScore(0)
    setLives(3)
  }, [])

  const startGame = () => { resetRun(); setStatus('playing'); playSfx('start') }
  const restartGame = () => { resetRun(); setStatus('playing'); playSfx('start') }
  const pauseGame = () => setStatus('paused')
  const resumeGame = () => setStatus('playing')

  const endGame = useCallback(() => {
    setStatus('gameover')
    playSfx('gameOver')
    setScore((sc) => { if (setHighScoreIfBetter(GAME_ID, sc)) setBest(sc); return sc })
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = true
      if (e.key === ' ') { e.preventDefault(); shootRef.current = true }
      if (e.key === 'Escape') setStatus((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s))
    }
    const onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = false
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = false
      if (e.key === ' ') shootRef.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [])

  // touch/mouse: drag to move, tap fires
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMove = (clientX) => {
      const rect = canvas.getBoundingClientRect()
      const scale = WIDTH / rect.width
      const x = (clientX - rect.left) * scale
      if (stateRef.current) stateRef.current.player.x = Math.min(WIDTH - PLAYER_W, Math.max(0, x - PLAYER_W / 2))
    }
    const onMouseMove = (e) => onMove(e.clientX)
    const onTouchMove = (e) => { onMove(e.touches[0].clientX); e.preventDefault() }
    const onDown = () => { shootRef.current = true }
    const onUp = () => { shootRef.current = false }
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('touchstart', onDown)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('touchstart', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  const update = useCallback((dt) => {
    const s = stateRef.current
    if (!s) return
    const { player, bullets, enemyBullets, wave } = s

    // player movement
    if (keysRef.current.left) player.x -= 260 * dt
    if (keysRef.current.right) player.x += 260 * dt
    player.x = Math.max(0, Math.min(WIDTH - PLAYER_W, player.x))

    // shooting
    shootCooldownRef.current -= dt
    if (shootRef.current && shootCooldownRef.current <= 0) {
      bullets.push({ x: player.x + PLAYER_W / 2 - 2, y: PLAYER_Y })
      shootCooldownRef.current = 0.32
      playSfx('move')
    }

    // enemy formation movement — classic "step, bounce, drop" pattern
    const aliveEnemies = wave.enemies.filter((e) => e.alive)
    let hitEdge = false
    for (const e of aliveEnemies) {
      e.x += wave.dir * wave.speed * dt
      if (e.x <= 4 || e.x + ENEMY_W >= WIDTH - 4) hitEdge = true
    }
    if (hitEdge) {
      wave.dir *= -1
      wave.speed = Math.min(220, wave.speed + 8)
      for (const e of wave.enemies) e.y += 16
    }

    // enemy reached player row -> game over
    if (aliveEnemies.some((e) => e.y + ENEMY_H >= PLAYER_Y)) {
      endGame()
      return
    }

    // enemy fire (small chance per alive enemy per second)
    if (aliveEnemies.length > 0 && Math.random() < dt * 0.6) {
      const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]
      enemyBullets.push({ x: shooter.x + ENEMY_W / 2 - 2, y: shooter.y + ENEMY_H })
    }

    // move bullets
    bullets.forEach((b) => (b.y -= BULLET_SPEED * dt))
    enemyBullets.forEach((b) => (b.y += ENEMY_BULLET_SPEED * dt))
    s.bullets = bullets.filter((b) => b.y > -10)
    s.enemyBullets = enemyBullets.filter((b) => b.y < HEIGHT + 10)

    // bullet vs enemy
    for (const b of s.bullets) {
      for (const e of wave.enemies) {
        if (!e.alive) continue
        if (b.x > e.x && b.x < e.x + ENEMY_W && b.y > e.y && b.y < e.y + ENEMY_H) {
          e.alive = false
          b.y = -999 // mark consumed
          setScore((sc) => sc + ROW_POINTS[e.row])
          setPulse(true); setTimeout(() => setPulse(false), 220)
          playSfx('score')
        }
      }
    }
    s.bullets = s.bullets.filter((b) => b.y > -10)

    // enemy bullet vs player
    for (const b of s.enemyBullets) {
      if (b.x > player.x && b.x < player.x + PLAYER_W && b.y > PLAYER_Y && b.y < PLAYER_Y + PLAYER_H) {
        b.y = HEIGHT + 999
        setLives((l) => {
          const next = l - 1
          if (next <= 0) endGame()
          else playSfx('hit')
          return Math.max(0, next)
        })
      }
    }
    s.enemyBullets = s.enemyBullets.filter((b) => b.y < HEIGHT + 10)

    // wave cleared -> next wave, faster
    if (wave.enemies.every((e) => !e.alive)) {
      s.waveNumber += 1
      s.wave = makeWave(Math.min(160, 60 + s.waveNumber * 12))
      playSfx('clear')
    }

    draw()
  }, [endGame])

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#241a3d'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    const s = stateRef.current
    if (!s) return

    ctx.fillStyle = '#3fa9f5'
    ctx.fillRect(s.player.x, PLAYER_Y, PLAYER_W, PLAYER_H)

    ctx.fillStyle = '#fdf9f3'
    s.bullets.forEach((b) => ctx.fillRect(b.x, b.y, 4, 10))
    ctx.fillStyle = '#ff5d73'
    s.enemyBullets.forEach((b) => ctx.fillRect(b.x, b.y, 4, 10))

    s.wave.enemies.forEach((e) => {
      if (!e.alive) return
      ctx.fillStyle = ROW_COLORS[e.row]
      ctx.fillRect(e.x, e.y, ENEMY_W, ENEMY_H)
    })
  }

  useGameLoop(update, status === 'playing')
  useEffect(() => { draw() }, [status])

  return (
    <GameFrame
      gameId={GAME_ID}
      title="Blaster"
      accent="sky"
      status={status}
      score={score}
      best={best}
      pulse={pulse}
      onStart={startGame}
      onRestart={restartGame}
      onResume={resumeGame}
      onPause={pauseGame}
      instructions={<p>← → or drag to move, Space or tap to fire. Clear the formation before it reaches you. Esc to pause.</p>}
    >
      <div>
        <div className="blaster-lives">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`blaster-life ${i >= lives ? 'blaster-life--lost' : ''}`} />
          ))}
        </div>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="blaster-canvas" />
      </div>
    </GameFrame>
  )
}
