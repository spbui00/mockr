import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- SHADERS ---
const vertexShader = `
  uniform float u_time;
  uniform float u_frequency;
  
  varying float vDistortion;

  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

  float cnoise(vec3 P){
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
    return 2.2 * n_xyz;
  }

  void main() {
    float noise = cnoise(position + u_time);
    float distortion = (u_frequency / 50.0) * noise; 
    vec3 newPosition = position + (normal * distortion);
    vDistortion = noise;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 u_color;
  varying float vDistortion;

  void main() {
    vec3 color = u_color + (vDistortion * 0.3); 
    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- COMPONENTS ---

const AudioMesh = ({ 
  isSpeaking, 
  audioAnalyser, 
  color 
}: { 
  isSpeaking: boolean; 
  audioAnalyser?: AnalyserNode; 
  color: { r: number; g: number; b: number };
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(() => ({
    u_time: { value: 0.0 },
    u_frequency: { value: 0.0 },
    u_color: { value: new THREE.Color(color.r, color.g, color.b) }
  }), []);

  useEffect(() => {
    uniforms.u_color.value.setRGB(color.r, color.g, color.b);
  }, [color, uniforms]);

  useFrame((state) => {
    if (!meshRef.current) return;

    // FIX: We cast the material to ShaderMaterial so TypeScript knows 'uniforms' exists
    const material = meshRef.current.material as THREE.ShaderMaterial;

    material.uniforms.u_time.value = state.clock.getElapsedTime() * 0.5;

    let targetFreq = 0;
    if (audioAnalyser) {
      const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
      audioAnalyser.getByteFrequencyData(dataArray);
      const lowerHalf = dataArray.slice(0, dataArray.length / 2);
      const average = lowerHalf.reduce((a, b) => a + b, 0) / lowerHalf.length;
      targetFreq = average;
    } else if (isSpeaking) {
      targetFreq = Math.sin(state.clock.getElapsedTime() * 4) * 20 + 30;
    } else {
      targetFreq = 5; 
    }

    const currentFreq = material.uniforms.u_frequency.value;
    material.uniforms.u_frequency.value = THREE.MathUtils.lerp(currentFreq, targetFreq, 0.1);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[2.5, 64]} /> 
      <shaderMaterial 
        wireframe={true}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
};

export default function ThreeVisualizer({ 
  isSpeaking, 
  theme, 
  audioAnalyser 
}: { 
  isSpeaking: boolean; 
  theme: { colors: { r: number; g: number; b: number } };
  audioAnalyser?: AnalyserNode;
}) {
  return (
    <Canvas 
      camera={{ position: [0, 0, 8], fov: 45 }} 
      gl={{ alpha: true, antialias: true }}
      className="w-full h-full"
    >
      <AudioMesh 
        isSpeaking={isSpeaking} 
        audioAnalyser={audioAnalyser} 
        color={theme.colors} 
      />
      
      <EffectComposer enabled={true}>
        <Bloom 
          intensity={1.5} 
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9} 
          mipmapBlur={true} 
        />
      </EffectComposer>
    </Canvas>
  );
}