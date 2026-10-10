import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Labubu from './Labubu.jsx'
import { B, BOX, CAP, CYL, SMILE, SPH, TORUS, m, useChatAvatar } from './avatarKit.jsx'

// Prof. Tauhid Zaman (MGT 409): black BLACKPINK hoodie, joggers, sneakers, and a Labubu clipped to his pants.
// Idle he scans the room and bobs to music; while you're chatting he turns to look at you.

export const ZAMAN_ID = 'tauhid-zaman' // matches the backend's professor id
const HEIGHT = 1.75
const SKIN = '#c4916c'
const HAIR = '#141012'
const HOODIE = '#111114'
const PINK = '#ff4fa3'
const PANTS = '#2b2f3a'
const TORSO = new THREE.CylinderGeometry(0.215, 0.2, 0.6, 28)

function chestPrint() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 160
  const g = c.getContext('2d')
  g.fillStyle = HOODIE
  g.fillRect(0, 0, 512, 160)
  g.fillStyle = PINK
  g.font = '900 92px "Arial Black", Impact, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('BLACKPINK', 256, 84, 490)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })
}

// bobbing his head to BLACKPINK
const vibe = (t, { root, head }) => {
  head.current.rotation.x = Math.sin(t * 4.2) * 0.06
  head.current.rotation.z = Math.sin(t * 2.1) * 0.05
  root.current.position.y += Math.abs(Math.sin(t * 4.2)) * 0.015
}

export default function Zaman({ position = [0, 0, 0], rotation = 0 }) {
  const { root, head, armR, armL } = useChatAvatar({ id: ZAMAN_ID, name: 'Prof. Zaman', position, rotation, idle: vibe })
  const charm = useRef()
  const print = useMemo(chestPrint, [])
  const s = HEIGHT / 1.9

  // the Labubu keychain swings as he moves
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    charm.current.rotation.z = Math.sin(t * 2.6) * 0.25
    charm.current.rotation.x = Math.sin(t * 1.9 + 1) * 0.15
  })

  const hoodie = m(HOODIE)
  const skin = m(SKIN)
  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]} scale={s}>
      {/* sneakers + joggers */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B g={BOX} c="#f4f4f6" p={[0.1 * sx, 0.05, 0.04]} s={[0.12, 0.1, 0.27]} />
          <B g={BOX} c={PINK} p={[0.1 * sx, 0.012, 0.04]} s={[0.125, 0.025, 0.275]} />
          <B g={CYL} c={PANTS} p={[0.1 * sx, 0.5, 0]} s={[0.078, 0.82, 0.078]} />
          <B g={CYL} c="#1c1f27" p={[0.1 * sx, 0.12, 0]} s={[0.07, 0.05, 0.07]} />
        </group>
      ))}
      <B g={CYL} c={PANTS} p={[0, 0.9, 0]} s={[0.195, 0.14, 0.15]} />
      {/* belt loop + Labubu keychain on his right hip */}
      <group position={[-0.17, 0.9, 0.09]}>
        <B g={TORUS} c="#c9ccd2" o={{ metalness: 0.9, roughness: 0.25 }} s={[0.022, 0.022, 0.022]} r={[0, Math.PI / 2, 0]} />
        <group ref={charm}>
          <B g={CYL} c="#c9ccd2" o={{ metalness: 0.9, roughness: 0.25 }} p={[0, -0.04, 0]} s={[0.004, 0.06, 0.004]} />
          <Labubu fur="#f4a9c9" shirt="#111114" expression="grin" height={0.17} position={[0, -0.26, 0.01]} />
        </group>
      </group>

      {/* hoodie */}
      <mesh geometry={TORSO} material={hoodie} position={[0, 1.2, 0]} scale={[1, 1, 0.78]} />
      <B g={CYL} c="#1d1d22" p={[0, 0.92, 0]} s={[0.205, 0.06, 0.16]} />
      <B c={HOODIE} p={[0, 1.48, 0]} s={[0.27, 0.1, 0.17]} />
      <B g={BOX} c="#1b1b20" p={[0, 1.03, 0.158]} s={[0.25, 0.13, 0.02]} />
      <mesh material={print} position={[0, 1.29, 0.17]}>
        <planeGeometry args={[0.3, 0.094]} />
      </mesh>
      {/* hood bunched behind the neck + drawstrings */}
      <B g={TORUS} c={HOODIE} p={[0, 1.53, -0.04]} r={[Math.PI / 2 - 0.2, 0, 0]} s={[0.14, 0.13, 0.45]} />
      <B c={HOODIE} p={[0, 1.52, -0.13]} s={[0.14, 0.11, 0.07]} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B g={CYL} c="#f4f4f6" p={[0.045 * sx, 1.4, 0.172]} s={[0.006, 0.15, 0.006]} />
          <B g={CYL} c={PINK} p={[0.045 * sx, 1.32, 0.172]} s={[0.009, 0.025, 0.009]} />
        </group>
      ))}
      <B g={CYL} c={SKIN} p={[0, 1.57, 0]} s={[0.05, 0.08, 0.05]} />

      {/* arms: sleeves, cuffs, hands. Right arm (at -x) waves and gestures. */}
      {[
        [armR, -1],
        [armL, 1],
      ].map(([ref, sx]) => (
        <group key={sx} ref={ref} position={[0.25 * sx, 1.46, 0]}>
          <mesh geometry={CAP} material={hoodie} position={[0, -0.24, 0]} scale={[0.07, 0.2, 0.07]} />
          <B g={CYL} c="#1d1d22" p={[0, -0.44, 0]} s={[0.058, 0.05, 0.058]} />
          <mesh geometry={SPH} material={skin} position={[0, -0.5, 0.01]} scale={[0.045, 0.055, 0.04]} />
        </group>
      ))}

      {/* head pivots at the neck so it can look at you */}
      <group ref={head} position={[0, 1.6, 0]}>
        <group position={[0, -1.6, 0]}>
          <B c={SKIN} p={[0, 1.7, 0]} s={[0.12, 0.14, 0.13]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={SKIN} p={[0.122 * sx, 1.7, 0]} s={[0.02, 0.035, 0.02]} />
          ))}
          {/* short black hair */}
          <B c={HAIR} p={[0, 1.77, -0.02]} s={[0.127, 0.085, 0.13]} />
          <B c={HAIR} p={[0, 1.72, -0.055]} s={[0.124, 0.1, 0.095]} />
          <B g={BOX} c={HAIR} p={[0, 1.8, 0.085]} r={[0.35, 0, 0]} s={[0.17, 0.035, 0.06]} />
          {/* eyes, brows, nose, big smile */}
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <B c="#ffffff" p={[0.045 * sx, 1.725, 0.112]} s={[0.022, 0.018, 0.012]} />
              <B c="#2a1a12" p={[0.045 * sx, 1.725, 0.122]} s={[0.011, 0.012, 0.008]} />
              <B g={BOX} c={HAIR} p={[0.047 * sx, 1.762, 0.115]} r={[0, 0, -0.12 * sx]} s={[0.046, 0.012, 0.01]} />
            </group>
          ))}
          <B c="#b07f5c" p={[0, 1.69, 0.128]} s={[0.022, 0.03, 0.025]} />
          <B g={SMILE} c="#5a2a22" p={[0, 1.655, 0.121]} r={[0, 0, Math.PI]} s={[0.032, 0.022, 0.02]} />
        </group>
      </group>
    </group>
  )
}
