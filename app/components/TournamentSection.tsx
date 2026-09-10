'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useLanguage } from '../context/LanguageContext';

const supabaseUrl = 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey = 'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type TournamentType = 'NONE' | 'DAILY' | 'NIGHT' | 'MEGA';

export default function TournamentSection() {
  const { t } = useLanguage();
  const [redDiamonds, setRedDiamonds] = useState(150);
  const [activeTournament, setActiveTournament] = useState<TournamentType>('NONE');

  // Lobby vs Actual Game Flow state
  const [inLobby, setInLobby] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Tournament Game State (15 Minutes Timer)
  const [timeLeft, setTimeLeft] = useState(900); // 15 Minutes (900 seconds)
  const [score, setScore] = useState(0); // Cumulative Total Score
  const [gameOver, setGameOver] = useState(false);
  const [isDayLocked, setIsDayLocked] = useState(false);
  const [isNightLocked, setIsNightLocked] = useState(false);
  const [isMegaLocked, setIsMegaLocked] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);

  // Audio Context Ref for Web Audio API Sound Effects
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Original Game Refs (Obstacle Dodge for ALL tournaments)
  const playerRef = useRef({ x: 175, y: 350, size: 20 });
  const obstaclesRef = useRef<{ x: number; y: number; size: number; speed: number }[]>([]);

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

      // Mega Showdown: Open 24/7
      setIsMegaLocked(false);
    };

    checkTimeWindows();
    const interval = setInterval(checkTimeWindows, 30000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio Sound Generator
  const playSound = (type: 'score' | 'gameover') => {
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

      if (type === 'score') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
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
  const handleJoinClick = (type: TournamentType) => {
    if (type === 'DAILY' && isDayLocked) {
      alert('❌ Daily Tournament is locked! Opens daily from 6:00 AM to 6:00 PM.');
      return;
    }
    if (type === 'NIGHT' && isNightLocked) {
      alert('❌ Night Tournament is locked! Opens daily from 7:30 PM to 6:00 AM.');
      return;
    }
    if (type === 'MEGA' && isMegaLocked) {
      alert('❌ Mega Showdown is currently locked.');
      return;
    }

    const fee = type === 'DAILY' ? 100 : type === 'NIGHT' ? 200 : 500;
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
    const fee = activeTournament === 'DAILY' ? 100 : activeTournament === 'NIGHT' ? 200 : 500;
    if (redDiamonds < fee) {
      alert(`❌ Not enough Red Diamonds!`);
      return;
    }

    const remaining = redDiamonds - fee;
    setRedDiamonds(remaining);
    
    localStorage.setItem('arena_red_diamonds', remaining.toString());
    localStorage.setItem('arena_red_dias', remaining.toString());
    localStorage.setItem('arena_diamond', remaining.toString());
    localStorage.setItem('arena_cash', remaining.toString());
    
    window.dispatchEvent(new Event('storage'));

    setInLobby(false);
    setGameStarted(true);
    setScore(0);
    setTimeLeft(900); // 15 Mins
    setGameOver(false);

    playerRef.current = { x: 175, y: 350, size: 20 };
    obstaclesRef.current = [];
  };

  // Handle Restart / Continue Game on Death (Preserves Score)
  const handleRestartGame = () => {
    setGameOver(false);
    playerRef.current = { x: 175, y: 350, size: 20 };
    obstaclesRef.current = [];
  };

  // Save Score to Supabase
  const saveScoreToSupabase = async (finalScore: number) => {
    try {
      const username = localStorage.getItem('arena_username') || 'Player';
      const tableName = activeTournament === 'DAILY' ? 'tournament_scores' : activeTournament === 'NIGHT' ? 'night_tournament_scores' : 'mega_tournament_scores';
      
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

      ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      const speedMultiplier = activeTournament === 'MEGA' ? 1.5 : activeTournament === 'NIGHT' ? 1.2 : 1.0;
      const spawnChance = activeTournament === 'MEGA' ? 0.04 : 0.03;

      if (Math.random() < spawnChance) {
        obstaclesRef.current.push({
          x: Math.random() * (canvas.width - 20),
          y: -20,
          size: 16 + Math.random() * 8,
          speed: 2.2 * speedMultiplier,
        });
      }

      ctx.fillStyle = activeTournament === 'MEGA' ? '#ff3300' : '#ff0055';
      obstaclesRef.current.forEach((obs, index) => {
        obs.y += obs.speed;
        ctx.shadowBlur = 8;
        ctx.shadowColor = activeTournament === 'MEGA' ? '#ff3300' : '#ff0055';
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
          setScore((s) => s + (activeTournament === 'MEGA' ? 20 : 10));
          playSound('score');
        }
      });

      ctx.shadowBlur = 0;
      const p = playerRef.current;
      ctx.fillStyle = activeTournament === 'MEGA' ? '#ffcc00' : '#00ffcc';
      ctx.shadowBlur = 12;
      ctx.shadowColor = activeTournament === 'MEGA' ? '#ffcc00' : '#00ffcc';
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.shadowBlur = 0;

      requestRef.current = requestAnimationFrame(updateGame);
    };

    requestRef.current = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameStarted, gameOver, score, activeTournament]);

  const handleInteraction = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = clientX - rect.left;
    if (x >= 0 && x <= canvas.width - playerRef.current.size) {
      playerRef.current.x = x;
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none pb-10">
      {inLobby ? (
        <div className="w-full max-w-md bg-gray-900 border border-purple-500/40 rounded-3xl p-5 flex flex-col items-center shadow-2xl relative text-center">
          <h2 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 uppercase mb-3">
            ⚠️ {activeTournament === 'DAILY' ? 'DAILY TOURNAMENT LOBBY' : activeTournament === 'NIGHT' ? 'NIGHT TOURNAMENT LOBBY' : 'MEGA TOURNAMENT LOBBY'} (15 MINS)
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
            ▶️ {t.playNow || "START MATCH"} (खेल सुरु गर्नुहोस्)
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
                    {t.back || "Exit to Tournaments"}
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
            {t.tournament || "ACTIVE TOURNAMENTS"}
          </h2>

          {/* 1. DAILY TOURNAMENT CARD (Attractive Mega Style) */}
          <div className="bg-gradient-to-br from-gray-900 via-purple-950/40 to-gray-900 border border-yellow-500/50 rounded-3xl p-4 flex flex-col gap-3 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 bg-yellow-500/15 w-24 h-24 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                ☀️ DAILY TOURNAMENT (15 MINS)
              </span>
              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2.5 py-1 rounded-xl border border-yellow-500/40 font-black">
                100 Red Dias 🔴
              </span>
            </div>
            
            <p className="text-xs text-yellow-300 font-bold leading-relaxed">
              Total Prize Pool: <span className="text-white font-black">10,000 Red Diamonds</span> | Top 10 players win <span className="text-white font-black">1,000 Red Diamonds each</span>! 🏆🔥
            </p>

            {isDayLocked ? (
              <div className="w-full py-2.5 bg-red-950/80 text-red-400 font-bold text-xs rounded-2xl text-center border border-red-500/30">
                🔒 Locked (Opens Daily 6:00 AM - 6:00 PM)
              </div>
            ) : (
              <button
                onClick={() => handleJoinClick('DAILY')}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 text-black font-black text-xs rounded-2xl shadow-xl active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
              >
                🚀 JOIN DAILY TOURNAMENT (100 Dias)
              </button>
            )}
          </div>

          {/* 2. NIGHT TOURNAMENT CARD (Attractive Mega Style) */}
          <div className="bg-gradient-to-br from-gray-900 via-purple-950/40 to-gray-900 border border-yellow-500/50 rounded-3xl p-4 flex flex-col gap-3 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 bg-yellow-500/15 w-24 h-24 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                🌙 NIGHT TOURNAMENT (15 MINS)
              </span>
              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2.5 py-1 rounded-xl border border-yellow-500/40 font-black">
                200 Red Dias 🔴
              </span>
            </div>
            
            <p className="text-xs text-yellow-300 font-bold leading-relaxed">
              Total Prize Pool: <span className="text-white font-black">22,500 Red Diamonds</span> | Top 15 players win <span className="text-white font-black">1,500 Red Diamonds each</span>! 🏆🔥
            </p>

            {isNightLocked ? (
              <div className="w-full py-2.5 bg-red-950/80 text-red-400 font-bold text-xs rounded-2xl text-center border border-red-500/30">
                🔒 Locked (Opens Daily 7:30 PM - 6:00 AM)
              </div>
            ) : (
              <button
                onClick={() => handleJoinClick('NIGHT')}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 text-black font-black text-xs rounded-2xl shadow-xl active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
              >
                🚀 JOIN NIGHT TOURNAMENT (200 Dias)
              </button>
            )}
          </div>

          {/* 3. MEGA SHOWDOWN CARD */}
          <div className="bg-gradient-to-br from-gray-900 via-purple-950/40 to-gray-900 border border-yellow-500/50 rounded-3xl p-4 flex flex-col gap-3 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 bg-yellow-500/15 w-24 h-24 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                ⚡ MEGA SHOWDOWN (15 MINS)
              </span>
              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2.5 py-1 rounded-xl border border-yellow-500/40 font-black animate-pulse">
                500 Red Dias 🔴
              </span>
            </div>
            
            <p className="text-xs text-yellow-300 font-bold leading-relaxed">
              Total Prize Pool: <span className="text-white font-black">50,000 Red Diamonds</span> | Top 20 players win <span className="text-white font-black">2,500 Red Diamonds each</span>! 🏆🔥
            </p>

            {isMegaLocked ? (
              <div className="w-full py-2.5 bg-red-950/80 text-red-400 font-bold text-xs rounded-2xl text-center border border-red-500/30">
                🔒 Locked
              </div>
            ) : (
              <button
                onClick={() => handleJoinClick('MEGA')}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 text-black font-black text-xs rounded-2xl shadow-xl active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
              >
                🚀 JOIN MEGA TOURNAMENT (500 Dias)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}