import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import TrustGraph from './components/TrustGraph'; 

function App() {
  const socket = useSocket();
  const [gameState, setGameState] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [formData, setFormData] = useState({ username: '', roomId: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket) return;
    
    socket.on('GAME_STATE_UPDATE', (newState) => setGameState(newState));
    socket.on('TIMER_UPDATE', (time) => setTimeLeft(time));
    
    return () => {
      socket.off('GAME_STATE_UPDATE');
      socket.off('TIMER_UPDATE');
    };
  }, [socket]);

  const handleJoin = (e) => {
    e.preventDefault();
    setError('');
    socket.emit('JOIN_ROOM', formData, (response) => {
      if (response.error) setError(response.error);
    });
  };

  const sendSignal = (type) => {
    socket.emit('SEND_SIGNAL', { roomId: gameState.roomId, signalType: type });
  };

  const submitVote = (decision) => {
    socket.emit('SUBMIT_VOTE', { roomId: gameState.roomId, decision });
  };

  if (gameState) {
    return (
      <div className="min-h-screen bg-abstract flex items-center justify-center p-4 font-mono relative">
        <div className="absolute top-10 left-10 text-slate-800 text-6xl opacity-20 select-none">∑</div>
        <div className="absolute bottom-10 right-10 text-slate-800 text-6xl opacity-20 select-none">λ</div>

        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-8 rounded-2xl shadow-2xl shadow-cyan-900/20 w-full max-w-2xl relative z-10">
          
          <div className="flex justify-between items-end border-b border-slate-700 pb-4 mb-6">
            <div>
              <p className="text-cyan-400 text-sm font-bold tracking-widest uppercase mb-1">Sector {gameState.roomId}</p>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {gameState.state === 'WAITING' ? 'Awaiting Subjects...' : 
                 gameState.state === 'END_GAME' ? 'Simulation Complete' : 
                 `Round ${gameState.round} of ${gameState.maxRounds}`}
              </h1>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <span className="inline-block px-3 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-slate-400">
                PHASE: <span className="text-cyan-300 font-bold">{gameState.state}</span>
              </span>
              {timeLeft !== null && gameState.state !== 'END_GAME' && (
                <span className="text-xl font-bold text-red-400 animate-pulse">
                  00:{timeLeft.toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </div>

          {gameState.state === 'WAITING' && (
             <div className="grid grid-cols-2 gap-6">
               <div>
                 <h3 className="text-slate-400 text-sm mb-3">CONNECTION ROSTER ({gameState.players.length}/4)</h3>
                 <ul className="space-y-2">
                   {gameState.players.map((p) => (
                     <li key={p.id} className="flex items-center gap-3 bg-slate-900/50 p-3 rounded border border-slate-700/50">
                       <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                       <span className={p.id === gameState.me.id ? "text-cyan-300 font-bold" : "text-slate-300"}>
                         {p.username} {p.id === gameState.me.id && "(You)"}
                       </span>
                     </li>
                   ))}
                 </ul>
               </div>
               <div className="bg-slate-900/80 rounded border border-slate-700 p-4 flex flex-col justify-center items-center text-center">
                 <span className="text-4xl mb-2 text-slate-500">∅</span>
                 <p className="text-slate-400 text-sm">Role assignment pending completion of the roster.</p>
               </div>
             </div>
          )}

          {gameState.state !== 'WAITING' && gameState.state !== 'END_GAME' && (
            <div className="flex flex-col gap-6">
              
              <div className={`p-4 rounded border ${gameState.me.role === 'SENDER' ? 'bg-cyan-900/30 border-cyan-500/50' : 'bg-purple-900/30 border-purple-500/50'}`}>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">
                    Role Classification: <span className={gameState.me.role === 'SENDER' ? 'text-cyan-400' : 'text-purple-400'}>{gameState.me.role}</span>
                  </h2>
                  {gameState.me.role === 'SENDER' && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase">True State:</p>
                      <p className={`font-bold ${gameState.trueState === 'HIGH_QUALITY' ? 'text-green-400' : 'text-red-400'}`}>
                        {gameState.trueState.replace('_', ' ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/80 rounded border border-slate-700 p-6">
                
                {gameState.state === 'SIGNAL_PHASE' && (
                  <div>
                    {gameState.me.role === 'SENDER' ? (
                      <div className="text-center">
                        <h3 className="text-xl text-white mb-2">Broadcast your signal</h3>
                        <p className="text-sm text-slate-400 mb-6">Receivers are waiting. A costly signal requires sacrifice but builds trust.</p>
                        <div className="flex gap-4 justify-center">
                          <button 
                            onClick={() => sendSignal('CHEAP')}
                            className="px-6 py-3 border border-slate-500 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                          >
                            Send CHEAP Signal
                          </button>
                          <button 
                            onClick={() => sendSignal('COSTLY')}
                            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400 rounded shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all"
                          >
                            Send COSTLY Signal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <h3 className="text-lg text-purple-300">Awaiting Sender's Transmission...</h3>
                        <p className="text-sm text-slate-500">Prepare to vote based on the incoming signal.</p>
                      </div>
                    )}
                  </div>
                )}

                {gameState.state === 'VOTING_PHASE' && (
                  <div>
                    <div className="text-center mb-6">
                      <h3 className="text-slate-400 uppercase tracking-widest text-sm mb-2">Intercepted Signal</h3>
                      <div className={`inline-block px-8 py-3 rounded border-2 font-bold text-xl ${
                        gameState.currentSignal === 'COSTLY' ? 'border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-slate-500 text-slate-300'
                      }`}>
                        {gameState.currentSignal} SIGNAL DETECTED
                      </div>
                    </div>

                    {gameState.me.role === 'RECEIVER' ? (
                      <div className="text-center">
                        <p className="text-slate-300 mb-6">Evaluate the signal. Do you trust the Sender's asset is High Quality?</p>
                        {gameState.votes && gameState.votes[gameState.me.id] ? (
                          <div className="text-cyan-400 font-bold border border-cyan-800 bg-cyan-900/30 py-3 rounded">
                            Vote Registered. Awaiting others...
                          </div>
                        ) : (
                          <div className="flex gap-4 justify-center">
                            <button 
                              onClick={() => submitVote('DISTRUST')}
                              className="px-6 py-3 bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-500 rounded transition-colors"
                            >
                              DISTRUST (Reject)
                            </button>
                            <button 
                              onClick={() => submitVote('TRUST')}
                              className="px-6 py-3 bg-green-900/50 hover:bg-green-800 text-green-200 border border-green-500 rounded transition-colors"
                            >
                              TRUST (Invest)
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 py-4">
                        <p>Receivers are analyzing your signal and voting...</p>
                        <div className="mt-4 flex justify-center gap-2">
                          {gameState.players.filter(p => p.role === 'RECEIVER').map(p => (
                            <div key={p.id} className={`w-3 h-3 rounded-full ${p.hasVoted ? 'bg-cyan-400' : 'bg-slate-700'}`}></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {gameState.state === 'RESOLUTION' && (
                  <div className="animate-fade-in">
                    <h3 className="text-2xl font-bold text-center text-white mb-6 border-b border-slate-700 pb-4">Phase Complete: Data Revealed</h3>
                    
                    <div className="grid grid-cols-2 gap-8">
                      <div className="bg-slate-900 p-4 rounded border border-slate-700">
                        <h4 className="text-slate-400 text-xs uppercase mb-2">True State Was</h4>
                        <p className={`text-2xl font-bold ${gameState.trueState === 'HIGH_QUALITY' ? 'text-green-400' : 'text-red-400'}`}>
                          {gameState.trueState.replace('_', ' ')}
                        </p>
                        <h4 className="text-slate-400 text-xs uppercase mt-4 mb-2">Signal Sent</h4>
                        <p className="text-lg font-bold text-cyan-400">{gameState.currentSignal}</p>
                      </div>

                      <div className="bg-slate-900 p-4 rounded border border-slate-700">
                        <h4 className="text-slate-400 text-xs uppercase mb-2">Current Standings</h4>
                        <ul className="space-y-2">
                          {gameState.players.map(p => (
                            <li key={p.id} className="flex justify-between items-center text-sm">
                              <span className={p.id === gameState.me.id ? "text-cyan-300 font-bold" : "text-slate-300"}>
                                {p.username} ({p.role.substring(0,1)})
                              </span>
                              <div className="flex gap-4">
                                <span className={p.score >= 0 ? "text-green-400" : "text-red-400"}>Score: {p.score}</span>
                                <span className="text-purple-400">Trust: {p.trustMetric}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {gameState.state === 'END_GAME' && (
            <div className="animate-fade-in space-y-8">
              <h3 className="text-3xl font-bold text-center text-cyan-400 mb-2">Laboratory Simulation Complete</h3>
              <p className="text-center text-slate-400 mb-8">Final trust metrics and scores compiled.</p>
              
              <TrustGraph history={gameState.history} players={gameState.players} />

              <div className="bg-slate-900 p-6 rounded border border-slate-700">
                <h4 className="text-slate-400 text-xs uppercase mb-4 tracking-widest">Final Ledger</h4>
                <ul className="space-y-3">
                  {gameState.players.sort((a,b) => b.score - a.score).map(p => (
                    <li key={p.id} className="flex justify-between items-center bg-slate-800 p-3 rounded">
                      <span className="text-slate-200 font-bold">{p.username}</span>
                      <div className="flex gap-6">
                        <span className={p.score >= 0 ? "text-green-400" : "text-red-400"}>Net Payoff: {p.score}</span>
                        <span className="text-purple-400">Final Trust: {p.trustMetric}/100</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-abstract flex items-center justify-center p-4 font-mono relative">
      <div className="absolute top-1/4 left-1/4 text-slate-800 text-8xl opacity-10 select-none">∀</div>
      <div className="absolute bottom-1/4 right-1/4 text-slate-800 text-8xl opacity-10 select-none">∃</div>

      <div className="bg-slate-800/80 backdrop-blur-lg border border-slate-600 p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tighter">SIGNAL</h1>
        <p className="text-cyan-400 text-sm mb-8 tracking-widest uppercase">The Asymmetric Information Laboratory</p>
        
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Subject Alias</label>
            <input 
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              placeholder="e.g., Node_01" 
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Sector ID</label>
            <input 
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              placeholder="1" 
              value={formData.roomId}
              onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(8,145,178,0.5)]"
          >
            Initialize Connection
          </button>
        </form>
        {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
}

export default App;