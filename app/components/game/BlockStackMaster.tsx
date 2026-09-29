'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface BlockStackMasterProps {
  onBackToLobby?: () => void;
}

export default function BlockStackMaster({ onBackToLobby }: BlockStackMasterProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'LOBBY' | 'GAME'>('LOBBY');
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [height, setHeight] = useState(0);
  const [combo, setCombo] = useState(0);

  const [doubleCooldown, setDoubleCooldown] = useState(0);
  const [reviveCooldown, setReviveCooldown] = useState(0);
  const [isDoubleRewarded, setIsDoubleRewarded] = useState(false);
  const [hasSyncedWallet, setHasSyncedWallet] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);
  const diamondsRef = useRef(0);

  // Game state refs
  const blocksRef = useRef<{ x: number; y: number; w: number; color: string }[]>([]);
  const currentBlockRef = useRef({ x: 0, y: 0, w: 120, dir: 1, speed: 2.8 });
  const isDroppingRef = useRef(false);
  const cameraY = useRef(0);
  const perfectCountRef = useRef(0);

  const colors = ['#22d3ee', '#a855f7', '#f43f5e', '#eab308', '#34d399', '#60a5fa', '#f97316'];

  useEffect(() => {
    diamondsRef.current = diamonds;
  }, [diamonds]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const checkCooldowns = () => {
    const now = Date.now();
    const dEnd = localStorage.getItem('stack_double_cd');
    const rEnd = localStorage.getItem('stack_revive_cd');

    if (dEnd) {
      const rem = Math.ceil((parseInt(dEnd) - now) / 1000);
      setDoubleCooldown(rem > 0 ? rem : 0);
      if (rem <= 0) localStorage.removeItem('stack_double_cd');
    }
    if (rEnd) {
      const rem = Math.ceil((parseInt(rEnd) - now) / 1000);
      setReviveCooldown(rem > 0 ? rem : 0);
      if (rem <= 0) localStorage.removeItem('stack_revive_cd');
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
    blocksRef.current = [
      { x: 110, y: 360, w: 120, color: '#22d3ee' }
    ];
    currentBlockRef.current = {
      x: 20,
      y: 300,
      w: 120,
      dir: 1,
      speed: 2.8
    };
    isDroppingRef.current = false;
    cameraY.current = 0;
    perfectCountRef.current = 0;
    setScore(0);
    setDiamonds(0);
    diamondsRef.current = 0;
    setHeight(0);
    setCombo(0);
    setIsDoubleRewarded(false);
    setHasSyncedWallet(false);
  };

  const startGame = () => {
    checkCooldowns();
    resetGame();
    setGameState('PLAYING');
    setActiveScreen('GAME');
  };

  const dropBlock = () => {
    if (gameState !== 'PLAYING' || isDroppingRef.current) return;
    isDroppingRef.current = true;

    const current = currentBlockRef.current;
    const last = blocksRef.current[blocksRef.current.length - 1];

    // Calculate overlap
    const left = Math.max(current.x, last.x);
    const right = Math.min(current.x + current.w, last.x + last.w);
    const overlap = right - left;

    if (overlap <= 8) {
      // Too much miss → Game Over
      setGameState('GAMEOVER');
      if (!hasSyncedWallet) {
        addToWallet(diamondsRef.current);
        setHasSyncedWallet(true);
      }
      isDroppingRef.current = false;
      return;
    }

    // Perfect or partial
    const isPerfect = Math.abs(current.x - last.x) < 6;

    const newBlock = {
      x: left,
      y: last.y - 28,
      w: overlap,
      color: colors[blocksRef.current.length % colors.length]
    };

    blocksRef.current.push(newBlock);

    // Score & Diamonds
    let addedScore = 10;
    let addedDiamond = 0;

    if (isPerfect) {
      addedScore = 30;
      perfectCountRef.current += 1;
      setCombo((c) => c + 1);
      if (perfectCountRef.current % 3 === 0) {
        addedDiamond = 1; // हर 3 परफेक्ट पर 1 डायमंड
      }
    } else {
      setCombo(0);
      perfectCountRef.current = 0;
    }

    // Height based small diamond chance
    if (blocksRef.current.length % 8 === 0) {
      addedDiamond += 1;
    }

    setScore((s) => s + addedScore);
    if (addedDiamond > 0) {
      setDiamonds((d) => d + addedDiamond);
    }
    setHeight(blocksRef.current.length - 1);

    // Prepare next block
    const nextSpeed = Math.min(2.8 + blocksRef.current.length * 0.09, 5.8);
    currentBlockRef.current = {
      x: Math.random() > 0.5 ? 10 : 210,
      y: newBlock.y - 40,
      w: newBlock.w,
      dir: Math.random() > 0.5 ? 1 : -1,
      speed: nextSpeed
    };

    // Camera follow
    if (blocksRef.current.length > 6) {
      cameraY.current = (blocksRef.current.length - 6) * 28;
    }

    isDroppingRef.current = false;
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
    localStorage.setItem('stack_double_cd', end.toString());
    setDoubleCooldown(900);
  };

  const handleRevive = () => {
    checkCooldowns();
    if (reviveCooldown > 0) return;

    // Revive: keep current tower, give one more chance
    setGameState('PLAYING');
    const last = blocksRef.current[blocksRef.current.length - 1];
    currentBlockRef.current = {
      x: 30,
      y: last.y - 40,
      w: last.w,
      dir: 1,
      speed: Math.min(2.8 + blocksRef.current.length * 0.08, 5.2)
    };
    isDroppingRef.current = false;
    setHasSyncedWallet(false);

    const end = Date.now() + 120 * 1000;
    localStorage.setItem('stack_revive_cd', end.toString());
    setReviveCooldown(120);
  };

  // Game Loop
  useEffect(() => {
    if (activeScreen !== 'GAME' || gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const current = currentBlockRef.current;

      // Move current block left-right
      if (!isDroppingRef.current) {
        current.x += current.dir * current.speed;

        if (current.x <= 10) {
          current.x = 10;
          current.dir = 1;
        }
        if (current.x + current.w >= 330) {
          current.x = 330 - current.w;
          current.dir = -1;
        }
      }

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 28 - (cameraY.current % 28));
        ctx.lineTo(340, i * 28 - (cameraY.current % 28));
        ctx.stroke();
      }

      // Draw stacked blocks
      blocksRef.current.forEach((block) => {
        const drawY = block.y - cameraY.current;
        ctx.fillStyle = block.color;
        ctx.shadowColor = block.color;
        ctx.shadowBlur = 12;
        ctx.fillRect(block.x, drawY, block.w, 26);
        ctx.shadowBlur = 0;

        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(block.x, drawY, block.w, 4);
      });

      // Draw current moving block
      if (gameState === 'PLAYING') {
        const drawY = current.y - cameraY.current;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.fillRect(current.x, drawY, current.w, 26);
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(current.x, drawY + 20, current.w, 6);
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [activeScreen, gameState]);

  if (!isMounted) return null;

  // ==================== LOBBY ====================
  if (activeScreen === 'LOBBY') {
    return (
      <div className="w-full max-w-md mx-auto text-white flex flex-col items-center pb-24 px-3 select-none">
        <div className="w-full bg-gradient-to-r from-indigo-950 via-purple-950 to-black border border-violet-500/40 p-4 rounded-3xl mb-5 shadow-2xl flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-pink-400">
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

        <div className="w-full bg-gray-900/90 border border-violet-500/40 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl">
              🏗️
            </div>
            <div>
              <h3 className="text-base font-black text-white">Block Stack Master</h3>
              <p className="text-[11px] text-violet-300/80">Timing Stack Game</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-5 leading-relaxed">
            Stack the moving blocks perfectly! Build the tallest tower and earn White Diamonds. Timing is everything.
          </p>
          <button
            onClick={startGame}
            className="w-full py-3.5 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 text-white font-black text-sm rounded-2xl shadow-lg active:scale-95 transition"
          >
            PLAY NOW
          </button>
        </div>
      </div>
    );
  }

  // ==================== GAME SCREEN ====================
  return (
    <div className="w-full max-w-md bg-gray-900 border border-violet-500/40 rounded-3xl p-3 sm:p-4 flex flex-col items-center shadow-2xl relative overflow-hidden select-none mb-24">
      {/* Top Bar */}
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
        <span className="text-xs font-black text-violet-300">🏗️ Height {height}</span>
        {onBackToLobby && (
          <button
            onClick={onBackToLobby}
            className="px-3 py-1 bg-red-600/20 text-red-300 font-bold text-[11px] rounded-xl border border-red-500/40"
          >
            ✕ Exit
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="w-full flex justify-between items-center mb-3 bg-black/50 px-3 py-2 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-400">Score: {score}</span>
          {combo > 1 && (
            <span className="text-[10px] font-bold text-yellow-400">Combo x{combo}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-violet-950/60 px-3 py-1 rounded-xl border border-violet-500/30">
          <span>💎</span>
          <span className="text-xs font-black text-violet-300">{diamonds}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full max-w-[340px] aspect-[340/420] bg-black rounded-2xl border border-violet-500/30 overflow-hidden mx-auto">
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-4 text-center gap-2">
            <h2 className="text-xl font-black text-red-500">TOWER FELL!</h2>
            <p className="text-sm text-gray-300">
              Height: {height} | Score: {score}
            </p>
            <p className="text-violet-300 font-bold">
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
          height={420}
          className="w-full h-full touch-none"
          onClick={dropBlock}
          onTouchStart={dropBlock}
        />
      </div>

      {/* Drop Button */}
      <button
        onClick={dropBlock}
        className="w-full mt-4 py-4 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-black text-lg rounded-2xl shadow-lg active:scale-95 transition"
      >
        DROP BLOCK
      </button>
    </div>
  );
}