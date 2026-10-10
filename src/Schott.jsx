import * as THREE from 'three'
import Totoro from './Totoro.jsx'
import { B, BOX, CAP, CYL, SMILE, SPH, m, useChatAvatar } from './avatarKit.jsx'

// Prof. Peter Schott (MGT 407 Statistics, EMBA): light blue open-collar button-down, khakis, side-parted brown
// hair, blue eyes, and a Totoro riding on his shoulder. Idle he bounces on his toes like a SoCal optimist.

export const SCHOTT_ID = 'peter-schott' // matches the backend's professor id
const HEIGHT = 1.82
const SKIN = '#ecc3a5'
const HAIR = '#6b4428'
const SHIRT = '#a9c8ea'
const SHIRT_DARK = '#93b6dd'
const PANTS = '#b9a27a'
const TORSO = new THREE.CylinderGeometry(0.21, 0.19, 0.6, 28)

const upbeat = (t, { root, head }) => {
  root.current.position.y += Math.abs(Math.sin(t * 2.2)) * 0.02
  head.current.rotation.z = Math.sin(t * 1.1) * 0.08 // friendly head tilt
  head.current.rotation.x = Math.sin(t * 2.2) * 0.03
}

export default function Schott({ position = [0, 0, 0], rotation = 0 }) {
  const { root, head, armR, armL } = useChatAvatar({ id: SCHOTT_ID, name: 'Prof. Schott', position, rotation, idle: upbeat })
  const s = HEIGHT / 1.9
  const shirt = m(SHIRT)
  const skin = m(SKIN)
  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]} scale={s}>
      {/* brown shoes + khakis + belt */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B g={BOX} c="#5a3a22" p={[0.1 * sx, 0.045, 0.04]} s={[0.11, 0.09, 0.26]} />
          <B g={CYL} c={PANTS} p={[0.1 * sx, 0.5, 0]} s={[0.075, 0.82, 0.075]} />
        </group>
      ))}
      <B g={CYL} c={PANTS} p={[0, 0.88, 0]} s={[0.19, 0.12, 0.145]} />
      <B g={CYL} c="#4a3020" p={[0, 0.955, 0]} s={[0.192, 0.035, 0.15]} />
      <B g={BOX} c="#c9b27a" o={{ metalness: 0.7, roughness: 0.3 }} p={[0, 0.955, 0.148]} s={[0.04, 0.03, 0.01]} />

      {/* button-down, tucked in, open collar */}
      <mesh geometry={TORSO} material={shirt} position={[0, 1.26, 0]} scale={[1, 1, 0.76]} />
      <B c={SHIRT} p={[0, 1.5, 0]} s={[0.26, 0.09, 0.165]} />
      <B g={BOX} c={SHIRT_DARK} p={[0, 1.22, 0.152]} s={[0.022, 0.5, 0.008]} />
      {[1.05, 1.17, 1.29].map((y) => (
        <B key={y} c="#f4f6fa" p={[0, y, 0.158]} s={[0.008, 0.008, 0.004]} />
      ))}
      <B g={BOX} c={SKIN} p={[0, 1.5, 0.152]} r={[0, 0, Math.PI / 4]} s={[0.075, 0.075, 0.012]} />
      {/* collar points spread open over the shoulders */}
      {[-1, 1].map((sx) => (
        <B key={sx} g={BOX} c="#bcd5f0" p={[0.06 * sx, 1.525, 0.15]} r={[-0.25, 0.3 * sx, 0.75 * sx]} s={[0.085, 0.04, 0.012]} />
      ))}
      <B g={CYL} c={SHIRT} p={[0, 1.55, -0.02]} s={[0.075, 0.05, 0.07]} />
      <B g={CYL} c={SKIN} p={[0, 1.58, 0]} s={[0.05, 0.07, 0.05]} />

      {/* Totoro sits on his left shoulder */}
      <Totoro height={0.21} position={[0.24, 1.55, -0.01]} phase={0.6} />

      {/* sleeves, cuffs, hands */}
      {[
        [armR, -1],
        [armL, 1],
      ].map(([ref, sx]) => (
        <group key={sx} ref={ref} position={[0.25 * sx, 1.47, 0]}>
          <mesh geometry={CAP} material={shirt} position={[0, -0.24, 0]} scale={[0.065, 0.2, 0.065]} />
          <B g={CYL} c={SHIRT_DARK} p={[0, -0.44, 0]} s={[0.055, 0.04, 0.055]} />
          <mesh geometry={SPH} material={skin} position={[0, -0.5, 0.01]} scale={[0.045, 0.055, 0.04]} />
        </group>
      ))}

      {/* head pivots at the neck so it can look at you */}
      <group ref={head} position={[0, 1.6, 0]}>
        <group position={[0, -1.6, 0]}>
          <B c={SKIN} p={[0, 1.7, 0]} s={[0.118, 0.142, 0.128]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={SKIN} p={[0.12 * sx, 1.7, 0]} s={[0.02, 0.036, 0.02]} />
          ))}
          {/* full brown hair, side part swept to his left */}
          <B c={HAIR} p={[0, 1.775, -0.015]} s={[0.128, 0.092, 0.134]} />
          <B c={HAIR} p={[0, 1.715, -0.06]} s={[0.122, 0.105, 0.09]} />
          <B c={HAIR} p={[0.02, 1.815, 0.05]} r={[0.2, 0, -0.22]} s={[0.12, 0.05, 0.085]} />
          <B g={BOX} c="#5a3820" p={[-0.06, 1.835, 0.035]} r={[0, 0, -0.3]} s={[0.006, 0.02, 0.09]} />
          {[-1, 1].map((sx) => (
            <B key={sx} g={BOX} c={HAIR} p={[0.113 * sx, 1.7, 0.03]} s={[0.012, 0.05, 0.03]} />
          ))}
          {/* blue eyes, brows, nose, warm closed smile */}
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <B c="#ffffff" p={[0.044 * sx, 1.722, 0.11]} s={[0.022, 0.016, 0.012]} />
              <B c="#5d86b5" p={[0.044 * sx, 1.722, 0.119]} s={[0.011, 0.012, 0.008]} />
              <B c="#141414" p={[0.044 * sx, 1.722, 0.125]} s={[0.005, 0.005, 0.004]} />
              <B g={BOX} c={HAIR} p={[0.046 * sx, 1.757, 0.113]} r={[0, 0, -0.08 * sx]} s={[0.046, 0.011, 0.01]} />
              <B c="#e9b69c" p={[0.068 * sx, 1.672, 0.102]} s={[0.018, 0.011, 0.008]} />
            </group>
          ))}
          <B c="#e2b394" p={[0, 1.69, 0.126]} s={[0.02, 0.032, 0.025]} />
          <B g={SMILE} c="#9a5a4a" p={[0, 1.652, 0.118]} r={[0, 0, Math.PI]} s={[0.034, 0.016, 0.016]} />
        </group>
      </group>
    </group>
  )
}
