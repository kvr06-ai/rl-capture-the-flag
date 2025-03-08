import { useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

const GRID_SIZE = 20;
const CELL_SIZE = 25;
const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;

const GameCanvas = ({ gameConfig, gameState, updateScore }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Game state
  const gameDataRef = useRef({
    grid: Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)),
    redTeam: [],
    blueTeam: [],
    redFlag: { x: 2, y: Math.floor(GRID_SIZE / 2) },
    blueFlag: { x: GRID_SIZE - 3, y: Math.floor(GRID_SIZE / 2) },
    walls: [],
    redFlagHolder: null,
    blueFlagHolder: null
  });

  // Initialize game
  useEffect(() => {
    if (!canvasRef.current) return;
    
    initializeGame();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameConfig.teamSize]);

  // Main game loop
  useEffect(() => {
    if (!gameState.isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    const runGameLoop = () => {
      if (!canvasRef.current) return;
      
      // Update agent positions and states
      updateAgents();
      
      // Draw the game
      renderGame();
      
      // Continue the loop
      animationRef.current = requestAnimationFrame(runGameLoop);
    };
    
    // Start the game loop
    animationRef.current = requestAnimationFrame(runGameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.isRunning]);

  const initializeGame = () => {
    const gameData = gameDataRef.current;
    
    // Create walls (simple pattern for now)
    gameData.walls = [];
    for (let i = 6; i < GRID_SIZE - 6; i++) {
      if (i % 3 !== 0) { // Gap in walls
        gameData.walls.push({ x: Math.floor(GRID_SIZE / 2), y: i });
      }
    }
    
    // Initialize teams
    gameData.redTeam = [];
    gameData.blueTeam = [];
    
    for (let i = 0; i < gameConfig.teamSize; i++) {
      gameData.redTeam.push({
        id: `red-${i}`,
        x: 1,
        y: 3 + i * 3,
        hasFlag: false,
        agent: initializeAgent('red')
      });
      
      gameData.blueTeam.push({
        id: `blue-${i}`,
        x: GRID_SIZE - 2,
        y: 3 + i * 3,
        hasFlag: false,
        agent: initializeAgent('blue')
      });
    }
    
    renderGame();
  };

  const initializeAgent = (team) => {
    // In a real app, this would be a more complex model
    // For demo purposes, we'll create a simple model
    const model = tf.sequential();
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [GRID_SIZE * GRID_SIZE * 3] // Simplified state representation
    }));
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
    }));
    model.add(tf.layers.dense({
      units: 5, // Up, down, left, right, stay
      activation: 'linear'
    }));
    
    // Compile the model
    model.compile({
      optimizer: tf.train.adam(gameConfig.learningRate),
      loss: 'meanSquaredError'
    });
    
    return {
      model,
      memory: [],
      team
    };
  };

  const updateAgents = () => {
    const gameData = gameDataRef.current;
    
    // Get current state
    const state = getGameState();
    
    // Update red team
    gameData.redTeam.forEach(agent => {
      const action = selectAction(agent, state);
      moveAgent(agent, action);
      checkFlagCapture(agent, 'red');
      checkTagging(agent, 'red');
    });
    
    // Update blue team
    gameData.blueTeam.forEach(agent => {
      const action = selectAction(agent, state);
      moveAgent(agent, action);
      checkFlagCapture(agent, 'blue');
      checkTagging(agent, 'blue');
    });
  };

  const getGameState = () => {
    // In a real implementation, this would create a proper state representation
    // For this demo, we'll return a simplified placeholder
    return {};
  };

  const selectAction = (agent, state) => {
    // Random action for demo purposes
    // In a real implementation, we would use the agent's neural network
    return Math.floor(Math.random() * 5);
  };

  const moveAgent = (agent, action) => {
    // 0: stay, 1: up, 2: right, 3: down, 4: left
    const dx = [0, 0, 1, 0, -1];
    const dy = [0, -1, 0, 1, 0];
    
    const newX = agent.x + dx[action];
    const newY = agent.y + dy[action];
    
    // Check if the move is valid (within bounds and not a wall)
    if (isValidMove(newX, newY)) {
      agent.x = newX;
      agent.y = newY;
    }
  };

  const isValidMove = (x, y) => {
    const gameData = gameDataRef.current;
    
    // Check boundaries
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
      return false;
    }
    
    // Check for walls
    for (const wall of gameData.walls) {
      if (wall.x === x && wall.y === y) {
        return false;
      }
    }
    
    return true;
  };

  const checkFlagCapture = (agent, team) => {
    const gameData = gameDataRef.current;
    
    if (team === 'red') {
      // Red team capturing blue flag
      const blueFlag = gameData.blueFlag;
      if (!agent.hasFlag && agent.x === blueFlag.x && agent.y === blueFlag.y && !gameData.blueFlagHolder) {
        agent.hasFlag = true;
        gameData.blueFlagHolder = agent.id;
      }
      
      // Red team returning with flag to base
      if (agent.hasFlag && agent.x <= 1) {
        agent.hasFlag = false;
        gameData.blueFlagHolder = null;
        // Update score using the prop
        if (updateScore) {
          updateScore('red', 1);
        }
      }
    } else {
      // Blue team capturing red flag
      const redFlag = gameData.redFlag;
      if (!agent.hasFlag && agent.x === redFlag.x && agent.y === redFlag.y && !gameData.redFlagHolder) {
        agent.hasFlag = true;
        gameData.redFlagHolder = agent.id;
      }
      
      // Blue team returning with flag to base
      if (agent.hasFlag && agent.x >= GRID_SIZE - 2) {
        agent.hasFlag = false;
        gameData.redFlagHolder = null;
        // Update score using the prop
        if (updateScore) {
          updateScore('blue', 1);
        }
      }
    }
  };

  const checkTagging = (agent, team) => {
    const gameData = gameDataRef.current;
    
    if (team === 'red') {
      // Red team tagging blue team in red territory
      if (agent.x <= GRID_SIZE / 2) {
        gameData.blueTeam.forEach(blueAgent => {
          if (blueAgent.x <= GRID_SIZE / 2 && agent.x === blueAgent.x && agent.y === blueAgent.y) {
            // Reset blue agent position
            blueAgent.x = GRID_SIZE - 2;
            blueAgent.y = Math.floor(Math.random() * GRID_SIZE);
            
            // Drop flag if carrying
            if (blueAgent.hasFlag) {
              blueAgent.hasFlag = false;
              gameData.redFlagHolder = null;
              gameData.redFlag = { x: 2, y: Math.floor(GRID_SIZE / 2) };
            }
          }
        });
      }
    } else {
      // Blue team tagging red team in blue territory
      if (agent.x >= GRID_SIZE / 2) {
        gameData.redTeam.forEach(redAgent => {
          if (redAgent.x >= GRID_SIZE / 2 && agent.x === redAgent.x && agent.y === redAgent.y) {
            // Reset red agent position
            redAgent.x = 1;
            redAgent.y = Math.floor(Math.random() * GRID_SIZE);
            
            // Drop flag if carrying
            if (redAgent.hasFlag) {
              redAgent.hasFlag = false;
              gameData.blueFlagHolder = null;
              gameData.blueFlag = { x: GRID_SIZE - 3, y: Math.floor(GRID_SIZE / 2) };
            }
          }
        });
      }
    }
  };

  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const gameData = gameDataRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#ddd';
    for (let x = 0; x <= CANVAS_WIDTH; x += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    
    // Draw territory divider
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.lineWidth = 1;
    
    // Draw walls
    ctx.fillStyle = '#555';
    gameData.walls.forEach(wall => {
      ctx.fillRect(wall.x * CELL_SIZE, wall.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    
    // Draw flags
    const redFlag = gameData.redFlag;
    const blueFlag = gameData.blueFlag;
    
    if (!gameData.redFlagHolder) {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.moveTo(redFlag.x * CELL_SIZE, redFlag.y * CELL_SIZE);
      ctx.lineTo(redFlag.x * CELL_SIZE + CELL_SIZE, redFlag.y * CELL_SIZE + CELL_SIZE / 2);
      ctx.lineTo(redFlag.x * CELL_SIZE, redFlag.y * CELL_SIZE + CELL_SIZE);
      ctx.fill();
    }
    
    if (!gameData.blueFlagHolder) {
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.moveTo(blueFlag.x * CELL_SIZE + CELL_SIZE, blueFlag.y * CELL_SIZE);
      ctx.lineTo(blueFlag.x * CELL_SIZE, blueFlag.y * CELL_SIZE + CELL_SIZE / 2);
      ctx.lineTo(blueFlag.x * CELL_SIZE + CELL_SIZE, blueFlag.y * CELL_SIZE + CELL_SIZE);
      ctx.fill();
    }
    
    // Draw agents
    gameData.redTeam.forEach(agent => {
      ctx.fillStyle = 'darkred';
      ctx.beginPath();
      ctx.arc(
        agent.x * CELL_SIZE + CELL_SIZE / 2,
        agent.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Draw flag if carrying
      if (agent.hasFlag) {
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.moveTo((agent.x + 0.3) * CELL_SIZE, (agent.y - 0.3) * CELL_SIZE);
        ctx.lineTo((agent.x - 0.1) * CELL_SIZE, (agent.y - 0.1) * CELL_SIZE);
        ctx.lineTo((agent.x + 0.3) * CELL_SIZE, (agent.y + 0.1) * CELL_SIZE);
        ctx.fill();
      }
    });
    
    gameData.blueTeam.forEach(agent => {
      ctx.fillStyle = 'darkblue';
      ctx.beginPath();
      ctx.arc(
        agent.x * CELL_SIZE + CELL_SIZE / 2,
        agent.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Draw flag if carrying
      if (agent.hasFlag) {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.moveTo((agent.x - 0.3) * CELL_SIZE, (agent.y - 0.3) * CELL_SIZE);
        ctx.lineTo((agent.x + 0.1) * CELL_SIZE, (agent.y - 0.1) * CELL_SIZE);
        ctx.lineTo((agent.x - 0.3) * CELL_SIZE, (agent.y + 0.1) * CELL_SIZE);
        ctx.fill();
      }
    });
  };

  // Initialize when the component mounts
  useEffect(() => {
    if (canvasRef.current) {
      renderGame();
    }
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="mb-4 flex justify-between">
        <div className="text-red-600 font-bold">Red Team: {gameState.redScore}</div>
        <div className="text-blue-600 font-bold">Blue Team: {gameState.blueScore}</div>
      </div>
      <div className="flex justify-center">
        <canvas 
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border border-gray-300"
        />
      </div>
    </div>
  );
};

export default GameCanvas; 