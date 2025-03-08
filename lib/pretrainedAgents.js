/**
 * Pre-trained agent strategies for Capture the Flag
 * 
 * This module provides expert-designed behaviors for agents, allowing them
 * to demonstrate effective strategies without requiring lengthy training.
 */

// Role-based behavior patterns that produce effective team strategies
const ROLES = {
  OFFENSE: 'offense',
  DEFENSE: 'defense',
  SUPPORT: 'support'
};

// Pre-defined team compositions for different strategies
const TEAM_STRATEGIES = {
  BALANCED: {
    roles: [ROLES.OFFENSE, ROLES.DEFENSE, ROLES.OFFENSE],
    description: 'Balanced team with both offensive and defensive capabilities'
  },
  AGGRESSIVE: {
    roles: [ROLES.OFFENSE, ROLES.OFFENSE, ROLES.SUPPORT],
    description: 'Highly aggressive team focused on flag capture'
  },
  DEFENSIVE: {
    roles: [ROLES.DEFENSE, ROLES.DEFENSE, ROLES.SUPPORT],
    description: 'Defense-oriented team that protects flag and waits for opportunities'
  }
};

/**
 * Creates a decision-making function based on agent role and team
 * @param {string} role - The agent's role (offense, defense, support)
 * @param {string} team - The agent's team ('red' or 'blue')
 * @returns {Function} Decision-making function that takes state and returns action
 */
const createRoleBasedBehavior = (role, team) => {
  // Base movement directions
  const RIGHT = 2;
  const LEFT = 4;
  const UP = 1;
  const DOWN = 3;
  const STAY = 0;
  
  // Direction vectors for team and role
  const toEnemyDirection = team === 'red' ? RIGHT : LEFT;
  const toHomeDirection = team === 'red' ? LEFT : RIGHT;
  
  // Default behavior pattern based on role
  switch (role) {
    case ROLES.OFFENSE:
      // Offensive agents prioritize getting enemy flag and returning it
      return (state, gameState) => {
        // Get key state information
        const hasFlag = state[state.length - 2] === 1;
        const relPosition = state[state.length - 1];
        const isInEnemyTerritory = (team === 'red' && relPosition > 0) || 
                                   (team === 'blue' && relPosition < 0);
        
        // If has flag, return to base
        if (hasFlag) {
          // With 80% probability, move toward home base
          if (Math.random() < 0.8) {
            return toHomeDirection;
          }
          // Occasionally move vertically to avoid obstacles or enemies
          return Math.random() < 0.5 ? UP : DOWN;
        }
        
        // If in own territory without flag, head to enemy territory
        if (!isInEnemyTerritory && !hasFlag) {
          // With 70% probability, move toward enemy territory
          if (Math.random() < 0.7) {
            return toEnemyDirection;
          }
          // Occasionally move vertically or pause to avoid predictability
          const actions = [UP, DOWN, STAY];
          return actions[Math.floor(Math.random() * actions.length)];
        }
        
        // In enemy territory without flag, search for flag
        // Implement a search pattern biased in the direction of the enemy flag
        const enemyFlagPresent = state.slice(0, 121).includes(3);
        
        if (enemyFlagPresent) {
          // Find direction to the flag by analyzing the grid
          const gridSize = 11; // 11x11 view centered on agent
          const center = 5; // Agent is at position (5,5)
          
          // Find enemy flag in the grid
          let flagY = -1, flagX = -1;
          for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
              const idx = y * gridSize + x;
              if (state[idx] === 3) { // 3 = enemy flag
                flagY = y;
                flagX = x;
                break;
              }
            }
            if (flagX !== -1) break;
          }
          
          // Move toward the flag
          if (flagX !== -1 && flagY !== -1) {
            // Decide which direction gets us closer to the flag
            if (Math.abs(flagX - center) > Math.abs(flagY - center)) {
              // X-axis difference is greater
              return flagX < center ? LEFT : RIGHT;
            } else {
              // Y-axis difference is greater or equal
              return flagY < center ? UP : DOWN;
            }
          }
        }
        
        // Default exploratory behavior when flag isn't visible
        const rand = Math.random();
        if (rand < 0.4) return toEnemyDirection; // Keep moving deeper
        if (rand < 0.6) return UP;
        if (rand < 0.8) return DOWN;
        return Math.random() < 0.7 ? toEnemyDirection : STAY;
      };
      
    case ROLES.DEFENSE:
      // Defensive agents protect their flag and intercept enemy carriers
      return (state, gameState) => {
        // Get team's flag and territory info
        const ownFlag = team === 'red' ? 2 : 3; // 2 = red flag, 3 = blue flag in state representation
        const isInHomeTerritory = (team === 'red' && state[state.length - 1] < 0) || 
                                 (team === 'blue' && state[state.length - 1] > 0);
        
        // First priority: Check if enemies are in our territory
        const enemiesPresent = state.slice(0, 121).includes(5); // 5 = enemy in state
        
        if (enemiesPresent) {
          // Find closest enemy in the grid
          const gridSize = 11;
          const center = 5;
          let closestEnemyX = -1, closestEnemyY = -1;
          let minDistance = 999;
          
          for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
              const idx = y * gridSize + x;
              if (state[idx] === 5) { // 5 = enemy
                const distance = Math.abs(x - center) + Math.abs(y - center);
                if (distance < minDistance) {
                  minDistance = distance;
                  closestEnemyX = x;
                  closestEnemyY = y;
                }
              }
            }
          }
          
          // Move toward the closest enemy to intercept
          if (closestEnemyX !== -1 && closestEnemyY !== -1) {
            if (Math.abs(closestEnemyX - center) > Math.abs(closestEnemyY - center)) {
              return closestEnemyX < center ? LEFT : RIGHT;
            } else {
              return closestEnemyY < center ? UP : DOWN;
            }
          }
        }
        
        // Second priority: Stay close to own flag if it's still there
        const ownFlagPresent = state.slice(0, 121).includes(ownFlag);
        
        if (ownFlagPresent) {
          // Find direction to own flag
          const gridSize = 11;
          const center = 5;
          
          let flagX = -1, flagY = -1;
          for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
              const idx = y * gridSize + x;
              if (state[idx] === ownFlag) {
                flagY = y;
                flagX = x;
                break;
              }
            }
            if (flagX !== -1) break;
          }
          
          // Move to patrol around flag
          if (flagX !== -1 && flagY !== -1) {
            const distance = Math.abs(flagX - center) + Math.abs(flagY - center);
            
            // If close enough to flag, patrol around it
            if (distance <= 2) {
              // Patrol pattern around flag
              return [UP, RIGHT, DOWN, LEFT][Math.floor(Math.random() * 4)];
            }
            
            // Otherwise, move closer to flag
            if (Math.abs(flagX - center) > Math.abs(flagY - center)) {
              return flagX < center ? LEFT : RIGHT;
            } else {
              return flagY < center ? UP : DOWN;
            }
          }
        }
        
        // If flag is gone, move toward enemy territory to find carrier
        if (!ownFlagPresent && !isInHomeTerritory) {
          return toHomeDirection;
        } else if (!ownFlagPresent) {
          return toEnemyDirection;
        }
        
        // Default patrol behavior
        return [UP, RIGHT, DOWN, LEFT, STAY][Math.floor(Math.random() * 5)];
      };
      
    case ROLES.SUPPORT:
      // Support agents assist both offense and defense as needed
      return (state, gameState) => {
        // Get key state information
        const hasFlag = state[state.length - 2] === 1;
        const isInEnemyTerritory = (team === 'red' && state[state.length - 1] > 0) || 
                                   (team === 'blue' && state[state.length - 1] < 0);
        const ownFlagIsTaken = !state.slice(0, 121).includes(team === 'red' ? 2 : 3);
        
        // Support flag carrier if teammate has flag
        const teammateHasFlag = gameState && 
          ((team === 'red' && gameState.blueFlagHolder) ||
           (team === 'blue' && gameState.redFlagHolder));
        
        if (teammateHasFlag) {
          // Find teammate with flag and move to support
          // For simplicity, just head toward own territory
          return isInEnemyTerritory ? toHomeDirection : toEnemyDirection;
        }
        
        // If own flag is taken, prioritize defense
        if (ownFlagIsTaken) {
          if (!isInEnemyTerritory) {
            // With 70% probability, move toward enemy territory
            return Math.random() < 0.7 ? toEnemyDirection : [UP, DOWN][Math.floor(Math.random() * 2)];
          }
        }
        
        // If no current priority, help with offense
        if (!hasFlag && !isInEnemyTerritory) {
          return Math.random() < 0.7 ? toEnemyDirection : [UP, DOWN, STAY][Math.floor(Math.random() * 3)];
        }
        
        // If has flag, return to base
        if (hasFlag) {
          return Math.random() < 0.8 ? toHomeDirection : [UP, DOWN][Math.floor(Math.random() * 2)];
        }
        
        // Default behavior: mix of exploration and strategic movement
        const rand = Math.random();
        if (rand < 0.3) return isInEnemyTerritory ? toHomeDirection : toEnemyDirection;
        if (rand < 0.6) return [UP, DOWN][Math.floor(Math.random() * 2)];
        return [LEFT, RIGHT][Math.floor(Math.random() * 2)];
      };
  }
};

/**
 * Creates pre-trained agent behavior for a team
 * @param {string} team - 'red' or 'blue' team
 * @param {number} teamSize - Number of agents in the team
 * @param {string} strategy - Strategy name from TEAM_STRATEGIES
 * @returns {Array} Array of behavior functions for each agent
 */
const createTeamBehavior = (team, teamSize, strategy = 'BALANCED') => {
  // Get role assignments based on team strategy
  const teamStrategy = TEAM_STRATEGIES[strategy] || TEAM_STRATEGIES.BALANCED;
  let roles = teamStrategy.roles;
  
  // If team size doesn't match strategy size, adjust roles
  if (teamSize > roles.length) {
    // Add extra agents with balanced roles
    const extraRoles = Array(teamSize - roles.length).fill()
      .map((_, i) => {
        const options = Object.values(ROLES);
        return options[i % options.length];
      });
    roles = roles.concat(extraRoles);
  } else if (teamSize < roles.length) {
    // Use only the first N roles
    roles = roles.slice(0, teamSize);
  }
  
  // Create behavior functions for each agent
  return roles.map(role => createRoleBasedBehavior(role, team));
};

/**
 * Applies pre-trained behavior to make a decision
 * @param {string} agentId - Agent identifier (e.g., 'red-0')
 * @param {Array} state - Current state vector
 * @param {Object} gameState - Current game state
 * @param {Array} teamBehaviors - Team behavior functions
 * @returns {number} Action to take (0-4)
 */
const getPretrainedAction = (agentId, state, gameState, teamBehaviors) => {
  const parts = agentId.split('-');
  const team = parts[0];
  const index = parseInt(parts[1]);
  
  if (!teamBehaviors || !teamBehaviors[team] || !teamBehaviors[team][index]) {
    // Fallback to random action if behavior not found
    return Math.floor(Math.random() * 5);
  }
  
  // Get the behavior function for this specific agent
  const behaviorFn = teamBehaviors[team][index];
  return behaviorFn(state, gameState);
};

export {
  ROLES,
  TEAM_STRATEGIES,
  createTeamBehavior,
  getPretrainedAction
}; 