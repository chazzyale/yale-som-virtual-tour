import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { B, BOX, CONE, SMILE } from './avatarKit.jsx'

// A little Totoro plush built from primitives: about 1 unit tall at height = 1 (ears included), facing +z.
const FUR = '#7f8682'
const BELLY = '#efe7d0'
const INK = '#1d1c1a'

// belly chevrons sit on the belly ellipsoid's surface (center [0, 0.33, 0.12], radii 0.3 / 0.3 / 0.26)
const CHEVRONS = [
  ...[-0.09, 0, 0.09].map((x) => [x, 0.47]),
  ...[-0.135, -0.045, 0.045, 0.135].map((x) => [x, 0.4]),
].map(([x, y]) => [x, y, 0.12 + 0.26 * Math.sqrt(Math.max(0, 1 - (x / 0.3) ** 2 - ((y - 0.33) / 0.3) ** 2)) - 0.005])

export default function Totoro({ height = 1, position = [0, 0, 0], rotation = 0, phase = 0 }) {
  const body = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    body.current.position.y = Math.abs(Math.sin(t * 2.4)) * 0.06 // happy little hops
    body.current.rotation.z = Math.sin(t * 1.2) * 0.08
  })
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={height}>
      <group ref={body}>
        <B c={FUR} p={[0, 0.36, 0]} s={[0.4, 0.36, 0.35]} />
        <B c={FUR} p={[0, 0.55, 0]} s={[0.33, 0.33, 0.3]} />
        <B c={BELLY} p={[0, 0.33, 0.12]} s={[0.3, 0.3, 0.26]} />
        {CHEVRONS.map((p, i) => (
          <B key={i} g={CONE} c={FUR} p={p} r={[0.25, 0, 0]} s={[0.028, 0.035, 0.008]} />
        ))}
        {/* ears */}
        {[-1, 1].map((sx) => (
          <B key={sx} g={CONE} c={FUR} p={[0.12 * sx, 0.93, 0]} r={[0, 0, -0.18 * sx]} s={[0.06, 0.2, 0.05]} />
        ))}
        {/* eyes, nose, wide grin, whiskers */}
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <B c="#ffffff" p={[0.12 * sx, 0.7, 0.245]} s={[0.055, 0.055, 0.03]} />
            <B c={INK} p={[0.12 * sx, 0.7, 0.27]} s={[0.024, 0.024, 0.012]} />
            {[-1, 0, 1].map((k) => (
              <B key={k} g={BOX} c={INK} p={[0.27 * sx, 0.63 + k * 0.03, 0.2]} r={[0, -0.5 * sx, k * 0.12 * sx]} s={[0.16, 0.006, 0.006]} />
            ))}
          </group>
        ))}
        <B c={INK} p={[0, 0.75, 0.27]} s={[0.035, 0.014, 0.015]} />
        <B g={SMILE} c={INK} p={[0, 0.65, 0.255]} r={[0, 0, Math.PI]} s={[0.1, 0.04, 0.02]} />
        {/* stubby arms + feet */}
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <B c={FUR} p={[0.37 * sx, 0.38, 0.06]} r={[0, 0, 0.25 * sx]} s={[0.08, 0.2, 0.08]} />
            <B c={FUR} p={[0.15 * sx, 0.03, 0.12]} s={[0.1, 0.05, 0.12]} />
          </group>
        ))}
      </group>
    </group>
  )
}
