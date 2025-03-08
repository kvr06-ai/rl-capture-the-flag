// Game environment for Capture the Flag
export class GameEnvironment {
  constructor(gridSize = 20, teamSize = 3, rewardWeights = { offense: 1.0, defense: 1.0, cooperation: 1.0 }) {
    this.gridSize = gridSize;
    this.teamSize = teamSize;
    this.rewardWeights = rewardWeights;
    this.heatmap = {
      red: Array(gridSize).fill().map(() => Array(gridSize).fill(0)),
      blue: Array(gridSize).fill().map(() => Array(gridSize).fill(0))
    };
    this.positionHistory = {
      red: [],
      blue: []
    };
    this.historyLimit = 1000; // Limit history size for heatmap generation
    
    // Initialize game state
    this.reset();
  }
  
  reset() {
    // Initialize grid
    this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
    
    // Initialize flags
    this.redFlag = { x: 2, y: Math.floor(this.gridSize / 2) };
    this.blueFlag = { x: this.gridSize - 3, y: Math.floor(this.gridSize / 2) };
    
    // Flag capture status
    this.redFlagHolder = null;
    this.blueFlagHolder = null;
    
    // Initialize teams
    this.redTeam = [];
    this.blueTeam = [];
    
    for (let i = 0; i < this.teamSize; i++) {
      this.redTeam.push({
        id: `red-${i}`,
        x: 1,
        y: 3 + i * 3,
        hasFlag: false,
        role: 'offense' // or 'defense'
      });
      
      this.blueTeam.push({
        id: `blue-${i}`,
        x: this.gridSize - 2,
        y: 3 + i * 3,
        hasFlag: false,
        role: 'offense' // or 'defense'
      });
    }
    
    // Create walls
    this.walls = [];
    for (let i = 6; i < this.gridSize - 6; i++) {
      if (i % 3 !== 0) { // Gap in walls
        this.walls.push({ x: Math.floor(this.gridSize / 2), y: i });
      }
    }
    
    // Game statistics
    this.redScore = 0;
    this.blueScore = 0;
    this.episode = 0;
    this.episodeSteps = 0;
    this.maxEpisodeSteps = 500; // Maximum steps per episode
  }
  
  updateWalls(newWalls) {
    this.walls = newWalls;
  }
  
  updateFlags(redFlag, blueFlag) {
    this.redFlag = redFlag;
    this.blueFlag = blueFlag;
  }
  
  updateRewardWeights(weights) {
    this.rewardWeights = weights;
  }
  
  step(actions) {
    // Apply actions for each agent
    // actions = { 'red-0': 1, 'blue-0': 2, ... }
    
    // Return value will be: { states, rewards, done, info }
    const result = {
      states: {},
      rewards: {},
      done: false,
      info: {}
    };
    
    // Update agent positions
    this.redTeam.forEach(agent => {
      const action = actions[agent.id];
      if (action !== undefined) {
        this.moveAgent(agent, action);
      }
    });
    
    this.blueTeam.forEach(agent => {
      const action = actions[agent.id];
      if (action !== undefined) {
        this.moveAgent(agent, action);
      }
    });
    
    // Check for flag captures and tagging
    const flagCaptured = this.checkFlagCaptures();
    this.checkTagging();
    
    // Update heatmap with new positions
    this.updateHeatmap();
    
    // Calculate rewards
    const rewards = this.calculateRewards();
    result.rewards = rewards;
    
    // Get states for each agent
    this.redTeam.concat(this.blueTeam).forEach(agent => {
      result.states[agent.id] = this.getStateForAgent(agent);
    });
    
    // Check if episode is done
    this.episodeSteps++;
    if (flagCaptured || this.episodeSteps >= this.maxEpisodeSteps) {
      result.done = true;
      this.episode++;
      this.episodeSteps = 0;
    }
    
    // Add info
    result.info = {
      redScore: this.redScore,
      blueScore: this.blueScore,
      episode: this.episode,
      steps: this.episodeSteps
    };
    
    return result;
  }
  
  moveAgent(agent, action) {
    // 0: stay, 1: up, 2: right, 3: down, 4: left
    const dx = [0, 0, 1, 0, -1];
    const dy = [0, -1, 0, 1, 0];
    
    const newX = agent.x + dx[action];
    const newY = agent.y + dy[action];
    
    // Check if move is valid
    if (this.isValidMove(newX, newY)) {
      agent.x = newX;
      agent.y = newY;
    }
  }
  
  isValidMove(x, y) {
    // Check boundaries
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
      return false;
    }
    
    // Check for walls
    for (const wall of this.walls) {
      if (wall.x === x && wall.y === y) {
        return false;
      }
    }
    
    return true;
  }
  
  checkFlagCaptures() {
    let flagCaptured = false;
    
    // Check red team capturing blue flag
    this.redTeam.forEach(agent => {
      // Red team capturing blue flag
      if (!agent.hasFlag && 
          agent.x === this.blueFlag.x && 
          agent.y === this.blueFlag.y && 
          !this.blueFlagHolder) {
        agent.hasFlag = true;
        this.blueFlagHolder = agent.id;
      }
      
      // Red team returning with flag
      if (agent.hasFlag && agent.x <= 1) {
        agent.hasFlag = false;
        this.blueFlagHolder = null;
        this.redScore += 1;
        flagCaptured = true;
      }
    });
    
    // Check blue team capturing red flag
    this.blueTeam.forEach(agent => {
      // Blue team capturing red flag
      if (!agent.hasFlag && 
          agent.x === this.redFlag.x && 
          agent.y === this.redFlag.y && 
          !this.redFlagHolder) {
        agent.hasFlag = true;
        this.redFlagHolder = agent.id;
      }
      
      // Blue team returning with flag
      if (agent.hasFlag && agent.x >= this.gridSize - 2) {
        agent.hasFlag = false;
        this.redFlagHolder = null;
        this.blueScore += 1;
        flagCaptured = true;
      }
    });
    
    return flagCaptured;
  }
  
  checkTagging() {
    // Red team tagging blue team in red territory
    this.redTeam.forEach(redAgent => {
      if (redAgent.x <= this.gridSize / 2) { // Red territory
        this.blueTeam.forEach(blueAgent => {
          if (blueAgent.x <= this.gridSize / 2 && // Blue in red territory
              redAgent.x === blueAgent.x && 
              redAgent.y === blueAgent.y) {
            // Reset blue agent position
            blueAgent.x = this.gridSize - 2;
            blueAgent.y = Math.floor(Math.random() * this.gridSize);
            
            // Drop flag if carrying
            if (blueAgent.hasFlag) {
              blueAgent.hasFlag = false;
              this.redFlagHolder = null;
              this.redFlag = { 
                x: 2, 
                y: Math.floor(this.gridSize / 2) 
              };
            }
          }
        });
      }
    });
    
    // Blue team tagging red team in blue territory
    this.blueTeam.forEach(blueAgent => {
      if (blueAgent.x >= this.gridSize / 2) { // Blue territory
        this.redTeam.forEach(redAgent => {
          if (redAgent.x >= this.gridSize / 2 && // Red in blue territory
              blueAgent.x === redAgent.x && 
              blueAgent.y === redAgent.y) {
            // Reset red agent position
            redAgent.x = 1;
            redAgent.y = Math.floor(Math.random() * this.gridSize);
            
            // Drop flag if carrying
            if (redAgent.hasFlag) {
              redAgent.hasFlag = false;
              this.blueFlagHolder = null;
              this.blueFlag = { 
                x: this.gridSize - 3, 
                y: Math.floor(this.gridSize / 2) 
              };
            }
          }
        });
      }
    });
  }
  
  calculateRewards() {
    const rewards = {};
    
    // Calculate rewards for red team
    this.redTeam.forEach(agent => {
      let reward = 0;
      
      // Base reward for staying alive
      reward += 0.01;
      
      // Offensive rewards
      if (agent.hasFlag) {
        // Has enemy flag - significant reward
        reward += 1.0 * this.rewardWeights.offense;
        
        // Moving towards own base with flag - higher reward the closer to base
        if (agent.x < this.gridSize / 2) {
          // Distance-based reward (higher when closer to base)
          const baseDistance = agent.x;
          reward += (5.0 / (baseDistance + 1)) * this.rewardWeights.offense;
        }
      } else if (agent.x > this.gridSize / 2) {
        // In enemy territory, closer to enemy flag - reward based on proximity
        const distToFlag = Math.abs(agent.x - this.blueFlag.x) + Math.abs(agent.y - this.blueFlag.y);
        
        // Distance-based reward inversely proportional to distance
        reward += (10.0 / (distToFlag + 1)) * this.rewardWeights.offense * 0.5;
      }
      
      // Defensive rewards
      if (agent.x < this.gridSize / 2) { // In own territory
        // Reward for being close to own flag when opponents are near
        const distToFlag = Math.abs(agent.x - this.redFlag.x) + Math.abs(agent.y - this.redFlag.y);
        
        // Check if any enemy is in our territory and close to our flag
        const enemyNearFlag = this.blueTeam.some(enemy => 
          enemy.x < this.gridSize / 2 && 
          Math.abs(enemy.x - this.redFlag.x) + Math.abs(enemy.y - this.redFlag.y) < 5
        );
        
        if (enemyNearFlag && distToFlag < 5) {
          reward += (5.0 / (distToFlag + 1)) * this.rewardWeights.defense;
        }
        
        // Reward for being close to enemy with flag
        const blueWithFlag = this.blueTeam.find(b => b.hasFlag);
        if (blueWithFlag && blueWithFlag.x < this.gridSize / 2) {
          const distToEnemy = Math.abs(agent.x - blueWithFlag.x) + Math.abs(agent.y - blueWithFlag.y);
          reward += (10.0 / (distToEnemy + 1)) * this.rewardWeights.defense;
        }
      }
      
      // Cooperative rewards
      const numTeammatesNearby = this.countTeammatesNearby(agent, 3);
      if (numTeammatesNearby > 0) {
        // Small reward for team formation, higher when in enemy territory
        const teamworkMultiplier = agent.x > this.gridSize / 2 ? 2.0 : 1.0;
        reward += numTeammatesNearby * 0.1 * this.rewardWeights.cooperation * teamworkMultiplier;
      }
      
      // Penalty for staying in the same position too long (encourages exploration)
      if (agent.previousX === agent.x && agent.previousY === agent.y) {
        agent.stationaryCount = (agent.stationaryCount || 0) + 1;
        if (agent.stationaryCount > 3) {
          reward -= 0.1 * agent.stationaryCount; // Increasing penalty
        }
      } else {
        agent.stationaryCount = 0;
        // Save current position for next comparison
        agent.previousX = agent.x;
        agent.previousY = agent.y;
      }
      
      // Big rewards for scoring
      if (this.redScore > 0 && this.redFlagHolder === null) {
        const scoreIncreased = agent.lastKnownScore < this.redScore;
        if (scoreIncreased) {
          reward += 20.0; // Very large reward for capturing flag
          agent.lastKnownScore = this.redScore;
        }
      }
      
      rewards[agent.id] = reward;
    });
    
    // Calculate rewards for blue team (similar logic but reversed)
    this.blueTeam.forEach(agent => {
      let reward = 0;
      
      // Base reward for staying alive
      reward += 0.01;
      
      // Offensive rewards
      if (agent.hasFlag) {
        // Has enemy flag
        reward += 1.0 * this.rewardWeights.offense;
        
        // Moving towards own base with flag
        if (agent.x > this.gridSize / 2) {
          // Distance-based reward (higher when closer to base)
          const baseDistance = this.gridSize - agent.x;
          reward += (5.0 / (baseDistance + 1)) * this.rewardWeights.offense;
        }
      } else if (agent.x < this.gridSize / 2) {
        // In enemy territory, closer to enemy flag
        const distToFlag = Math.abs(agent.x - this.redFlag.x) + Math.abs(agent.y - this.redFlag.y);
        
        // Distance-based reward inversely proportional to distance
        reward += (10.0 / (distToFlag + 1)) * this.rewardWeights.offense * 0.5;
      }
      
      // Defensive rewards
      if (agent.x > this.gridSize / 2) { // In own territory
        // Reward for being close to own flag when opponents are near
        const distToFlag = Math.abs(agent.x - this.blueFlag.x) + Math.abs(agent.y - this.blueFlag.y);
        
        // Check if any enemy is in our territory and close to our flag
        const enemyNearFlag = this.redTeam.some(enemy => 
          enemy.x > this.gridSize / 2 && 
          Math.abs(enemy.x - this.blueFlag.x) + Math.abs(enemy.y - this.blueFlag.y) < 5
        );
        
        if (enemyNearFlag && distToFlag < 5) {
          reward += (5.0 / (distToFlag + 1)) * this.rewardWeights.defense;
        }
        
        // Reward for being close to enemy with flag
        const redWithFlag = this.redTeam.find(r => r.hasFlag);
        if (redWithFlag && redWithFlag.x > this.gridSize / 2) {
          const distToEnemy = Math.abs(agent.x - redWithFlag.x) + Math.abs(agent.y - redWithFlag.y);
          reward += (10.0 / (distToEnemy + 1)) * this.rewardWeights.defense;
        }
      }
      
      // Cooperative rewards
      const numTeammatesNearby = this.countTeammatesNearby(agent, 3);
      if (numTeammatesNearby > 0) {
        // Small reward for team formation, higher when in enemy territory
        const teamworkMultiplier = agent.x < this.gridSize / 2 ? 2.0 : 1.0;
        reward += numTeammatesNearby * 0.1 * this.rewardWeights.cooperation * teamworkMultiplier;
      }
      
      // Penalty for staying in the same position too long (encourages exploration)
      if (agent.previousX === agent.x && agent.previousY === agent.y) {
        agent.stationaryCount = (agent.stationaryCount || 0) + 1;
        if (agent.stationaryCount > 3) {
          reward -= 0.1 * agent.stationaryCount; // Increasing penalty
        }
      } else {
        agent.stationaryCount = 0;
        // Save current position for next comparison
        agent.previousX = agent.x;
        agent.previousY = agent.y;
      }
      
      // Big rewards for scoring
      if (this.blueScore > 0 && this.blueFlagHolder === null) {
        const scoreIncreased = agent.lastKnownScore < this.blueScore;
        if (scoreIncreased) {
          reward += 20.0; // Very large reward for capturing flag
          agent.lastKnownScore = this.blueScore;
        }
      }
      
      rewards[agent.id] = reward;
    });
    
    return rewards;
  }
  
  countTeammatesNearby(agent, radius) {
    let count = 0;
    const team = agent.id.startsWith('red') ? this.redTeam : this.blueTeam;
    
    team.forEach(teammate => {
      if (teammate.id !== agent.id) {
        const dist = Math.abs(agent.x - teammate.x) + Math.abs(agent.y - teammate.y);
        if (dist <= radius) {
          count++;
        }
      }
    });
    
    return count;
  }
  
  getStateForAgent(agent) {
    // Create a local observation grid centered around the agent
    // with information about walls, flags, and other agents
    const team = agent.id.startsWith('red') ? 'red' : 'blue';
    const enemies = team === 'red' ? this.blueTeam : this.redTeam;
    const teammates = team === 'red' ? this.redTeam : this.blueTeam;
    const ownFlag = team === 'red' ? this.redFlag : this.blueFlag;
    const enemyFlag = team === 'red' ? this.blueFlag : this.redFlag;
    
    // Create a flattened state representation
    // 11x11 grid centered on agent with different channels for different entities
    const state = Array(121).fill(0);
    
    // Helper function to get index in flattened array
    const getIndex = (x, y) => {
      // Convert to relative coordinates (agent at center 5,5)
      const relX = x - agent.x + 5;
      const relY = y - agent.y + 5;
      
      // Check bounds
      if (relX < 0 || relX > 10 || relY < 0 || relY > 10) {
        return -1;
      }
      
      return relY * 11 + relX;
    };
    
    // Mark walls
    this.walls.forEach(wall => {
      const idx = getIndex(wall.x, wall.y);
      if (idx >= 0) state[idx] = 1;
    });
    
    // Mark own flag
    const ownFlagIdx = getIndex(ownFlag.x, ownFlag.y);
    if (ownFlagIdx >= 0) state[ownFlagIdx] = 2;
    
    // Mark enemy flag
    const enemyFlagIdx = getIndex(enemyFlag.x, enemyFlag.y);
    if (enemyFlagIdx >= 0) state[enemyFlagIdx] = 3;
    
    // Mark teammates
    teammates.forEach(teammate => {
      if (teammate.id !== agent.id) {
        const idx = getIndex(teammate.x, teammate.y);
        if (idx >= 0) state[idx] = 4;
      }
    });
    
    // Mark enemies
    enemies.forEach(enemy => {
      const idx = getIndex(enemy.x, enemy.y);
      if (idx >= 0) state[idx] = 5;
    });
    
    // Add special state for carrying flag
    if (agent.hasFlag) {
      state.push(1);
    } else {
      state.push(0);
    }
    
    // Add x position relative to center to help with territory awareness
    const relativePosX = (agent.x / this.gridSize) * 2 - 1; // -1 to 1
    state.push(relativePosX);
    
    return state;
  }
  
  updateHeatmap() {
    // Update position history for heatmap generation
    const redPositions = this.redTeam.map(agent => ({ x: agent.x, y: agent.y }));
    const bluePositions = this.blueTeam.map(agent => ({ x: agent.x, y: agent.y }));
    
    this.positionHistory.red.push(redPositions);
    this.positionHistory.blue.push(bluePositions);
    
    // Limit history size
    if (this.positionHistory.red.length > this.historyLimit) {
      this.positionHistory.red.shift();
      this.positionHistory.blue.shift();
    }
    
    // Update heatmaps
    this.updateTeamHeatmap('red');
    this.updateTeamHeatmap('blue');
  }
  
  updateTeamHeatmap(team) {
    // Reset heatmap
    this.heatmap[team] = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
    
    // Calculate intensity based on position history
    this.positionHistory[team].forEach(positions => {
      positions.forEach(pos => {
        if (pos.x >= 0 && pos.x < this.gridSize && pos.y >= 0 && pos.y < this.gridSize) {
          this.heatmap[team][pos.y][pos.x] += 1;
        }
      });
    });
    
    // Normalize heatmap values between 0 and 1
    const flatValues = this.heatmap[team].flat();
    const maxValue = Math.max(...flatValues);
    
    if (maxValue > 0) {
      for (let y = 0; y < this.gridSize; y++) {
        for (let x = 0; x < this.gridSize; x++) {
          this.heatmap[team][y][x] /= maxValue;
        }
      }
    }
  }
  
  getGameState() {
    return {
      redTeam: this.redTeam,
      blueTeam: this.blueTeam,
      redFlag: this.redFlag,
      blueFlag: this.blueFlag,
      redFlagHolder: this.redFlagHolder,
      blueFlagHolder: this.blueFlagHolder,
      walls: this.walls,
      redScore: this.redScore,
      blueScore: this.blueScore,
      episode: this.episode,
      heatmap: this.heatmap
    };
  }
  
  setTeamSize(size) {
    this.teamSize = size;
    this.reset();
  }
} 