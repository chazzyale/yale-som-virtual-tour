import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { talk } from './talk.js'

const REACH = 6 // meters: how close you need to be to start a chat
const CENTER = new THREE.Vector2(0, 0)

// Looks through the crosshair every frame for a professor you can chat with.
// onAim(id | null) fires when that changes; clicking (or pressing E) while aiming calls onTalk(id).
export default function Interact({ activeRef, onAim, onTalk }) {
  const { camera } = useThree()
  const ray = useMemo(() => new THREE.Raycaster(undefined, undefined, 0, REACH), [])
  const aim = useRef(null)

  useEffect(() => {
    const start = () => aim.current && activeRef.current && onTalk(aim.current)
    const click = (e) => e.button === 0 && document.pointerLockElement && start()
    const key = (e) => e.code === 'KeyE' && !e.target.closest?.('input, textarea') && start()
    window.addEventListener('mousedown', click)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('mousedown', click)
      window.removeEventListener('keydown', key)
    }
  }, [activeRef, onTalk])

  useFrame(() => {
    let hit = null
    if (activeRef.current && !talk.with) {
      ray.setFromCamera(CENTER, camera)
      for (const [id, { obj }] of talk.targets) {
        if (ray.intersectObject(obj, true).length) {
          hit = id
          break
        }
      }
    }
    if (hit !== aim.current) {
      aim.current = hit
      onAim(hit)
    }
  })
  return null
}
