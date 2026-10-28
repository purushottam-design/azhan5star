/* Azhan / Five Star — a local, image-free Three.js scene. Compatible with r160. */
(function () {
  'use strict';

  var canvas = document.getElementById('webgl');
  var T = window.THREE;
  var noop = function () {};
  window.AzhanScene = { setProgress: noop, setSection: noop, setMotion: noop, dispose: noop };
  if (!canvas || !T) {
    document.documentElement.dataset.webgl = 'off';
    return;
  }

  var renderer;
  try {
    renderer = new T.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power'
    });
  } catch (error) {
    document.documentElement.dataset.webgl = 'off';
    return;
  }

  document.documentElement.dataset.webgl = 'on';
  renderer.setClearColor(0x090b08, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(39, 1, 0.1, 65);
  camera.position.set(0, 0, 9.5);
  var group = new T.Group();
  scene.add(group);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobile = window.innerWidth < 760;
  var motionEnabled = !reduced.matches;
  var paused = document.hidden;
  var disposed = false;
  var frame = 0;
  var timer = 0;
  var lastTime = 0;
  var scrollTarget = 0;
  var scrollCurrent = 0;
  var section = 'hero';
  var sectionWeight = 1;
  var sectionTarget = 1;
  var pointer = { x: 0, y: 0 };
  var easedPointer = { x: 0, y: 0 };
  var targetX = 2.65;
  var targetY = 0;
  var targetScale = 1;
  var geometries = [];
  var materials = [];

  function geometry(value) { geometries.push(value); return value; }
  function material(value) { materials.push(value); return value; }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function ease(a, b, amount) { return a + (b - a) * amount; }

  // Procedural studio lighting: no remotely hosted texture or image requests.
  var studioCanvas = document.createElement('canvas');
  studioCanvas.width = 512;
  studioCanvas.height = 256;
  var studioContext = studioCanvas.getContext('2d');
  var environmentTexture = null;
  var environmentTarget = null;
  if (studioContext) {
    var wash = studioContext.createLinearGradient(0, 0, 0, 256);
    wash.addColorStop(0, '#666b70');
    wash.addColorStop(0.4, '#141714');
    wash.addColorStop(0.75, '#050705');
    wash.addColorStop(1, '#151a10');
    studioContext.fillStyle = wash;
    studioContext.fillRect(0, 0, 512, 256);
    studioContext.fillStyle = '#ffffff';
    studioContext.fillRect(52, 15, 40, 135);
    studioContext.fillRect(255, 45, 85, 75);
    studioContext.fillStyle = '#c7cdcb';
    studioContext.fillRect(440, 20, 24, 150);
    studioContext.fillStyle = '#b9ed44';
    studioContext.fillRect(365, 125, 34, 80);
    try {
      environmentTexture = new T.CanvasTexture(studioCanvas);
      environmentTexture.mapping = T.EquirectangularReflectionMapping;
      environmentTexture.colorSpace = T.SRGBColorSpace;
      var pmrem = new T.PMREMGenerator(renderer);
      environmentTarget = pmrem.fromEquirectangular(environmentTexture);
      scene.environment = environmentTarget.texture;
      pmrem.dispose();
    } catch (error) {
      // Directional lights below keep the star readable without an environment.
    }
  }

  scene.add(new T.HemisphereLight(0xf4f5ef, 0x1b2411, 2.2));
  var key = new T.DirectionalLight(0xffffff, 4.2);
  key.position.set(-3, 5, 7);
  scene.add(key);
  var fill = new T.DirectionalLight(0xc8d8e4, 2.4);
  fill.position.set(6, -1, 4);
  scene.add(fill);
  var rim = new T.DirectionalLight(0xc4ff32, 3.5);
  rim.position.set(-5, -2, -4);
  scene.add(rim);

  var silver = material(new T.MeshStandardMaterial({
    color: 0xcbd0cf,
    roughness: 0.23,
    metalness: 0.92,
    envMapIntensity: 1.1
  }));
  var edgeSilver = material(new T.MeshStandardMaterial({
    color: 0x8f9692,
    roughness: 0.32,
    metalness: 0.86,
    envMapIntensity: 1.25
  }));
  var lime = material(new T.MeshStandardMaterial({
    color: 0xc4ff32,
    emissive: 0x486504,
    emissiveIntensity: 0.25,
    metalness: 0.55,
    roughness: 0.28
  }));

  var starShape = new T.Shape();
  for (var i = 0; i < 10; i += 1) {
    var radius = i % 2 === 0 ? 1.58 : 0.69;
    var angle = Math.PI / 2 + i * Math.PI / 5;
    var x = Math.cos(angle) * radius;
    var y = Math.sin(angle) * radius;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();
  var starGeometry = geometry(new T.ExtrudeGeometry(starShape, {
    depth: 0.31,
    bevelEnabled: true,
    bevelSize: 0.14,
    bevelThickness: 0.15,
    bevelSegments: 5,
    steps: 1,
    curveSegments: 6
  }));
  starGeometry.translate(0, 0, -0.155);
  var star = new T.Mesh(starGeometry, [silver, edgeSilver]);
  star.rotation.set(-0.15, -0.35, -0.13);
  group.add(star);

  // Slender intersecting orbits deliberately sit behind the main star.
  var orbitGroup = new T.Group();
  group.add(orbitGroup);
  var orbitGeometry = geometry(new T.TorusGeometry(2.15, 0.009, 5, 128));
  var orbitMaterial = material(new T.MeshBasicMaterial({
    color: 0xb9c3aa, transparent: true, opacity: 0.26, depthWrite: false
  }));
  var orbit = new T.Mesh(orbitGeometry, orbitMaterial);
  orbit.rotation.set(0.72, 0.28, -0.48);
  orbitGroup.add(orbit);
  var secondOrbit = new T.Mesh(orbitGeometry, orbitMaterial);
  secondOrbit.rotation.set(1.06, -0.4, 0.47);
  secondOrbit.scale.setScalar(1.12);
  orbitGroup.add(secondOrbit);

  var satellite = new T.Mesh(geometry(new T.IcosahedronGeometry(0.115, 0)), lime);
  orbitGroup.add(satellite);
  var satelliteTwo = new T.Mesh(geometry(new T.SphereGeometry(0.045, 8, 6)), silver);
  orbitGroup.add(satelliteTwo);

  // Open film outlines: recognisable depth without competing with real media.
  var frames = new T.Group();
  group.add(frames);
  var frameMaterial = material(new T.LineBasicMaterial({
    color: 0xd7e2c6, transparent: true, opacity: 0.21, depthWrite: false
  }));
  var framePoints = [
    new T.Vector3(-0.34, -0.58, 0), new T.Vector3(0.34, -0.58, 0),
    new T.Vector3(0.34, 0.58, 0), new T.Vector3(-0.34, 0.58, 0)
  ];
  var filmGeometry = geometry(new T.BufferGeometry().setFromPoints(framePoints));
  var filmA = new T.LineLoop(filmGeometry, frameMaterial);
  filmA.position.set(-1.9, -0.75, 0.12);
  filmA.rotation.set(0.15, -0.4, -0.22);
  frames.add(filmA);
  var filmB = new T.LineLoop(filmGeometry, frameMaterial);
  filmB.position.set(1.7, 0.8, -0.2);
  filmB.rotation.set(-0.15, 0.55, 0.3);
  frames.add(filmB);
  var filmC = new T.LineLoop(filmGeometry, frameMaterial);
  filmC.position.set(0.5, -1.95, -0.8);
  filmC.rotation.set(0.2, 0.3, -0.4);
  filmC.scale.setScalar(0.6);
  frames.add(filmC);

  var count = mobile ? 90 : 160;
  var positions = new Float32Array(count * 3);
  var seed = 17491;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  for (var p = 0; p < count; p += 1) {
    positions[p * 3] = (random() - 0.5) * 17;
    positions[p * 3 + 1] = (random() - 0.5) * 10;
    positions[p * 3 + 2] = (random() - 0.5) * 8 - 3;
  }
  var particleGeometry = geometry(new T.BufferGeometry());
  particleGeometry.setAttribute('position', new T.BufferAttribute(positions, 3));
  var particleMaterial = material(new T.PointsMaterial({
    color: 0xc4ff32,
    size: 0.018,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
    depthWrite: false
  }));
  var particles = new T.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  function layout() {
    mobile = window.innerWidth < 760;
    var width = Math.max(1, window.innerWidth);
    var height = Math.max(1, window.innerHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.setSize(width, height, false);
    targetX = mobile ? 0.75 : Math.min(3.2, camera.aspect * 1.6);
    targetY = mobile ? -0.65 : 0;
    targetScale = mobile ? 0.59 : Math.min(1, width / 1200);
    if (section === 'outro') targetX *= 0.45;
    if (!motionEnabled) draw(performance.now(), true);
  }

  function draw(now, single) {
    if (disposed) return;
    var delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = now;
    var amount = motionEnabled ? 1 - Math.exp(-delta * 4.5) : 1;
    if (motionEnabled && !paused) timer += delta;
    scrollCurrent = ease(scrollCurrent, scrollTarget, amount);
    sectionWeight = ease(sectionWeight, sectionTarget, amount);
    easedPointer.x = ease(easedPointer.x, motionEnabled ? pointer.x : 0, amount);
    easedPointer.y = ease(easedPointer.y, motionEnabled ? pointer.y : 0, amount);

    var weightScale = 0.58 + sectionWeight * 0.42;
    var travel = motionEnabled ? scrollCurrent : 0;
    group.position.x = ease(group.position.x, targetX + travel * 0.7, amount);
    group.position.y = ease(group.position.y, targetY + Math.sin(timer * 0.43) * 0.11 + travel * 0.8, amount);
    group.position.z = ease(group.position.z, section === 'hero' ? 0 : -1.4, amount);
    group.scale.setScalar(targetScale * weightScale);
    star.rotation.x = -0.15 + Math.sin(timer * 0.25) * 0.14 + easedPointer.y * 0.12;
    star.rotation.y = -0.35 + Math.sin(timer * 0.2) * 0.32 + easedPointer.x * 0.28 + travel * 1.6;
    star.rotation.z = -0.13 + Math.sin(timer * 0.18) * 0.08 - travel * 0.65;
    orbitGroup.rotation.z = timer * 0.035 + travel * 0.6;
    satellite.position.set(Math.cos(timer * 0.27) * 2.14, Math.sin(timer * 0.27) * 1.55, Math.sin(timer * 0.27) * 0.85);
    satelliteTwo.position.set(Math.cos(timer * 0.18 + 2.6) * 2.28, Math.sin(timer * 0.18 + 2.6) * 2.02, -0.5);
    filmA.position.y = -0.75 + Math.sin(timer * 0.4 + 1) * 0.12;
    filmB.position.y = 0.8 + Math.sin(timer * 0.38 + 3) * 0.15;
    frames.rotation.z = Math.sin(timer * 0.16) * 0.045;
    particles.rotation.y = timer * 0.006 + travel * 0.05;
    particles.position.y = travel * 0.4;
    particleMaterial.opacity = 0.2 + sectionWeight * 0.28;
    camera.position.x = easedPointer.x * 0.12;
    camera.position.y = -easedPointer.y * 0.1;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);

    if (!single && motionEnabled && !paused) frame = window.requestAnimationFrame(draw);
    else frame = 0;
  }

  function start() {
    if (!disposed && !paused && motionEnabled && !frame) {
      lastTime = 0;
      frame = window.requestAnimationFrame(draw);
    }
  }
  function stop() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }
  function setMotion(enabled) {
    motionEnabled = Boolean(enabled) && !reduced.matches;
    if (motionEnabled) start();
    else {
      stop();
      draw(performance.now(), true);
    }
  }
  function setProgress(value) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    scrollTarget = clamp(parsed, 0, 1);
    if (!motionEnabled) draw(performance.now(), true);
  }
  function setSection(value) {
    if (['hero', 'reels', 'photos', 'outro'].indexOf(value) < 0 || value === section) return;
    section = value;
    sectionTarget = value === 'hero' ? 1 : value === 'outro' ? 0.85 : 0.12;
    layout();
  }
  function onPointer(event) {
    pointer.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
    pointer.y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
  }
  function onVisibility() {
    paused = document.hidden;
    if (paused) stop();
    else if (motionEnabled) start();
    else draw(performance.now(), true);
  }
  function onReducedChange() { setMotion(!reduced.matches); }
  function onContextLost(event) {
    event.preventDefault();
    stop();
    document.documentElement.dataset.webgl = 'off';
  }
  function onContextRestored() {
    document.documentElement.dataset.webgl = 'on';
    layout();
    start();
    if (!motionEnabled) draw(performance.now(), true);
  }

  window.addEventListener('resize', layout, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  if (reduced.addEventListener) reduced.addEventListener('change', onReducedChange);

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    window.removeEventListener('resize', layout);
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    if (reduced.removeEventListener) reduced.removeEventListener('change', onReducedChange);
    geometries.forEach(function (item) { item.dispose(); });
    materials.forEach(function (item) { item.dispose(); });
    if (environmentTarget) environmentTarget.dispose();
    if (environmentTexture) environmentTexture.dispose();
    renderer.dispose();
  }

  window.AzhanScene = {
    setProgress: setProgress,
    setSection: setSection,
    setMotion: setMotion,
    dispose: dispose
  };
  layout();
  group.position.set(targetX, targetY, 0);
  group.scale.setScalar(targetScale);
  if (motionEnabled) start();
  else draw(performance.now(), true);
}());
