export const napaLeafVertexShader = `
  uniform float uTime;
  uniform float uGrowthScale;
  uniform float uWiltFactor;
  uniform float uWrapTightness;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;
    pos *= uGrowthScale;

    float cupAmount = 0.25 * uWrapTightness;
    pos.z += sin(uv.x * 3.14159) * cupAmount * (0.5 + pos.y * 0.3);

    float edgeDist = abs(uv.x - 0.5) * 2.0;
    pos.z += sin(pos.y * 10.0 + uTime * 0.3) * 0.015 * edgeDist * (1.0 - uWiltFactor);
    pos.x += sin(pos.y * 6.0) * 0.01 * edgeDist;

    float heightFactor = smoothstep(0.0, 1.0, pos.y * 0.3);
    pos.x += sin(uTime * 0.8 + pos.y * 1.5) * 0.01 * heightFactor * (1.0 - uWiltFactor * 0.5);

    pos.z += uWiltFactor * heightFactor * 0.12;
    pos.y -= uWiltFactor * heightFactor * 0.04;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const napaLeafFragmentShader = `
  uniform float uTime;
  uniform float uWiltFactor;
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform float uIsInner;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(0.4, 1.0, 0.6));
    float diff = max(dot(vNormal, lightDir), 0.0);

    float heightGrad = smoothstep(0.0, 0.7, vUv.y);
    vec3 baseColor = mix(uBaseColor, uTipColor, heightGrad);

    float centerDist = abs(vUv.x - 0.5) * 2.0;
    float midrib = smoothstep(0.12, 0.0, centerDist) * 0.15;
    baseColor += vec3(midrib * 0.8, midrib, midrib * 0.6);

    float veinPattern = abs(sin((vUv.x - 0.5) * 30.0)) * 0.04 * (1.0 - vUv.y * 0.3);
    baseColor -= vec3(0.0, veinPattern, veinPattern * 0.5);

    vec3 wiltColor = vec3(0.55, 0.5, 0.3);
    baseColor = mix(baseColor, wiltColor, uWiltFactor * 0.5);

    float sss = pow(max(dot(-vNormal, lightDir), 0.0), 1.8) * 0.4;
    vec3 sssColor = vec3(0.6, 0.9, 0.5) * sss * (1.0 - uIsInner * 0.5);

    float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5) * 0.2;
    vec3 rimColor = vec3(0.3, 0.7, 0.4) * rim * (1.0 - uWiltFactor);

    vec3 ambient = baseColor * 0.35;
    vec3 diffuse = baseColor * diff * 0.6;
    vec3 finalColor = ambient + diffuse + sssColor + rimColor;

    gl_FragColor = vec4(finalColor, 0.96);
  }
`;

export const napaCoreVertexShader = `
  uniform float uTime;
  uniform float uGrowthScale;
  uniform float uWiltFactor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;
    pos *= uGrowthScale;
    pos.x += sin(uTime * 0.5) * 0.005;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const napaCoreFragmentShader = `
  uniform float uWiltFactor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(0.4, 1.0, 0.6));
    float diff = max(dot(vNormal, lightDir), 0.0);

    vec3 baseColor = vec3(0.88, 0.92, 0.72);
    float heightGrad = smoothstep(-0.5, 1.5, vPosition.y);
    baseColor = mix(vec3(0.92, 0.94, 0.85), vec3(0.7, 0.82, 0.5), heightGrad);

    vec3 wiltColor = vec3(0.6, 0.55, 0.35);
    baseColor = mix(baseColor, wiltColor, uWiltFactor * 0.4);

    float sss = pow(max(dot(-vNormal, lightDir), 0.0), 2.0) * 0.3;
    vec3 sssColor = vec3(0.7, 0.9, 0.6) * sss;

    vec3 ambient = baseColor * 0.4;
    vec3 diffuse = baseColor * diff * 0.55;
    vec3 finalColor = ambient + diffuse + sssColor;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
