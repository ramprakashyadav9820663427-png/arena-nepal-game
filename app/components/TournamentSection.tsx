'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// सीधे तुम्हारे प्रोजेक्ट के Credentials यहाँ सेट कर दिए गए हैं
const supabaseUrl = 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey = 'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function TournamentSection() {
  const [redDiamonds, setRedDiamonds] = useState(150);
  const [activeTournament, setActiveTournament] = useState<'NONE' | 'DAILY'>('NONE');

  // Lobby vs Actual Game Flow state
  const [inLobby, setInLobby] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Tournament Game State (1 Hour Timer)
  const [timeLeft, setTimeLeft] = useState(3600); // 1 Hour (3600 seconds)
  const [score, setScore] = useState(0);
  const [layer, setLayer] = useState(1);
  const [layerTimeLeft, setLayerTimeLeft] = useState(120); 
  const [gameOver, setGameOver] = useState(false);
  const [isTimeLocked, setIsTimeLocked] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);

  // Game entities refs
  const playerRef = useRef({ x: 175, y: 350, size: 20 });
  const obstaclesRef = useRef<
    { x: number; y: number; size: number; speed: number }[]
  >([]);

  // Load Red Diamonds & Check Time Window (6 AM to 6 PM) on mount
  useEffect(() => {
    try {
      const red = localStorage.getItem('arena_red_diamonds');
      if (red) setRedDiamonds(parseInt(red, 10));
    } catch (e) {
      console.error(e);
    }

    const checkTournamentTime = () => {
      const currentHour = new Date().getHours();
      // सुबह 6:00 से शाम 6:00 तक खुला रहेगा
      if (currentHour < 6 || currentHour >= 18) {
        setIsTimeLocked(true);
      } else {
        setIsTimeLocked(false);
      }
    };

    checkTournamentTime();
    const interval = setInterval(checkTournamentTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Main 1-Hour Tournament Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameStarted && !gameOver && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameStarted, gameOver, timeLeft]);

  // Handle Join Tournament Button Click (100 Red Diamonds Required)
  const handleJoinClick = () => {
    if (isTimeLocked) {
      alert('❌ Tournament is currently locked! It is open daily from 6:00 AM to 6:00 PM.');
      return;
    }

    const fee = 100;
    if (redDiamonds < fee) {
      alert(`❌ Not enough Red Diamonds! You need ${fee} Red Diamonds to join.`);
      return;
    }

    setActiveTournament('DAILY');
    setInLobby(true);
    setGameStarted(false);
  };

  // Start the actual Game -> Deducts 100 Red Diamonds safely
  const startTourneyGamePlay = () => {
    const fee = 100;
    if (redDiamonds < fee) {
      alert(`❌ Not enough Red Diamonds!`);
      return;
    }

    const remaining = redDiamonds - fee;
    setRedDiamonds(remaining);
    localStorage.setItem('arena_red_diamonds', remaining.toString());

    setInLobby(false);
    setGameStarted(true);
    setScore(0);
    setLayer(1);
    setLayerTimeLeft(120);
    setTimeLeft(3600);
    setGameOver(false);
    playerRef.current = { x: 175, y: 350, size: 20 };
    obstaclesRef.current = [];
  };

  // Handle Restart Game inside 1-hour window
  const handleRestartGame = () => {
    setGameOver(false);
    setScore(0);
    setLayer(1);
    setLayerTimeLeft(120);
    playerRef.current = { x: 175, y: 350, size: 20 };
    obstaclesRef.current = [];
  };

  // Save Score to Supabase on Game Over / Death
  const saveScoreToSupabase = async (finalScore: number) => {
    try {
      const username = localStorage.getItem('arena_username') || 'Player';
      const { error } = await supabase.from('tournament_scores').insert([
        { user_id: 'player_local_user', username: username, score: finalScore }
      ]);
      if (error) console.error('Supabase Error:', error.message);
      else console.log('Score successfully saved to Supabase:', finalScore);
    } catch (err) {
      console.error('Error saving score:', err);
    }
  };

  // Main Game Loop
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

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid
      ctx.strokeStyle = layer === 7 ? 'rgba(255, 0, 80, 0.2)' : 'rgba(0, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      const baseSpawnChance = 0.03 + layer * 0.005;
      const spawnChance = layer === 1 ? baseSpawnChance : baseSpawnChance * 0.65;

      if (Math.random() < spawnChance) {
        obstaclesRef.current.push({
          x: Math.random() * (canvas.width - 20),
          y: -20,
          size: 15 + Math.random() * 10,
          speed: 3 + layer * 1.0,
        });
      }

      // Obstacles (Red Stones)
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
          saveScoreToSupabase(score); // Supabase पर स्कोर सेव होगा
        }

        if (obs.y > canvas.height) {
          obstaclesRef.current.splice(index, 1);
          setScore((s) => s + 10);
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
  }, [gameStarted, gameOver, layer, score]);

  const handleTouchMove = (
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
    <div className="w-full flex flex-col items-center">
      {inLobby ? (
        <div className="w-full max-w-md bg-gray-900 border border-purple-500/40 rounded-3xl p-5 flex flex-col items-center shadow-2xl relative text-center">
          <h2 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 uppercase mb-3">
            ⚠️ DAILY TOURNAMENT LOBBY
          </h2>

          <div className="bg-black/60 p-4 rounded-2xl border border-red-500/40 mb-5 text-left">
            <p className="text-xs text-red-400 font-bold mb-1">महत्वपूर्ण चेतावनी (Important Warning):</p>
            <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
              &quot;एक पटक खेल (Game) सुरु भइसकेपछि कृपया बीचमा नछाड्नुहोला वा बाहिर नजानुहोला। यदि तपाईंले खेल बीचैमा काट्नुभयो भने फेरि खेल्न पाइने छैन।&quot;
            </p>
          </div>

          <button
            onClick={startTourneyGamePlay}
            className="w-full py-3 bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            ▶️ START MATCH (खेल सुरु गर्नुहोस्)
          </button>
        </div>
      ) : gameStarted ? (
        <div className="w-full max-w-md bg-gray-900 border border-purple-500/40 rounded-3xl p-4 flex flex-col items-center shadow-2xl relative">
          <div className="w-full flex justify-between items-center mb-3 bg-black/60 px-3 py-2 rounded-2xl border border-gray-800">
            <span className="text-xs font-black text-pink-400">🔥 Layer {layer}/7</span>
            <span className="text-xs font-black text-yellow-400">⏱️ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
            <span className="text-xs font-black text-cyan-300">Score: {score}</span>
          </div>

          <div className="relative w-[320px] h-[420px] bg-black rounded-2xl border border-cyan-500/30 overflow-hidden flex flex-col items-center justify-center">
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-10 p-4 text-center gap-2">
                <h2 className="text-base font-black text-red-500 uppercase">
                  {timeLeft <= 0 ? 'Tournament Time Up!' : 'Game Over!'}
                </h2>
                <p className="text-xs text-gray-300">Final Score: <span className="text-cyan-400 font-bold">{score}</span></p>

                <div className="flex flex-col gap-2 w-full mt-1">
                  {timeLeft > 0 && (
                    <button
                      onClick={handleRestartGame}
                      className="w-full py-2.5 bg-gradient-to-r from-green-400 to-cyan-500 text-black font-black text-xs rounded-xl shadow active:scale-95 transition-all"
                    >
                      🔄 RESTART & PLAY AGAIN
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setGameStarted(false);
                      setActiveTournament('NONE');
                    }}
                    className="w-full py-2 bg-gray-800 text-gray-300 font-bold text-xs rounded-xl"
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
              onMouseMove={handleTouchMove}
              onTouchMove={handleTouchMove}
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
            
            <p className="text-xs text-yellow-400 font-bold">Prize Pool: Top 10 players will be rewarded with NPR 1,000 each! 🏆</p>

            {isTimeLocked ? (
              <div className="w-full py-2.5 bg-red-950/80 text-red-400 font-bold text-xs rounded-2xl text-center border border-red-500/30">
                🔒 Locked (Opens Daily 6:00 AM - 6:00 PM)
              </div>
            ) : (
              <button
                onClick={handleJoinClick}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                JOIN NOW (1 Hour Match)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}