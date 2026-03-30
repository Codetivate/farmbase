// ═══════════════════════════════════════════════════════════════
// Strawberry Fruit Shaders — Photorealistic PBR-inspired GLSL
// Reference: strawberry.usd PBR textures (BC, Normal, ORM)
// ═══════════════════════════════════════════════════════════════

export const fruitStemVertexShader = `
  uniform float uTime;
  uniform float uWiltFactor;
  uniform float uGrowthScale;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;
    pos.y *= uGrowthScale;

    // Organic sway
    float heightFactor = smoothstep(0.0, 1.0, pos.y * 0.3);
    float swayAmount = (1.0 - uWiltFactor) * 0.02 + uWiltFactor * 0.10;
    pos.x += sin(uTime * 0.8 + pos.y * 2.0) * swayAmount * heightFactor;
    pos.z += cos(uTime * 0.6 + pos.y * 1.8) * swayAmount * 0.4 * heightFactor;

    // Wilt
    float wiltBend = uWiltFactor * heightFactor * 0.25;
    pos.x += wiltBend * sin(pos.y);
    pos.y -= wiltBend * 0.15 * heightFactor;

    vPosition = pos;
    vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const fruitStemFragmentShader = `
  uniform float uWiltFactor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.6));
    float diff = max(dot(vNormal, lightDir), 0.0);

    // Strawberry runner stem — pale green with reddish tinge
    vec3 baseColor = vec3(0.28, 0.48, 0.18);
    vec3 wiltColor = vec3(0.45, 0.38, 0.2);
    vec3 color = mix(baseColor, wiltColor, uWiltFactor * 0.5);

    // Slight reddish tinge near top
    float topGrad = smoothstep(0.3, 0.9, vUv.y);
    color = mix(color, vec3(0.45, 0.30, 0.18), topGrad * 0.15);

    vec3 ambient = color * 0.35;
    vec3 diffuse = color * diff * 0.6;

    gl_FragColor = vec4(ambient + diffuse, 1.0);
  }
`;

export const fruitLeafVertexShader = `
  uniform float uTime;
  uniform float uGrowthScale;
  uniform float uWiltFactor;
  uniform float uLeafIndex;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;
    pos *= uGrowthScale;

    // Trifoliate leaf curl (strawberry leaves are compound trifoliate)
    float curlAmount = 0.12 * (1.0 - uWiltFactor);
    pos.z += sin(uv.x * 3.14159) * curlAmount;

    // Serrated edge wave
    float edgeDist = abs(uv.x - 0.5) * 2.0;
    float serration = sin(uv.y * 18.0) * 0.008 * edgeDist;
    pos.x += serration;
    pos.z += sin(pos.y * 6.0 + uTime * 0.4 + uLeafIndex) * 0.012 * edgeDist * (1.0 - uWiltFactor);

    // Wilt droop
    pos.z += uWiltFactor * smoothstep(0.0, 1.0, uv.y) * 0.06;
    pos.y -= uWiltFactor * smoothstep(0.0, 1.0, uv.y) * 0.02;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const fruitLeafFragmentShader = `
  uniform float uWiltFactor;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(0.4, 1.0, 0.6));
    float diff = max(dot(vNormal, lightDir), 0.0);

    // Strawberry leaf — darker, with visible veins
    float heightGrad = smoothstep(0.0, 0.7, vUv.y);
    vec3 baseColor = mix(vec3(0.18, 0.48, 0.12), vec3(0.12, 0.35, 0.08), heightGrad);

    // Mid-rib vein pattern
    float centerDist = abs(vUv.x - 0.5) * 2.0;
    float midrib = smoothstep(0.06, 0.0, centerDist) * 0.12;
    baseColor += vec3(midrib * 0.2, midrib * 0.8, midrib * 0.15);

    // Secondary veins
    float vein = sin(vUv.y * 12.0 + vUv.x * 3.0) * 0.5 + 0.5;
    vein = smoothstep(0.42, 0.50, vein) * 0.04;
    baseColor += vec3(vein * 0.2, vein, vein * 0.15);

    // Wilt
    vec3 wiltColor = vec3(0.5, 0.42, 0.25);
    baseColor = mix(baseColor, wiltColor, uWiltFactor * 0.5);

    // Subsurface scattering
    float sss = pow(max(dot(-vNormal, lightDir), 0.0), 1.8) * 0.25;
    vec3 sssColor = vec3(0.3, 0.65, 0.2) * sss;

    vec3 ambient = baseColor * 0.3;
    vec3 diffuse = baseColor * diff * 0.65;

    // Leaf edge alpha for organic shape
    float leafShape = 1.0 - smoothstep(0.85, 1.0, centerDist);
    float tipFade = 1.0 - smoothstep(0.88, 1.0, vUv.y);

    gl_FragColor = vec4(ambient + diffuse + sssColor, leafShape * tipFade * 0.96);
  }
`;

// ═══════════════════════════════════════════════════════════════
// Strawberry Body — Realistic conical shape with achenes + SSS
// ═══════════════════════════════════════════════════════════════

export const fruitBodyVertexShader = `
  uniform float uTime;
  uniform float uGrowthScale;
  uniform float uWiltFactor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

    vec3 pos = position;
    pos *= uGrowthScale;

    // Very subtle pendulum sway
    pos.x += sin(uTime * 0.4) * 0.002;
    pos.z += cos(uTime * 0.35) * 0.001;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const fruitBodyFragmentShader = `
  uniform float uWiltFactor;
  uniform float uTime;
  uniform vec3 uFruitColor;
  uniform vec3 uFruitHighlight;
  uniform float uRipeness;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;

  // Simple noise for achene seed pattern
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);

    // --- Achene (seed pit) pattern ---
    // Use spherical UV to create achene spots
    float acheneScale = 28.0;
    vec2 acheneUV = vUv * acheneScale;
    float acheneNoise = noise(acheneUV);

    // Hexagonal-ish seed pattern
    vec2 gridUV = fract(acheneUV) - 0.5;
    float seedDist = length(gridUV);
    float seedMask = smoothstep(0.18, 0.12, seedDist);

    // Offset every other row for natural stagger
    vec2 offsetUV = acheneUV;
    offsetUV.x += step(1.0, mod(floor(acheneUV.y), 2.0)) * 0.5;
    vec2 gridUV2 = fract(offsetUV) - 0.5;
    float seedDist2 = length(gridUV2);
    float seedPattern = smoothstep(0.22, 0.14, seedDist2);

    // --- Base color gradient (tip-to-shoulder) ---
    // Strawberry: deep red at bottom (tip), lighter orange-red at shoulder (top)
    float tipGrad = smoothstep(-0.6, 0.8, vPosition.y);
    vec3 tipColor = vec3(0.72, 0.08, 0.05);       // deep crimson at tip
    vec3 shoulderColor = vec3(0.92, 0.28, 0.10);   // warm orange-red at shoulder
    vec3 whiteTop = vec3(0.95, 0.88, 0.75);        // pale near calyx

    vec3 baseColor = mix(tipColor, shoulderColor, tipGrad * 0.7);
    baseColor = mix(baseColor, whiteTop, smoothstep(0.75, 1.0, tipGrad) * 0.35 * (1.0 - uRipeness));

    // Ripeness control: unripe → pale greenish, ripe → deep red
    vec3 unripeColor = vec3(0.65, 0.75, 0.45);
    baseColor = mix(unripeColor, baseColor, uRipeness);

    // --- Achene coloring ---
    vec3 acheneColor = mix(vec3(0.85, 0.78, 0.35), vec3(0.72, 0.55, 0.20), acheneNoise);
    // Seed pits are slightly recessed (darker around achene)
    float acheneRim = smoothstep(0.14, 0.22, seedDist2) * seedPattern;
    vec3 surfaceColor = mix(baseColor, acheneColor, seedPattern * 0.55);
    // Darken flesh around each achene (pit shadow)
    surfaceColor = mix(surfaceColor, baseColor * 0.75, acheneRim * 0.3);

    // --- Subsurface Scattering (waxy translucency) ---
    float sss = pow(max(dot(-vNormal, lightDir), 0.0), 2.2) * 0.4;
    vec3 sssColor = vec3(0.95, 0.25, 0.08) * sss * uRipeness;

    // --- Specular highlight (glossy fresh surface) ---
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 42.0) * 0.45;
    // Reduce specular on achene pits
    spec *= (1.0 - seedPattern * 0.6);

    // --- Fresnel rim glow ---
    float rim = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.5) * 0.25;
    vec3 rimColor = vec3(0.95, 0.3, 0.12) * rim * (1.0 - uWiltFactor);

    // --- Wilt / overripe ---
    vec3 wiltColor = vec3(0.40, 0.28, 0.18);
    surfaceColor = mix(surfaceColor, wiltColor, uWiltFactor * 0.5);

    // --- Final composition ---
    vec3 ambient = surfaceColor * 0.28;
    vec3 diffuse = surfaceColor * diff * 0.62;
    vec3 finalColor = ambient + diffuse + sssColor + rimColor + vec3(spec * 0.8);

    // Tone mapping (prevent blowout)
    finalColor = finalColor / (finalColor + vec3(1.0)) * 1.15;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ═══════════════════════════════════════════════════════════════
// Calyx (green crown on top of strawberry)
// ═══════════════════════════════════════════════════════════════

export const calyxVertexShader = `
  uniform float uTime;
  uniform float uGrowthScale;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;
    pos *= uGrowthScale;

    // Slight curl on sepal tips
    float tipFactor = smoothstep(0.3, 1.0, length(pos.xz));
    pos.y += tipFactor * 0.03;
    pos.xz *= 1.0 + tipFactor * 0.05;

    // Micro sway
    pos.x += sin(uTime * 0.5 + pos.z * 4.0) * 0.002 * tipFactor;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const calyxFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(0.4, 1.0, 0.6));
    float diff = max(dot(vNormal, lightDir), 0.0);

    // Sepal green with slight yellow edge
    float centerDist = length(vPosition.xz);
    vec3 innerColor = vec3(0.22, 0.50, 0.12);
    vec3 outerColor = vec3(0.35, 0.55, 0.18);
    vec3 baseColor = mix(innerColor, outerColor, smoothstep(0.0, 0.15, centerDist));

    // Vein detail on sepal
    float vein = sin(vUv.y * 20.0 + vUv.x * 8.0) * 0.5 + 0.5;
    vein = smoothstep(0.4, 0.5, vein) * 0.06;
    baseColor += vec3(vein * 0.15, vein * 0.4, vein * 0.1);

    // SSS
    float sss = pow(max(dot(-vNormal, lightDir), 0.0), 2.0) * 0.2;
    vec3 sssColor = vec3(0.3, 0.6, 0.15) * sss;

    vec3 ambient = baseColor * 0.3;
    vec3 diffuse = baseColor * diff * 0.6;

    // Alpha fade at sepal tip for organic edge
    float tipAlpha = 1.0 - smoothstep(0.12, 0.18, centerDist);

    gl_FragColor = vec4(ambient + diffuse + sssColor, mix(0.95, tipAlpha, 0.3));
  }
`;
