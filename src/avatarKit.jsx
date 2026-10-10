import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { talk } from './talk.js'

// Shared pieces for chat-able professor avatars (Zaman.jsx, Schott.jsx, ...).
// Avatars are built like Professor.jsx: ~1.9 units tall before scaling, facing +z, own right hand at -x.

const mats = new Map()
export const m = (color, o = {}) => {
  const k = color + JSON.stringify(o)
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }))
  return mats.get(k)
}
export const SPH = new THREE.SphereGeometry(1, 24, 16)
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 20)
export const BOX = new THREE.BoxGeometry(1, 1, 1)
export const CONE = new THREE.ConeGeometry(1, 1, 20)
export const TORUS = new THREE.TorusGeometry(1, 0.14, 8, 24)
export const SMILE = new THREE.TorusGeometry(1, 0.16, 6, 16, Math.PI)
export const CAP = new THREE.CapsuleGeometry(1, 1, 6, 12)

export const B = ({ g = SPH, c, p, s, r = [0, 0, 0], o }) => <mesh geometry={g} material={m(c, o)} position={p} scale={s} rotation={r} />

const angleTo = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from))

// Makes an avatar clickable for chat and animates it: scans the room when idle (plus an optional
// `idle(t, refs)` flourish), turns to face you and looks at your eyes while chatting, waves hello
// when a chat opens, and gestures for a few seconds after each reply.
// Returns refs to attach: root (whole figure), head (pivot at the neck), armR / armL (pivot at the shoulder).
export function useChatAvatar({ id, name, position, rotation, idle }) {
  const refs = { root: useRef(), head: useRef(), armR: useRef(), armL: useRef() }
  const yaw = useRef(rotation)
  const chatSince = useRef(null)

  useEffect(() => {
    talk.targets.set(id, { obj: refs.root.current, name })
    return () => talk.targets.delete(id)
  }, [id, name]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock, camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = clock.elapsedTime
    const { root, head, armR, armL } = refs
    const chatting = talk.with === id
    if (chatting && chatSince.current === null) chatSince.current = t
    if (!chatting) chatSince.current = null

    const dx = camera.position.x - position[0]
    const dz = camera.position.z - position[2]
    const target = chatting ? Math.atan2(dx, dz) : rotation + Math.sin(t * 0.4) * 0.35
    yaw.current += angleTo(yaw.current, target) * Math.min(1, dt * (chatting ? 6 : 2))
    root.current.rotation.y = yaw.current
    root.current.position.y = position[1]
    head.current.rotation.set(0, 0, 0)

    const sinceOpen = chatSince.current === null ? 99 : t - chatSince.current
    const talking = (performance.now() - talk.replyAt) / 1000 < 2.5
    armR.current.rotation.set(-0.35, 0, -0.12)
    armL.current.rotation.set(-0.35, 0, 0.12)

    if (chatting) {
      const pitch = -Math.atan2(camera.position.y - (position[1] + 1.65), Math.hypot(dx, dz))
      head.current.rotation.x = THREE.MathUtils.clamp(pitch, -0.45, 0.45)
      if (sinceOpen < 1.6) armR.current.rotation.set(0, 0, -2.5 + Math.sin(t * 10) * 0.35)
      else if (talking) {
        armR.current.rotation.set(-0.9 - Math.sin(t * 5) * 0.35, 0, -0.25)
        armL.current.rotation.set(-0.7 - Math.sin(t * 5 + 1.5) * 0.3, 0, 0.12)
      }
    } else {
      idle?.(t, refs)
    }
  })
  return refs
}
