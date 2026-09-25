// ============================================================
// storage.js — shared localStorage helper used by every game.
// Keeping this in one file means all 5 games save high scores
// the same way, and we can list a combined leaderboard on the
// hub page without each game inventing its own key format.
// ============================================================

const PREFIX = 'neonrow'

/**
 * Read the saved high score for a game.
 * @param {string} gameId - e.g. "breakout"
 * @returns {number}
 */
export function getHighScore(gameId) {
  const raw = localStorage.getItem(`${PREFIX}:${gameId}:highscore`)
  return raw ? Number(raw) : 0
}

/**
 * Save a new high score IF it beats the current one.
 * Returns true if it was a new record.
 */
export function setHighScoreIfBetter(gameId, score) {
  const current = getHighScore(gameId)
  if (score > current) {
    localStorage.setItem(`${PREFIX}:${gameId}:highscore`, String(score))
    return true
  }
  return false
}

/**
 * Returns { breakout: 1200, snake: 40, ... } for every known game,
 * used by the hub page to show a best-score badge on each card.
 */
export function getAllHighScores(gameIds) {
  return Object.fromEntries(gameIds.map((id) => [id, getHighScore(id)]))
}
