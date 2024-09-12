// Create the scene, camera, and renderer
import * as THREE from 'https://cdn.skypack.dev/three@0.133.1/build/three.module';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.133.1/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);  // Start camera behind player

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('canvas'),
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0xbfd1e5); // Light blue background

// Add some basic lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Ground texture with filtering for sharper graphics
const groundTexture = new THREE.TextureLoader().load('texture-ground.png', (texture) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.anisotropy = 16;
});

// Create a ground plane
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Create a blocky player model (like Minecraft)
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);  // Blocky player
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1; // Half height to stand on the ground
scene.add(player);

// Create a blocky bot
const botGeometry = new THREE.BoxGeometry(1, 2, 1);
const botMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const bot = new THREE.Mesh(botGeometry, botMaterial);
bot.position.set(5, 1, 0);  // Position the bot
scene.add(bot);

// Variables for gravity and jumping
let velocityY = 0;
const gravity = -0.01;  // Gravity force
let canJump = false;

// Movement and key controls
let keysDown = {};

// Mouse rotation (yaw and pitch)
let yaw = 0;
let pitch = 0;
let targetYaw = 0;    // Target rotation for smooth transition
let targetPitch = 0;  // Target pitch for smooth transition
let sensitivity = 0.002;
const damping = 0.1;  // Damping factor for smooth camera movement

// Distance and height for camera relative to the player
const cameraDistance = 5;
const cameraHeight = 2;

// Lock the pointer for camera control
document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

document.addEventListener('click', () => {
  document.body.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === document.body) {
    document.addEventListener('mousemove', onMouseMove, false);
  } else {
    document.removeEventListener('mousemove', onMouseMove, false);
  }
});

function onMouseMove(event) {
  targetYaw -= event.movementX * sensitivity;
  targetPitch -= event.movementY * sensitivity;

  // Clamp pitch to avoid flipping the camera up/down too much
  targetPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetPitch));
}

// FPS Counter Variables
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;
const fpsElement = document.createElement('div');
fpsElement.style.position = 'absolute';
fpsElement.style.top = '10px';
fpsElement.style.right = '10px';
fpsElement.style.color = '#000';
fpsElement.style.fontFamily = 'Arial';
fpsElement.style.fontSize = '14px';
document.body.appendChild(fpsElement);

// Game Version Display
const versionElement = document.createElement('div');
versionElement.innerText = 'v0.0.1';
versionElement.style.position = 'absolute';
versionElement.style.bottom = '10px';
versionElement.style.left = '10px';
versionElement.style.color = '#000';
versionElement.style.fontFamily = 'Arial';
versionElement.style.fontSize = '14px';
document.body.appendChild(versionElement);

// Load the gun texture
const gunTexture = new THREE.TextureLoader().load('https://img1.cgtrader.com/items/257274/f1b1608edb/texture-weapons-3d-model-blend.jpg', (texture) => {
  texture.anisotropy = 16;  // Sharper texture rendering
});

// Create the gun model and apply the texture
const gunGeometry = new THREE.BoxGeometry(1, 0.3, 2); // Simplified gun shape
const gunMaterial = new THREE.MeshStandardMaterial({ map: gunTexture });
const gun = new THREE.Mesh(gunGeometry, gunMaterial);
gun.position.set(0.5, 0.5, -1);  // Place gun in front of the player
scene.add(gun);

// Variables for shooting and gun status
let hasGun = true;  // Player starts with the gun
let bullets = [];
const bulletSpeed = 0.2;

// Function to shoot a bullet
function shoot() {
  if (hasGun) {
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);  // Small sphere as a bullet
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    bullet.position.set(
      player.position.x + Math.sin(yaw) * 1.5,
      player.position.y + 1.5,
      player.position.z + Math.cos(yaw) * 1.5
    );
    
    bullet.direction = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    bullets.push(bullet);
    scene.add(bullet);
  }
}

// Function to drop the gun
function dropGun() {
  if (hasGun) {
    hasGun = false;
    gun.position.set(player.position.x, player.position.y, player.position.z - 2);  // Drop gun nearby
  }
}

// Function to pick up the gun
function pickUpGun() {
  if (!hasGun && player.position.distanceTo(gun.position) < 2) {
    hasGun = true;
    gun.position.set(0.5, 0.5, -1);  // Reattach the gun to the player
  }
}

// Function to update bullets
function updateBullets() {
  bullets.forEach((bullet, index) => {
    bullet.position.add(bullet.direction.clone().multiplyScalar(bulletSpeed));

    // Remove bullet if it gets too far
    if (bullet.position.distanceTo(player.position) > 50) {
      scene.remove(bullet);
      bullets.splice(index, 1);
    }
  });
}

// Reset player position when 'R' is pressed
function resetPlayerPosition() {
  player.position.set(0, 1, 0);  // Reset to starting position
  velocityY = 0;  // Reset velocity
}

// Function to update player movement, gravity, and FPS counter
function update() {
  // Movement speed and directions
  const speed = 0.1;
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  const right = new THREE.Vector3(Math.sin(yaw - Math.PI / 2), 0, Math.cos(yaw - Math.PI / 2)).normalize();

  // WASD movement
  if (keysDown['w']) player.position.add(forward.multiplyScalar(speed));
  if (keysDown['s']) player.position.add(forward.multiplyScalar(-speed));
  if (keysDown['a']) player.position.add(right.multiplyScalar(-speed));
  if (keysDown['d']) player.position.add(right.multiplyScalar(speed));

  // Apply gravity
  velocityY += gravity;
  player.position.y += velocityY;

  // Collision detection with ground (basic)
  if (player.position.y <= 1) {
    player.position.y = 1;
    velocityY = 0;
    canJump = true;
  }

  // Reset player if they fall below a certain height
  if (player.position.y < -10) {
    resetPlayerPosition();  // Reset player position if they fall off
  }

  // Jump
  if (keysDown[' '] && canJump) {
    velocityY = 0.2;  // Jump force
    canJump = false;
  }

  // Smooth camera rotation (damping to make it less "wonky")
  yaw += (targetYaw - yaw) * damping;
  pitch += (targetPitch - pitch) * damping;

  // Update camera position and rotation to follow the player
  camera.position.x = player.position.x - Math.sin(yaw) * cameraDistance;
  camera.position.z = player.position.z - Math.cos(yaw) * cameraDistance;
  camera.position.y = player.position.y + cameraHeight + Math.sin(pitch) * cameraDistance;

  camera.lookAt(player.position.x, player.position.y + cameraHeight, player.position.z);

  // Update FPS Counter
  frameCount++;
  const now = performance.now();
  if (now - lastFrameTime >= 1000) {
    fps = frameCount;
    fpsElement.innerText = `FPS: ${fps}`;
    frameCount = 0;
    lastFrameTime = now;
  }

  // Update bullets
  updateBullets();

  renderer.render(scene, camera);
  requestAnimationFrame(update);
}

// Event listeners for key controls
document.addEventListener('keydown', (event) => {
  keysDown[event.key.toLowerCase()] = true;
  if (event.key === 'q') dropGun();  // Drop gun
});

document.addEventListener('keyup', (event) => {
  keysDown[event.key.toLowerCase()] = false;
});

// Event listener for shooting and picking up the gun
document.addEventListener('mousedown', (event) => {
  if (event.button === 0) {
    if (hasGun) {
      shoot();  // Shoot the gun
    } else {
      pickUpGun();  // Pick up the gun if dropped
    }
  }
});

// Start the game loop
update();
