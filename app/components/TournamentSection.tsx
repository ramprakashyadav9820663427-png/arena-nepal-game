'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function TournamentSection() {
  const [redDiamonds, setRedDiamonds] = useState(150);
  const [activeTournament, setActiveTournament] = useState<
    'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
  >('NONE');

  // Lobby vs Actual Game Flow state
  const [inLobby, setInLobby] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Tournament Game State (1 Hour Timer)
  const [timeLeft, setTimeLeft] = useState(3600); // 1 Hour (3600 seconds)
  const [score, setScore] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [layer, setLayer] = useState(1);
  const [layerTimeLeft, setLayerTimeLeft] = useState(120); // 2 minutes per layer inside tourney
  const [gameOver, setGameOver] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);

  // Game entities refs
  const playerRef = useRef({ x: 175, y: 350, size: 20 });
  const obstaclesRef = useRef<
    { x: number; y: number; size: number; speed: number }[]
  >([]);
  const collectibleDiamondsRef = useRef<
    { x: number; y: number; value: number }[]
  >([]);

  // Load Red Diamonds on mount
  useEffect(() => {
    try {
      const red = localStorage.getItem('arena_red_diamonds');
      if (red) setRedDiamonds(parseInt(red, 10));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Global Wallet sync helper for white diamonds
  const addToWallet = (earnedDiamonds: number) => {
    try {
      const currentWhite = localStorage.getItem('arena_white_diamonds');
      const updated =
        (currentWhite ? parseInt(currentWhite, 10) : 24500) + earnedDiamonds;
      localStorage.setItem('arena_white_diamonds', updated.toString());
    } catch (e) {
      console.error('Wallet sync error', e);
    }
  };

  // Main 1-Hour Tournament Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameStarted && !gameOver && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameOver(true);
            addToWallet(diamonds); // Sync final score/diamonds when 1 hour expires
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameStarted, gameOver, timeLeft, diamonds]);

  // Handle Join Tournament Button Click -> Opens Lobby without deducting diamonds yet
  const handleJoinClick = (type: 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
    const fee = type === 'DAILY' ? 50 : type === 'WEEKLY' ? 200 : 500;
    if (redDiamonds < fee) {
      alert(
        `❌ Not enough Red Diamonds! You need ${fee} Red Diamonds to join.`
      );
      return;
    }

    setActiveTournament(type);
    setInLobby(true); // Open Lobby with Nepali Warning
    setGameStarted(false);
  };

  // Start the actual Neon Dodge Game from Lobby -> Deducts Red Diamonds here safely
  const startTourneyGamePlay = () => {
    const fee =
      activeTournament === 'DAILY'
        ? 50
        : activeTournament === 'WEEKLY'
        ? 200
        : 500;
    if (redDiamonds < fee) {
      alert(`❌ Not enough Red Diamonds!`);
      return;
    }

    // Deduct Red Diamonds only when starting the match
    const remaining = redDiamonds - fee;
    setRedDiamonds(remaining);
    localStorage.setItem('arena_red_diamonds', remaining.toString());

    setInLobby(false);
    setGameStarted(true);
    setScore(0);
    setDiamonds(0);
    setLayer(1);
    setLayerTimeLeft(120);
    setTimeLeft(3600); // 1 hour match duration
    setGameOver(false);
    playerRef.current = { x: 175, y: 350, size: 20 };
    obstaclesRef.current = [];
    collectibleDiamondsRef.current = [];
  };

  // Handle Restart Game inside 1-hour window if player dies
  const handleRestartGame = () => {
    setGameOver(false);
    setScore(0);
    setLayer(1);
    setLayerTimeLeft(120);
    playerRef.current = { x: 175, y: 350, size: 20 };
    obstaclesRef.current = [];
    collectibleDiamondsRef.current = [];
  };

  // Main Game Loop for Neon Dodge Game inside Tournament
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let secondCounter = 0;

    const updateGame = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Layer timer countdown (2 mins = 120 secs per layer)
      secondCounter += deltaTime;
      if (secondCounter >= 1) {
        secondCounter = 0;
        setLayerTimeLeft((prev) => {
          if (prev <= 1) {
            setLayer((l) => (l < 7 ? l + 1 : l));
            return 120;
          }
          return prev - 1;
        });
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background grid effect
      ctx.strokeStyle =
        layer === 7 ? 'rgba(255, 0, 80, 0.2)' : 'rgba(0, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      // Obstacle Spawn Rate
      const baseSpawnChance = 0.03 + layer * 0.005;
      const spawnChance =
        layer === 1 ? baseSpawnChance : baseSpawnChance * 0.65;

      if (Math.random() < spawnChance) {
        obstaclesRef.current.push({
          x: Math.random() * (canvas.width - 20),
          y: -20,
          size: 15 + Math.random() * 10,
          speed: 3 + layer * 1.0,
        });
      }

      // Spawn scattered risk-based diamonds
      if (Math.random() < 0.015) {
        collectibleDiamondsRef.current.push({
          x: Math.random() * (canvas.width - 20),
          y: -20,
          value: Math.floor(5 + Math.random() * 8 * layer),
        });
      }

      // Update & Draw Obstacles (Red Stones)
      ctx.fillStyle = '#ff0055';
      obstaclesRef.current.forEach((obs, index) => {
        obs.y += obs.speed;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0055';
        ctx.fillRect(obs.x, obs.y, obs.size, obs.size);

        // Collision check with player (On death, show game over screen with Restart option for 1 hour duration)
        const p = playerRef.current;
        if (
          p.x < obs.x + obs.size &&
          p.x + p.size > obs.x &&
          p.y < obs.y + obs.size &&
          p.y + p.size > obs.y
        ) {
          setGameOver(true);
          addToWallet(diamonds); // Sync earned diamonds to wallet on death/score update
        }

        if (obs.y > canvas.height) {
          obstaclesRef.current.splice(index, 1);
          setScore((s) => s + 10);
        }
      });

      // Update & Draw Diamonds
      ctx.fillStyle = '#00ffff';
      collectibleDiamondsRef.current.forEach((dia, index) => {
        dia.y += 3.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.arc(dia.x + 10, dia.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Collection check
        const p = playerRef.current;
        const dist = Math.hypot(
          p.x + 10 - (dia.x + 10),
          p.y + 10 - (dia.y + 10)
        );
        if (dist < p.size / 2 + 10) {
          setDiamonds((d) => d + dia.value);
          collectibleDiamondsRef.current.splice(index, 1);
        }

        if (dia.y > canvas.height) {
          collectibleDiamondsRef.current.splice(index, 1);
        }
      });

      ctx.shadowBlur = 0;

      // Draw Player
      const p = playerRef.current;
      ctx.fillStyle = '#00ffcc';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00ffcc';
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.shadowBlur = 0;

      requestRef.current = requestAnimationFrame(updateGame);
    };

    requestRef.current = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameStarted, gameOver, layer, diamonds]);

  // Player Touch/Mouse Control
  const handleTouchMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX =
      'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = clientX - rect.left;
    if (x >= 0 && x <= canvas.width - playerRef.current.size) {
      playerRef.current.x = x;
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. TOURNAMENT LOBBY WITH NEPALI WARNING */}
      {inLobby ? (
        <div className="w-full max-w-md bg-gray-900 border border-purple-500/40 rounded-3xl p-5 flex flex-col items-center shadow-2xl relative text-center">
          <h2 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 uppercase mb-3">
            ⚠️ {activeTournament} Tournament Lobby
          </h2>

          <div className="bg-black/60 p-4 rounded-2xl border border-red-500/40 mb-5 text-left">
            <p className="text-xs text-red-400 font-bold mb-1">
              महत्वपूर्ण चेतावनी (Important Warning):
            </p>
            <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
              "एक पटक खेल (Game) सुरु भइसकेपछि कृपया बीचमा नछाड्नुहोला वा बाहिर
              नजानुहोला। यदि तपाईंले खेल बीचैमा काट्नुभयो वा बाहिर निस्कनुभयो
              भने, तपाईंको अहिलेसम्मको स्कोर मात्र जोडिनेछ र फेरि खेल्न वा पुनः
              सुरु गर्न पाइने छैन। त्यसैले १ घण्टासम्म निरन्तर ध्यान दिएर
              खेल्नुहोला!"
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={startTourneyGamePlay}
              className="w-full py-3 bg-gradient-to-r from-cyan-400 from-pink-500 text-black font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              ▶️ START MATCH (खेल सुरु गर्नुहोस्)
            </button>
          </div>
        </div>
      ) : gameStarted ? (
        /* 2. ACTIVE TOURNAMENT GAME SCREEN WITH 1-HR TIMER & UNLIMITED RESTART */
        <div className="w-full max-w-md bg-gray-900 border border-purple-500/40 rounded-3xl p-4 flex flex-col items-center shadow-2xl relative">
          {/* Top HUD with Tourney Timer & Layer Info */}
          <div className="w-full flex justify-between items-center mb-3 bg-black/60 px-3 py-2 rounded-2xl border border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-pink-400">
                🔥 Layer {layer}/7
              </span>
              <span className="text-[10px] text-gray-400">
                ({Math.floor(layerTimeLeft / 60)}:
                {String(layerTimeLeft % 60).padStart(2, '0')})
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-purple-950/60 px-2.5 py-1 rounded-xl border border-purple-500/30">
              <span className="text-xs font-black text-yellow-400">
                ⏱️ {Math.floor(timeLeft / 60)}:
                {String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-purple-950/60 px-2 py-1 rounded-xl border border-purple-500/30">
              <span className="text-sm">💎</span>
              <span className="text-xs font-black text-cyan-300">
                {diamonds}
              </span>
            </div>
          </div>

          {/* Game Canvas Box */}
          <div className="relative w-[320px] h-[420px] bg-black rounded-2xl border border-cyan-500/30 overflow-hidden flex flex-col items-center justify-center">
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-10 p-4 text-center gap-2">
                <h2 className="text-base font-black text-red-500 uppercase">
                  {timeLeft <= 0 ? 'Tournament Time Up!' : 'Game Over!'}
                </h2>
                <p className="text-xs text-gray-300">
                  Score: {score} | Earned:{' '}
                  <span className="text-cyan-400 font-bold">{diamonds} 💎</span>
                </p>
                <p className="text-[10px] text-gray-400 mb-2">
                  {timeLeft > 0
                    ? 'आप 1 घंटे का समय खत्म होने तक दोबारा खेल सकते हैं!'
                    : '1 घंटे का समय पूरा हो गया है।'}
                </p>

                <div className="flex flex-col gap-2 w-full mt-1">
                  {timeLeft > 0 && (
                    <button
                      onClick={handleRestartGame}
                      className="w-full py-2.5 bg-gradient-to-r from-green-400 to-cyan-500 text-black font-black text-xs rounded-xl shadow active:scale-95 transition-all"
                    >
                      🔄 RESTART & PLAY AGAIN (1 घंटा बाकी है)
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setGameStarted(false);
                      setActiveTournament('NONE');
                    }}
                    className="w-full py-2 bg-gray-800 text-gray-300 font-bold text-xs rounded-xl"
                  >
                    Exit to Tournaments (बाहर जाएं)
                  </button>
                </div>
              </div>
            )}

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={320}
              height={420}
              onMouseMove={handleTouchMove}
              onTouchMove={handleTouchMove}
              className="cursor-crosshair touch-none"
            />
          </div>

          <p className="text-[10px] text-gray-400 mt-2 text-center">
            ⚠️ 1 Hour match active. Do not close or refresh window!
          </p>
        </div>
      ) : (
        /* 3. TOURNAMENT LIST SELECTION SCREEN */
        <div className="w-full max-w-md flex flex-col gap-4">
          <div className="flex justify-between items-center bg-gray-900/90 border border-purple-500/30 px-4 py-2.5 rounded-2xl">
            <span className="text-xs font-bold text-gray-300">
              Your Red Diamonds:
            </span>
            <span className="text-xs font-black text-red-400">
              {redDiamonds} 🔴
            </span>
          </div>

          <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
            ACTIVE TOURNAMENTS
          </h2>

          {/* DAILY */}
          <div className="bg-gray-900/90 border border-purple-500/30 rounded-3xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-pink-400">
                DAILY TOURNAMENT
              </span>
              <span className="text-[10px] bg-purple-950 text-cyan-300 px-2 py-1 rounded-xl border border-purple-500/30 font-bold">
                50 Red Dias 🔴
              </span>
            </div>
            <p className="text-xs text-yellow-400 font-bold">
              Prize Pool: NPR 2,800 🏆
            </p>
            <button
              onClick={() => handleJoinClick('DAILY')}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-400 from-pink-500 text-black font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              JOIN NOW (1 Hour Match)
            </button>
            <div className="bg-black/40 p-2.5 rounded-xl border border-gray-800 text-[10px] text-gray-300 space-y-1">
              <p className="font-bold text-pink-300">
                📋 Daily Prize Pool Breakdown:
              </p>
              <div className="grid grid-cols-2 gap-1 text-gray-400">
                <span>1st: NPR 700</span>
                <span>6th: NPR 150</span>
                <span>2nd: NPR 500</span>
                <span>7th: NPR 150</span>
                <span>3rd: NPR 400</span>
                <span>8th: NPR 150</span>
                <span>4th: NPR 300</span>
                <span>9th: NPR 150</span>
                <span>5th: NPR 200</span>
                <span>10th: NPR 100</span>
              </div>
            </div>
          </div>

          {/* WEEKLY */}
          <div className="bg-gray-900/90 border border-purple-500/30 rounded-3xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-pink-400">
                WEEKLY TOURNAMENT
              </span>
              <span className="text-[10px] bg-purple-950 text-cyan-300 px-2 py-1 rounded-xl border border-purple-500/30 font-bold">
                200 Red Dias 🔴
              </span>
            </div>
            <p className="text-xs text-yellow-400 font-bold">
              Prize Pool: NPR 16,000 🏆
            </p>
            <button
              onClick={() => handleJoinClick('WEEKLY')}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-400 from-pink-500 text-black font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              JOIN NOW (1 Hour Match)
            </button>
            <div className="bg-black/40 p-2.5 rounded-xl border border-gray-800 text-[10px] text-gray-300 space-y-1">
              <p className="font-bold text-pink-300">
                📋 Weekly Prize Pool Breakdown:
              </p>
              <div className="grid grid-cols-2 gap-1 text-gray-400">
                <span>1st: NPR 5,000</span>
                <span>6th: NPR 900</span>
                <span>2nd: NPR 3,000</span>
                <span>7th: NPR 800</span>
                <span>3rd: NPR 2,000</span>
                <span>8th: NPR 700</span>
                <span>4th: NPR 1,500</span>
                <span>9th: NPR 600</span>
                <span>5th: NPR 1,000</span>
                <span>10th: NPR 500</span>
              </div>
            </div>
          </div>

          {/* MONTHLY */}
          <div className="bg-gray-900/90 border border-purple-500/30 rounded-3xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-pink-400">
                MONTHLY TOURNAMENT
              </span>
              <span className="text-[10px] bg-purple-950 text-cyan-300 px-2 py-1 rounded-xl border border-purple-500/30 font-bold">
                500 Red Dias 🔴
              </span>
            </div>
            <p className="text-xs text-yellow-400 font-bold">
              Prize Pool: NPR 50,000 🏆
            </p>
            <button
              onClick={() => handleJoinClick('MONTHLY')}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-400 from-pink-500 text-black font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              JOIN NOW (1 Hour Match)
            </button>
            <div className="bg-black/40 p-2.5 rounded-xl border border-gray-800 text-[10px] text-gray-300 space-y-1">
              <p className="font-bold text-pink-300">
                📋 Monthly Prize Pool Breakdown:
              </p>
              <div className="grid grid-cols-2 gap-1 text-gray-400">
                <span>1st: NPR 15,000</span>
                <span>6th: NPR 3,000</span>
                <span>2nd: NPR 10,000</span>
                <span>7th: NPR 2,500</span>
                <span>3rd: NPR 7,000</span>
                <span>8th: NPR 2,000</span>
                <span>4th: NPR 5,000</span>
                <span>9th: NPR 1,500</span>
                <span>5th: NPR 4,000</span>
                <span>10th: NPR 1,000</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
