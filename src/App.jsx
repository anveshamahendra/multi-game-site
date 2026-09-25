import { Routes, Route } from 'react-router-dom'
import Hub from './pages/Hub.jsx'
import Breakout from './games/breakout/Breakout.jsx'
import Snake from './games/snake/Snake.jsx'
import Pong from './games/pong/Pong.jsx'
import Tetris from './games/tetris/Tetris.jsx'
import Blaster from './games/blaster/Blaster.jsx'

// Each game is its own route + its own folder under src/games/<game>/.
// A teammate only ever needs to touch their own folder — nobody else's
// game imports from it, so merge conflicts should be rare.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Hub />} />
      <Route path="/breakout" element={<Breakout />} />
      <Route path="/snake" element={<Snake />} />
      <Route path="/pong" element={<Pong />} />
      <Route path="/tetris" element={<Tetris />} />
      <Route path="/blaster" element={<Blaster />} />
    </Routes>
  )
}
