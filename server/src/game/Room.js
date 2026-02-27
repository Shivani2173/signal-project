const { GAME_PHASES, PLAYER_ROLES } = require('./constants');

class Room {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io; 
    this.players = new Map();
    this.state = GAME_PHASES.WAITING;
    this.round = 1;
    this.maxRounds = 5;
    this.history = []; // Tracks trust metrics over time
    
    this.trueState = null; 
    this.currentSignal = null; 
    this.votes = {}; 
    
    this.timer = null;
    this.timeRemaining = 0;
  }

  addPlayer(socketId, username) {
    if (this.players.size >= 4) return false;
    this.players.set(socketId, {
      id: socketId,
      username,
      role: PLAYER_ROLES.UNASSIGNED,
      score: 0,
      trustMetric: 50 
    });

    if (this.players.size === 4 && this.state === GAME_PHASES.WAITING) {
      setTimeout(() => this.transition(GAME_PHASES.ROLE_ASSIGNMENT), 1000);
    }
    return true;
  }

  broadcastState() {
    this.players.forEach((player) => {
      this.io.to(player.id).emit('GAME_STATE_UPDATE', this.getSanitizedState(player.id));
    });
  }

  startTimer(seconds, nextPhase) {
    this.timeRemaining = seconds;
    clearInterval(this.timer); 
    
    this.io.to(this.roomId).emit('TIMER_UPDATE', this.timeRemaining);

    this.timer = setInterval(() => {
      this.timeRemaining -= 1;
      this.io.to(this.roomId).emit('TIMER_UPDATE', this.timeRemaining);
      
      if (this.timeRemaining <= 0) {
        clearInterval(this.timer);
        this.transition(nextPhase);
      }
    }, 1000);
  }

  transition(newState) {
    this.state = newState;
    console.log(`[Room ${this.roomId}] Transitioned to: ${this.state}`);
    
    switch (newState) {
      case GAME_PHASES.ROLE_ASSIGNMENT:
        this.assignRoles();
        break;
      case GAME_PHASES.SIGNAL_PHASE:
        this.startSignalPhase();
        break;
      case GAME_PHASES.VOTING_PHASE:
        this.startVotingPhase();
        break;
      case GAME_PHASES.RESOLUTION:
        this.resolveRound();
        break;
      case GAME_PHASES.NEXT_ROUND:
        this.setupNextRound();
        break;
      case GAME_PHASES.END_GAME:
        this.broadcastState();
        break;
    }
  }

  assignRoles() {
    const playersArray = Array.from(this.players.values());
    
    for (let i = playersArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playersArray[i], playersArray[j]] = [playersArray[j], playersArray[i]];
    }

    playersArray[0].role = PLAYER_ROLES.SENDER;
    playersArray[1].role = PLAYER_ROLES.RECEIVER;
    playersArray[2].role = PLAYER_ROLES.RECEIVER;
    playersArray[3].role = PLAYER_ROLES.RECEIVER;

    this.trueState = Math.random() > 0.5 ? 'HIGH_QUALITY' : 'LOW_QUALITY';

    this.broadcastState();
    this.startTimer(7, GAME_PHASES.SIGNAL_PHASE);
  }

  startSignalPhase() {
    this.currentSignal = null; 
    this.broadcastState();
    this.startTimer(15, GAME_PHASES.VOTING_PHASE); 
  }

  handleSignal(socketId, signalType) {
    const player = this.players.get(socketId);
    
    if (this.state !== GAME_PHASES.SIGNAL_PHASE) return;
    if (!player || player.role !== PLAYER_ROLES.SENDER) return;

    this.currentSignal = (signalType === 'COSTLY') ? 'COSTLY' : 'CHEAP';
    console.log(`[Room ${this.roomId}] Sender broadcasted a ${this.currentSignal} signal.`);
    
    clearInterval(this.timer);
    this.transition(GAME_PHASES.VOTING_PHASE);
  }

  startVotingPhase() {
    this.votes = {}; 
    this.broadcastState();
    this.startTimer(15, GAME_PHASES.RESOLUTION); 
  }

  handleVote(socketId, decision) {
    const player = this.players.get(socketId);
    
    if (this.state !== GAME_PHASES.VOTING_PHASE) return;
    if (!player || player.role !== PLAYER_ROLES.RECEIVER) return;

    this.votes[socketId] = decision === 'TRUST' ? 'TRUST' : 'DISTRUST';
    console.log(`[Room ${this.roomId}] ${player.username} voted to ${this.votes[socketId]}.`);

    this.broadcastState();

    const voteCount = Object.keys(this.votes).length;
    if (voteCount === 3) {
      clearInterval(this.timer);
      this.transition(GAME_PHASES.RESOLUTION);
    }
  }

  resolveRound() {
    let senderPayoff = 0;
    
    if (this.currentSignal === 'COSTLY') {
      if (this.trueState === 'HIGH_QUALITY') {
        senderPayoff -= 5;
      } else {
        senderPayoff -= 20; 
      }
    }

    let trustCount = 0;
    
    this.players.forEach((player, socketId) => {
      if (player.role === PLAYER_ROLES.RECEIVER) {
        const vote = this.votes[socketId] || 'DISTRUST'; 
        let receiverPayoff = 0;

        if (vote === 'TRUST') {
          trustCount++;
          senderPayoff += 10; 

          if (this.trueState === 'HIGH_QUALITY') {
            receiverPayoff += 15; 
            player.trustMetric = Math.min(100, player.trustMetric + 10);
          } else {
            receiverPayoff -= 15; 
            player.trustMetric = Math.max(0, player.trustMetric - 20);
          }
        }

        player.score += receiverPayoff;
      }
    });

    const sender = Array.from(this.players.values()).find(p => p.role === PLAYER_ROLES.SENDER);
    if (sender) {
      sender.score += senderPayoff;
      if (this.trueState === 'LOW_QUALITY' && trustCount > 0) {
         sender.trustMetric = Math.max(0, sender.trustMetric - 15);
      } else if (this.trueState === 'HIGH_QUALITY' && trustCount > 0) {
         sender.trustMetric = Math.min(100, sender.trustMetric + 10);
      }
    }

    // Record history for D3
    const roundData = { round: this.round, metrics: {} };
    this.players.forEach((p, id) => { roundData.metrics[id] = p.trustMetric; });
    this.history.push(roundData);

    this.broadcastState();
    this.startTimer(8, GAME_PHASES.NEXT_ROUND); 
  }

  setupNextRound() {
    if (this.round >= this.maxRounds) {
      this.transition(GAME_PHASES.END_GAME);
    } else {
      this.round++;
      this.currentSignal = null;
      this.trueState = null;
      this.votes = {};
      this.transition(GAME_PHASES.ROLE_ASSIGNMENT); 
    }
  }

  getSanitizedState(socketId) {
    const player = this.players.get(socketId);
    if (!player) return null;

    const isSender = player.role === PLAYER_ROLES.SENDER;
    const isResolution = this.state === GAME_PHASES.RESOLUTION;
    const isEndGame = this.state === GAME_PHASES.END_GAME;

    return {
      roomId: this.roomId,
      state: this.state,
      round: this.round,
      maxRounds: this.maxRounds,
      trueState: (isSender || isResolution || isEndGame) ? this.trueState : 'HIDDEN',
      currentSignal: this.currentSignal,
      me: player,
      votes: this.votes,
      history: this.history, 
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        username: p.username,
        score: p.score,
        trustMetric: p.trustMetric,
        role: p.role === PLAYER_ROLES.SENDER ? 'SENDER' : (p.role === PLAYER_ROLES.RECEIVER ? 'RECEIVER' : 'UNASSIGNED'),
        hasVoted: !!this.votes[p.id]
      }))
    };
  }
}

module.exports = Room;