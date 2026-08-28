'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function NeonDodgeGame() {
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER'>(
    'IDLE'
  );
  const [score, setScore] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [layer, setLayer] = useState(1);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes per layer

  // Cooldown timers state (in seconds) - Persistent using localStorage
  const [doubleCooldown, setDoubleCooldown] = useState(0);
  const [reviveCooldown, setReviveCooldown] = useState(0);
  const [isDoubleRewarded, setIsDoubleRewarded] = useState(false);
  const [hasSyncedWallet, setHasSyncedWallet] = useState(false);

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

  // Function to sync and check cooldowns from localStorage securely
  const checkAndUpdateCooldowns = () => {
    const savedDoubleTime = localStorage.getItem('arena_double_cooldown_end');
    const savedReviveTime = localStorage.getItem('arena_revive_cooldown_end');
    const now = Date.now();

    if (savedDoubleTime) {
      const remaining = Math.ceil((parseInt(savedDoubleTime, 10) - now) / 1000);
      if (remaining > 0) {
        setDoubleCooldown(remaining);
      } else {
        setDoubleCooldown(0);
        localStorage.removeItem('arena_double_cooldown_end');
      }
    } else {
      setDoubleCooldown(0);
    }

    if (savedReviveTime) {
      const remaining = Math.ceil((parseInt(savedReviveTime, 10) - now) / 1000);
      if (remaining > 0) {
        setReviveCooldown(remaining);
      } else {
        setReviveCooldown(0);
        localStorage.removeItem('arena_revive_cooldown_end');
      }
    } else {
      setReviveCooldown(0);
    }
  };

  // Check cooldowns on mount and window focus/tab change
  useEffect(() => {
    checkAndUpdateCooldowns();

    const handleFocus = () => {
      checkAndUpdateCooldowns();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Cooldown Intervals handler with LocalStorage Tick
  useEffect(() => {
    const timer = setInterval(() => {
      checkAndUpdateCooldowns();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Wallet sync helper for white diamonds
  const addToWallet = (earnedDiamonds: number) => {
    try {
      const currentWhite = localStorage.getItem('arena_white_diamonds');
      const updated =
        (currentWhite ? parseInt(currentWhite, 10) : 24500) + earnedDiamonds;
      localStorage.setItem('arena_white_diamonds', updated.toString());
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Wallet sync error', e);
    }
  };

  // Start Game
  const startGame = () => {
    checkAndUpdateCooldowns();

    setGameState('PLAYING');
    setScore(0);
    setDiamonds(0);
    setLayer(1);
    setTimeLeft(120);
    setIsDoubleRewarded(false);
    setHasSyncedWallet(false);
    playerRef.current = { x: 175, y: 350, size: 20 };
    obstaclesRef.current = [];
    collectibleDiamondsRef.current = [];
  };

  // Handle Double Diamonds with 15-Minute (900s) Cooldown
  const handleWatchAdToDouble = () => {
    checkAndUpdateCooldowns();
    if (doubleCooldown > 0) {
      alert(
        `Anti-Fraud Protection: Please wait ${Math.floor(
          doubleCooldown / 60
        )}m ${doubleCooldown % 60}s before doubling diamonds again!`
      );
      return;
    }

    if (!isDoubleRewarded) {
      const doubled = Math.floor(diamonds * 2);
      const diff = doubled - diamonds;
      setDiamonds(doubled);
      addToWallet(diff);
      setIsDoubleRewarded(true);

      const cooldownEndTime = Date.now() + 900 * 1000; // 15 Minutes
      localStorage.setItem(
        'arena_double_cooldown_end',
        cooldownEndTime.toString()
      );
      setDoubleCooldown(900);

      alert(
        '🎉 Ad watched! Your diamonds have been successfully doubled and added to your wallet!'
      );
    }
  };

  // Revive with 2-Minute (120s) Cooldown
  const handleRevive = () => {
    checkAndUpdateCooldowns();
    if (reviveCooldown > 0) {
      alert(
        `Anti-Fraud Protection: Please wait ${Math.floor(
          reviveCooldown / 60
        )}m ${reviveCooldown % 60}s to revive again!`
      );
      return;
    }

    setGameState('PLAYING');

    const cooldownEndTime = Date.now() + 120 * 1000; // 2 Minutes
    localStorage.setItem(
      'arena_revive_cooldown_end',
      cooldownEndTime.toString()
    );
    setReviveCooldown(120);

    setHasSyncedWallet(false);
    obstaclesRef.current = [];
    alert('✨ Revived successfully! Continue playing!');
  };

  // Main Game Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let secondCounter = 0;

    const updateGame = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      secondCounter += deltaTime;
      if (secondCounter >= 1) {
        secondCounter = 0;
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setLayer((l) => (l < 7 ? l + 1 : l));
            return 120;
          }
          return prev - 1;
        });
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle =
        layer === 7 ? 'rgba(255, 0, 80, 0.2)' : 'rgba(0, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

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

      if (Math.random() < 0.015) {
        collectibleDiamondsRef.current.push({
          x: Math.random() * (canvas.width - 20),
          y: -20,
          value: 2, // यहाँ मान (value) को फिक्स करके 2 कर दिया गया है
        });
      }

      ctx.fillStyle = '#ff0055';
      obstaclesRef.current.forEach((obs, index) => {
        obs.y += obs.speed;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0055';
        ctx.fillRect(obs.x, obs.y, obs.size, obs.size);

        const p = playerRef.current;
        if (
          p.x < obs.x + obs.size &&
          p.x + p.size > obs.x &&
          p.y < obs.y + obs.size &&
          p.y + p.size > obs.y
        ) {
          setGameState('GAMEOVER');

          setHasSyncedWallet((prevSynced) => {
            if (!prevSynced && diamonds > 0) {
              addToWallet(diamonds);
            }
            return true;
          });
        }

        if (obs.y > canvas.height) {
          obstaclesRef.current.splice(index, 1);
          setScore((s) => s + 10);
        }
      });

      ctx.fillStyle = '#00ffff';
      collectibleDiamondsRef.current.forEach((dia, index) => {
        dia.y += 3.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.arc(dia.x + 10, dia.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();

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
  }, [gameState, layer, diamonds]);

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
    <div className="w-full max-w-md bg-gray-900 border border-purple-500/40 rounded-3xl p-4 flex flex-col items-center shadow-2xl relative overflow-hidden select-none">
      {/* Top HUD */}
      <div className="w-full flex justify-between items-center mb-3 bg-black/40 px-3 py-2 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-pink-400">
            🔥 Layer {layer}/7
          </span>
          <span className="text-[10px] text-gray-400">
            ({Math.floor(timeLeft / 60)}:
            {String(timeLeft % 60).padStart(2, '0')} left)
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-500/30">
          <span className="text-sm">💎</span>
          <span className="text-xs font-black text-cyan-300">{diamonds}</span>
        </div>
      </div>

      {/* Game Canvas Box */}
      <div className="relative w-[320px] h-[420px] bg-black rounded-2xl border border-cyan-500/30 overflow-hidden flex flex-col items-center justify-center">
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 p-4 text-center">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 mb-1">
              NEON SHERPA RUSH
            </h2>
            <p className="text-[11px] text-gray-300 mb-4">
              Collect scattered diamonds with risk, dodge 35% reduced red
              stones, survive 7 layers!
            </p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-black text-xs rounded-2xl shadow-lg transform active:scale-95 transition-all"
            >
              ▶️ PLAY NOW
            </button>
          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-10 p-4 text-center gap-2">
            <h2 className="text-base font-black text-red-500 uppercase">
              Game Over!
            </h2>
            <p className="text-xs text-gray-300">
              Score: {score} | Earned:{' '}
              <span className="text-cyan-400 font-bold">{diamonds} 💎</span>
            </p>

            <div className="flex flex-col gap-2 w-full mt-1">
              <button
                onClick={handleWatchAdToDouble}
                disabled={isDoubleRewarded || doubleCooldown > 0}
                className="w-full py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-[11px] rounded-xl shadow disabled:opacity-50"
              >
                {isDoubleRewarded
                  ? '✅ Diamonds Doubled!'
                  : doubleCooldown > 0
                  ? `⏳ Double Cooldown (${Math.floor(doubleCooldown / 60)}m ${
                      doubleCooldown % 60
                    }s)`
                  : '▶️ Watch Ad to Double Diamonds (2x)'}
              </button>

              <button
                onClick={handleRevive}
                disabled={reviveCooldown > 0}
                className="w-full py-2 bg-gradient-to-r from-green-400 to-cyan-500 text-black font-black text-[11px] rounded-xl shadow disabled:opacity-50"
              >
                {reviveCooldown > 0
                  ? `⏳ Revive Cooldown (${Math.floor(reviveCooldown / 60)}m ${
                      reviveCooldown % 60
                    }s)`
                  : '▶️ Watch Ad to Revive (Continue)'}
              </button>

              <button
                onClick={startGame}
                className="w-full py-1.5 bg-gray-800 text-gray-300 font-bold text-[11px] rounded-xl"
              >
                Restart Game
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
        💡 Drag to collect diamonds safely! Wallet updates automatically.
      </p>
    </div>
  );
}
