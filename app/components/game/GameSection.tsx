'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface UserWallet {
  [key: string]: any;
}

interface GameSectionProps {
  wallet?: UserWallet;
  setWallet?: React.Dispatch<React.SetStateAction<UserWallet>> | any;
}

export default function GameSection({ wallet, setWallet }: GameSectionProps) {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [activeGame, setActiveGame] = useState<'LOBBY' | 'NEON'>('LOBBY');

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER'>('IDLE');
  const [score, setScore] = useState<number>(0);
  const [diamonds, setDiamonds] = useState<number>(0);
  const [layer, setLayer] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(120);

  // Cooldown timers state (Persistent using localStorage)
  const [doubleCooldown, setDoubleCooldown] = useState<number>(0);
  const [reviveCooldown, setReviveCooldown] = useState<number>(0);
  const [isDoubleRewarded, setIsDoubleRewarded] = useState<boolean>(false);
  const [hasSyncedWallet, setHasSyncedWallet] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);

  const playerRef = useRef<{ x: number; y: number; radius: number }>({ x: 150, y: 315, radius: 14 });
  const obstaclesRef = useRef<{ x: number; y: number; size: number; speed: number }[]>([]);
  const collectibleDiamondsRef = useRef<{ x: number; y: number; value: number }[]>([]);

  const magnetRef = useRef<{ x: number; y: number; speed: number; active: boolean } | null>(null);
  const magnetTimerRef = useRef<number>(0);
  const moveDirectionRef = useRef<'LEFT' | 'RIGHT' | null>(null);

  // Always keep latest diamonds for game-over sync (avoids stale closure)
  const diamondsRef = useRef<number>(0);
  useEffect(() => {
    diamondsRef.current = diamonds;
  }, [diamonds]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const playClickSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  };

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

  useEffect(() => {
    checkAndUpdateCooldowns();
    const handleFocus = () => checkAndUpdateCooldowns();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      checkAndUpdateCooldowns();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * White Diamonds ONLY — add (never deduct).
   * 1) localStorage
   * 2) walletUpdated event → Lobby header + Wallet update instantly
   * 3) Supabase profiles.white_diamonds → survives refresh
   */
  const addToWallet = async (earnedDiamonds: number) => {
    if (!earnedDiamonds || earnedDiamonds <= 0) return;

    try {
      // Base = max(localStorage, Supabase) so we never wipe existing balance
      let current = 0;
      try {
        const raw = localStorage.getItem('arena_white_diamonds');
        if (raw !== null && raw !== '') {
          const n = parseInt(raw, 10);
          if (!isNaN(n)) current = n;
        }
      } catch {
        // ignore
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('white_diamonds')
          .eq('id', session.user.id)
          .single();

        const serverWhite = Number(profile?.white_diamonds) || 0;
        current = Math.max(current, serverWhite);
      }

      const updated = current + earnedDiamonds;

      // 1. localStorage
      try {
        localStorage.setItem('arena_white_diamonds', String(updated));
      } catch {
        // ignore
      }

      // 2. Live UI sync (Lobby header + WalletSection)
      window.dispatchEvent(
        new CustomEvent('walletUpdated', {
          detail: {
            whiteDiamonds: updated,
          },
        })
      );

      // 3. Persist to Supabase so refresh keeps the value
      if (session?.user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ white_diamonds: updated })
          .eq('id', session.user.id);

        if (error) {
          console.error('Failed to persist white_diamonds:', error);
        }
      }
    } catch (e) {
      console.error('White diamond sync error', e);
    }
  };

  const startGame = () => {
    checkAndUpdateCooldowns();
    setGameState('PLAYING');
    setScore(0);
    setDiamonds(0);
    diamondsRef.current = 0;
    setLayer(1);
    setTimeLeft(120);
    setIsDoubleRewarded(false);
    setHasSyncedWallet(false);
    playerRef.current = { x: 160, y: 315, radius: 14 };
    obstaclesRef.current = [];
    collectibleDiamondsRef.current = [];
    magnetRef.current = null;
    magnetTimerRef.current = 0;
    moveDirectionRef.current = null;
  };

  // Double Diamonds (ad) — only adds the extra difference
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
      const current = diamondsRef.current;
      const doubled = Math.floor(current * 2);
      const diff = doubled - current;
      setDiamonds(doubled);
      diamondsRef.current = doubled;
      addToWallet(diff);
      setIsDoubleRewarded(true);

      const cooldownEndTime = Date.now() + 900 * 1000; // 15 Minutes
      localStorage.setItem('arena_double_cooldown_end', cooldownEndTime.toString());
      setDoubleCooldown(900);

      alert('🎉 Ad watched! Your diamonds have been successfully doubled and added to your wallet!');
    }
  };

  // Revive
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
    localStorage.setItem('arena_revive_cooldown_end', cooldownEndTime.toString());
    setReviveCooldown(120);

    setHasSyncedWallet(false);
    obstaclesRef.current = [];
    magnetRef.current = null;
    magnetTimerRef.current = 0;
    moveDirectionRef.current = null;
    alert('✨ Revived successfully! Continue playing!');
  };

  useEffect(() => {
    if (activeGame !== 'NEON' || gameState !== 'PLAYING') return;

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
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            setLayer((l: number) => (l < 7 ? l + 1 : l));
            return 120;
          }
          return prev - 1;
        });

        if (magnetTimerRef.current > 0) {
          magnetTimerRef.current -= 1;
          if (magnetTimerRef.current <= 0 && magnetRef.current) {
            magnetRef.current.active = false;
          }
        }
      }

      const p = playerRef.current;
      const speed = 4.5;
      if (moveDirectionRef.current === 'LEFT') {
        p.x = Math.max(p.radius + 4, p.x - speed);
      } else if (moveDirectionRef.current === 'RIGHT') {
        p.x = Math.min(canvas.width - p.radius - 4, p.x + speed);
      }
      p.y = 315;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = layer === 7 ? 'rgba(255, 0, 80, 0.2)' : 'rgba(0, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      const baseSpawnChance = 0.02 + layer * 0.0025;
      const spawnChance = layer === 1 ? baseSpawnChance * 0.7 : baseSpawnChance;

      if (Math.random() < spawnChance) {
        const obstacleSpeed = 1.2 + layer * 0.45;
        obstaclesRef.current.push({
          x: Math.random() * (canvas.width - 25),
          y: -25,
          size: 16 + Math.random() * 6,
          speed: obstacleSpeed,
        });
      }

      if (Math.random() < 0.012) {
        collectibleDiamondsRef.current.push({
          x: Math.random() * (canvas.width - 20),
          y: -20,
          value: 1,
        });
      }

      if (!magnetRef.current && Math.random() < 0.003) {
        magnetRef.current = {
          x: Math.random() * (canvas.width - 30),
          y: -30,
          speed: 1.8,
          active: false,
        };
      }

      ctx.fillStyle = '#ff0055';
      obstaclesRef.current.forEach((obs, index) => {
        obs.y += obs.speed;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0055';
        ctx.fillRect(obs.x, obs.y, obs.size, obs.size);

        const closestX = Math.max(obs.x, Math.min(p.x, obs.x + obs.size));
        const closestY = Math.max(obs.y, Math.min(p.y, obs.y + obs.size));
        const distance = Math.hypot(p.x - closestX, p.y - closestY);

        if (distance < p.radius) {
          setGameState('GAMEOVER');
          moveDirectionRef.current = null;

          setHasSyncedWallet((prevSynced: boolean) => {
            if (!prevSynced) {
              const earned = diamondsRef.current;
              if (earned > 0) {
                addToWallet(earned);
              }
            }
            return true;
          });
        }

        if (obs.y > canvas.height) {
          obstaclesRef.current.splice(index, 1);
          setScore((s: number) => s + 10);
        }
      });

      if (magnetRef.current) {
        const mag = magnetRef.current;
        if (!mag.active) {
          mag.y += mag.speed;
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(mag.x + 12, mag.y + 12, 12, Math.PI, 0, false);
          ctx.stroke();

          const distMag = Math.hypot(p.x - (mag.x + 12), p.y - (mag.y + 12));
          if (distMag < p.radius + 12) {
            mag.active = true;
            magnetTimerRef.current = 5;
          }
          if (mag.y > canvas.height) magnetRef.current = null;
        }
      }

      ctx.fillStyle = '#00ffff';
      collectibleDiamondsRef.current.forEach((dia, index) => {
        if (magnetRef.current && magnetRef.current.active) {
          const angle = Math.atan2(p.y - dia.y, p.x - dia.x);
          dia.x += Math.cos(angle) * 5;
          dia.y += Math.sin(angle) * 5;
        } else {
          dia.y += 2.5;
        }

        ctx.beginPath();
        ctx.arc(dia.x + 10, dia.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();

        const dist = Math.hypot(p.x - (dia.x + 10), p.y - (dia.y + 10));
        if (dist < p.radius + 8) {
          setDiamonds((d: number) => d + dia.value);
          collectibleDiamondsRef.current.splice(index, 1);
        }
      });

      ctx.fillStyle = '#00ffcc';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.radius, p.radius * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      requestRef.current = requestAnimationFrame(updateGame);
    };

    requestRef.current = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [activeGame, gameState, layer]);

  if (!isMounted) return null;

  if (activeGame === 'LOBBY') {
    return (
      <div className="w-full max-w-md mx-auto text-white flex flex-col items-center pb-20 px-3 select-none">
        <div className="w-full bg-gradient-to-r from-purple-900 via-indigo-900 to-black border border-purple-500/40 p-4 rounded-3xl mb-5 shadow-2xl flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
              ARENA ARCADE HUB 🎮
            </h2>
            <p className="text-[10px] text-gray-300">Play games & earn White Diamonds!</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 w-full">
          <div className="bg-gray-900 border border-cyan-500/40 p-4 rounded-2xl flex flex-col justify-between shadow-lg">
            <h4 className="text-sm font-black text-white mb-1">NEON SHERPA RUSH</h4>
            <p className="text-xs text-gray-400 mb-4">Collect free diamonds & power-ups in a neon world!</p>
            <button
              onClick={() => {
                setActiveGame('NEON');
                startGame();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-black text-xs rounded-xl cursor-pointer"
            >
              PLAY NOW
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-gray-900 border border-purple-500/40 rounded-3xl p-4 flex flex-col items-center shadow-2xl relative overflow-hidden select-none">
      <div className="w-full flex justify-between items-center mb-3">
        <button
          onClick={() => setActiveGame('LOBBY')}
          className="px-3 py-1 bg-gray-800 text-gray-300 font-bold text-[11px] rounded-xl border border-gray-700 cursor-pointer"
        >
          ← Lobby
        </button>
        <span className="text-xs font-black text-pink-400">🔥 Layer {layer}/7</span>
      </div>

      <div className="w-full flex justify-between items-center mb-3 bg-black/40 px-3 py-2 rounded-2xl border border-gray-800">
        <span className="text-[10px] text-gray-400">
          Time: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-1.5 bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-500/30">
          <span className="text-sm">💎</span>
          <span className="text-xs font-black text-cyan-300">{diamonds}</span>
        </div>
      </div>

      <div className="relative w-[320px] h-[380px] bg-black rounded-2xl border border-cyan-500/30 overflow-hidden flex flex-col items-center justify-center">
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 p-4 text-center">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 mb-1">
              NEON SHERPA RUSH
            </h2>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-black text-xs rounded-2xl cursor-pointer mt-3"
            >
              ▶️ PLAY NOW
            </button>
          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-4 text-center gap-2">
            <h2 className="text-base font-black text-red-500 uppercase">Game Over!</h2>
            <p className="text-xs text-gray-300">
              Score: {score} | Earned: <span className="text-cyan-400 font-bold">{diamonds} 💎</span>
            </p>

            <div className="flex flex-col gap-2 w-full mt-1">
              <button
                onClick={handleWatchAdToDouble}
                disabled={isDoubleRewarded || doubleCooldown > 0}
                className="w-full py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-[11px] rounded-xl shadow disabled:opacity-50 cursor-pointer"
              >
                {isDoubleRewarded
                  ? '✅ Diamonds Doubled!'
                  : doubleCooldown > 0
                  ? `⏳ Double Cooldown (${Math.floor(doubleCooldown / 60)}m ${doubleCooldown % 60}s)`
                  : '▶️ Watch Ad to Double Diamonds (2x)'}
              </button>

              <button
                onClick={handleRevive}
                disabled={reviveCooldown > 0}
                className="w-full py-2 bg-gradient-to-r from-green-400 to-cyan-500 text-black font-black text-[11px] rounded-xl shadow disabled:opacity-50 cursor-pointer"
              >
                {reviveCooldown > 0
                  ? `⏳ Revive Cooldown (${Math.floor(reviveCooldown / 60)}m ${reviveCooldown % 60}s)`
                  : '▶️ Watch Ad to Revive (Continue)'}
              </button>

              <button
                onClick={startGame}
                className="w-full py-1.5 bg-gray-800 text-gray-300 font-bold text-[11px] rounded-xl cursor-pointer"
              >
                Restart Game
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} width={320} height={380} className="touch-none" />
      </div>

      <div className="w-full flex justify-between items-center gap-4 mt-3 px-2">
        <button
          onMouseDown={() => {
            moveDirectionRef.current = 'LEFT';
            playClickSound();
          }}
          onMouseUp={() => (moveDirectionRef.current = null)}
          onTouchStart={() => {
            moveDirectionRef.current = 'LEFT';
            playClickSound();
          }}
          onTouchEnd={() => (moveDirectionRef.current = null)}
          className="flex-1 py-3.5 bg-purple-600 text-white font-black rounded-2xl cursor-pointer"
        >
          Left
        </button>
        <button
          onMouseDown={() => {
            moveDirectionRef.current = 'RIGHT';
            playClickSound();
          }}
          onMouseUp={() => (moveDirectionRef.current = null)}
          onTouchStart={() => {
            moveDirectionRef.current = 'RIGHT';
            playClickSound();
          }}
          onTouchEnd={() => (moveDirectionRef.current = null)}
          className="flex-1 py-3.5 bg-indigo-600 text-white font-black rounded-2xl cursor-pointer"
        >
          Right
        </button>
      </div>
    </div>
  );
}