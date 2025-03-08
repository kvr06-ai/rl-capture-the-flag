import { useRef, useEffect, useState } from 'react';
import { GameController } from '../lib/gameController';

const GRID_SIZE = 20;
const CELL_SIZE = 25;
const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;

const GameCanvas = ({ gameConfig, gameState, updateScore }) => {
  const canvasRef = useRef(null);
  const heatmapCanvasRef = useRef(null);
  const animationRef = useRef(null);
  const [gameController, setGameController] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('red');
  const [customMode, setCustomMode] = useState(null); // null, 'obstacle', 'flag'

  // Initialize game controller
  useEffect(() => {
    const controller = new GameController(
      GRID_SIZE,
      gameConfig.teamSize,
      gameConfig.rewardWeights
    );
    
    setGameController(controller);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Update controller when config changes
  useEffect(() => {
    if (!gameController) return;
    
    gameController.updateParameters({
      teamSize: gameConfig.teamSize,
      learningRate: gameConfig.learningRate,
      discountFactor: gameConfig.discountFactor,
      explorationRate: gameConfig.explorationRate,
      rewardWeights: gameConfig.rewardWeights
    });
    
  }, [gameController, gameConfig]);

  // Main game loop
  useEffect(() => {
    if (!gameState.isRunning || !gameController || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    const runGameLoop = () => {
      // Update game state
      const result = gameController.update();
      
      if (result) {
        // Update scores in parent component
        const state = gameController.getGameState();
        if (updateScore && state) {
          if (state.redScore > gameState.redScore) {
            updateScore('red', state.redScore - gameState.redScore);
          }
          if (state.blueScore > gameState.blueScore) {
            updateScore('blue', state.blueScore - gameState.blueScore);
          }
        }
      }
      
      // Render game
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
  }, [gameState.isRunning, gameController, gameState.redScore, gameState.blueScore]);

  // Training mode effect
  useEffect(() => {
    if (!gameController) return;
    
    if (gameState.isTraining) {
      gameController.startTraining();
    } else {
      gameController.stopTraining();
    }
  }, [gameController, gameState.isTraining]);

  // Reset game when requested
  useEffect(() => {
    if (!gameController) return;
    
    if (gameState.reset) {
      gameController.reset();
      renderGame();
    }
  }, [gameController, gameState.reset]);

  // Handle canvas click for customization
  const handleCanvasClick = (e) => {
    if (!customMode || !gameController || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    
    if (customMode === 'obstacle') {
      // Add or remove obstacle
      const wallExists = gameController.environment.walls.some(
        wall => wall.x === x && wall.y === y
      ) || gameController.customObstacles.some(
        wall => wall.x === x && wall.y === y
      );
      
      if (wallExists) {
        gameController.removeObstacle(x, y);
      } else {
        gameController.addObstacle(x, y);
      }
    } else if (customMode === 'flag') {
      // Update flag position
      gameController.updateFlagPosition(selectedTeam, x, y);
    }
    
    renderGame();
  };

  // Toggle heatmap visualization
  const toggleHeatmap = () => {
    setShowHeatmap(!showHeatmap);
  };

  // Toggle customization mode
  const toggleCustomMode = (mode) => {
    setCustomMode(customMode === mode ? null : mode);
  };

  // Render the game canvas
  const renderGame = () => {
    if (!gameController || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const gameState = gameController.getGameState();
    
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
    gameState.walls.forEach(wall => {
      ctx.fillRect(wall.x * CELL_SIZE, wall.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    
    // Draw flags
    const redFlag = gameState.redFlag;
    const blueFlag = gameState.blueFlag;
    
    if (!gameState.redFlagHolder) {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.moveTo(redFlag.x * CELL_SIZE, redFlag.y * CELL_SIZE);
      ctx.lineTo(redFlag.x * CELL_SIZE + CELL_SIZE, redFlag.y * CELL_SIZE + CELL_SIZE / 2);
      ctx.lineTo(redFlag.x * CELL_SIZE, redFlag.y * CELL_SIZE + CELL_SIZE);
      ctx.fill();
    }
    
    if (!gameState.blueFlagHolder) {
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.moveTo(blueFlag.x * CELL_SIZE + CELL_SIZE, blueFlag.y * CELL_SIZE);
      ctx.lineTo(blueFlag.x * CELL_SIZE, blueFlag.y * CELL_SIZE + CELL_SIZE / 2);
      ctx.lineTo(blueFlag.x * CELL_SIZE + CELL_SIZE, blueFlag.y * CELL_SIZE + CELL_SIZE);
      ctx.fill();
    }
    
    // Draw agents
    gameState.redTeam.forEach(agent => {
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
      
      // Display agent ID
      ctx.fillStyle = 'white';
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        agent.id.split('-')[1], 
        agent.x * CELL_SIZE + CELL_SIZE / 2, 
        agent.y * CELL_SIZE + CELL_SIZE / 2 + 3
      );
    });
    
    gameState.blueTeam.forEach(agent => {
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
      
      // Display agent ID
      ctx.fillStyle = 'white';
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        agent.id.split('-')[1], 
        agent.x * CELL_SIZE + CELL_SIZE / 2, 
        agent.y * CELL_SIZE + CELL_SIZE / 2 + 3
      );
    });
    
    // Render heatmap if enabled
    if (showHeatmap && heatmapCanvasRef.current) {
      renderHeatmap();
    }
  };

  // Render heatmap visualization
  const renderHeatmap = () => {
    if (!gameController || !heatmapCanvasRef.current) return;
    
    const canvas = heatmapCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const heatmapData = gameController.getHeatmapData();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw heatmap for selected team
    const teamData = heatmapData[selectedTeam];
    if (!teamData) return;
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const intensity = teamData[y][x];
        if (intensity > 0) {
          const alpha = Math.min(intensity * 0.8 + 0.2, 0.8);
          ctx.fillStyle = selectedTeam === 'red' 
            ? `rgba(255, 0, 0, ${alpha})` 
            : `rgba(0, 0, 255, ${alpha})`;
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  };

  // Initialize when the component mounts
  useEffect(() => {
    if (canvasRef.current && gameController) {
      renderGame();
    }
  }, [gameController]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="mb-4 flex justify-between items-center">
        <div className="text-red-600 font-bold">Red Team: {gameState.redScore}</div>
        <div className="flex space-x-2">
          <button 
            onClick={toggleHeatmap}
            className={`px-2 py-1 text-xs rounded ${showHeatmap ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
          >
            {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
          </button>
          {showHeatmap && (
            <select 
              value={selectedTeam} 
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="text-xs border rounded px-1"
            >
              <option value="red">Red Team</option>
              <option value="blue">Blue Team</option>
            </select>
          )}
        </div>
        <div className="text-blue-600 font-bold">Blue Team: {gameState.blueScore}</div>
      </div>
      
      <div className="mb-4 flex justify-center space-x-2">
        <button 
          onClick={() => toggleCustomMode('obstacle')}
          className={`px-2 py-1 text-xs rounded ${customMode === 'obstacle' ? 'bg-yellow-600 text-white' : 'bg-gray-200'}`}
        >
          {customMode === 'obstacle' ? 'Cancel' : 'Place Obstacles'}
        </button>
        <button 
          onClick={() => toggleCustomMode('flag')}
          className={`px-2 py-1 text-xs rounded ${customMode === 'flag' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          {customMode === 'flag' ? 'Cancel' : 'Move Flags'}
        </button>
        {customMode === 'flag' && (
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="text-xs border rounded px-1"
          >
            <option value="red">Red Flag</option>
            <option value="blue">Blue Flag</option>
          </select>
        )}
      </div>
      
      <div className="flex justify-center relative">
        <canvas 
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border border-gray-300"
          onClick={handleCanvasClick}
        />
        {showHeatmap && (
          <canvas 
            ref={heatmapCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="absolute top-0 left-0 pointer-events-none"
          />
        )}
      </div>
      
      {customMode && (
        <div className="mt-2 text-sm text-center text-gray-500">
          {customMode === 'obstacle' ? 
            'Click to add or remove obstacles' : 
            `Click to place the ${selectedTeam} flag`}
        </div>
      )}
    </div>
  );
};

export default GameCanvas; 