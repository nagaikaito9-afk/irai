/**
 * こうえんのネコさがし - ネコデータ & 高速ベクターレンダラー
 * 10種類のネコ & 隠れ度合い（チラ見せ・顔出し・完全発見）対応レンダラー
 */

const CAT_SPECIES = [
  {
    id: "calico",
    name: "ミケちゃん (三毛猫)",
    desc: "白・茶・黒の３色が鮮やかな元気なネコ。公園の花壇が大好き。",
    baseColor: "#ffffff",
    patternColor1: "#d97706",
    patternColor2: "#1e293b",
    eyeColor: "#10b981",
    pitch: 1.1,
    svgIcon: "🐾"
  },
  {
    id: "tabby",
    name: "トラくん (茶トラ)",
    desc: "しましま模様。ダンボール箱やすべり台の階段裏によく潜り込む。",
    baseColor: "#f59e0b",
    patternColor1: "#b45309",
    patternColor2: "#d97706",
    eyeColor: "#d97706",
    pitch: 0.95,
    svgIcon: "🐈"
  },
  {
    id: "kuro",
    name: "クロくん (黒猫)",
    desc: "金色に光る目がトレードマーク。ベンチの下の暗がりがお気に入り。",
    baseColor: "#1e293b",
    patternColor1: "#0f172a",
    patternColor2: "#334155",
    eyeColor: "#facc15",
    pitch: 0.85,
    svgIcon: "🐈‍⬛"
  },
  {
    id: "shiro",
    name: "シロちゃん (白猫)",
    desc: "真っ白でフワフワな毛並み。青い瞳。砂場の周りでひなたぼっこ。",
    baseColor: "#f8fafc",
    patternColor1: "#f1f5f9",
    patternColor2: "#e2e8f0",
    eyeColor: "#38bdf8",
    pitch: 1.25,
    svgIcon: "🤍"
  },
  {
    id: "tuxedo",
    name: "ハチワレくん (ハチワレ)",
    desc: "顔の模様が「八」の字。すべり台のてっぺんから公園を見下ろすのが好き。",
    baseColor: "#ffffff",
    patternColor1: "#1e293b",
    patternColor2: "#0f172a",
    eyeColor: "#34d399",
    pitch: 1.0,
    svgIcon: "🖤"
  },
  {
    id: "russian",
    name: "ルシアンくん (ロシアンブルー)",
    desc: "上品なシルバーグレー。植え込みの奥に静かに隠れている。",
    baseColor: "#64748b",
    patternColor1: "#475569",
    patternColor2: "#94a3b8",
    eyeColor: "#22c55e",
    pitch: 0.9,
    svgIcon: "🩶"
  },
  {
    id: "siamese",
    name: "シャムちゃん (シャム猫)",
    desc: "青い瞳とポイントカラー。木の枝や高い場所からじっと見ている。",
    baseColor: "#fdf4ff",
    patternColor1: "#475569",
    patternColor2: "#334155",
    eyeColor: "#0284c7",
    pitch: 1.2,
    svgIcon: "🐱"
  },
  {
    id: "scottish",
    name: "スコティくん (折れ耳)",
    desc: "折れたお耳がキュート。丸い遊具やバケツの中にすっぽりハマる。",
    baseColor: "#fed7aa",
    patternColor1: "#fb923c",
    patternColor2: "#ea580c",
    eyeColor: "#eab308",
    pitch: 1.3,
    svgIcon: "😻"
  },
  {
    id: "tortie",
    name: "サビちゃん (サビ猫)",
    desc: "落ち葉の山にぴったり同化するモザイク模様。かくれんぼの達人！",
    baseColor: "#334155",
    patternColor1: "#ca8a04",
    patternColor2: "#b45309",
    eyeColor: "#84cc16",
    pitch: 1.05,
    svgIcon: "🐈"
  },
  {
    id: "golden",
    name: "ゴールド様 (黄金猫)",
    desc: "夕暮れの公園に現れる幻のネコ。見つけられたら超ラッキー！",
    baseColor: "#fbbf24",
    patternColor1: "#f59e0b",
    patternColor2: "#d97706",
    eyeColor: "#38bdf8",
    pitch: 1.4,
    svgIcon: "👑"
  }
];

class CatRenderer {
  /**
   * ネコを高速・軽量に描画
   * visibility: 0.0〜1.0 (チラ見せ度合い)
   * peekType: "ears_only" (耳だけ), "half_face" (半分), "full" (全体)
   */
  static drawCat(ctx, cat, x, y, size, state = "normal", animProgress = 0, peekType = "full") {
    ctx.save();
    ctx.translate(x, y);

    // 発見時ジャンプ
    if (state === "found") {
      const hop = Math.sin(animProgress * Math.PI) * (size * 0.4);
      ctx.translate(0, -hop);
    } else if (state === "alert") {
      // 鈴の音で少し浮き上がる
      ctx.translate(0, -size * 0.2);
    }

    const r = size * 0.45;

    // 耳の描画（耳だけチラ見せの場合も描画）
    const earW = r * 0.45;
    const earH = r * 0.6;

    // 左耳
    ctx.beginPath();
    if (cat.id === "scottish") {
      ctx.moveTo(-r * 0.6, -r * 0.1);
      ctx.quadraticCurveTo(-r * 0.65, -r * 0.55, -r * 0.25, -r * 0.45);
      ctx.lineTo(-r * 0.15, -r * 0.25);
    } else {
      ctx.moveTo(-r * 0.6, -r * 0.1);
      ctx.lineTo(-r * 0.48, -r * 0.85);
      ctx.lineTo(-r * 0.15, -r * 0.4);
    }
    ctx.closePath();
    ctx.fillStyle = cat.baseColor;
    ctx.fill();

    // 左耳の内側ピンク
    ctx.beginPath();
    ctx.moveTo(-r * 0.52, -r * 0.2);
    ctx.lineTo(-r * 0.44, -r * 0.68);
    ctx.lineTo(-r * 0.22, -r * 0.38);
    ctx.fillStyle = "#fbcfe8";
    ctx.fill();

    // 右耳
    ctx.beginPath();
    if (cat.id === "scottish") {
      ctx.moveTo(r * 0.6, -r * 0.1);
      ctx.quadraticCurveTo(r * 0.65, -r * 0.55, r * 0.25, -r * 0.45);
      ctx.lineTo(r * 0.15, -r * 0.25);
    } else {
      ctx.moveTo(r * 0.6, -r * 0.1);
      ctx.lineTo(r * 0.48, -r * 0.85);
      ctx.lineTo(r * 0.15, -r * 0.4);
    }
    ctx.closePath();
    ctx.fillStyle = cat.baseColor;
    ctx.fill();

    // 右耳の内側ピンク
    ctx.beginPath();
    ctx.moveTo(r * 0.52, -r * 0.2);
    ctx.lineTo(r * 0.44, -r * 0.68);
    ctx.lineTo(r * 0.22, -r * 0.38);
    ctx.fillStyle = "#fbcfe8";
    ctx.fill();

    // もし耳だけ隠れている状態ならここで終了
    if (peekType === "ears_only" && state !== "found" && state !== "alert") {
      ctx.restore();
      return;
    }

    // 身体
    ctx.beginPath();
    ctx.ellipse(0, r * 0.45, r * 0.85, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = cat.baseColor;
    ctx.fill();

    // 顔
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.75, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fillStyle = cat.baseColor;
    ctx.fill();

    // 模様の描画（簡略化で高速化）
    if (cat.id === "tuxedo") {
      // ハチワレ
      ctx.fillStyle = cat.patternColor1;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.5);
      ctx.lineTo(0, -r * 0.1);
      ctx.lineTo(-r * 0.6, r * 0.4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.7, -r * 0.5);
      ctx.lineTo(0, -r * 0.1);
      ctx.lineTo(r * 0.6, r * 0.4);
      ctx.fill();
    } else if (cat.id === "calico") {
      // 三毛
      ctx.fillStyle = cat.patternColor1;
      ctx.beginPath();
      ctx.arc(r * 0.4, -r * 0.3, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cat.patternColor2;
      ctx.beginPath();
      ctx.arc(-r * 0.45, r * 0.1, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (cat.id === "tabby") {
      // トラ縞
      ctx.fillStyle = cat.patternColor1;
      [-r * 0.25, 0, r * 0.25].forEach(ox => {
        ctx.fillRect(ox - 2, -r * 0.5, 4, r * 0.3);
      });
    }

    // 目
    const eyeSpacing = r * 0.3;
    const eyeY = -r * 0.05;
    const eyeR = r * 0.16;

    if (state === "found") {
      // にっこり笑顔
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(-eyeSpacing, eyeY, eyeR * 0.8, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(eyeSpacing, eyeY, eyeR * 0.8, Math.PI, 0);
      ctx.stroke();
    } else {
      // パッチリお目々
      [-eyeSpacing, eyeSpacing].forEach(eyeX => {
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = cat.eyeColor;
        ctx.fill();

        // 瞳孔
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, eyeR * 0.4, eyeR * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#0f172a";
        ctx.fill();

        // ハイライト
        ctx.beginPath();
        ctx.arc(eyeX - 2, eyeY - 2, eyeR * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      });
    }

    // 鼻と口
    ctx.beginPath();
    ctx.arc(0, r * 0.15, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#f472b6";
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#475569";
    ctx.beginPath();
    ctx.arc(-3, r * 0.22, 3, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(3, r * 0.22, 3, 0, Math.PI);
    ctx.stroke();

    // チーク
    ctx.fillStyle = "rgba(251, 113, 133, 0.4)";
    ctx.beginPath();
    ctx.arc(-r * 0.4, r * 0.15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.4, r * 0.15, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  static createCatAvatarDataUrl(cat, size = 80) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    this.drawCat(ctx, cat, size * 0.5, size * 0.52, size * 0.7, "normal", 0, "full");
    return canvas.toDataURL("image/png");
  }
}
