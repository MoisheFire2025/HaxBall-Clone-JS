import { useEffect, useRef, useState } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { GameEngine } from './game/engine';
import { NetworkManager, NetworkMessage } from './game/network';
import { drawPitch, drawPlayer, drawBall } from './game/renderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './game/constants';
import { Trophy, Users, Play, Share2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'lobby' | 'playing'>('menu');
  const [isHost, setIsHost] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [playerName, setPlayerName] = useState('Player ' + Math.floor(Math.random() * 1000));
  const [score, setScore] = useState({ red: 0, blue: 0 });

  const engineRef = useRef<GameEngine | null>(null);
  const networkRef = useRef<NetworkManager | null>(null);
  const inputsRef = useRef<Record<string, any>>({});
  const localInputsRef = useRef({ up: false, down: false, left: false, right: false, kick: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      switch (e.key) {
        case 'ArrowUp': case 'w': localInputsRef.current.up = true; break;
        case 'ArrowDown': case 's': localInputsRef.current.down = true; break;
        case 'ArrowLeft': case 'a': localInputsRef.current.left = true; break;
        case 'ArrowRight': case 'd': localInputsRef.current.right = true; break;
        case ' ': localInputsRef.current.kick = true; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      switch (e.key) {
        case 'ArrowUp': case 'w': localInputsRef.current.up = false; break;
        case 'ArrowDown': case 's': localInputsRef.current.down = false; break;
        case 'ArrowLeft': case 'a': localInputsRef.current.left = false; break;
        case 'ArrowRight': case 'd': localInputsRef.current.right = false; break;
        case ' ': localInputsRef.current.kick = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const startHost = () => {
    setIsHost(true);
    const engine = new GameEngine(true);
    engineRef.current = engine;

    const network = new NetworkManager(
      (conn, msg) => {
        if (msg.type === 'JOIN') {
          engine.addPlayer(conn.peer, msg.payload.name, engine.state.players.length % 2 === 0 ? 'red' : 'blue');
          network.send(conn, { type: 'WELCOME', payload: { team: engine.state.players.find(p => p.id === conn.peer)?.team } });
        } else if (msg.type === 'INPUT') {
          inputsRef.current[conn.peer] = msg.payload;
        }
      },
      (conn) => {
        console.log('Connected to', conn.peer);
      },
      (conn) => {
        engine.removePlayer(conn.peer);
      }
    );

    network.peer.on('open', (id) => {
      setPeerId(id);
      setGameState('lobby');
      // Add local player
      engine.addPlayer(id, playerName, 'red');
    });

    networkRef.current = network;
  };

  const joinGame = () => {
    setIsHost(false);
    const engine = new GameEngine(false);
    engineRef.current = engine;

    const network = new NetworkManager(
      (conn, msg) => {
        if (msg.type === 'STATE') {
          engine.setState(msg.payload);
          setScore(msg.payload.score);
        } else if (msg.type === 'WELCOME') {
          setGameState('playing');
        }
      },
      (conn) => {
        network.send(conn, { type: 'JOIN', payload: { name: playerName } });
      },
      () => {
        setGameState('menu');
        alert('Disconnected from host');
      }
    );

    network.peer.on('open', (id) => {
      setPeerId(id);
      network.connect(targetId);
    });

    networkRef.current = network;
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const loop = () => {
      const engine = engineRef.current;
      const network = networkRef.current;
      if (!engine || !network) return;

      if (isHost) {
        // Update local inputs
        inputsRef.current[peerId] = localInputsRef.current;
        engine.update(inputsRef.current);
        setScore({ ...engine.state.score });
        
        // Broadcast state
        network.broadcast({
          type: 'STATE',
          payload: {
            players: engine.state.players.map(p => ({
              id: p.id,
              name: p.name,
              team: p.team,
              pos: p.pos,
              vel: p.vel,
              kicking: p.kicking
            })),
            ball: { pos: engine.state.ball.pos, vel: engine.state.ball.vel },
            score: engine.state.score
          }
        });
      } else {
        // Send local inputs to host
        if (network.connections[0]) {
          network.send(network.connections[0], { type: 'INPUT', payload: localInputsRef.current });
        }
      }

      // Render
      drawPitch(ctx);
      engine.state.players.forEach(p => drawPlayer(ctx, p));
      drawBall(ctx, engine.state.ball);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, isHost, peerId]);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-sans selection:bg-blue-500/30">
      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-4"
          >
            <div className="mb-12 text-center">
              <motion.h1 
                className="text-7xl font-black tracking-tighter mb-2 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                HAXBALL CLONE
              </motion.h1>
              <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">Multiplayer P2P Physics Engine</p>
            </div>

            <div className="w-full max-w-md space-y-6 bg-[#252525] p-8 rounded-3xl border border-white/5 shadow-2xl">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Your Nickname</label>
                <input 
                  type="text" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-medium"
                  placeholder="Enter name..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={startHost}
                  className="group relative flex items-center justify-between bg-white text-black px-6 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95 overflow-hidden"
                >
                  <span className="flex items-center gap-3">
                    <Play size={20} fill="currentColor" />
                    Host Game
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Share2 size={18} />
                  </div>
                </button>

                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500">
                    <Users size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-blue-500 transition-colors font-medium"
                    placeholder="Enter Host ID to join..."
                  />
                  <button 
                    onClick={joinGame}
                    disabled={!targetId}
                    className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 px-4 rounded-xl font-bold transition-all active:scale-95"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'lobby' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-screen p-4"
          >
            <div className="bg-[#252525] p-10 rounded-3xl border border-white/5 shadow-2xl text-center max-w-lg w-full">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Share2 className="text-blue-500" size={32} />
              </div>
              <h2 className="text-3xl font-bold mb-2">Waiting for Players</h2>
              <p className="text-gray-400 mb-8">Share this ID with your friends to start the match</p>
              
              <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/10 mb-8 flex items-center justify-between group">
                <code className="text-blue-400 font-mono text-lg font-bold">{peerId}</code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(peerId);
                    alert('ID copied to clipboard!');
                  }}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <Share2 size={20} />
                </button>
              </div>

              <button 
                onClick={() => setGameState('playing')}
                className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
              >
                Start Match
              </button>
              
              <button 
                onClick={() => setGameState('menu')}
                className="mt-4 text-gray-500 hover:text-white flex items-center gap-2 mx-auto text-sm font-medium"
              >
                <ArrowLeft size={16} /> Cancel
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-screen bg-black"
          >
            <div className="mb-6 flex items-center gap-12 bg-[#1a1a1a] px-8 py-4 rounded-full border border-white/5 shadow-xl">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest font-bold text-red-500 mb-1">Red Team</span>
                <span className="text-4xl font-black font-mono">{score.red}</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest font-bold text-blue-500 mb-1">Blue Team</span>
                <span className="text-4xl font-black font-mono">{score.blue}</span>
              </div>
            </div>

            <div className="relative group">
              <canvas 
                ref={canvasRef} 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT}
                className="rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-[#252525]"
              />
              <div className="absolute -bottom-12 left-0 right-0 flex justify-between px-4 text-[10px] uppercase tracking-widest font-bold text-gray-500">
                <span>WASD / Arrows to Move</span>
                <span>Space to Kick</span>
                <span>ID: {peerId}</span>
              </div>
            </div>

            <button 
              onClick={() => {
                networkRef.current?.peer.destroy();
                setGameState('menu');
              }}
              className="mt-16 text-gray-500 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft size={16} /> Quit to Menu
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
