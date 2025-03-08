import { RLAgent } from './rlAgent';
import { GameEnvironment } from './gameEnvironment';
import { createTeamBehavior, getPretrainedAction, TEAM_STRATEGIES } from './pretrainedAgents';

export class GameController {
  constructor(gridSize = 20, teamSize = 3, rewardWeights = { offense: 1.0, defense: 1.0, cooperation: 1.0 }) {
    // Create game environment
    this.environment = new GameEnvironment(gridSize, teamSize, rewardWeights);
    
    // RL parameters
    this.learningRate = 0.001;
    this.discountFactor = 0.95;
    this.explorationRate = 0.2;
    
    // Create agents
    this.agents = {};
    this.createAgents();
    
    // Training state
    this.isTraining = false;
    this.frameSkip = 2; // Process every n frames for training
    this.frameCount = 0;
    this.episodeCount = 0;
    this.maxEpisodes = 1000;
    
    // Performance metrics
    this.metrics = {
      redWins: 0,
      blueWins: 0,
      episodeRewards: [],
      episodeSteps: []
    };
    
    // Previous states and actions for learning
    this.prevStates = {};
    this.prevActions = {};
    
    // Initialize custom obstacle positions
    this.customObstacles = [];
    this.customFlagPositions = {
      red: { x: 2, y: Math.floor(gridSize / 2) },
      blue: { x: gridSize - 3, y: Math.floor(gridSize / 2) }
    };
    
    // Pre-trained agent mode
    this.usePretrainedAgents = false;
    this.pretrainedStrategy = 'BALANCED';
    this.pretrainedBehaviors = {
      red: [],
      blue: []
    };
    this.initializePretrainedBehaviors();
  }
  
  createAgents() {
    // Create red team agents
    for (let i = 0; i < this.environment.teamSize; i++) {
      const id = `red-${i}`;
      this.agents[id] = new RLAgent(
        id, 
        'red', 
        this.learningRate, 
        this.discountFactor, 
        this.explorationRate
      );
    }
    
    // Create blue team agents
    for (let i = 0; i < this.environment.teamSize; i++) {
      const id = `blue-${i}`;
      this.agents[id] = new RLAgent(
        id, 
        'blue', 
        this.learningRate,
        this.discountFactor,
        this.explorationRate
      );
    }
  }
  
  initializePretrainedBehaviors() {
    // Create pre-trained behavior patterns for both teams
    this.pretrainedBehaviors.red = createTeamBehavior('red', this.environment.teamSize, this.pretrainedStrategy);
    this.pretrainedBehaviors.blue = createTeamBehavior('blue', this.environment.teamSize, this.pretrainedStrategy);
  }
  
  setPretrainedMode(enabled, strategy = 'BALANCED') {
    this.usePretrainedAgents = enabled;
    
    if (strategy && TEAM_STRATEGIES[strategy]) {
      this.pretrainedStrategy = strategy;
      this.initializePretrainedBehaviors();
    }
  }
  
  update() {
    // Skip frames for performance
    this.frameCount = (this.frameCount + 1) % this.frameSkip;
    if (this.frameCount !== 0) return;
    
    // Get current states for all agents
    const states = {};
    
    this.environment.redTeam.concat(this.environment.blueTeam).forEach(agent => {
      states[agent.id] = this.environment.getStateForAgent(agent);
    });
    
    // Select actions for each agent (either pre-trained or RL-based)
    const actions = {};
    const gameState = this.environment.getGameState();
    
    Object.keys(this.agents).forEach(id => {
      if (this.usePretrainedAgents) {
        // Use pre-trained behavior
        actions[id] = getPretrainedAction(id, states[id], gameState, this.pretrainedBehaviors);
      } else {
        // Use reinforcement learning
        actions[id] = this.agents[id].selectAction(states[id], this.isTraining);
      }
    });
    
    // Save current state and actions for learning
    if (this.isTraining && !this.usePretrainedAgents) {
      this.prevStates = { ...states };
      this.prevActions = { ...actions };
    }
    
    // Apply actions to environment
    const result = this.environment.step(actions);
    
    // Learn from experience if training
    if (this.isTraining && !this.usePretrainedAgents) {
      Object.keys(this.agents).forEach(id => {
        const reward = result.rewards[id] || 0;
        const nextState = result.states[id];
        const done = result.done;
        
        // Store experience
        if (this.prevStates[id]) {
          this.agents[id].remember(
            this.prevStates[id], 
            this.prevActions[id], 
            reward, 
            nextState, 
            done
          );
          
          // Perform replay
          this.agents[id].replay();
        }
      });
    }
    
    // Check if episode ended
    if (result.done) {
      this.episodeEnded(result);
    }
    
    return result;
  }
  
  episodeEnded(result) {
    // Track metrics
    this.episodeCount++;
    
    if (this.environment.redScore > this.environment.blueScore) {
      this.metrics.redWins++;
    } else if (this.environment.blueScore > this.environment.redScore) {
      this.metrics.blueWins++;
    }
    
    this.metrics.episodeSteps.push(this.environment.episodeSteps);
    
    // Calculate total rewards for each team
    let redTotalReward = 0;
    let blueTotalReward = 0;
    
    Object.keys(result.rewards).forEach(id => {
      if (id.startsWith('red')) {
        redTotalReward += result.rewards[id];
      } else {
        blueTotalReward += result.rewards[id];
      }
    });
    
    this.metrics.episodeRewards.push({
      red: redTotalReward,
      blue: blueTotalReward
    });
    
    // Stop training if reached max episodes
    if (this.isTraining && this.episodeCount >= this.maxEpisodes) {
      this.isTraining = false;
      console.log('Training completed after', this.episodeCount, 'episodes');
    }
    
    // Reset environment for next episode
    this.environment.reset();
  }
  
  startTraining(episodes = 1000) {
    this.isTraining = true;
    this.maxEpisodes = episodes;
    this.episodeCount = 0;
    
    // Reset metrics
    this.metrics = {
      redWins: 0,
      blueWins: 0,
      episodeRewards: [],
      episodeSteps: []
    };
    
    // Set agents to training mode
    Object.values(this.agents).forEach(agent => {
      agent.setTrainingMode(true);
    });
    
    // Reset environment
    this.environment.reset();
  }
  
  stopTraining() {
    this.isTraining = false;
    
    // Set agents to evaluation mode
    Object.values(this.agents).forEach(agent => {
      agent.setTrainingMode(false);
    });
  }
  
  getGameState() {
    // Get state from environment
    const envState = this.environment.getGameState();
    
    // Add agent stats
    const agentStats = {};
    Object.keys(this.agents).forEach(id => {
      agentStats[id] = this.agents[id].getStats();
    });
    
    return {
      ...envState,
      isTraining: this.isTraining,
      episodeCount: this.episodeCount,
      metrics: this.metrics,
      agentStats,
      redAgents: Object.keys(this.agents).filter(id => id.startsWith('red')).length,
      blueAgents: Object.keys(this.agents).filter(id => id.startsWith('blue')).length,
      usePretrainedAgents: this.usePretrainedAgents,
      pretrainedStrategy: this.pretrainedStrategy
    };
  }
  
  updateParameters(params) {
    // Update learning parameters
    if (params.learningRate !== undefined) {
      this.learningRate = params.learningRate;
    }
    
    if (params.discountFactor !== undefined) {
      this.discountFactor = params.discountFactor;
    }
    
    if (params.explorationRate !== undefined) {
      this.explorationRate = params.explorationRate;
    }
    
    // Update reward weights
    if (params.rewardWeights) {
      this.environment.updateRewardWeights(params.rewardWeights);
    }
    
    // Update team size
    if (params.teamSize !== undefined && 
        params.teamSize !== this.environment.teamSize) {
      this.environment.setTeamSize(params.teamSize);
      this.createAgents(); // Recreate agents for new team size
      this.initializePretrainedBehaviors(); // Recreate pretrained behaviors
    }
    
    // Update pretrained strategy
    if (params.pretrainedStrategy) {
      this.pretrainedStrategy = params.pretrainedStrategy;
      this.initializePretrainedBehaviors();
    }
    
    // Update pre-trained agent mode
    if (params.usePretrainedAgents !== undefined) {
      this.usePretrainedAgents = params.usePretrainedAgents;
    }
    
    // Update all agents with new parameters
    Object.values(this.agents).forEach(agent => {
      agent.updateParameters(
        this.learningRate,
        this.discountFactor,
        this.explorationRate
      );
    });
  }
  
  reset() {
    this.environment.reset();
    this.episodeCount = 0;
    this.frameCount = 0;
    
    // Reset metrics
    this.metrics = {
      redWins: 0,
      blueWins: 0,
      episodeRewards: [],
      episodeSteps: []
    };
    
    // Reset previous states and actions
    this.prevStates = {};
    this.prevActions = {};
  }
  
  // Customization methods
  addObstacle(x, y) {
    // Add custom obstacle if position is valid
    if (this.isValidObstaclePosition(x, y)) {
      this.customObstacles.push({ x, y });
      const allWalls = [...this.environment.walls, ...this.customObstacles];
      this.environment.updateWalls(allWalls);
      return true;
    }
    return false;
  }
  
  removeObstacle(x, y) {
    // Remove custom obstacle
    const index = this.customObstacles.findIndex(
      wall => wall.x === x && wall.y === y
    );
    
    if (index !== -1) {
      this.customObstacles.splice(index, 1);
      const allWalls = [...this.environment.walls, ...this.customObstacles];
      this.environment.updateWalls(allWalls);
      return true;
    }
    return false;
  }
  
  isValidObstaclePosition(x, y) {
    // Check if position is within grid
    if (x < 0 || x >= this.environment.gridSize || 
        y < 0 || y >= this.environment.gridSize) {
      return false;
    }
    
    // Check if position overlaps with flags
    if ((x === this.environment.redFlag.x && y === this.environment.redFlag.y) ||
        (x === this.environment.blueFlag.x && y === this.environment.blueFlag.y)) {
      return false;
    }
    
    // Check if position blocks the path between flags
    // (simplified - just ensure there's at least one path)
    if (x === Math.floor(this.environment.gridSize / 2) && 
        y % 3 === 0) {
      return false;
    }
    
    return true;
  }
  
  updateFlagPosition(team, x, y) {
    // Update flag position if valid
    if (this.isValidFlagPosition(team, x, y)) {
      this.customFlagPositions[team] = { x, y };
      
      if (team === 'red') {
        this.environment.updateFlags(
          this.customFlagPositions.red,
          this.environment.blueFlag
        );
      } else {
        this.environment.updateFlags(
          this.environment.redFlag,
          this.customFlagPositions.blue
        );
      }
      
      return true;
    }
    return false;
  }
  
  isValidFlagPosition(team, x, y) {
    // Check if position is within valid area for the team's flag
    if (x < 0 || x >= this.environment.gridSize || 
        y < 0 || y >= this.environment.gridSize) {
      return false;
    }
    
    // Red flag must be in red territory, blue flag in blue territory
    if (team === 'red' && x >= this.environment.gridSize / 2) {
      return false;
    }
    
    if (team === 'blue' && x < this.environment.gridSize / 2) {
      return false;
    }
    
    // Check if position overlaps with walls
    for (const wall of this.environment.walls.concat(this.customObstacles)) {
      if (wall.x === x && wall.y === y) {
        return false;
      }
    }
    
    return true;
  }
  
  // Get statistics for visualization
  getHeatmapData() {
    return this.environment.heatmap;
  }
  
  getAgentStats() {
    const stats = {};
    
    Object.keys(this.agents).forEach(id => {
      stats[id] = this.agents[id].getStats();
    });
    
    return stats;
  }
  
  getPerformanceMetrics() {
    // Calculate win rates
    const totalEpisodes = this.metrics.redWins + this.metrics.blueWins;
    const redWinRate = totalEpisodes > 0 ? this.metrics.redWins / totalEpisodes : 0;
    const blueWinRate = totalEpisodes > 0 ? this.metrics.blueWins / totalEpisodes : 0;
    
    // Calculate average rewards
    const recentEpisodes = Math.min(10, this.metrics.episodeRewards.length);
    let redRecentReward = 0;
    let blueRecentReward = 0;
    
    for (let i = this.metrics.episodeRewards.length - recentEpisodes; 
         i < this.metrics.episodeRewards.length; i++) {
      if (i >= 0) {
        redRecentReward += this.metrics.episodeRewards[i].red;
        blueRecentReward += this.metrics.episodeRewards[i].blue;
      }
    }
    
    redRecentReward = recentEpisodes > 0 ? redRecentReward / recentEpisodes : 0;
    blueRecentReward = recentEpisodes > 0 ? blueRecentReward / recentEpisodes : 0;
    
    return {
      redWinRate,
      blueWinRate,
      redRecentReward,
      blueRecentReward,
      totalEpisodes: this.episodeCount,
      episodeRewards: this.metrics.episodeRewards,
      episodeSteps: this.metrics.episodeSteps,
      usePretrainedAgents: this.usePretrainedAgents,
      pretrainedStrategy: this.pretrainedStrategy
    };
  }
  
  // Save and load agent models
  async saveAgents() {
    const savePromises = Object.values(this.agents).map(agent => 
      agent.saveModel(`agent-${agent.id}`)
    );
    
    await Promise.all(savePromises);
    return true;
  }
  
  async loadAgents() {
    try {
      const loadPromises = Object.values(this.agents).map(agent => 
        agent.loadModel(`agent-${agent.id}`)
      );
      
      await Promise.all(loadPromises);
      return true;
    } catch (error) {
      console.error('Failed to load agent models:', error);
      return false;
    }
  }
} 