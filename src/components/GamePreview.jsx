import './GamePreview.css'

// Small looping CSS-animation "trailer" for each game card on the
// hub. Deliberately lightweight (no canvas, no game logic) — its
// only job is to make the hub grid feel alive instead of static
// icons, and to hint at what each game actually looks like.
export default function GamePreview({ id }) {
  switch (id) {
    case 'breakout':
      return (
        <div className="preview preview--breakout">
          <div className="bo-bricks">
            {Array.from({ length: 8 }).map((_, i) => <span key={i} className={`bo-brick bo-brick--${i % 3}`} />)}
          </div>
          <div className="bo-ball" />
          <div className="bo-paddle" />
        </div>
      )
    case 'snake':
      return (
        <div className="preview preview--snake">
          <div className="sn-trail">
            {Array.from({ length: 6 }).map((_, i) => <span key={i} className="sn-seg" style={{ animationDelay: `${i * 90}ms` }} />)}
          </div>
        </div>
      )
    case 'pong':
      return (
        <div className="preview preview--pong">
          <div className="pg-paddle pg-paddle--left" />
          <div className="pg-paddle pg-paddle--right" />
          <div className="pg-ball" />
        </div>
      )
    case 'tetris':
      return (
        <div className="preview preview--tetris">
          <div className="tt-block tt-block--1" />
          <div className="tt-block tt-block--2" />
          <div className="tt-stack" />
        </div>
      )
    case 'blaster':
      return (
        <div className="preview preview--blaster">
          {Array.from({ length: 10 }).map((_, i) => <span key={i} className="bl-star" style={{ animationDelay: `${i * 220}ms`, left: `${(i * 37) % 100}%` }} />)}
          <div className="bl-ship" />
        </div>
      )
    default:
      return <div className="preview" />
  }
}
