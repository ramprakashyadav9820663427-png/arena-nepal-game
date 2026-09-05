'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey = 'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function TournamentSection() {
  const [redDiamonds, setRedDiamonds] = useState(150);
  const [activeTournament, setActiveTournament] = useState<'NONE' | 'DAILY' | 'NIGHT'>('NONE');

  // Lobby vs Actual Game Flow state
  const [inLobby, setInLobby] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Tournament Game State (15 Minutes Timer)
  const [timeLeft, setTimeLeft] = useState(900); // 15 Minutes (900 seconds)
  const [score, setScore] = useState(0); // Cumulative Total Score
  const [gameOver, setGameOver] = useState(false);
  const [isDayLocked, setIsDayLocked] = useState(false);
  const [isNightLocked, setIsNightLocked] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);

  // Audio Context Ref for Web Audio API Sound Effects
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Day Game Refs (Obstacle Dodge)
  const playerRef = useRef({ x: 175, y: 350, size: 20 });
  const obstaclesRef = useRef<{ x: number; y: number; size: number; speed: number }[]>([]);

  // Night Game Refs (Neon Tower Stack)
  const stackRef = useRef<{ x: number; y: number; width: number; height: number; color: string }[]>([]);
  const movingBlockRef = useRef<{ x: number; y: number; width: number; height: number; speed: number; dir: number }>({
    x: 50,
    y: 100,
    width: 140,
    height: 20,
    speed: 3,
    dir: 1,
  });

  // Load Red Diamonds & Check Time Windows on mount
  useEffect(() => {
    try {
      const red = localStorage.getItem('arena_red_diamonds') || localStorage.getItem('arena_diamond') || localStorage.getItem('arena_cash');
      if (red) setRedDiamonds(parseInt(red, 10));
    } catch (e) {
      console.error(e);
    }

    const checkTimeWindows = () => {
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      const totalMins = currentHour * 60 + currentMinute;

      // Daily: 6:00 AM (360) to 6:00 PM (1080)
      if (totalMins < 360 || totalMins >= 1080) {
        setIsDayLocked(true);
      } else {
        setIsDayLocked(false);
      }

      // Night: 7:30 PM (1170) to 6:00 AM (360) next day
      if (totalMins >= 1170 || totalMins < 360) {
        setIsNightLocked(false);
      } else {
        setIsNightLocked(true);
      }
    };

    checkTimeWindows();
    const interval = setInterval(checkTimeWindows, 30000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio Sound Generator
  const playSound = (type: 'tap' | 'score' | 'gameover') => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'tap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'score') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Main 15-Minute Tournament Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameStarted && !gameOver && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameOver(true);
            saveScoreToSupabase(score);
            playSound('gameover');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameStarted, gameOver, timeLeft, score]);

  // Handle Join Click
  const handleJoinClick = (type: 'DAILY' | 'NIGHT') => {
    if (type === 'DAILY' && isDayLocked) {
      alert('❌ Daily Tournament is locked! Opens daily from 6:00 AM to 6:00 PM.');
      return;
    }
    if (type === 'NIGHT' && isNightLocked) {
      alert('❌ Night Cyber Tournament is locked! Opens daily from 7:30 PM to 6:00 AM.');
      return;
    }

    const fee = type === 'DAILY' ? 100 : 200;
    if (redDiamonds < fee) {
      alert(`❌ Not enough Red Diamonds! You need ${fee} Red Diamonds to join.`);
      return;
    }

    setActiveTournament(type);
    setInLobby(true);
    setGameStarted(false);
  };

  // Start Actual Gameplay
  const startTourneyGamePlay = () => {
    const fee = activeTournament === 'DAILY' ? 100 : 200;
    if (redDiamonds < fee) {
      alert(`❌ Not enough Red Diamonds!`);
      return;
    }

    const remaining = redDiamonds - fee;
    setRedDiamonds(remaining);
    
    // 🔴 यहाँ सभी स्टोरेज कीज़ को एक साथ सिंक कर दिया गया है
    localStorage.setItem('arena_red_diamonds', remaining.toString());
    localStorage.setItem('arena_red_dias', remaining.toString());
    localStorage.setItem('arena_diamond', remaining.toString());
    localStorage.setItem('arena_cash', remaining.toString());
    
    // ब्राउज़र को तुरंत इवेंट भेजें ताकि page.tsx (लॉबी) भी अपडेट हो जाए
    window.dispatchEvent(new Event('storage'));

    setInLobby(false);
    setGameStarted(true);
    setScore(0);
    setTimeLeft(900); // 15 Mins
    setGameOver(false);

    if (activeTournament === 'DAILY') {
      playerRef.current = { x: 175, y: 350, size: 20 };
      obstaclesRef.current = [];
    } else {
      // Initialize Night Tower Stack
      stackRef.current = [
        { x: 90, y: 360, width: 140, height: 24, color: '#00ffcc' }
      ];
      movingBlockRef.current = {
        x: 40,
        y: 330,
        width: 140,
        height: 24,
        speed: 2.8,
        dir: 1,
      };
    }
  };

  // Handle Restart / Continue Game on Death (Preserves Score)
  const handleRestartGame = () => {
    setGameOver(false);
    if (activeTournament === 'DAILY') {
      playerRef.current = { x: 175, y: 350, size: 20 };
      obstaclesRef.current = [];
    } else {
      const topBlock = stackRef.current[stackRef.current.length - 1];
      const nextY = Math.max(80, topBlock.y - 28);
      movingBlockRef.current = {
        x: 20,
        y: nextY,
        width: topBlock.width,
        height: 24,
        speed: 3 + Math.floor(stackRef.current.length / 5) * 0.4,
        dir: 1,
      };
    }
  };

  // Save Score to Supabase (Day vs Night Table Separation)
  const saveScoreToSupabase = async (finalScore: number) => {
    try {
      const username = localStorage.getItem('arena_username') || 'Player';
      const tableName = activeTournament === 'DAILY' ? 'tournament_scores' : 'night_tournament_scores';
      
      const { error } = await supabase.from(tableName).insert([
        { user_id: 'player_local_user', username: username, score: finalScore }
      ]);
      if (error) console.error('Supabase Error:', error.message);
      else console.log(`${activeTournament} cumulative score saved successfully:`, finalScore);
    } catch (err) {
      console.error('Error saving score:', err);
    }
  };

  // Main Canvas Game Loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateGame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Common Background Grid
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      if (activeTournament === 'DAILY') {
        // --- GAME 1: DAILY OBSTACLE DODGE ---
        const spawnChance = 0.03;
        if (Math.random() < spawnChance) {
          obstaclesRef.current.push({
            x: Math.random() * (canvas.width - 20),
            y: -20,
            size: 16 + Math.random() * 8,
            speed: 2.2,
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
            setGameOver(true);
            playSound('gameover');
            saveScoreToSupabase(score);
          }

          if (obs.y > canvas.height) {
            obstaclesRef.current.splice(index, 1);
            setScore((s) => s + 10);
          }
        });

        ctx.shadowBlur = 0;
        const p = playerRef.current;
        ctx.fillStyle = '#00ffcc';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00ffcc';
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.shadowBlur = 0;

      } else {
        // --- GAME 2: NIGHT CYBER TOWER STACK ---
        const mb = movingBlockRef.current;
        mb.x += mb.speed * mb.dir;
        if (mb.x <= 0 || mb.x + mb.width >= canvas.width) {
          mb.dir *= -1;
        }

        // Render Stacked Blocks
        stackRef.current.forEach((block) => {
          ctx.fillStyle = block.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = block.color;
          ctx.fillRect(block.x, block.y, block.width, block.height);
        });

        // Render Moving Block
        ctx.fillStyle = '#ff0077';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff0077';
        ctx.fillRect(mb.x, mb.y, mb.width, mb.height);
        ctx.shadowBlur = 0;
      }

      requestRef.current = requestAnimationFrame(updateGame);
    };

    requestRef.current = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameStarted, gameOver, score, activeTournament]);

  // Touch / Click Handler
  const handleInteraction = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (activeTournament === 'DAILY') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const x = clientX - rect.left;
      if (x >= 0 && x <= canvas.width - playerRef.current.size) {
        playerRef.current.x = x;
      }
    } else if (activeTournament === 'NIGHT' && gameStarted && !gameOver) {
      // Tower Stack Tap Action
      playSound('tap');
      const canvas = canvasRef.current;
      if (!canvas) return;

      const topBlock = stackRef.current[stackRef.current.length - 1];
      const mb = movingBlockRef.current;

      const overlapLeft = Math.max(mb.x, topBlock.x);
      const overlapRight = Math.min(mb.x + mb.width, topBlock.x + topBlock.width);
      const overlapWidth = overlapRight - overlapLeft;

      if (overlapWidth <= 0) {
        // Totally Missed! Game Over
        setGameOver(true);
        playSound('gameover');
        saveScoreToSupabase(score);
      } else {
        // Successful Stack Cut
        const newX = overlapLeft;
        const newWidth = overlapWidth;
        const colors = ['#00ffcc', '#0099ff', '#9900ff', '#ff00aa', '#ffcc00'];
        const nextColor = colors[stackRef.current.length % colors.length];

        stackRef.current.push({
          x: newX,
          y: mb.y,
          width: newWidth,
          height: mb.height,
          color: nextColor,
        });

        setScore((s) => s + 50);
        playSound('score');

        // Scroll tower down if it gets too high
        if (stackRef.current.length > 10) {
          stackRef.current.shift();
          stackRef.current.forEach((b) => {
            b.y += 28;
          });
        }

        const nextY = Math.max(80, mb.y - 28);
        movingBlockRef.current = {
          x: 10,
          y: nextY,
          width: newWidth,
          height: 24,
          speed: 3 + Math.floor(stackRef.current.length / 4) * 0.4,
          dir: 1,
        };
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      {inLobby ? (
        <div className="w-full max-w-md bg-gray-900 border border-purple-500/40 rounded-3xl p-5 flex flex-col items-center shadow-2xl relative text-center">
          <h2 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 uppercase mb-3">
            ⚠️ {activeTournament === 'DAILY' ? 'DAILY TOURNAMENT LOBBY' : 'NIGHT CYBER TOWER LOBBY'} (15 MINS)
          </h2>

          <div className="bg-black/60 p-4 rounded-2xl border border-red-500/40 mb-5 text-left">
            <p className="text-xs text-red-400 font-bold mb-1">महत्वपूर्ण चेतावनी (Important Warning):</p>
            <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
              &quot;एक पटक खेल (Game) सुरु भइसकेपछि कृपया बीचमा नछाड्नुहोला वा बाहिर नजानुहोला। यदि तपाईंले खेल बीचैमा काट्नुभयो भने फेरि खेल्न पाइने छैन।&quot;
            </p>
          </div>

          <button
            onClick={startTourneyGamePlay}
            className="w-full py-3 bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            ▶️ START MATCH (खेल सुरु गर्नुहोस्)
          </button>
        </div>
      ) : gameStarted ? (
        <div className="w-full max-w-md bg-gray-900 border border-purple-500/40 rounded-3xl p-4 flex flex-col items-center shadow-2xl relative">
          <div className="w-full flex justify-between items-center mb-3 bg-black/60 px-3 py-2 rounded-2xl border border-gray-800">
            <span className="text-xs font-black text-yellow-400">⏱️ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
            <span className="text-xs font-black text-cyan-300">Total Score: {score}</span>
          </div>

          <div className="relative w-[320px] h-[420px] bg-black rounded-2xl border border-cyan-500/30 overflow-hidden flex flex-col items-center justify-center">
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-10 p-4 text-center gap-2">
                <h2 className="text-base font-black text-red-500 uppercase">
                  {timeLeft <= 0 ? 'Tournament Time Up!' : 'Ouch! Out!'}
                </h2>
                <p className="text-xs text-gray-300">Cumulative Score: <span className="text-cyan-400 font-bold">{score}</span></p>

                <div className="flex flex-col gap-2 w-full mt-1">
                  {timeLeft > 0 && (
                    <button
                      onClick={handleRestartGame}
                      className="w-full py-2.5 bg-gradient-to-r from-green-400 to-cyan-500 text-black font-black text-xs rounded-xl shadow active:scale-95 transition-all cursor-pointer"
                    >
                      🔄 CONTINUE PLAYING (Resume Score)
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setGameStarted(false);
                      setActiveTournament('NONE');
                    }}
                    className="w-full py-2 bg-gray-800 text-gray-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Exit to Tournaments
                  </button>
                </div>
              </div>
            )}

            <canvas
              ref={canvasRef}
              width={320}
              height={420}
              onMouseMove={handleInteraction}
              onTouchMove={handleInteraction}
              onClick={handleInteraction}
              onTouchStart={handleInteraction}
              className="cursor-crosshair touch-none"
            />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col gap-4">
          <div className="flex justify-between items-center bg-gray-900/90 border border-purple-500/30 px-4 py-2.5 rounded-2xl">
            <span className="text-xs font-bold text-gray-300">Your Red Diamonds:</span>
            <span className="text-xs font-black text-red-400">{redDiamonds} 🔴</span>
          </div>

          <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
            ACTIVE TOURNAMENTS
          </h2>

          {/* DAILY TOURNAMENT CARD */}
          <div className="bg-gray-900/90 border border-purple-500/30 rounded-3xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-pink-400">DAILY TOURNAMENT</span>
              <span className="text-[10px] bg-purple-950 text-cyan-300 px-2 py-1 rounded-xl border border-purple-500/30 font-bold">
                100 Red Dias 🔴
              </span>
            </div>
            
            <p className="text-xs text-yellow-400 font-bold">Prize Pool: Top 10 players win NPR 1,000 each! 🏆 (15 Mins Match)</p>

            {isDayLocked ? (
              <div className="w-full py-2.5 bg-red-950/80 text-red-400 font-bold text-xs rounded-2xl text-center border border-red-500/30">
                🔒 Locked (Opens Daily 6:00 AM - 6:00 PM)
              </div>
            ) : (
              <button
                onClick={() => handleJoinClick('DAILY')}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                JOIN DAILY TOURNAMENT
              </button>
            )}
          </div>

          {/* NIGHT CYBER TOWER TOURNAMENT CARD */}
          <div className="bg-gray-900/90 border border-purple-500/30 rounded-3xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-cyan-400">NIGHT CYBER TOWER (15 MINS)</span>
              <span className="text-[10px] bg-purple-950 text-pink-300 px-2 py-1 rounded-xl border border-purple-500/30 font-bold">
                200 Red Dias 🔴
              </span>
            </div>
            
            <p className="text-xs text-yellow-400 font-bold">Prize Pool: Top 15 players win NPR 1,500 each! 🏆 (Result at 7:00 AM)</p>

            {isNightLocked ? (
              <div className="w-full py-2.5 bg-red-950/80 text-red-400 font-bold text-xs rounded-2xl text-center border border-red-500/30">
                🔒 Locked (Opens Daily 7:30 PM - 6:00 AM)
              </div>
            ) : (
              <button
                onClick={() => handleJoinClick('NIGHT')}
                className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-cyan-400 text-black font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                JOIN NIGHT TOURNAMENT (200 Dias)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}