"use client"

import { useRef, useEffect, Suspense, useMemo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, useAnimations, Html } from "@react-three/drei"
import * as THREE from "three"
import { SkeletonUtils } from "three-stdlib"

// ─── Types ─────────────────────────────────────────────────────────────────────
export type OnboardingAnimation = "idle" | "looking" | "launch" | "waving"

export interface OnboardingRobotProps {
  /** The current animation state */
  animation: OnboardingAnimation
  /** Scale of the robot (optional, auto-calculated responsively if omitted) */
  scale?: number
  /** Y Position offset (optional, auto-calculated responsively if omitted) */
  positionY?: number
}

// ─── Multi-Animation Robot Model ────────────────────────────────────────────────
function RobotModel({ animation, scale = 1 }: { animation: OnboardingAnimation, scale?: number }) {
  const group = useRef<THREE.Group>(null)

  // 1. Load the master skin (Draco enabled)
  const { scene } = useGLTF("/model/robotmodel.draco.glb", true)

  // 2. Load all four lightweight animation skeletons
  const { animations: animIdle } = useGLTF("/animations/low/Happy Idle-low.fbx.glb", true)
  const { animations: animLooking } = useGLTF("/animations/low/Looking-low.fbx.glb", true)
  const { animations: animLaunch } = useGLTF("/animations/low/Hip Hop Dancing-low.fbx.glb", true)
  const { animations: animWaving } = useGLTF("/animations/low/Wavie Gesture.fbx.glb", true)

  // 3. Merge and rename the animations into a single array
  const mergedAnimations = useMemo(() => {
    // Clone clips to avoid mutating the original GLTF caches
    const idleClips = animIdle.map(a => a.clone())
    const lookingClips = animLooking.map(a => a.clone())
    const launchClips = animLaunch.map(a => a.clone())
    const wavingClips = animWaving.map(a => a.clone())

    // Mixamo names everything "mixamo.com", so we MUST rename them
    idleClips.forEach(clip => { clip.name = "idle" })
    lookingClips.forEach(clip => { clip.name = "looking" })
    launchClips.forEach(clip => { clip.name = "launch" })
    wavingClips.forEach(clip => { clip.name = "waving" })

    return [...idleClips, ...lookingClips, ...launchClips, ...wavingClips]
  }, [animIdle, animLooking, animLaunch, animWaving])

  // 4. Clone the scene for safety (allows rendering multiple robots if needed)
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])

  // 5. Bind the merged animations to the clone
  const { actions } = useAnimations(mergedAnimations, clone)
  const activeActionRef = useRef<string | null>(null)

  // 6. Handle state-driven crossfading
  useEffect(() => {
    if (!actions || !actions[animation]) {
      return
    }

    const action = actions[animation]!
    const fadeDuration = 0.5 // 500ms smooth crossfade

    if (activeActionRef.current && activeActionRef.current !== animation) {
      const prevAction = actions[activeActionRef.current]
      if (prevAction) {
        prevAction.fadeOut(fadeDuration)
      }
    }

    action.reset().fadeIn(fadeDuration).play()
    activeActionRef.current = animation
  }, [actions, animation])

  // Subtle floating effect
  useFrame((state) => {
    if (group.current) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.05
    }
  })

  return (
    <group ref={group} dispose={null} scale={scale}>
      <primitive object={clone} />
    </group>
  )
}

// ─── Responsive Inner Wrapper ──────────────────────────────────────────────────
function ResponsiveRobotWrapper({
  animation,
  scale: customScale,
  positionY: customPosY,
}: {
  animation: OnboardingAnimation
  scale?: number
  positionY?: number
}) {
  const { size } = useThree()

  // Calculate dynamic scale and positioning based on canvas size
  const isCompact = size.height < 450 || size.width < 500
  const isUltraCompact = size.height < 300

  let autoScale = 0.052
  let autoPosY = -2.1

  if (isUltraCompact) {
    autoScale = 0.036
    autoPosY = -1.6
  } else if (isCompact) {
    autoScale = 0.044
    autoPosY = -1.85
  }

  const finalScale = customScale ?? autoScale
  const finalPosY = customPosY ?? autoPosY

  return (
    <group position={[0, finalPosY, 0]}>
      <RobotModel animation={animation} scale={finalScale} />
    </group>
  )
}

// ─── Loader ────────────────────────────────────────────────────────────────────
function RobotLoader() {
  return (
    <Html center zIndexRange={[100, 0]}>
      <div className="flex flex-col items-center justify-center">
        <div className="relative animate-pulse opacity-50 flex items-center justify-center">
          <svg className="w-16 h-16 text-[#c5a880] drop-shadow-[0_0_12px_rgba(197,168,128,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a2 2 0 0 1 2 2c-.001.942-.28 1.838-.8 2.6A2 2 0 0 1 12 8l-6 6-2-2"></path>
            <path d="M14 6v6l4-4"></path>
            <path d="m20 12-4 4 2 2"></path>
            <path d="m2 16 6-6"></path>
          </svg>
        </div>
      </div>
    </Html>
  )
}

// ─── Scene Wrapper ─────────────────────────────────────────────────────────────
export function OnboardingRobot3D({ animation, scale, positionY }: OnboardingRobotProps) {
  return (
    <div className="w-full h-full relative z-10 pointer-events-none">
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 8], fov: 45 }}
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <Suspense fallback={<RobotLoader />}>
          <ambientLight intensity={1.4} />
          <directionalLight position={[5, 8, 5]} intensity={2.2} />
          <directionalLight position={[-5, 2, -3]} intensity={1.0} color="#c5a880" />
          <pointLight position={[0, 3, 4]} intensity={1.2} color="#ffffff" />
          
          <ResponsiveRobotWrapper animation={animation} scale={scale} positionY={positionY} />
        </Suspense>
      </Canvas>
    </div>
  )
}

// Preload assets for instant stable rendering
useGLTF.preload("/model/robotmodel.draco.glb", true)
useGLTF.preload("/animations/low/Happy Idle-low.fbx.glb", true)
useGLTF.preload("/animations/low/Looking-low.fbx.glb", true)
useGLTF.preload("/animations/low/Hip Hop Dancing-low.fbx.glb", true)
useGLTF.preload("/animations/low/Wavie Gesture.fbx.glb", true)
