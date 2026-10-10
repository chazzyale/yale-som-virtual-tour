import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import World from './World.jsx'
import Player from './Player.jsx'
import Minimap from './Minimap.jsx'
import TouchControls from './TouchControls.jsx'
import Interact from './Interact.jsx'
import Chat from './Chat.jsx'
import { talk } from './talk.js'
import { EYE, SPAWN } from './layout.js'

export default function App() {
  const [locked, setLocked] = useState(false)
  const [where, setWhere] = useState('')
  const [showMap, setShowMap] = useState(true)
  const lockRef = useRef()
  const mapRef = useRef()
  const onLock = useCallback((v) => setLocked(v), [])
  const onWhere = useCallback((w) => setWhere(w), [])
  // phones have no pointer lock, so they get a joystick + drag-to-look instead
  const [isTouch] = useState(() => matchMedia('(pointer: coarse)').matches) // phones + tablets; touchscreen laptops still get mouse mode
  const [touchOn, setTouchOn] = useState(false)
  const touchRef = useRef({ active: false, move: [0, 0], look: [0, 0], jump: false })
  const setTouch = (on) => {
    touchRef.current.active = on
    touchRef.current.move = [0, 0]
    setTouchOn(on)
  }
  const playing = locked || touchOn

  // chatting with a professor: aim at them and click (or tap "chat") to open; closing hands control back
  const [aim, setAim] = useState(null)
  const [chatWith, setChatWith] = useState(null)
  const activeRef = useRef(false)
  activeRef.current = playing && !chatWith
  const resumeTouch = useRef(false)
  const touchOnRef = useRef(false)
  touchOnRef.current = touchOn
  const openChat = useCallback((id) => {
    resumeTouch.current = touchOnRef.current
    talk.with = id
    setChatWith(id)
    if (document.pointerLockElement) document.exitPointerLock()
    if (touchOnRef.current) {
      touchRef.current.active = false
      touchRef.current.move = [0, 0]
      setTouchOn(false)
    }
  }, [])
  const closeChat = useCallback(() => {
    talk.with = null
    setChatWith(null)
    if (resumeTouch.current) {
      touchRef.current.active = true
      setTouchOn(true)
    } else {
      // re-locking only works from a click; after Esc the "Click to walk in" card shows instead
      Promise.resolve(lockRef.current?.()).catch(() => {})
    }
  }, [])
  const aimName = aim && talk.targets.get(aim)?.name

  useEffect(() => {
    const k = (e) => e.code === 'KeyM' && !e.target.closest?.('input, textarea') && setShowMap((v) => !v)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  return (
    <>
      <Canvas
        camera={{ fov: 72, near: 0.05, far: 800, position: [SPAWN.x, EYE, SPAWN.z] }}
        dpr={[1, 1.75]}
      >
        <World />
        <Player lockRef={lockRef} mapRef={mapRef} touchRef={touchRef} onLock={onLock} onWhere={onWhere} />
        <Interact activeRef={activeRef} onAim={setAim} onTalk={openChat} />
      </Canvas>

      <div className="where">
        <span className="dot" />
        {where}
      </div>
      <div className={showMap && !chatWith ? 'mapwrap' : 'mapwrap hidden'}>
        <Minimap drawRef={mapRef} />
      </div>
      <button className="maptoggle" onClick={() => setShowMap((s) => !s)}>
        {showMap ? 'hide map' : 'map'}
      </button>
      {playing && <div className={aim ? 'crosshair on' : 'crosshair'} />}
      {touchOn && <TouchControls touchRef={touchRef} onPause={() => setTouch(false)} />}
      {playing && aim && !chatWith && (
        isTouch || touchOn ? (
          <button className="talkhint tap" onPointerDown={() => openChat(aim)}>
            Chat with {aimName}
          </button>
        ) : (
          <div className="talkhint">
            <b>Click</b> to chat with {aimName}
          </div>
        )
      )}
      {chatWith && <Chat profId={chatWith} fallbackName={talk.targets.get(chatWith)?.name ?? 'Professor'} onClose={closeChat} />}

      {!playing && !chatWith && (
        <div className="overlay" onClick={() => (isTouch ? setTouch(true) : lockRef.current?.())}>
          <div className="card">
            <div className="kicker">Yale SOM · Evans Hall</div>
            <h1>Floor 2</h1>
            <p className="sub">Classroom drums, the cloister, Ross Library, the Beinecke Terrace Room, and the courtyard.</p>
            <button className="go">{isTouch ? 'Tap to walk in' : 'Click to walk in'}</button>
            {!isTouch && (
              <button
                className="go alt"
                onClick={(e) => {
                  e.stopPropagation()
                  setTouch(true)
                }}
              >
                Use on-screen joystick
              </button>
            )}
            {isTouch ? (
              <div className="keys">
                <span><b>Left thumb</b> joystick to walk (push all the way to hurry)</span>
                <span><b>Right thumb</b> drag to look</span>
              </div>
            ) : (
              <div className="keys">
                <span><b>W A S D</b> walk</span>
                <span><b>Mouse</b> look</span>
                <span><b>Shift</b> sprint</span>
                <span><b>Space</b> jump</span>
                <span><b>C</b> crouch</span>
                <span><b>M</b> map</span>
                <span><b>Esc</b> pause</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
