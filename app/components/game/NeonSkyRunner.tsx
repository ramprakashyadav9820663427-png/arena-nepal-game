'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface NeonSkyRunnerProps {
  onBackToLobby?: () => void;
}

export default function NeonSkyRunner({ onBackToLobby }: NeonSkyRunnerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'LOBBY' | 'GAME'>('LOBBY');
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [layer, setLayer] = useState(1);
  const [distance, setDistance] = useState(0);

  const [doubleCooldown, setDoubleCooldown] = useState(0);
  const [reviveCooldown, setReviveCooldown] = useState(0);
  const [isDoubleRewarded, setIsDoubleRewarded] = useState(false);
  const [hasSyncedWallet, setHasSyncedWallet] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);
  const diamondsRef = useRef(0);

  const playerRef = useRef({ x: 70, y: 260, vy: 0, width: 30, height: 38, jumping: false });
  const platformsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  const diamondsListRef = useRef<{ x: number; y: number; collected: boolean }[]>([]);
  const magnetRef = useRef<{ x: number; y: number; active: boolean; timer: number } | null>(null);
  const cameraX = useRef(0);
  const speedRef = useRef(2.6);
  const gravity = 0.45;        // कम ग्रेविटी
  const jumpForce = -12.8;     // ऊंचा जंप

  useEffect(() => {
    diamondsRef.current = diamonds;
  }, [diamonds]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const checkCooldowns = () => {
    const now = Date.now();
    const dEnd = localStorage.getItem('sky_double_cd');
    const rEnd = localStorage.getItem('sky_revive_cd');

    if (dEnd) {
      const rem = Math.ceil((parseInt(dEnd) - now) / 1000);
      setDoubleCooldown(rem > 0 ? rem : 0);
      if (rem <= 0) localStorage.removeItem('sky_double_cd');
    }
    if (rEnd) {
      const rem = Math.ceil((parseInt(rEnd) - now) / 1000);
      setReviveCooldown(rem > 0 ? rem : 0);
      if (rem <= 0) localStorage.removeItem('sky_revive_cd');
    }
  };

  useEffect(() => {
    checkCooldowns();
    const t = setInterval(checkCooldowns, 1000);
    return () => clearInterval(t);
  }, []);

  const addToWallet = async (earned: number) => {
    if (!earned || earned <= 0) return;
    try {
      let current = 0;
      const raw = localStorage.getItem('arena_white_diamonds');
      if (raw) {
        const n = parseInt(raw, 10);
        if (!isNaN(n)) current = n;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('white_diamonds')
          .eq('id', session.user.id)
          .single();
        current = Math.max(current, Number(profile?.white_diamonds) || 0);
      }

      const updated = current + earned;
      localStorage.setItem('arena_white_diamonds', String(updated));

      window.dispatchEvent(
        new CustomEvent('walletUpdated', {
          detail: { whiteDiamonds: updated },
        })
      );

      if (session?.user?.id) {
        await supabase
          .from('profiles')
          .update({ white_diamonds: updated })
          .eq('id', session.user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetGame = () => {
    playerRef.current = { x: 70, y: 260, vy: 0, width: 30, height: 38, jumping: false };
    
    // शुरुआत के प्लेटफॉर्म एकदम पास-पास और लंबे
    platformsRef.current = [
      { x: 0, y: 340, w: 420, h: 30 },
      { x: 460, y: 310, w: 200, h: 22 },
      { x: 700, y: 280, w: 180, h: 22 },
      { x: 920, y: 300, w: 170, h: 22 },
    ];
    
    diamondsListRef.current = [];
    magnetRef.current = null;
    cameraX.current = 0;
    speedRef.current = 2.6;
    setScore(0);
    setDiamonds(0);
    diamondsRef.current = 0;
    setLayer(1);
    setDistance(0);
    setIsDoubleRewarded(false);
    setHasSyncedWallet(false);
  };

  const startGame = () => {
    checkCooldowns();
    resetGame();
    setGameState('PLAYING');
    setActiveScreen('GAME');
  };

  const handleJump = () => {
    const p = playerRef.current;
    if (!p.jumping && gameState === 'PLAYING') {
      p.vy = jumpForce;
      p.jumping = true;
    }
  };

  const handleDouble = () => {
    checkCooldowns();
    if (doubleCooldown > 0 || isDoubleRewarded) return;

    const current = diamondsRef.current;
    const doubled = current * 2;
    const diff = doubled - current;
    setDiamonds(doubled);
    diamondsRef.current = doubled;
    addToWallet(diff);
    setIsDoubleRewarded(true);

    const end = Date.now() + 900 * 1000;
    localStorage.setItem('sky_double_cd', end.toString());
    setDoubleCooldown(900);
  };

  const handleRevive = () => {
    checkCooldowns();
    if (reviveCooldown > 0) return;

    setGameState('PLAYING');
    playerRef.current.y = 200;
    playerRef.current.vy = 0;
    playerRef.current.jumping = false;
    setHasSyncedWallet(false);

    const end = Date.now() + 120 * 1000;
    localStorage.setItem('sky_revive_cd', end.toString());
    setReviveCooldown(120);
  };

  useEffect(() => {
    if (activeScreen !== 'GAME' || gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.67, 2);
      lastTime = time;

      const p = playerRef.current;
      const speed = speedRef.current;

      cameraX.current += speed * dt;
      setDistance(Math.floor(cameraX.current / 10));

      // Physics
      p.vy += gravity * dt;
      p.y += p.vy * dt;

      // Platform collision (थोड़ा आसान बनाया)
      platformsRef.current.forEach((plat) => {
        const platScreenX = plat.x - cameraX.current;
        if (
          p.x + p.width > platScreenX + 5 &&
          p.x < platScreenX + plat.w - 5 &&
          p.y + p.height >= plat.y - 2 &&
          p.y + p.height <= plat.y + 22 &&
          p.vy >= 0
        ) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.jumping = false;
        }
      });

      // नए प्लेटफॉर्म (गैप बहुत कम रखा है)
      const lastPlat = platformsRef.current[platformsRef.current.length - 1];
      if (lastPlat && lastPlat.x - cameraX.current < 600) {
        // शुरुआत में गैप बहुत छोटा
        const baseGap = 45 + layer * 8; // बहुत कम गैप
        const gap = baseGap + Math.random() * 25;
        const newX = lastPlat.x + lastPlat.w + gap;
        
        // ऊंचाई का अंतर भी कम
        const heightDiff = (Math.random() - 0.5) * 50;
        const newY = Math.max(220, Math.min(340, lastPlat.y + heightDiff));
        const newW = 140 + Math.random() * 80;

        platformsRef.current.push({ x: newX, y: newY, w: newW, h: 20 });

        // डायमंड प्लेटफॉर्म के ऊपर (2-4)
        const diamondCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < diamondCount; i++) {
          diamondsListRef.current.push({
            x: newX + 20 + i * 26,
            y: newY - 16,
            collected: false,
          });
        }

        // कभी-कभी मैग्नेट
        if (Math.random() < 0.06 && !magnetRef.current) {
          magnetRef.current = {
            x: newX + newW / 2,
            y: newY - 50,
            active: false,
            timer: 0,
          };
        }
      }

      // पुराने प्लेटफॉर्म साफ
      platformsRef.current = platformsRef.current.filter(
        (plat) => plat.x - cameraX.current > -300
      );

      // लेयर और स्पीड (धीमी बढ़ोतरी)
      const newLayer = Math.min(7, Math.floor(cameraX.current / 2500) + 1);
      if (newLayer !== layer) {
        setLayer(newLayer);
        speedRef.current = 2.6 + (newLayer - 1) * 0.35;
      }

      // सिर्फ नीचे गिरने पर मौत
      if (p.y > 450) {
        setGameState('GAMEOVER');
        if (!hasSyncedWallet) {
          addToWallet(diamondsRef.current);
          setHasSyncedWallet(true);
        }
      }

      // डायमंड कलेक्ट
      diamondsListRef.current.forEach((d) => {
        if (d.collected) return;
        const dx = d.x - cameraX.current;
        const dist = Math.hypot(p.x + 15 - dx, p.y + 19 - d.y);

        if (magnetRef.current?.active) {
          d.x += (p.x - (d.x - cameraX.current)) * 0.12;
          d.y += (p.y - d.y) * 0.12;
        }

        if (dist < 28) {
          d.collected = true;
          setDiamonds((prev) => prev + 1);
          setScore((s) => s + 15);
        }
      });

      // मैग्नेट
      if (magnetRef.current) {
        const m = magnetRef.current;
        const mx = m.x - cameraX.current;
        if (!m.active) {
          const dist = Math.hypot(p.x + 15 - mx, p.y + 19 - m.y);
          if (dist < 35) {
            m.active = true;
            m.timer = 8;
          }
        } else {
          m.timer -= dt / 60;
          if (m.timer <= 0) magnetRef.current = null;
        }
      }

      // ========== DRAW ==========
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a0a1a');
      grad.addColorStop(1, '#12081f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      for (let i = 0; i < 28; i++) {
        const sx = ((i * 97 + cameraX.current * 0.2) % canvas.width);
        const sy = (i * 53) % canvas.height;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Platforms
      platformsRef.current.forEach((plat) => {
        const px = plat.x - cameraX.current;
        ctx.fillStyle = '#1e293b';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 12;
        ctx.fillRect(px, plat.y, plat.w, plat.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(px, plat.y, plat.w, 3);
      });

      // Diamonds
      diamondsListRef.current.forEach((d) => {
        if (d.collected) return;
        const dx = d.x - cameraX.current;
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(dx, d.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Magnet
      if (magnetRef.current && !magnetRef.current.active) {
        const mx = magnetRef.current.x - cameraX.current;
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(mx, magnetRef.current.y, 12, Math.PI, 0);
        ctx.stroke();
      }

      // Player
      ctx.fillStyle = '#00ffcc';
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.width, p.height, 9);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x + 7, p.y + 11, 5, 5);
      ctx.fillRect(p.x + 18, p.y + 11, 5, 5);

      setScore((s) => s + Math.floor(speed * dt * 0.7));

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [activeScreen, gameState, layer, hasSyncedWallet]);

  if (!isMounted) return null;

  // ==================== LOBBY ====================
  if (activeScreen === 'LOBBY') {
    return (
      <div className="w-full max-w-md mx-auto text-white flex flex-col items-center pb-24 px-3 select-none">
        <div className="w-full bg-gradient-to-r from-indigo-950 via-purple-950 to-black border border-cyan-500/40 p-4 rounded-3xl mb-5 shadow-2xl flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-pink-400">
              ARENA ARCADE HUB 🎮
            </h2>
            <p className="text-[10px] text-gray-300">Play & earn White Diamonds</p>
          </div>
          {onBackToLobby && (
            <button
              onClick={onBackToLobby}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 font-bold text-[11px] rounded-xl border border-gray-700"
            >
              ✕ Exit
            </button>
          )}
        </div>

        <div className="w-full bg-gray-900/90 border border-cyan-500/40 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl">
              🏃‍♂️
            </div>
            <div>
              <h3 className="text-base font-black text-white">Neon Sky Runner</h3>
              <p className="text-[11px] text-cyan-300/80">2.5D Endless Runner</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-5 leading-relaxed">
            Jump across neon platforms and collect White Diamonds. Easy start, gets better with layers!
          </p>
          <button
            onClick={startGame}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 text-black font-black text-sm rounded-2xl shadow-lg active:scale-95 transition"
          >
            PLAY NOW
          </button>
        </div>
      </div>
    );
  }

  // ==================== GAME SCREEN ====================
  return (
    <div className="w-full max-w-md bg-gray-900 border border-cyan-500/40 rounded-3xl p-3 sm:p-4 flex flex-col items-center shadow-2xl relative overflow-hidden select-none mb-24">
      <div className="w-full flex justify-between items-center mb-3 gap-2">
        <button
          onClick={() => {
            setActiveScreen('LOBBY');
            setGameState('IDLE');
          }}
          className="px-3 py-1 bg-gray-800 text-gray-300 font-bold text-[11px] rounded-xl border border-gray-700"
        >
          ← Lobby
        </button>
        <span className="text-xs font-black text-pink-400">🔥 Layer {layer}/7</span>
        {onBackToLobby && (
          <button
            onClick={onBackToLobby}
            className="px-3 py-1 bg-red-600/20 text-red-300 font-bold text-[11px] rounded-xl border border-red-500/40"
          >
            ✕ Exit
          </button>
        )}
      </div>

      <div className="w-full flex justify-between items-center mb-3 bg-black/50 px-3 py-2 rounded-2xl border border-gray-800">
        <span className="text-[10px] text-gray-400">
          Dist: {distance}m
        </span>
        <div className="flex items-center gap-1.5 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-500/30">
          <span>💎</span>
          <span className="text-xs font-black text-cyan-300">{diamonds}</span>
        </div>
      </div>

      <div className="relative w-full max-w-[340px] aspect-[340/400] bg-black rounded-2xl border border-cyan-500/30 overflow-hidden mx-auto">
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-4 text-center gap-2">
            <h2 className="text-xl font-black text-red-500">GAME OVER</h2>
            <p className="text-sm text-gray-300">
              Distance: {distance}m | Score: {score}
            </p>
            <p className="text-cyan-300 font-bold">
              Earned: {diamonds} 💎 White Diamonds
            </p>

            <div className="flex flex-col gap-2 w-full mt-3">
              <button
                onClick={handleDouble}
                disabled={isDoubleRewarded || doubleCooldown > 0}
                className="w-full py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-[12px] rounded-xl disabled:opacity-50"
              >
                {isDoubleRewarded
                  ? '✅ Diamonds Doubled!'
                  : doubleCooldown > 0
                  ? `⏳ Wait ${Math.floor(doubleCooldown / 60)}m ${doubleCooldown % 60}s`
                  : '▶️ Watch Ad to Double (2x)'}
              </button>

              <button
                onClick={handleRevive}
                disabled={reviveCooldown > 0}
                className="w-full py-2.5 bg-gradient-to-r from-green-400 to-cyan-500 text-black font-black text-[12px] rounded-xl disabled:opacity-50"
              >
                {reviveCooldown > 0
                  ? `⏳ Revive in ${Math.floor(reviveCooldown / 60)}m ${reviveCooldown % 60}s`
                  : '▶️ Watch Ad to Revive'}
              </button>

              <button
                onClick={startGame}
                className="w-full py-2 bg-gray-800 text-gray-300 font-bold text-[12px] rounded-xl"
              >
                Restart Game
              </button>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={340}
          height={400}
          className="w-full h-full touch-none"
          onClick={handleJump}
          onTouchStart={handleJump}
        />
      </div>

      <button
        onMouseDown={handleJump}
        onTouchStart={handleJump}
        className="w-full mt-4 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-lg rounded-2xl shadow-lg active:scale-95 transition"
      >
        JUMP
      </button>
    </div>
  );
}