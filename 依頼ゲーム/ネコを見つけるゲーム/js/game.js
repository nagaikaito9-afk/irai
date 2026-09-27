/**
 * こうえんのネコさがし - メインゲームロジック
 * 高速・軽量な公園オブジェクトシステム & レベル毎の難易度上昇
 */

class ParkCatGame {
  constructor() {
    this.canvas = document.getElementById("park-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.container = document.getElementById("park-container");

    // レベル & スコア
    this.level = 1;
    this.score = 0;
    this.timeLeft = 50;
    this.timerInterval = null;
    this.isPlaying = false;
    this.isPaused = false;

    // お助けアイテム
    this.bellsCount = 3;
    this.hintsCount = 2;

    // 公園オブジェクト & ネコ
    this.parkObjects = [];
    this.cats = [];
    this.targetCats = [];
    this.foundCats = [];
    this.particles = [];

    // 図鑑アンロックデータ (localStorage)
    this.unlockedCats = this.loadUnlockedCats();

    this.bindEvents();
    this.resizeCanvas();
    this.updateUI();
    this.renderCollectionGrid();

    // 描画ループ
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loadUnlockedCats() {
    try {
      const data = localStorage.getItem("park_cats_unlocked");
      return data ? JSON.parse(data) : ["calico"];
    } catch (e) {
      return ["calico"];
    }
  }

  saveUnlockedCats() {
    try {
      localStorage.setItem("park_cats_unlocked", JSON.stringify(this.unlockedCats));
    } catch (e) {}
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      this.resizeCanvas();
      if (this.isPlaying) {
        this.generatePark();
      }
    });

    const handlePointerAction = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      this.onClickPark(x, y);
    };

    this.canvas.addEventListener("click", (e) => {
      handlePointerAction(e.clientX, e.clientY);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) {
        handlePointerAction(e.touches[0].clientX, e.touches[0].clientY);
      }
      e.preventDefault();
    }, { passive: false });

    // UIボタン
    document.getElementById("btn-start-game").addEventListener("click", () => {
      window.soundSystem.init();
      document.getElementById("screen-title").classList.add("hidden");
      this.startLevel(1);
    });

    document.getElementById("btn-bell").addEventListener("click", () => this.useBell());
    document.getElementById("btn-hint").addEventListener("click", () => this.useHint());
    document.getElementById("btn-sound").addEventListener("click", () => this.toggleSound());
    document.getElementById("btn-collection").addEventListener("click", () => this.openCollection());
    document.getElementById("btn-close-collection").addEventListener("click", () => this.closeCollection());
    document.getElementById("btn-pause").addEventListener("click", () => this.openPauseModal());
    document.getElementById("btn-close-pause").addEventListener("click", () => this.closePauseModal());
    document.getElementById("btn-resume").addEventListener("click", () => this.closePauseModal());
    document.getElementById("btn-restart-level").addEventListener("click", () => {
      this.closePauseModal();
      this.startLevel(this.level);
    });

    document.getElementById("btn-next-level").addEventListener("click", () => {
      document.getElementById("modal-clear").classList.add("hidden");
      this.startLevel(this.level + 1);
    });

    document.getElementById("btn-retry").addEventListener("click", () => {
      document.getElementById("modal-clear").classList.add("hidden");
      this.startLevel(this.level);
    });

    document.getElementById("btn-gameover-retry").addEventListener("click", () => {
      document.getElementById("modal-gameover").classList.add("hidden");
      this.startLevel(this.level);
    });

    document.getElementById("check-bgm").addEventListener("change", (e) => {
      window.soundSystem.bgmEnabled = e.target.checked;
      if (e.target.checked) window.soundSystem.startAmbientSound();
      else window.soundSystem.stopAmbientSound();
    });

    document.getElementById("check-sfx").addEventListener("change", (e) => {
      window.soundSystem.sfxEnabled = e.target.checked;
    });
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  // レベル開始
  startLevel(lvl) {
    this.level = lvl;
    this.isPlaying = true;
    this.isPaused = false;
    this.foundCats = [];

    // レベルに応じた難易度設定
    // Lv1: 1匹, Lv2: 2匹, Lv3: 3匹, Lv4: 3匹, Lv5: 4匹, Lv6: 4匹, Lv7+: 5匹
    const targetCount = Math.min(1 + Math.floor((this.level - 1) * 0.7), 5);
    this.timeLeft = Math.max(25, 55 - (this.level - 1) * 4);
    this.bellsCount = 3;
    this.hintsCount = 2;

    this.generatePark();
    this.startTimer();
    this.updateUI();

    // 操作ヒント
    const hintEl = document.getElementById("interaction-hint");
    if (this.level === 1) {
      hintEl.textContent = "植え込みやベンチをタップしてネコを探そう！ 🌳";
    } else if (this.level >= 2 && this.level <= 3) {
      hintEl.textContent = "ダンボール箱やバケツはタップすると開くよ！ 📦";
    } else {
      hintEl.textContent = "耳やしっぽを頼りに、怪しい場所を何度もタップしてみよう！ 👀";
    }
    hintEl.style.opacity = "1";
    setTimeout(() => { hintEl.style.opacity = "0"; }, 4000);
  }

  // 公園のマップ生成 & ネコ配置
  generatePark() {
    this.parkObjects = [];
    this.cats = [];

    const W = this.width;
    const H = this.height;

    // 隠れ場所候補オブジェクトのリスト
    const spots = [];

    // 1. 公園の大きな木 (2〜3本)
    const treeCount = Math.min(3, Math.max(2, Math.floor(W / 360)));
    for (let i = 0; i < treeCount; i++) {
      const tx = (W / (treeCount + 1)) * (i + 1) + (Math.random() - 0.5) * 60;
      const ty = H * 0.32 + Math.random() * (H * 0.1);
      spots.push({
        type: "tree",
        x: tx,
        y: ty,
        w: 120,
        h: 170,
        catOffsetX: (Math.random() - 0.5) * 40,
        catOffsetY: -45,
        hideDifficulty: 3 // レベル3以上で隠れる
      });
    }

    // 2. ベンチ (1〜2台)
    const benchCount = W > 600 ? 2 : 1;
    for (let i = 0; i < benchCount; i++) {
      const bx = W * (0.25 + i * 0.45) + (Math.random() - 0.5) * 40;
      const by = H * 0.65 + (Math.random() - 0.5) * 30;
      spots.push({
        type: "bench",
        x: bx,
        y: by,
        w: 110,
        h: 60,
        catOffsetX: 0,
        catOffsetY: 12,
        hideDifficulty: 1
      });
    }

    // 3. すべり台 (1台)
    spots.push({
      type: "slide",
      x: W * 0.82,
      y: H * 0.55,
      w: 130,
      h: 110,
      catOffsetX: -25,
      catOffsetY: 20,
      hideDifficulty: 2
    });

    // 4. 砂場とバケツ (1箇所)
    spots.push({
      type: "sandbox",
      x: W * 0.2,
      y: H * 0.78,
      w: 130,
      h: 80,
      catOffsetX: 20,
      catOffsetY: 5,
      hideDifficulty: 2
    });

    // 5. ダンボール箱 (1〜3個: レベルが上がると増える)
    const boxCount = Math.min(3, 1 + Math.floor(this.level / 2));
    for (let i = 0; i < boxCount; i++) {
      const bx = W * (0.35 + (i * 0.22)) + (Math.random() - 0.5) * 30;
      const by = H * 0.8 + (Math.random() - 0.5) * 20;
      spots.push({
        type: "box",
        x: bx,
        y: by,
        w: 65,
        h: 55,
        catOffsetX: 0,
        catOffsetY: -5,
        opened: false,
        hideDifficulty: 2
      });
    }

    // 6. 植え込み低木 (多数)
    const bushCount = Math.min(8, 4 + this.level);
    for (let i = 0; i < bushCount; i++) {
      const bx = (W / (bushCount + 1)) * (i + 1) + (Math.random() - 0.5) * 50;
      const by = H * 0.45 + Math.random() * (H * 0.45);
      spots.push({
        type: "bush",
        x: bx,
        y: by,
        w: 80 + Math.random() * 30,
        h: 50 + Math.random() * 20,
        catOffsetX: (Math.random() - 0.5) * 20,
        catOffsetY: -10,
        tapsRequired: this.level >= 4 ? 2 : 1, // 高レベルは2回タップでかき分ける
        currentTaps: 0,
        hideDifficulty: 1
      });
    }

    // 7. 落ち葉の山 (レベル3以上で登場)
    if (this.level >= 3) {
      spots.push({
        type: "leaves",
        x: W * 0.52,
        y: H * 0.72,
        w: 80,
        h: 40,
        catOffsetX: 0,
        catOffsetY: -5,
        cleared: false,
        hideDifficulty: 3
      });
    }

    // 各スポットにインタラクション揺れアニメーション状態を追加
    spots.forEach(sp => {
      sp.shake = 0;
      sp.catInside = null;
    });

    // ネコを難易度に合わせてスポットに配置
    const targetCount = Math.min(1 + Math.floor((this.level - 1) * 0.7), 5);
    
    // スポットをシャッフル
    const availableSpots = spots.filter(s => s.hideDifficulty <= this.level);
    availableSpots.sort(() => Math.random() - 0.5);

    const chosenSpecies = [...CAT_SPECIES].sort(() => Math.random() - 0.5);

    for (let i = 0; i < targetCount; i++) {
      const spot = availableSpots[i % availableSpots.length];
      const species = chosenSpecies[i % chosenSpecies.length];

      // ネコの隠れ方タイプ決定 (難易度に応じる)
      let peekType = "full";
      if (this.level === 1) {
        peekType = "half_face"; // 顔が半分見えている（見つけやすい）
      } else if (this.level <= 3) {
        peekType = (spot.type === "box" || spot.type === "sandbox") ? "inside" : "ears_only";
      } else if (this.level <= 5) {
        // 耳だけチラ見せ、または箱/落ち葉の中に完全隠蔽
        peekType = (spot.type === "box" || spot.type === "leaves") ? "inside" : "ears_only";
      } else {
        // 高レベル：完全隠蔽 & 巧妙な隠れ
        peekType = "hidden";
      }

      const catSize = Math.max(48, Math.min(68, W * 0.08));

      const cat = {
        id: species.id,
        species: species,
        spot: spot,
        x: spot.x + (spot.catOffsetX || 0),
        y: spot.y + (spot.catOffsetY || 0),
        size: catSize,
        found: false,
        state: "normal",
        animProgress: 0,
        peekType: peekType, // "full", "half_face", "ears_only", "inside", "hidden"
        revealed: (peekType === "full" || peekType === "half_face" || peekType === "ears_only")
      };

      spot.catInside = cat;
      this.cats.push(cat);
    }

    this.targetCats = [...this.cats];
    this.parkObjects = spots;

    // Y座標でソート（奥から手前へ描画）
    this.parkObjects.sort((a, b) => a.y - b.y);
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isPaused && this.isPlaying) {
        this.timeLeft--;
        this.updateUI();

        const timerCard = document.getElementById("timer-card");
        if (this.timeLeft <= 10) timerCard.classList.add("urgent");
        else timerCard.classList.remove("urgent");

        if (this.timeLeft <= 0) {
          this.handleGameOver();
        }
      }
    }, 1000);
  }

  // タップ・クリック処理
  onClickPark(x, y) {
    if (!this.isPlaying || this.isPaused) return;

    // 手前のオブジェクトから順にヒット判定（逆順チェック）
    let hitObject = null;
    for (let i = this.parkObjects.length - 1; i >= 0; i--) {
      const obj = this.parkObjects[i];
      const halfW = obj.w * 0.6;
      const halfH = obj.h * 0.6;
      if (Math.abs(obj.x - x) < halfW && Math.abs(obj.y - y) < halfH) {
        hitObject = obj;
        break;
      }
    }

    if (hitObject) {
      hitObject.shake = 12; // 揺らす
      window.soundSystem.playGrassRustle();
      this.spawnLeafParticles(hitObject.x, hitObject.y);

      // ダンボール箱の場合
      if (hitObject.type === "box") {
        hitObject.opened = true;
      }
      // 落ち葉の山の場合
      if (hitObject.type === "leaves") {
        hitObject.cleared = true;
      }
      // 植え込みの場合
      if (hitObject.type === "bush") {
        hitObject.currentTaps = (hitObject.currentTaps || 0) + 1;
      }

      // 中にネコがいるか？
      const cat = hitObject.catInside;
      if (cat && !cat.found) {
        // 出現条件チェック
        const needsMoreTaps = (hitObject.type === "bush" && hitObject.currentTaps < (hitObject.tapsRequired || 1));
        
        if (needsMoreTaps) {
          // まだかき分けが足りない：少しだけ耳が見える！
          cat.peekType = "ears_only";
          cat.revealed = true;
          this.showFloatingText(x, y - 20, "ガサガサ...🐾");
          window.soundSystem.playMeow(cat.species.pitch * 0.9);
        } else {
          // ネコ発見！
          this.discoverCat(cat);
          return;
        }
      } else {
        // 空っぽの場所をタップした時のエフェクト
        this.showFloatingText(x, y - 20, "からっぽ！", 0.8);
      }
    } else {
      // 地面タップ
      this.spawnLeafParticles(x, y, 4);
    }
  }

  // ネコ発見
  discoverCat(cat) {
    cat.found = true;
    cat.state = "found";
    cat.revealed = true;
    cat.peekType = "full";
    cat.animProgress = 0;
    this.foundCats.push(cat);

    const points = 500 + this.timeLeft * 15 + this.level * 100;
    this.score += points;

    window.soundSystem.playMeow(cat.species.pitch, true);
    setTimeout(() => { window.soundSystem.playFoundFanfare(); }, 120);

    this.spawnHeartParticles(cat.x, cat.y);
    this.showFloatingText(cat.x, cat.y - 35, `+${points}pt 🐾 みつけた!`);

    // 図鑑アンロック
    if (!this.unlockedCats.includes(cat.id)) {
      this.unlockedCats.push(cat.id);
      this.saveUnlockedCats();
      this.renderCollectionGrid();
    }

    this.updateUI();

    // レベルクリア判定
    if (this.foundCats.length >= this.targetCats.length) {
      setTimeout(() => { this.handleLevelClear(); }, 900);
    }
  }

  // 鈴アイテム（鳴き声で居場所を教える）
  useBell() {
    if (this.bellsCount <= 0 || !this.isPlaying || this.isPaused) return;
    this.bellsCount--;
    document.getElementById("bell-badge").textContent = this.bellsCount;

    window.soundSystem.playBellSound();

    this.cats.forEach(cat => {
      if (!cat.found) {
        cat.state = "alert";
        cat.spot.shake = 15;
        setTimeout(() => {
          window.soundSystem.playMeow(cat.species.pitch * 1.2);
          this.showFloatingText(cat.x, cat.y - 25, "にゃ〜ん！🔔", 0.9);
        }, 250);
      }
    });
  }

  // 虫眼鏡ヒント
  useHint() {
    if (this.hintsCount <= 0 || !this.isPlaying || this.isPaused) return;
    const remaining = this.cats.filter(c => !c.found);
    if (remaining.length === 0) return;

    this.hintsCount--;
    document.getElementById("hint-badge").textContent = this.hintsCount;

    const target = remaining[Math.floor(Math.random() * remaining.length)];
    target.spot.shake = 25;
    window.soundSystem.playFoundFanfare();
    this.spawnLeafParticles(target.x, target.y, 16, "#fef08a");
    this.showFloatingText(target.x, target.y - 30, "🔍 ここが怪しいよ！");
  }

  handleLevelClear() {
    this.isPlaying = false;
    clearInterval(this.timerInterval);
    window.soundSystem.playClearMusic();

    const timeBonus = this.timeLeft * 25;
    const levelScore = this.score;
    const totalScore = levelScore + timeBonus;
    this.score = totalScore;

    document.getElementById("stat-time-bonus").textContent = `+${timeBonus}pt`;
    document.getElementById("stat-stage-score").textContent = `${levelScore}pt`;
    document.getElementById("stat-total-score").textContent = `${totalScore}pt`;

    const galleryEl = document.getElementById("found-cats-gallery");
    galleryEl.innerHTML = "";
    this.targetCats.forEach(cat => {
      const bubble = document.createElement("div");
      bubble.className = "found-cat-bubble";
      bubble.innerHTML = `
        <img class="cat-avatar" src="${CatRenderer.createCatAvatarDataUrl(cat.species, 48)}" alt="${cat.species.name}">
        <span class="cat-name">${cat.species.name.split(" ")[0]}</span>
      `;
      galleryEl.appendChild(bubble);
    });

    document.getElementById("modal-clear").classList.remove("hidden");
  }

  handleGameOver() {
    this.isPlaying = false;
    clearInterval(this.timerInterval);
    document.getElementById("modal-gameover").classList.remove("hidden");
  }

  // 描画メインループ
  loop(timestamp) {
    timestampNow = timestamp;
    const dt = Math.min((timestamp - this.lastTime) * 0.001, 0.1);
    this.lastTime = timestamp;

    this.render(dt);
    requestAnimationFrame((t) => this.loop(t));
  }

  render(dt) {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    ctx.clearRect(0, 0, W, H);

    // 1. 公園の背景 (空、遠景の街並み、芝生の地面)
    this.drawParkBackground(ctx, W, H);

    // 2. 公園オブジェクト & ネコ (Y軸ソート済み)
    this.parkObjects.forEach(obj => {
      // 揺れアニメーション減衰
      if (obj.shake > 0) {
        obj.shake = Math.max(0, obj.shake - dt * 35);
      }
      const shakeX = Math.sin(timestampNow * 0.05) * obj.shake;

      ctx.save();
      ctx.translate(obj.x + shakeX, obj.y);

      // オブジェクトの奥に隠れているネコ
      const cat = obj.catInside;
      if (cat) {
        this.updateAndDrawCat(ctx, cat, obj, dt);
      }

      // 公園オブジェクト本体の描画
      this.drawParkObject(ctx, obj);

      ctx.restore();
    });

    // 3. パーティクル
    this.updateAndDrawParticles(ctx, dt);
  }

  drawParkBackground(ctx, W, H) {
    // 青空
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    skyGrad.addColorStop(0, "#7dd3fc");
    skyGrad.addColorStop(1, "#bae6fd");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.4);

    // 太陽
    ctx.beginPath();
    ctx.arc(W - 60, 45, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#fef08a";
    ctx.fill();

    // 遠くの木々
    ctx.fillStyle = "#86efac";
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc((W / 6) * i, H * 0.38, 45, Math.PI, 0);
      ctx.fill();
    }

    // 公園の芝生地面
    const grassGrad = ctx.createLinearGradient(0, H * 0.35, 0, H);
    grassGrad.addColorStop(0, "#84cc16");
    grassGrad.addColorStop(0.3, "#65a30d");
    grassGrad.addColorStop(1, "#4d7c0f");
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, H * 0.35, W, H * 0.65);

    // 小道 (砂利道)
    ctx.beginPath();
    ctx.moveTo(W * 0.4, H);
    ctx.quadraticCurveTo(W * 0.5, H * 0.6, W * 0.35, H * 0.35);
    ctx.lineTo(W * 0.48, H * 0.35);
    ctx.quadraticCurveTo(W * 0.62, H * 0.6, W * 0.6, H);
    ctx.closePath();
    ctx.fillStyle = "#e2d9c8";
    ctx.fill();
  }

  drawParkObject(ctx, obj) {
    switch (obj.type) {
      case "tree": {
        // 木の幹
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-14, -60, 28, 70);
        // 樹冠（ふさふさの葉っぱ）
        ctx.fillStyle = "#15803d";
        ctx.beginPath();
        ctx.arc(0, -90, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.arc(-22, -80, 36, 0, Math.PI * 2);
        ctx.arc(22, -80, 36, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "bench": {
        // ベンチの座面
        ctx.fillStyle = "#b45309";
        ctx.fillRect(-45, -12, 90, 10);
        // 背もたれ
        ctx.fillRect(-45, -28, 90, 10);
        // 脚（鉄製）
        ctx.fillStyle = "#334155";
        ctx.fillRect(-38, -2, 6, 14);
        ctx.fillRect(32, -2, 6, 14);
        break;
      }
      case "slide": {
        // すべり台の階段
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-40, -45, 10, 50);
        // スロープ
        ctx.lineWidth = 14;
        ctx.strokeStyle = "#3b82f6";
        ctx.beginPath();
        ctx.moveTo(-35, -45);
        ctx.quadraticCurveTo(0, -20, 45, 5);
        ctx.stroke();
        break;
      }
      case "sandbox": {
        // 砂場の枠
        ctx.fillStyle = "#ca8a04";
        ctx.beginPath();
        ctx.ellipse(0, 0, 55, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        // 砂
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.ellipse(0, -2, 48, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        // 赤いバケツ
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(15, -10, 14, 12);
        break;
      }
      case "box": {
        // ダンボール箱
        ctx.fillStyle = "#d97706";
        ctx.fillRect(-26, -20, 52, 38);
        // テープ
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(-26, -5, 52, 6);
        // フタが開いている表現
        if (obj.opened) {
          ctx.fillStyle = "#b45309";
          ctx.beginPath();
          ctx.moveTo(-26, -20);
          ctx.lineTo(-38, -32);
          ctx.lineTo(-10, -20);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(26, -20);
          ctx.lineTo(38, -32);
          ctx.lineTo(10, -20);
          ctx.fill();
        }
        break;
      }
      case "bush": {
        // 植え込み低木
        ctx.fillStyle = "#15803d";
        ctx.beginPath();
        ctx.ellipse(0, 0, obj.w * 0.5, obj.h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // 葉のハイライト
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(-obj.w * 0.2, -obj.h * 0.15, obj.h * 0.3, 0, Math.PI * 2);
        ctx.arc(obj.w * 0.2, -obj.h * 0.1, obj.h * 0.28, 0, Math.PI * 2);
        ctx.fill();
        // 小さなお花
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.arc(-10, 5, 4, 0, Math.PI * 2);
        ctx.arc(14, -6, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "leaves": {
        if (!obj.cleared) {
          // 落ち葉の山
          ctx.fillStyle = "#b45309";
          ctx.beginPath();
          ctx.ellipse(0, 0, 36, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ea580c";
          ctx.beginPath();
          ctx.ellipse(-8, -4, 22, 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }
  }

  updateAndDrawCat(ctx, cat, obj, dt) {
    if (cat.found) {
      cat.animProgress = Math.min(1.0, cat.animProgress + dt * 2.5);
    }

    // ネコを描画するか判定
    const shouldDraw = cat.found || cat.revealed || (cat.spot.type === "box" && cat.spot.opened) || (cat.spot.type === "leaves" && cat.spot.cleared);

    if (shouldDraw) {
      ctx.save();
      // オブジェクトの相対オフセット
      ctx.translate(cat.spot.catOffsetX || 0, cat.spot.catOffsetY || 0);

      // 見つかった時はオブジェクトの手前に描画
      CatRenderer.drawCat(
        ctx,
        cat.species,
        0,
        0,
        cat.size,
        cat.state,
        cat.animProgress,
        cat.peekType
      );
      ctx.restore();
    }
  }

  spawnLeafParticles(x, y, count = 8, color = "#4ade80") {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.8;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 3 + Math.random() * 4,
        color: color,
        alpha: 1.0,
        type: "leaf"
      });
    }
  }

  spawnHeartParticles(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2 - 2,
        size: 16,
        alpha: 1.0,
        type: "heart"
      });
    }
  }

  updateAndDrawParticles(ctx, dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += dt * 8; // 重力
      p.alpha -= dt * 1.5;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.type === "heart") {
        ctx.font = `${p.size}px sans-serif`;
        ctx.fillText("❤️", p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  showFloatingText(x, y, text, scale = 1.0) {
    const el = document.createElement("div");
    el.className = "floating-found-text";
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    if (scale !== 1.0) {
      el.style.fontSize = `${1.4 * scale}rem`;
    }
    document.getElementById("effect-layer").appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  updateUI() {
    document.getElementById("level-badge").textContent = `Lv. ${this.level}`;
    document.getElementById("timer-text").textContent = `${this.timeLeft}s`;
    document.getElementById("score-text").textContent = `${this.score}`;
    document.getElementById("target-count").textContent = `${this.foundCats.length} / ${this.targetCats.length}`;
  }

  openCollection() {
    this.renderCollectionGrid();
    document.getElementById("modal-collection").classList.remove("hidden");
  }

  closeCollection() {
    document.getElementById("modal-collection").classList.add("hidden");
  }

  renderCollectionGrid() {
    const grid = document.getElementById("collection-grid");
    grid.innerHTML = "";
    document.getElementById("collection-unlocked-count").textContent = this.unlockedCats.length;
    document.getElementById("collection-total-count").textContent = CAT_SPECIES.length;

    CAT_SPECIES.forEach(species => {
      const isUnlocked = this.unlockedCats.includes(species.id);
      const card = document.createElement("div");
      card.className = `collection-card ${isUnlocked ? "" : "locked"}`;

      if (isUnlocked) {
        card.innerHTML = `
          <img class="collection-avatar" src="${CatRenderer.createCatAvatarDataUrl(species, 64)}" alt="${species.name}">
          <div class="collection-name">${species.name}</div>
          <div class="collection-desc">${species.desc}</div>
        `;
        card.addEventListener("click", () => {
          window.soundSystem.playMeow(species.pitch, true);
        });
      } else {
        card.innerHTML = `
          <div style="font-size: 2.2rem; height: 64px; display: flex; align-items: center; justify-content: center;">❓</div>
          <div class="collection-name">？？？</div>
          <div class="collection-desc">公園のどこかに隠れているよ！</div>
        `;
      }
      grid.appendChild(card);
    });
  }

  openPauseModal() {
    this.isPaused = true;
    document.getElementById("modal-pause").classList.remove("hidden");
  }

  closePauseModal() {
    this.isPaused = false;
    document.getElementById("modal-pause").classList.add("hidden");
  }

  toggleSound() {
    const soundIcon = document.getElementById("sound-icon");
    const nextState = !window.soundSystem.sfxEnabled;
    window.soundSystem.toggleSound(nextState);
    soundIcon.textContent = nextState ? "🔊" : "🔇";
    document.getElementById("check-bgm").checked = nextState;
    document.getElementById("check-sfx").checked = nextState;
  }
}

let timestampNow = 0;
window.addEventListener("DOMContentLoaded", () => {
  const mascotEl = document.querySelector(".title-cat-mascot .mascot-cat-img");
  if (mascotEl) {
    mascotEl.src = CatRenderer.createCatAvatarDataUrl(CAT_SPECIES[0], 100);
  }
  window.parkGame = new ParkCatGame();
});
