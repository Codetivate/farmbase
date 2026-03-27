export const fruitStemVertexShader = `
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

    float heightFactor = smoothstep(0.0, 1.0, pos.y * 0.3);
    float swayAmount = (1.0 - uWiltFactor) * 0.03 + uWiltFactor * 0.12;
    pos.x += sin(uTime * 1.0 + pos.y * 2.0) * swayAmount * heightFactor;
    pos.z += cos(uTime * 0.8 + pos.y * 1.8) * swayAmount * 0.4 * heightFactor;

    float wiltBend = uWiltFactor * heightFactor * 0.25;
    pos.x += wiltBend * sin(pos.y);
    pos.y -= wiltBend * 0.15 * heightFactor;

    vPosition = pos;
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

    vec3 baseColor = vec3(0.3, 0.5, 0.2);
    vec3 wiltColor = vec3(0.45, 0.38, 0.2);
    vec3 color = mix(baseColor, wiltColor, uWiltFactor * 0.5);

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

    float curlAmount = 0.1 * (1.0 - uWiltFactor);
    pos.z += sin(uv.x * 3.14159) * curlAmount;

    float edgeDist = abs(uv.x - 0.5) * 2.0;
    pos.z += sin(pos.y * 6.0 + uTime * 0.4 + uLeafIndex) * 0.015 * edgeDist * (1.0 - uWiltFactor);

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

    float heightGrad = smoothstep(0.0, 0.7, vUv.y);
    vec3 baseColor = mix(vec3(0.25, 0.52, 0.2), vec3(0.18, 0.4, 0.15), heightGrad);

    float centerDist = abs(vUv.x - 0.5) * 2.0;
    float midrib = smoothstep(0.08, 0.0, centerDist) * 0.1;
    baseColor += vec3(midrib * 0.3, midrib, midrib * 0.2);

    vec3 wiltColor = vec3(0.5, 0.42, 0.25);
    baseColor = mix(baseColor, wiltColor, uWiltFactor * 0.5);

    float sss = pow(max(dot(-vNormal, lightDir), 0.0), 1.8) * 0.3;
    vec3 sssColor = vec3(0.4, 0.75, 0.3) * sss;

    vec3 ambient = baseColor * 0.3;
    vec3 diffuse = baseColor * diff * 0.6;

    gl_FragColor = vec4(ambient + diffuse + sssColor, 0.94);
  }
`;

export const fruitBodyVertexShader = `
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

    pos.x += sin(uTime * 0.5) * 0.003;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const fruitBodyFragmentShader = `
  uniform float uWiltFactor;
  uniform float uTime;
  uniform vec3 uFruitColor;
  uniform vec3 uFruitHighlight;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    float diff = max(dot(vNormal, lightDir), 0.0);

    float topGrad = smoothstep(-0.5, 0.8, vPosition.y);
    vec3 baseColor = mix(uFruitColor, uFruitHighlight, topGrad * 0.4);

    vec3 wiltColor = vec3(0.45, 0.35, 0.2);
    baseColor = mix(baseColor, wiltColor, uWiltFactor * 0.4);

    float sss = pow(max(dot(-vNormal, lightDir), 0.0), 2.0) * 0.35;
    vec3 sssColor = uFruitHighlight * sss;

    float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0) * 0.2;
    vec3 rimColor = uFruitHighlight * rim * (1.0 - uWiltFactor);

    float spec = pow(max(dot(reflect(-lightDir, vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 16.0) * 0.3;

    vec3 ambient = baseColor * 0.3;
    vec3 diffuse = baseColor * diff * 0.65;
    vec3 finalColor = ambient + diffuse + sssColor + rimColor + vec3(spec);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
