export const herbStemVertexShader = `
  uniform float uTime;
  uniform float uWiltFactor;
  uniform float uGrowthScale;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;
    pos.y *= uGrowthScale;

    float heightFactor = smoothstep(0.0, 1.0, pos.y * 0.4);
    float swayAmount = (1.0 - uWiltFactor) * 0.04 + uWiltFactor * 0.15;
    pos.x += sin(uTime * 1.2 + pos.y * 2.5) * swayAmount * heightFactor;
    pos.z += cos(uTime * 0.9 + pos.y * 2.0) * swayAmount * 0.5 * heightFactor;

    float wiltBend = uWiltFactor * heightFactor * 0.3;
    pos.x += wiltBend * sin(pos.y * 1.2);
    pos.y -= wiltBend * 0.2 * heightFactor;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const herbStemFragmentShader = `
  uniform float uWiltFactor;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.6));
    float diff = max(dot(vNormal, lightDir), 0.0);

    vec3 baseColor = vec3(0.28, 0.48, 0.22);
    vec3 wiltColor = vec3(0.45, 0.35, 0.2);
    vec3 color = mix(baseColor, wiltColor, uWiltFactor * 0.6);

    float heightGrad = smoothstep(0.0, 2.0, vPosition.y);
    color = mix(color * 0.8, color * 1.1, heightGrad);

    vec3 ambient = color * 0.35;
    vec3 diffuse = color * diff * 0.6;
    vec3 finalColor = ambient + diffuse;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const herbLeafVertexShader = `
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

    float curlAmount = 0.15 * (1.0 - uWiltFactor);
    pos.z += sin(uv.x * 3.14159) * curlAmount;

    float edgeDist = abs(uv.x - 0.5) * 2.0;
    pos.z += sin(pos.y * 8.0 + uTime * 0.5 + uLeafIndex) * 0.02 * edgeDist * (1.0 - uWiltFactor);

    float heightFactor = smoothstep(0.0, 1.0, uv.y);
    pos.x += sin(uTime * 0.7 + uLeafIndex * 2.0) * 0.015 * heightFactor * (1.0 - uWiltFactor * 0.5);

    pos.z += uWiltFactor * heightFactor * 0.08;
    pos.y -= uWiltFactor * heightFactor * 0.03;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const herbLeafFragmentShader = `
  uniform float uWiltFactor;
  uniform float uTime;
  uniform float uLeafIndex;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(0.4, 1.0, 0.6));
    float diff = max(dot(vNormal, lightDir), 0.0);

    float heightGrad = smoothstep(0.0, 0.8, vUv.y);
    vec3 baseGreen = vec3(0.2, 0.55, 0.18);
    vec3 tipGreen = vec3(0.15, 0.42, 0.12);
    vec3 baseColor = mix(baseGreen, tipGreen, heightGrad);

    float centerDist = abs(vUv.x - 0.5) * 2.0;
    float midrib = smoothstep(0.1, 0.0, centerDist) * 0.12;
    baseColor += vec3(midrib * 0.3, midrib, midrib * 0.2);

    float veinPattern = abs(sin((vUv.x - 0.5) * 24.0)) * 0.03;
    baseColor -= vec3(0.0, veinPattern, 0.0);

    vec3 wiltColor = vec3(0.5, 0.42, 0.25);
    baseColor = mix(baseColor, wiltColor, uWiltFactor * 0.5);

    float sss = pow(max(dot(-vNormal, lightDir), 0.0), 1.8) * 0.35;
    vec3 sssColor = vec3(0.4, 0.8, 0.3) * sss;

    float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5) * 0.2;
    vec3 rimColor = vec3(0.2, 0.6, 0.3) * rim * (1.0 - uWiltFactor);

    vec3 ambient = baseColor * 0.3;
    vec3 diffuse = baseColor * diff * 0.65;
    vec3 finalColor = ambient + diffuse + sssColor + rimColor;

    gl_FragColor = vec4(finalColor, 0.95);
  }
`;
