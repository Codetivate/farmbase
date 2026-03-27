export const enokiVertexShader = `
  uniform float uTime;
  uniform float uWiltFactor;
  uniform float uGrowthScale;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vHeight;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vHeight = position.y;

    vec3 pos = position;

    pos.y *= uGrowthScale;

    float swayAmount = (1.0 - uWiltFactor) * 0.08 + uWiltFactor * 0.25;
    float swayFreq = 1.5 + uWiltFactor * 0.5;
    float heightFactor = smoothstep(0.0, 1.0, pos.y * 0.5);
    pos.x += sin(uTime * swayFreq + pos.y * 3.0) * swayAmount * heightFactor;
    pos.z += cos(uTime * swayFreq * 0.7 + pos.y * 2.5) * swayAmount * 0.6 * heightFactor;

    float wiltBend = uWiltFactor * heightFactor * 0.4;
    pos.x += wiltBend * sin(pos.y * 1.5);
    pos.y -= wiltBend * 0.3 * heightFactor;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const enokiFragmentShader = `
  uniform vec3 uHealthColor;
  uniform float uWiltFactor;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vHeight;

  void main() {
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    float diff = max(dot(vNormal, lightDir), 0.0);

    float sss = pow(max(dot(-vNormal, lightDir), 0.0), 2.0) * 0.4;
    float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0) * 0.3;

    vec3 baseColor = uHealthColor;
    vec3 wiltColor = vec3(0.55, 0.38, 0.22);
    vec3 color = mix(baseColor, wiltColor, uWiltFactor * 0.7);

    float heightGrad = smoothstep(0.0, 2.0, vPosition.y);
    color = mix(color * 0.85, color * 1.1, heightGrad);

    vec3 sssColor = vec3(1.0, 0.95, 0.85) * sss;
    vec3 rimColor = vec3(0.4, 0.9, 0.7) * rim * (1.0 - uWiltFactor);

    vec3 ambient = color * 0.25;
    vec3 diffuse = color * diff * 0.7;
    vec3 finalColor = ambient + diffuse + sssColor + rimColor;

    float pulse = sin(uTime * 2.0 + vPosition.y * 4.0) * 0.02 * (1.0 - uWiltFactor);
    finalColor += vec3(0.0, pulse, pulse * 0.5);

    gl_FragColor = vec4(finalColor, 0.92 + heightGrad * 0.08);
  }
`;

export const capVertexShader = `
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

    float swayAmount = (1.0 - uWiltFactor) * 0.06 + uWiltFactor * 0.2;
    pos.x += sin(uTime * 1.5 + pos.y * 3.0) * swayAmount;
    pos.z += cos(uTime * 1.1 + pos.y * 2.5) * swayAmount * 0.5;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const capFragmentShader = `
  uniform vec3 uHealthColor;
  uniform float uWiltFactor;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    float diff = max(dot(vNormal, lightDir), 0.0);

    float sss = pow(max(dot(-vNormal, lightDir), 0.0), 1.5) * 0.5;
    float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5) * 0.35;

    vec3 capBase = uHealthColor * 1.1;
    vec3 wiltCap = vec3(0.5, 0.35, 0.2);
    vec3 color = mix(capBase, wiltCap, uWiltFactor * 0.6);

    float edgeDark = smoothstep(0.3, 0.7, length(vUv - 0.5) * 2.0);
    color = mix(color, color * 0.75, edgeDark * 0.3);

    vec3 sssColor = vec3(1.0, 0.92, 0.8) * sss;
    vec3 rimColor = vec3(0.3, 0.85, 0.65) * rim * (1.0 - uWiltFactor);

    vec3 ambient = color * 0.3;
    vec3 diffuse = color * diff * 0.65;
    vec3 finalColor = ambient + diffuse + sssColor + rimColor;

    gl_FragColor = vec4(finalColor, 0.95);
  }
`;
