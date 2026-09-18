(() => {
  const COLS = 20;
  const ROWS = 20;
  const BASE_INTERVAL = 170;
  const MIN_INTERVAL = 62;
  const HIGH_SCORE_KEY = "snake-high-score";

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("high-score");
  const speedEl = document.getElementById("speed");
  const overlay = document.getElementById("overlay");
  const overlayKicker = document.getElementById("overlay-kicker");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayCopy = document.getElementById("overlay-copy");
  const btnPrimary = document.getElementById("btn-primary");
  const btnPause = document.getElementById("btn-pause");
  const btnRestart = document.getElementById("btn-restart");

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const KEY_TO_DIR = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    a: "left",
    s: "down",
    d: "right",
    W: "up",
    A: "left",
    S: "down",
    D: "right",
  };

  const state = {
    status: "idle", // idle | running | paused | over
    snake: [],
    dir: DIRS.right,
    queuedDir: null,
    food: { x: 14, y: 10 },
    score: 0,
    highScore: Number(localStorage.getItem(HIGH_SCORE_KEY) || 0),
    tickId: 0,
    pulse: 0,
  };

  function clone(cell) {
    return { x: cell.x, y: cell.y };
  }

  function same(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function occupied(cell) {
    return state.snake.some((part) => same(part, cell));
  }

  function speedLevel() {
    return 1 + Math.floor(state.score / 50);
  }

  function interval() {
    return Math.max(MIN_INTERVAL, BASE_INTERVAL - (speedLevel() - 1) * 14);
  }

  function spawnFood() {
    const empty = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const cell = { x, y };
        if (!occupied(cell)) empty.push(cell);
      }
    }
    state.food = empty.length
      ? empty[Math.floor(Math.random() * empty.length)]
      : { x: -1, y: -1 };
  }

  function resetGame() {
    const midY = Math.floor(ROWS / 2);
    state.snake = [
      { x: 6, y: midY },
      { x: 5, y: midY },
      { x: 4, y: midY },
    ];
    state.dir = DIRS.right;
    state.queuedDir = null;
    state.score = 0;
    spawnFood();
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    highScoreEl.textContent = String(state.highScore);
    speedEl.textContent = String(speedLevel());
  }

  function showOverlay({ kicker, title, copy, action }) {
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayCopy.textContent = copy;
    btnPrimary.textContent = action;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function setStatus(next) {
    state.status = next;
    btnPause.disabled = next !== "running" && next !== "paused";
    btnPause.textContent = next === "paused" ? "继续" : "暂停";

    if (next === "idle") {
      showOverlay({
        kicker: "准备就绪",
        title: "开始游戏",
        copy: "吃到红色果实得分，撞墙或咬到自己就会结束。速度会随分数提升。",
        action: "开始",
      });
    } else if (next === "paused") {
      showOverlay({
        kicker: "先歇一口气",
        title: "已暂停",
        copy: "当前分数 " + state.score + "。按空格或点继续，接着吃。",
        action: "继续",
      });
    } else if (next === "over") {
      const best = state.score >= state.highScore && state.score > 0;
      showOverlay({
        kicker: best ? "新纪录" : "再来一局",
        title: "游戏结束",
        copy: "本局分数 " + state.score + "，最高分 " + state.highScore + "。",
        action: "重新开始",
      });
    } else {
      hideOverlay();
    }
  }

  function queueDirection(name) {
    const next = DIRS[name];
    if (!next) return;
    const current = state.queuedDir || state.dir;
    if (next.x + current.x === 0 && next.y + current.y === 0) return;
    state.queuedDir = next;
    if (state.status === "idle") startGame();
  }

  function eat() {
    state.score += 10;
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem(HIGH_SCORE_KEY, String(state.highScore));
    }
    spawnFood();
    updateHud();
  }

  function gameOver() {
    stopLoop();
    setStatus("over");
  }

  function tick() {
    if (state.status !== "running") return;
    if (state.queuedDir) {
      state.dir = state.queuedDir;
      state.queuedDir = null;
    }

    const head = clone(state.snake[0]);
    head.x += state.dir.x;
    head.y += state.dir.y;

    const willEat = same(head, state.food);
    const body = willEat ? state.snake : state.snake.slice(0, -1);
    const hitWall = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
    const hitSelf = body.some((part) => same(part, head));

    if (hitWall || hitSelf) {
      gameOver();
      draw();
      return;
    }

    state.snake.unshift(head);
    if (willEat) eat();
    else state.snake.pop();

    updateHud();
    draw();
    state.tickId = window.setTimeout(tick, interval());
  }

  function stopLoop() {
    window.clearTimeout(state.tickId);
    state.tickId = 0;
  }

  function startGame() {
    resetGame();
    setStatus("running");
    stopLoop();
    draw();
    state.tickId = window.setTimeout(tick, interval());
  }

  function togglePause() {
    if (state.status === "running") {
      stopLoop();
      setStatus("paused");
    } else if (state.status === "paused") {
      setStatus("running");
      state.tickId = window.setTimeout(tick, interval());
    }
  }

  function resizeCanvas() {
    const size = Math.floor(canvas.getBoundingClientRect().width * window.devicePixelRatio);
    canvas.width = size;
    canvas.height = size;
    draw();
  }

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function draw() {
    const size = canvas.width;
    const gap = size / COLS;
    const pad = gap * 0.12;

    ctx.clearRect(0, 0, size, size);

    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, "#0a1a14");
    bg.addColorStop(1, "#07110d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(61, 255, 154, 0.06)";
    ctx.lineWidth = Math.max(1, size / 640);
    for (let i = 1; i < COLS; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * gap, 0);
      ctx.lineTo(i * gap, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * gap);
      ctx.lineTo(size, i * gap);
      ctx.stroke();
    }

    if (state.food.x >= 0) {
      const pulse = 0.85 + Math.sin(state.pulse / 180) * 0.15;
      const fx = state.food.x * gap + pad;
      const fy = state.food.y * gap + pad;
      const fw = gap - pad * 2;
      ctx.shadowColor = "rgba(255, 107, 107, 0.7)";
      ctx.shadowBlur = gap * 0.55;
      ctx.fillStyle = `rgba(255, 107, 107, ${pulse})`;
      roundRect(fx, fy, fw, fw, fw * 0.45);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255, 230, 230, 0.85)";
      ctx.beginPath();
      ctx.arc(fx + fw * 0.32, fy + fw * 0.32, fw * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }

    state.snake.forEach((part, index) => {
      const t = index / Math.max(state.snake.length - 1, 1);
      const x = part.x * gap + pad;
      const y = part.y * gap + pad;
      const w = gap - pad * 2;
      ctx.shadowColor = "rgba(61, 255, 154, 0.35)";
      ctx.shadowBlur = index === 0 ? gap * 0.45 : 0;
      ctx.fillStyle = index === 0 ? "#7dffc0" : `rgb(${30 + (1 - t) * 40}, ${180 - t * 50}, ${110 - t * 30})`;
      roundRect(x, y, w, w, w * (index === 0 ? 0.38 : 0.3));
      ctx.fill();
      ctx.shadowBlur = 0;

      if (index === 0) {
        const eye = w * 0.13;
        const ox = state.dir.x * w * 0.16;
        const oy = state.dir.y * w * 0.16;
        ctx.fillStyle = "#052013";
        const left = {
          x: x + w * 0.35 + (state.dir.y !== 0 ? -w * 0.14 : ox),
          y: y + w * 0.35 + (state.dir.x !== 0 ? -w * 0.14 : oy),
        };
        const right = {
          x: x + w * 0.65 + (state.dir.y !== 0 ? w * 0.02 : ox) - eye,
          y: y + w * 0.35 + (state.dir.x !== 0 ? w * 0.02 : oy),
        };
        ctx.beginPath();
        ctx.arc(left.x, left.y, eye, 0, Math.PI * 2);
        ctx.arc(right.x, right.y, eye, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function animate(now) {
    state.pulse = now;
    draw();
    requestAnimationFrame(animate);
  }

  function onPrimary() {
    if (state.status === "running") return;
    if (state.status === "paused") togglePause();
    else startGame();
  }

  document.addEventListener("keydown", (event) => {
    const dir = KEY_TO_DIR[event.key];
    if (dir) {
      event.preventDefault();
      queueDirection(dir);
      return;
    }
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      if (state.status === "idle" || state.status === "over") startGame();
      else togglePause();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      onPrimary();
    }
  });

  let swipeStart = null;
  const boardWrap = document.querySelector(".board-wrap");
  boardWrap.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.changedTouches[0];
      swipeStart = { x: touch.clientX, y: touch.clientY };
    },
    { passive: true }
  );
  boardWrap.addEventListener(
    "touchmove",
    (event) => {
      if (swipeStart) event.preventDefault();
    },
    { passive: false }
  );
  boardWrap.addEventListener(
    "touchend",
    (event) => {
      if (!swipeStart) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - swipeStart.x;
      const dy = touch.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) queueDirection(dx > 0 ? "right" : "left");
      else queueDirection(dy > 0 ? "down" : "up");
    },
    { passive: true }
  );

  document.querySelectorAll(".pad-btn").forEach((button) => {
    button.addEventListener("click", () => queueDirection(button.dataset.dir));
  });

  btnPrimary.addEventListener("click", onPrimary);
  btnPause.addEventListener("click", togglePause);
  btnRestart.addEventListener("click", startGame);
  window.addEventListener("resize", resizeCanvas);

  resetGame();
  setStatus("idle");
  resizeCanvas();
  requestAnimationFrame(animate);
})();
