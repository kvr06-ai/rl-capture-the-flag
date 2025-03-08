import { useRef, useEffect, useState } from 'react';

const StatsPanel = ({ gameState }) => {
  const [stats, setStats] = useState({
    redReward: 0,
    blueReward: 0,
    episodes: 0,
    history: {
      redRewards: Array(10).fill(0),
      blueRewards: Array(10).fill(0),
      episodes: Array(10).fill(0)
    }
  });
  
  const canvasRef = useRef(null);
  
  // Update stats when game state changes
  useEffect(() => {
    // In a real application, we would track the actual rewards from the RL agents
    // For the demo, we'll use simulated data
    if (gameState.isRunning || gameState.isTraining) {
      const interval = setInterval(() => {
        setStats(prevStats => {
          // Simulate accumulated rewards
          const redRewardDelta = Math.random() * 2 - 0.5 + gameState.redScore * 10;
          const blueRewardDelta = Math.random() * 2 - 0.5 + gameState.blueScore * 10;
          
          // Update history
          const newRedRewards = [...prevStats.history.redRewards.slice(1), prevStats.redReward + redRewardDelta];
          const newBlueRewards = [...prevStats.history.blueRewards.slice(1), prevStats.blueReward + blueRewardDelta];
          const newEpisodes = [...prevStats.history.episodes.slice(1), prevStats.episodes + 1];
          
          return {
            redReward: prevStats.redReward + redRewardDelta,
            blueReward: prevStats.blueReward + blueRewardDelta,
            episodes: prevStats.episodes + 1,
            history: {
              redRewards: newRedRewards,
              blueRewards: newBlueRewards,
              episodes: newEpisodes
            }
          };
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [gameState.isRunning, gameState.isTraining, gameState.redScore, gameState.blueScore]);
  
  // Draw reward history chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= width; x += width / 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += height / 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Find max value for scaling
    const allValues = [...stats.history.redRewards, ...stats.history.blueRewards];
    const maxValue = Math.max(...allValues, 1);
    
    // Draw red team rewards
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    stats.history.redRewards.forEach((value, index) => {
      const x = (index / (stats.history.redRewards.length - 1)) * width;
      const y = height - (value / maxValue) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw blue team rewards
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    stats.history.blueRewards.forEach((value, index) => {
      const x = (index / (stats.history.blueRewards.length - 1)) * width;
      const y = height - (value / maxValue) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Add legend
    ctx.fillStyle = 'black';
    ctx.font = '10px Arial';
    ctx.fillText('Cumulative Rewards', 10, 15);
    
    ctx.fillStyle = 'red';
    ctx.fillRect(width - 70, 10, 10, 10);
    ctx.fillStyle = 'black';
    ctx.fillText('Red Team', width - 55, 18);
    
    ctx.fillStyle = 'blue';
    ctx.fillRect(width - 70, 25, 10, 10);
    ctx.fillStyle = 'black';
    ctx.fillText('Blue Team', width - 55, 33);
    
  }, [stats]);
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-xl font-bold mb-4">Statistics</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <h3 className="font-semibold text-red-600">Red Team</h3>
          <p className="text-2xl">{Math.round(stats.redReward)}</p>
          <p className="text-xs text-gray-600">Cumulative Reward</p>
        </div>
        
        <div className="text-center">
          <h3 className="font-semibold text-blue-600">Blue Team</h3>
          <p className="text-2xl">{Math.round(stats.blueReward)}</p>
          <p className="text-xs text-gray-600">Cumulative Reward</p>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Training Progress</h3>
        <div className="flex justify-between">
          <p>Episodes: {stats.episodes}</p>
          <p>Score: {gameState.redScore} - {gameState.blueScore}</p>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Reward History</h3>
        <canvas 
          ref={canvasRef}
          width={300}
          height={150}
          className="w-full border border-gray-200 rounded"
        />
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Agent Strategies</h3>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span>Offensive Agents:</span>
            <span className="font-medium">{Math.round(gameState.redScore > gameState.blueScore ? 2 : 1)}</span>
          </div>
          <div className="flex justify-between">
            <span>Defensive Agents:</span>
            <span className="font-medium">{Math.round(gameState.redScore > gameState.blueScore ? 1 : 2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Coordination Level:</span>
            <span className="font-medium">
              {gameState.isTraining ? 'Improving' : 'Baseline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel; 