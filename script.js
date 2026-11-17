const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score");
const bestDisplay = document.getElementById("best");
const overlay = document.getElementById("overlay");
const pauseLabel = document.getElementById("pauseLabel");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const jumpBtn = document.getElementById("jumpBtn");
const duckBtn = document.getElementById("duckBtn");
const soundBtn = document.getElementById("soundBtn");

const ground = 285;

let running = false;
let paused = false;
let gameOver = false;
let soundEnabled = true;

let score = 0;
let speed = 6;
let frame = 0;
let obstacles = [];
let clouds = [];
let particles = [];

let best = Number(localStorage.getItem("dinoBest")) || 0;
bestDisplay.textContent = String(best).padStart(5, "0");

const dino = {
  x: 85,
  y: ground - 55,
  width: 48,
  height: 55,
  velocity: 0,
  jumping: false,
  ducking: false
};

let audioContext;

function playSound(frequency = 400, duration = 0.08) {
  if (!soundEnabled) return;

  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "square";

    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    // Sound is optional.
  }
}

function drawDino() {
  const x = dino.x;
  const y = dino.y;

  ctx.fillStyle = "#237b48";

  if (dino.ducking && !dino.jumping) {
    ctx.fillRect(x, ground - 28, 55, 22);
    ctx.fillRect(x + 34, ground - 42, 22, 20);
    ctx.fillRect(x + 48, ground - 39, 5, 5);
    ctx.fillRect(x - 10, ground - 23, 18, 6);
    ctx.fillRect(x + 10, ground - 8, 7, 8);
    ctx.fillRect(x + 38, ground - 8, 7, 8);
  } else {
    ctx.fillRect(x + 8, y + 18, 29, 34);
    ctx.fillRect(x + 24, y, 29, 27);
    ctx.fillRect(x + 48, y + 10, 12, 8);
    ctx.fillRect(x - 7, y + 27, 16, 7);

    ctx.fillStyle = "white";
    ctx.fillRect(x + 44, y + 7, 5, 5);

    ctx.fillStyle = "#237b48";

    if (frame % 12 < 6 && running) {
      ctx.fillRect(x + 10, y + 49, 8, 10);
      ctx.fillRect(x + 29, y + 49, 8, 5);
    } else {
      ctx.fillRect(x + 10, y + 49, 8, 5);
      ctx.fillRect(x + 29, y + 49, 8, 10);
    }
  }
}

function drawGround() {
  ctx.fillStyle = "#91b66c";
  ctx.fillRect(0, ground, canvas.width, 4);

  ctx.fillStyle = "#63834a";

  for (let i = 0; i < 30; i++) {
    const x = (i * 47 - (frame * speed * 0.7) % 47);
    ctx.fillRect(x, ground + 14, 16, 2);
  }
}

function drawClouds() {
  ctx.fillStyle = "#ffffff";

  clouds.forEach(cloud => {
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, 14, 0, Math.PI * 2);
    ctx.arc(cloud.x + 17, cloud.y - 7, 18, 0, Math.PI * 2);
    ctx.arc(cloud.x + 34, cloud.y, 13, 0, Math.PI * 2);
    ctx.fill();
  });
}

function createObstacle() {
  const flying = Math.random() < 0.28;

  obstacles.push({
    x: canvas.width + 20,
    y: flying ? ground - 100 : ground - 40,
    width: flying ? 42 : 25,
    height: flying ? 24 : 40,
    type: flying ? "bird" : "cactus"
  });
}

function drawObstacles() {
  obstacles.forEach(obstacle => {
    if (obstacle.type === "cactus") {
      ctx.fillStyle = "#26864b";
      ctx.fillRect(obstacle.x + 7, obstacle.y, 12, obstacle.height);
      ctx.fillRect(obstacle.x, obstacle.y + 13, 9, 9);
      ctx.fillRect(obstacle.x - 1, obstacle.y + 7, 6, 16);
      ctx.fillRect(obstacle.x + 17, obstacle.y + 19, 9, 8);
      ctx.fillRect(obstacle.x + 20, obstacle.y + 13, 6, 16);
    } else {
      ctx.fillStyle = "#e45d56";
      ctx.fillRect(obstacle.x, obstacle.y + 7, 35, 13);
      ctx.fillRect(obstacle.x + 10, obstacle.y, 13, 24);
      ctx.fillRect(obstacle.x + 2, obstacle.y + 17, 9, 8);
    }
  });
}

function spawnCloud() {
  clouds.push({
    x: canvas.width,
    y: 40 + Math.random() * 100
  });
}

function update() {
  frame++;

  dino.velocity += 0.65;
  dino.y += dino.velocity;

  if (dino.y >= ground - dino.height) {
    dino.y = ground - dino.height;
    dino.velocity = 0;
    dino.jumping = false;
  }

  if (frame % 100 === 0) createObstacle();
  if (frame % 170 === 0) spawnCloud();

  obstacles.forEach(obstacle => {
    obstacle.x -= speed;
  });

  obstacles = obstacles.filter(o => o.x > -70);

  clouds.forEach(cloud => cloud.x -= 1);
  clouds = clouds.filter(c => c.x > -60);

  speed = Math.min(6 + score / 300, 15);
  score++;

  scoreDisplay.textContent = String(score).padStart(5, "0");

  checkCollision();
}

function checkCollision() {
  const dinoBox = {
    x: dino.x + 7,
    y: dino.ducking && !dino.jumping ? ground - 28 : dino.y + 5,
    width: 43,
    height: dino.ducking && !dino.jumping ? 22 : 45
  };

  for (const obstacle of obstacles) {
    const hit =
      dinoBox.x < obstacle.x + obstacle.width - 5 &&
      dinoBox.x + dinoBox.width > obstacle.x + 5 &&
      dinoBox.y < obstacle.y + obstacle.height &&
      dinoBox.y + dinoBox.height > obstacle.y + 5;

    if (hit) {
      endGame();
      return;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawClouds();
  drawGround();
  drawObstacles();
  drawDino();
}

function gameLoop() {
  if (!running || paused) return;

  update();
  draw();

  requestAnimationFrame(gameLoop);
}

function jump() {
  if (!running || paused || dino.jumping) return;

  dino.velocity = -14;
  dino.jumping = true;
  dino.ducking = false;

  playSound(500);
}

function setDuck(value) {
  if (!running || paused) return;
  if (dino.jumping) return;

  dino.ducking = value;
}

function startGame() {
  score = 0;
  speed = 6;
  frame = 0;

  obstacles = [];
  clouds = [];

  dino.y = ground - dino.height;
  dino.velocity = 0;
  dino.jumping = false;
  dino.ducking = false;

  gameOver = false;
  paused = false;
  running = true;

  overlay.style.display = "none";
  pauseLabel.style.display = "none";

  pauseBtn.textContent = "Ⅱ PAUSE";

  playSound(600);
  gameLoop();
}

function endGame() {
  running = false;
  gameOver = true;

  if (score > best) {
    best = score;
    localStorage.setItem("dinoBest", best);
    bestDisplay.textContent = String(best).padStart(5, "0");
  }

  playSound(130, 0.25);

  document.getElementById("messageTitle").textContent = "GAME OVER!";
  document.getElementById("messageText").textContent =
    `Your score: ${score} | Best: ${best}`;

  startBtn.textContent = "PLAY AGAIN ↻";
  overlay.style.display = "flex";
}

function togglePause() {
  if (!running && !paused) return;

  paused = !paused;

  if (paused) {
    pauseLabel.style.display = "flex";
    pauseBtn.textContent = "▶ RESUME";
  } else {
    pauseLabel.style.display = "none";
    pauseBtn.textContent = "Ⅱ PAUSE";
    gameLoop();
  }
}

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);

jumpBtn.addEventListener("pointerdown", jump);

duckBtn.addEventListener("pointerdown", () => setDuck(true));
duckBtn.addEventListener("pointerup", () => setDuck(false));
duckBtn.addEventListener("pointerleave", () => setDuck(false));
duckBtn.addEventListener("pointercancel", () => setDuck(false));

soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? "🔊" : "🔇";
});

document.addEventListener("keydown", event => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();

    if (!event.repeat) jump();
  }

  if (event.code === "ArrowDown") {
    event.preventDefault();
    setDuck(true);
  }

  if (event.code === "Escape" && !event.repeat) {
    togglePause();
  }
});

document.addEventListener("keyup", event => {
  if (event.code === "ArrowDown") {
    setDuck(false);
  }
});

draw();

// Mobile touch support fix

startBtn.addEventListener("touchend", function(event) {
  event.preventDefault();

  if (!running) {
    startGame();
  }
}, { passive: false });

jumpBtn.addEventListener("touchstart", function(event) {
  event.preventDefault();
  jump();
}, { passive: false });

duckBtn.addEventListener("touchstart", function(event) {
  event.preventDefault();
  setDuck(true);
}, { passive: false });

duckBtn.addEventListener("touchend", function(event) {
  event.preventDefault();
  setDuck(false);
}, { passive: false });

