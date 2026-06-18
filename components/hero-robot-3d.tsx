"use client"

import { useRef, useEffect, Suspense } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, useAnimations, Stage, OrbitControls, Html } from "@react-three/drei"
import * as THREE from "three"
import { useRobotAnimation } from "@/lib/robot-animation-context"

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface RobotSceneProps {
  /** Path to the GLB model file (relative to /public) */
  modelPath: string
  /** Enable idle floating animation (default: true) */
  float?: boolean
  /** Floating amplitude (default: 0.08) */
  floatAmplitude?: number
  /** Enable idle Y-axis rotation (default: true) */
  rotate?: boolean
  /** Rotation speed multiplier (default: 0.12) */
  rotateSpeed?: number
  /** Stage environment preset (default: "city") */
  environment?: "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "studio" | "sunset" | "warehouse"
  /** Stage lighting intensity (default: 0.45) */
  intensity?: number
  /** Enable orbit controls for interactive dragging (default: true) */
  orbitControls?: boolean
  /** Canvas height CSS value (default: "100%") */
  height?: string
  /** Manual scale of the 3D model (default: 1) */
  scale?: number
  /** Manual Y position offset of the 3D model (default: 0) */
  positionY?: number
}

// ─── Inner Scene Model ─────────────────────────────────────────────────────────
function RobotModel({
  modelPath,
  float: enableFloat = true,
  floatAmplitude = 0.08,
  rotate: enableRotate = true,
  rotateSpeed = 0.12,
  scale = 1,
  positionY = 0,
}: Pick<RobotSceneProps, "modelPath" | "float" | "floatAmplitude" | "rotate" | "rotateSpeed" | "scale" | "positionY">) {
  const group = useRef<THREE.Group>(null)

  // Load the rigged robot model (Draco decoder enabled)
  const { scene, animations } = useGLTF(modelPath, true)

  // Bind animations to the scene skeleton
  const { actions, names } = useAnimations(animations, scene)

  const { currentAnimation, fadeDuration } = useRobotAnimation()
  const activeActionRef = useRef<string | null>(null)

  useEffect(() => {
    if (names.length === 0) return

    // Map custom/aliased animation names to actual clip names inside the GLB
    let targetName = currentAnimation
    if (currentAnimation === "waving" || currentAnimation === "idle") {
      targetName = names.find((name) => name.toLowerCase().includes("mixamo")) || names[0]
    }

    // Fallback: if the requested name isn't found, play the first clip
    const action = actions[targetName] ?? actions[names[0]]
    if (action) {
      // Crossfade: fade out previous action
      if (activeActionRef.current && activeActionRef.current !== targetName) {
        const prevAction = actions[activeActionRef.current]
        if (prevAction) {
          prevAction.fadeOut(fadeDuration)
        }
      }

      action.reset().fadeIn(fadeDuration).play()
      activeActionRef.current = targetName
    }
  }, [actions, names, currentAnimation, fadeDuration])

  // Idle float & rotation applied to the group wrapper
  useFrame((state) => {
    if (group.current) {
      const time = state.clock.getElapsedTime()
      if (enableFloat) {
        group.current.position.y = positionY + Math.sin(time * 1.5) * floatAmplitude
      } else {
        group.current.position.y = positionY
      }
      
      if (enableRotate) {
        group.current.rotation.y = time * rotateSpeed
      }
    }
  })

  return (
    <group ref={group} dispose={null} scale={scale} position={[0, positionY, 0]}>
      <primitive object={scene} />
    </group>
  )
}

// ─── Loader Fallback ───────────────────────────────────────────────────────────
function RobotLoader() {
  return (
    <Html center zIndexRange={[100, 0]}>
      <div className="flex flex-col items-center justify-center w-[200px]">
        <div className="relative animate-pulse opacity-50 flex items-center justify-center">
          <svg
            width="100"
            height="140"
            viewBox="0 0 100 150"
            fill="none"
            stroke="#c5a880"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_15px_rgba(197,168,128,0.8)]"
          >
            {/* Head */}
            <path d="M35 25 C 35 15, 65 15, 65 25 L 65 40 L 35 40 Z" />
            {/* Eyes */}
            <circle cx="45" cy="28" r="2" fill="#c5a880" />
            <circle cx="55" cy="28" r="2" fill="#c5a880" />
            {/* Neck */}
            <line x1="50" y1="40" x2="50" y2="48" />
            {/* Torso/Chassis */}
            <path d="M30 48 L70 48 L60 95 L40 95 Z" />
            {/* Spine detail */}
            <line x1="50" y1="48" x2="50" y2="95" strokeWidth="1" strokeDasharray="4 4" />
            {/* Arms */}
            <path d="M30 50 L15 75 L20 105" />
            <path d="M70 50 L85 75 L80 105" />
            {/* Hands (claws) */}
            <path d="M15 105 L20 115 L25 105" />
            <path d="M75 105 L80 115 L85 105" />
            {/* Legs */}
            <path d="M40 95 L30 135" />
            <path d="M60 95 L70 135" />
            {/* Feet */}
            <path d="M25 135 L35 135 L35 140 L25 140 Z" />
            <path d="M65 135 L75 135 L75 140 L65 140 Z" />
          </svg>
        </div>
        <span className="text-[10px] font-bold text-[#c5a880] tracking-widest uppercase mt-6 whitespace-nowrap animate-pulse drop-shadow-[0_0_8px_rgba(197,168,128,0.5)]">
          Constructing Model...
        </span>
      </div>
    </Html>
  )
}

// ─── Reusable Public Component ─────────────────────────────────────────────────
/**
 * RobotScene — Drop-in reusable 3D robot canvas.
 *
 * Usage:
 * ```tsx
 * <RobotScene modelPath="/animations/Waving.fbx.glb" scale={0.02} positionY={-1.5} />
 * ```
 */
export function RobotScene({
  modelPath,
  float = true,
  floatAmplitude = 0.08,
  rotate = true,
  rotateSpeed = 0.12,
  environment = "city",
  intensity = 0.45,
  orbitControls = true,
  height = "100%",
  scale = 1,
  positionY = 0,
}: RobotSceneProps) {
  return (
    <div className="w-full relative bg-transparent" style={{ height }}>
      <Canvas
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ width: "100%", height: "100%", touchAction: "auto" }}
      >
        <Suspense fallback={<RobotLoader />}>
          <Stage
            environment={environment}
            intensity={intensity}
            adjustCamera={false}
            shadows={{ type: "contact", opacity: 0.4, blur: 2 }}
          >
            <RobotModel
              modelPath={modelPath}
              float={float}
              floatAmplitude={floatAmplitude}
              rotate={rotate}
              rotateSpeed={rotateSpeed}
              scale={scale}
              positionY={positionY}
            />
          </Stage>

          {orbitControls && (
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              enableDamping
              minPolarAngle={Math.PI / 2.5}
              maxPolarAngle={Math.PI / 1.8}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  )
}

// Preload animation models
useGLTF.preload("/animations/Waving.fbx.glb", true)
useGLTF.preload("/animations/Looking Around.fbx.glb", true)
