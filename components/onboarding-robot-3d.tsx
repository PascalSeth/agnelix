"use client"

import { Suspense, useEffect, useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useFBX, Environment, ContactShadows } from "@react-three/drei"
import * as THREE from "three"
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js"

interface OnboardingRobot3DProps {
  animationState: "idle" | "thinking" | "waving" | "dancing" | "looking"
  posY?: number
  rotY?: number
  scale?: number
  cameraZ?: number
  hideBackground?: boolean
  loopWaving?: boolean
  useContinuousWaving?: boolean
  posX?: number
}

// Module-level cache to keep loaded animation clips across mounts
const clipCache: Record<string, THREE.AnimationClip> = {}

// ── ROBOT MODEL SUB-COMPONENT ──────────────────────────────────────────────
function RobotModel({ animationState, posY = 0.6, posX = 0, rotY = 0, scale = 0.019, loopWaving = false, useContinuousWaving = false }: OnboardingRobot3DProps) {
  // Use the idle action FBX as the persistent rendered model.
  // This guarantees bone name matching when we apply clips from the other action files,
  // since all Mixamo exports share the same skeleton hierarchy.
  const fbx = useFBX("/actions/Breathing Idle.fbx")

  // Safely clone the skinned mesh model using SkeletonUtils so multiple concurrent
  // instances can render on the same page without render-stealing or animation bugs.
  const model = useMemo(() => SkeletonUtils.clone(fbx), [fbx])

  const wavingPath = useContinuousWaving ? "/actions/Waving.fbx" : "/actions/Waving Gesture.fbx"

  const groupRef = useRef<THREE.Group>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({})
  
  // Track latest desired state so loading callbacks can play the correct clip
  const desiredStateRef = useRef(animationState)
  useEffect(() => {
    desiredStateRef.current = animationState
  }, [animationState])

  // Apply orientation fix + materials, then set up the animation mixer
  useEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
        const meshName = mesh.name.toLowerCase()
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        const patched = mats.map((m) => enhanceMaterial(m as THREE.MeshStandardMaterial, meshName))
        mesh.material = Array.isArray(mesh.material) ? patched : patched[0]
      }
    })

    // Set up a single persistent AnimationMixer on the model
    const mixer = new THREE.AnimationMixer(model)
    mixerRef.current = mixer

    // Register idle clip from original loaded FBX animations array
    const idleClip = fbx.animations[0].clone()
    idleClip.name = "idle"
    // Strip root-motion position tracks from clip.
    idleClip.tracks = idleClip.tracks.filter(
      (track) => !track.name.toLowerCase().endsWith(".position")
    )
    const idleAction = mixer.clipAction(idleClip)
    actionsRef.current["idle"] = idleAction

    // Helper to register a clip on the active mixer
    const registerClipFromData = (name: string, clip: THREE.AnimationClip) => {
      const cloned = clip.clone()
      cloned.name = name
      cloned.tracks = cloned.tracks.filter(
        (track) => !track.name.toLowerCase().endsWith(".position")
      )
      actionsRef.current[name] = mixer.clipAction(cloned)
    }

    // Register already cached clips immediately
    if (clipCache["/actions/Thinking.fbx"]) {
      registerClipFromData("thinking", clipCache["/actions/Thinking.fbx"])
    }
    if (clipCache[wavingPath]) {
      registerClipFromData("waving", clipCache[wavingPath])
    }
    if (clipCache["/actions/Hip Hop Dancing.fbx"]) {
      registerClipFromData("dancing", clipCache["/actions/Hip Hop Dancing.fbx"])
    }
    if (clipCache["/actions/looking idle.fbx"]) {
      registerClipFromData("looking", clipCache["/actions/looking idle.fbx"])
    }

    // Play whichever state is desired right now if it's already registered, otherwise play idle
    const desired = desiredStateRef.current
    const start = actionsRef.current[desired] ?? actionsRef.current.idle
    if (start) {
      if (desired === "waving") {
        start.setLoop(THREE.LoopOnce, 1)
        start.clampWhenFinished = true
      } else {
        start.setLoop(THREE.LoopRepeat, Infinity)
      }
      start.play()
    }

    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
      mixerRef.current = null
      actionsRef.current = {}
    }
  }, [model, wavingPath, fbx.animations])

  // Load animations in the background
  useEffect(() => {
    // Helper to register a loaded clip on the active mixer and potentially switch to it
    const registerLoadedClip = (clipName: string, path: string, clip: THREE.AnimationClip) => {
      clipCache[path] = clip
      
      const mixer = mixerRef.current
      if (!mixer) return

      // Register the clip if it's not already in the actions
      if (!actionsRef.current[clipName]) {
        const cloned = clip.clone()
        cloned.name = clipName
        cloned.tracks = cloned.tracks.filter(
          (track) => !track.name.toLowerCase().endsWith(".position")
        )
        const action = mixer.clipAction(cloned)
        actionsRef.current[clipName] = action
      }

      // If the current desired state is this animation, play it now
      if (desiredStateRef.current === clipName) {
        const action = actionsRef.current[clipName]
        if (action) {
          if (clipName === "waving" && !loopWaving) {
            action.setLoop(THREE.LoopOnce, 1)
            action.clampWhenFinished = true
          } else {
            action.setLoop(THREE.LoopRepeat, Infinity)
          }

          // Fade out all other running actions
          Object.entries(actionsRef.current).forEach(([name, act]) => {
            if (name !== clipName && act.isRunning()) {
              act.fadeOut(0.3)
            }
          })

          action.reset().fadeIn(0.3).play()
        }
      }
    }

    // Dynamic import of FBXLoader so it only runs on the client side
    import("three/examples/jsm/loaders/FBXLoader.js").then(({ FBXLoader }) => {
      const loader = new FBXLoader()

      // Load thinking animation
      const thinkingPath = "/actions/Thinking.fbx"
      if (clipCache[thinkingPath]) {
        registerLoadedClip("thinking", thinkingPath, clipCache[thinkingPath])
      } else {
        loader.load(
          thinkingPath,
          (fbx) => {
            if (fbx.animations && fbx.animations.length > 0) {
              registerLoadedClip("thinking", thinkingPath, fbx.animations[0])
            }
          },
          undefined,
          (err) => console.error("Error loading Thinking.fbx:", err)
        )
      }

      // Load waving animation
      if (clipCache[wavingPath]) {
        registerLoadedClip("waving", wavingPath, clipCache[wavingPath])
      } else {
        loader.load(
          wavingPath,
          (fbx) => {
            if (fbx.animations && fbx.animations.length > 0) {
              registerLoadedClip("waving", wavingPath, fbx.animations[0])
            }
          },
          undefined,
          (err) => console.error(`Error loading ${wavingPath}:`, err)
        )
      }

      // Load dancing animation
      const dancingPath = "/actions/Hip Hop Dancing.fbx"
      if (clipCache[dancingPath]) {
        registerLoadedClip("dancing", dancingPath, clipCache[dancingPath])
      } else {
        loader.load(
          dancingPath,
          (fbx) => {
            if (fbx.animations && fbx.animations.length > 0) {
              registerLoadedClip("dancing", dancingPath, fbx.animations[0])
            }
          },
          undefined,
          (err) => console.error("Error loading Hip Hop Dancing.fbx:", err)
        )
      }

      // Load looking idle animation
      const lookingPath = "/actions/looking idle.fbx"
      if (clipCache[lookingPath]) {
        registerLoadedClip("looking", lookingPath, clipCache[lookingPath])
      } else {
        loader.load(
          lookingPath,
          (fbx) => {
            if (fbx.animations && fbx.animations.length > 0) {
              registerLoadedClip("looking", lookingPath, fbx.animations[0])
            }
          },
          undefined,
          (err) => console.error("Error loading looking idle.fbx:", err)
        )
      }
    })
  }, [wavingPath, loopWaving])

  // Cross-fade to a new animation whenever animationState changes
  useEffect(() => {
    const actions = actionsRef.current
    if (!Object.keys(actions).length) return  // mixer/idle action not ready yet

    const next = actions[animationState]
    if (!next) {
      // If the target action is not loaded yet, fallback to playing idle
      const idleAction = actions["idle"]
      if (idleAction && !idleAction.isRunning()) {
        Object.entries(actions).forEach(([name, action]) => {
          if (name !== "idle" && action.isRunning()) action.fadeOut(0.3)
        })
        idleAction.reset().fadeIn(0.3).play()
      }
      return
    }

    if (animationState === "waving" && !loopWaving) {
      next.setLoop(THREE.LoopOnce, 1)
      next.clampWhenFinished = true
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity)
    }

    Object.entries(actions).forEach(([name, action]) => {
      if (name !== animationState && action.isRunning()) action.fadeOut(0.3)
    })

    next.reset().fadeIn(0.3).play()
  }, [animationState, loopWaving])

  // Keep track of the current values using refs so we can lerp them smoothly
  const posXRef = useRef(posX)
  const scaleRef = useRef(scale)
  const posYRef = useRef(posY)

  // Advance the mixer each frame + apply floating animation on the outer group
  useFrame((state, delta) => {
    mixerRef.current?.update(delta)
    if (groupRef.current) {
      const t = state.clock.getElapsedTime()
      
      // Smoothly lerp X, Y, and Scale inside WebGL for maximum performance (no layout shifts)
      posXRef.current = THREE.MathUtils.lerp(posXRef.current, posX, 0.05)
      posYRef.current = THREE.MathUtils.lerp(posYRef.current, posY, 0.05)
      scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, scale, 0.05)

      groupRef.current.position.x = posXRef.current
      groupRef.current.position.y = posYRef.current + Math.sin(t * 1.5) * 0.06
      groupRef.current.rotation.y = rotY + Math.sin(t * 0.4) * 0.15
      
      // Apply the animated scale to the parent group
      groupRef.current.scale.setScalar(scaleRef.current)
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={model} scale={1} />
    </group>
  )
}

// Enhance a material in-place by cloning it and patching only PBR properties.
// Cloning preserves all texture maps (diffuse, normal, roughness, AO, etc.)
// that are embedded in the original FBX material.
function enhanceMaterial(
  original: THREE.MeshStandardMaterial,
  meshName: string,
): THREE.MeshStandardMaterial {
  const mat = original.clone() as THREE.MeshStandardMaterial
  const n = (mat.name ?? "").toLowerCase()

  // Glowing eye / visor parts — add emissive on top of whatever texture exists
  if (
    n.includes("eye") || n.includes("glow") || n.includes("light") ||
    meshName.includes("eye") || meshName.includes("glow") || meshName.includes("visor")
  ) {
    mat.emissive = new THREE.Color("#7c83fd")
    mat.emissiveIntensity = 2.5
    mat.roughness = Math.min(mat.roughness, 0.15)
    mat.metalness = Math.max(mat.metalness, 0.1)
    return mat
  }

  // Dark joint / inner frame parts
  if (
    n.includes("joint") || n.includes("inner") || n.includes("frame") ||
    n.includes("metal_dark") || meshName.includes("joint") || meshName.includes("inner")
  ) {
    mat.roughness  = 0.45
    mat.metalness  = 0.85
    return mat
  }

  // Default — keep original textures, just boost metalness slightly for a premium look
  mat.roughness = mat.roughness > 0 ? mat.roughness * 0.85 : 0.2
  mat.metalness = Math.max(mat.metalness, 0.55)
  return mat
}


// ── 3D WIREFRAME SKELETON LOADER ──────────────────────────────────────────
function WireframeRobotLoader({ scale = 2.1, posY = 0.6 }: { scale?: number; posY?: number }) {
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 1.8
      const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 4) * 0.04
      const currentScale = scale * pulse
      groupRef.current.scale.set(currentScale, currentScale, currentScale)
    }
  })

  return (
    <group ref={groupRef} position={[0, posY - 0.7, 0]}>
      {/* ── HEAD ASSEMBLY ── */}
      {/* Head Sphere */}
      <mesh position={[0, 0.74, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      
      {/* Visor / Eyes */}
      <mesh position={[0, 0.76, 0.14]}>
        <boxGeometry args={[0.22, 0.05, 0.05]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>

      {/* Left Antenna */}
      <mesh position={[-0.15, 0.9, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.1, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Left Antenna Tip */}
      <mesh position={[-0.17, 0.96, 0]}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>

      {/* Right Antenna */}
      <mesh position={[0.15, 0.9, 0]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.1, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Right Antenna Tip */}
      <mesh position={[0.17, 0.96, 0]}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.08, 8]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>


      {/* ── TORSO ASSEMBLY ── */}
      {/* Upper Chest */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.34, 0.22, 0.2]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>

      {/* Waist Joint */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>

      {/* Pelvis */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.28, 0.12, 0.18]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>


      {/* ── LEFT ARM (DOWN) ── */}
      {/* Left Shoulder */}
      <mesh position={[-0.21, 0.48, 0]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Left Upper Arm */}
      <mesh position={[-0.26, 0.36, 0]}>
        <cylinderGeometry args={[0.03, 0.025, 0.16, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Left Elbow */}
      <mesh position={[-0.29, 0.26, 0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Left Forearm */}
      <mesh position={[-0.32, 0.16, 0]}>
        <cylinderGeometry args={[0.025, 0.02, 0.16, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Left Hand */}
      <mesh position={[-0.35, 0.06, 0]}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>


      {/* ── RIGHT ARM (RAISED WAVING) ── */}
      {/* Right Shoulder */}
      <mesh position={[0.21, 0.48, 0]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Right Upper Arm */}
      <mesh position={[0.27, 0.58, 0]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.03, 0.025, 0.16, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Right Elbow */}
      <mesh position={[0.33, 0.68, 0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Right Forearm */}
      <mesh position={[0.37, 0.8, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.025, 0.02, 0.16, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Right Hand */}
      <mesh position={[0.4, 0.9, 0]}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>


      {/* ── LEGS ASSEMBLY ── */}
      {/* Left Hip Joint */}
      <mesh position={[-0.1, 0.06, 0]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Left Thigh */}
      <mesh position={[-0.1, -0.08, 0]}>
        <cylinderGeometry args={[0.035, 0.03, 0.2, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Left Knee */}
      <mesh position={[-0.1, -0.2, 0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Left Shin */}
      <mesh position={[-0.1, -0.34, 0]}>
        <cylinderGeometry args={[0.03, 0.025, 0.22, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Left Foot */}
      <mesh position={[-0.1, -0.47, 0.03]}>
        <boxGeometry args={[0.07, 0.04, 0.14]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>

      {/* Right Hip Joint */}
      <mesh position={[0.1, 0.06, 0]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Right Thigh */}
      <mesh position={[0.1, -0.08, 0]}>
        <cylinderGeometry args={[0.035, 0.03, 0.2, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Right Knee */}
      <mesh position={[0.1, -0.2, 0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Right Shin */}
      <mesh position={[0.1, -0.34, 0]}>
        <cylinderGeometry args={[0.03, 0.025, 0.22, 6]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
      {/* Right Foot */}
      <mesh position={[0.1, -0.47, 0.03]}>
        <boxGeometry args={[0.07, 0.04, 0.14]} />
        <meshBasicMaterial color="#7c83fd" wireframe />
      </mesh>
    </group>
  )
}

// ── PARTICLE DATA (module-level — computed once at import, never during render) ──
function buildParticleData() {
  const pos = new Float32Array(400 * 3)
  const col = new Float32Array(400 * 3)
  for (let i = 0; i < 400; i++) {
    const r     = 4 + Math.random() * 6
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.acos(2 * Math.random() - 1)
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = (Math.random() - 0.5) * 8
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    const t        = Math.random()
    col[i * 3]     = 0.48 + t * 0.52
    col[i * 3 + 1] = 0.45 + t * 0.35
    col[i * 3 + 2] = 0.98
  }
  return { pos, col }
}
const PARTICLE_DATA = buildParticleData()

// ── PARTICLE FIELD ────────────────────────────────────────────────────────────
function ParticleField() {
  const ref = useRef<THREE.Points>(null)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.018
      ref.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.008) * 0.06
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute args={[PARTICLE_DATA.pos, 3]} attach="attributes-position" />
        <bufferAttribute args={[PARTICLE_DATA.col, 3]} attach="attributes-color" />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        vertexColors
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}


// ── MAIN CANVAS COMPONENT ──────────────────────────────────────────────────
export default function OnboardingRobot3D({ 
  animationState, 
  posY = 0.6, 
  posX = 0,
  rotY = 0, 
  scale = 0.019, 
  cameraZ = 5.5, 
  hideBackground = false, 
  loopWaving = false,
  useContinuousWaving = false 
}: OnboardingRobot3DProps) {
  return (
    <div className="w-full h-full relative" style={{ minHeight: "inherit" }}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 0.2, cameraZ], fov: 46 }}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      >
        {/* Atmospheric fog for depth */}
        {!hideBackground && <fog attach="fog" args={["#05060a", 12, 24]} />}

        {/* Ambient violet tint */}
        <ambientLight intensity={0.9} color="#b3b7ff" />

        {/* Dramatic key light */}
        <directionalLight
          position={[3, 6, 4]}
          intensity={2.8}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Deep violet rim light from behind-left */}
        <directionalLight position={[-5, 3, -3]} intensity={2.0} color="#7c83fd" />
        {/* Soft fill from below */}
        <pointLight position={[0, -1, 2]} intensity={0.8} color="#9e7cfd" />

        {/* Floating particle stars */}
        {!hideBackground && <ParticleField />}

        <Suspense fallback={<WireframeRobotLoader posY={posY} />}>
          <Environment preset="city" />
          <RobotModel 
            animationState={animationState} 
            posY={posY} 
            posX={posX}
            rotY={rotY} 
            scale={scale} 
            loopWaving={loopWaving} 
            useContinuousWaving={useContinuousWaving}
          />
        </Suspense>
        <ContactShadows position={[0, -1.5, 0]} opacity={0.45} scale={12} blur={2.5} far={0} />
      </Canvas>
    </div>
  )
}
