import { useRef, useEffect, useState } from 'react';

const StatsPanel = ({ gameState, gameController }) => {
  const [stats, setStats] = useState({
    redReward: 0,
    blueReward: 0,
    episodes: 0,
    redWinRate: 0,
    blueWinRate: 0,
    history: {
      redRewards: Array(10).fill(0),
      blueRewards: Array(10).fill(0),
      episodes: Array(10).fill(0)
    }
  });
  
  const canvasRef = useRef(null);
  
  // Update stats when game controller updates
  useEffect(() => {
    if (!gameController) return;
    
    const interval = setInterval(() => {
      const performanceMetrics = gameController.getPerformanceMetrics();
      const agentStats = gameController.getAgentStats();
      
      // Calculate team rewards
      let redTotalReward = 0;
      let blueTotalReward = 0;
      
      Object.keys(agentStats).forEach(id => {
        if (id.startsWith('red')) {
          redTotalReward += agentStats[id].totalReward;
        } else {
          blueTotalReward += agentStats[id].totalReward;
        }
      });
      
      // Extract history
      const episodeRewards = performanceMetrics.episodeRewards.slice(-10);
      const redRewards = episodeRewards.map(ep => ep.red);
      const blueRewards = episodeRewards.map(ep => ep.blue);
      
      setStats({
        redReward: redTotalReward,
        blueReward: blueTotalReward,
        episodes: performanceMetrics.totalEpisodes,
        redWinRate: performanceMetrics.redWinRate,
        blueWinRate: performanceMetrics.blueWinRate,
        history: {
          redRewards,
          blueRewards,
          episodes: performanceMetrics.episodeSteps.slice(-10)
        }
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameController]);
  
  // Update when game state changes
  useEffect(() => {
    if (!gameController) {
      // Fallback to simulated data when no controller is available
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
            redWinRate: gameState.redScore > gameState.blueScore ? 0.6 : 0.4,
            blueWinRate: gameState.blueScore > gameState.redScore ? 0.6 : 0.4,
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
  }, [gameState.isRunning, gameState.isTraining, gameState.redScore, gameState.blueScore, gameController]);
  
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
      const x = (index / (stats.history.redRewards.length - 1 || 1)) * width;
      const y = height - (value / maxValue) * height;
      
      if (index === 0 || isNaN(y)) {
        ctx.moveTo(x, height - 1);
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
      const x = (index / (stats.history.blueRewards.length - 1 || 1)) * width;
      const y = height - (value / maxValue) * height;
      
      if (index === 0 || isNaN(y)) {
        ctx.moveTo(x, height - 1);
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
  
  // Format numbers for display
  const formatNumber = (num) => {
    return Number(num).toFixed(1);
  };
  
  // Calculate the reward difference
  const getRewardDifference = (red, blue) => {
    const diff = red - blue;
    return (
      <span className={`font-mono ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
        {diff > 0 ? '+' : ''}{formatNumber(diff)}
      </span>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-xl font-bold mb-4">Statistics</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <h3 className="font-semibold text-red-600">Red Team</h3>
          <p className="text-2xl">{formatNumber(stats.redReward)}</p>
          <p className="text-xs text-gray-600">Cumulative Reward</p>
        </div>
        
        <div className="text-center">
          <h3 className="font-semibold">Difference</h3>
          <p className="text-2xl">
            {getRewardDifference(stats.redReward, stats.blueReward)}
          </p>
          <p className="text-xs text-gray-600">Red vs Blue</p>
        </div>
        
        <div className="text-center">
          <h3 className="font-semibold text-blue-600">Blue Team</h3>
          <p className="text-2xl">{formatNumber(stats.blueReward)}</p>
          <p className="text-xs text-gray-600">Cumulative Reward</p>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Training Progress</h3>
        <div className="flex justify-between">
          <p>Episodes: <span className="font-mono">{stats.episodes}</span></p>
          <p>Score: <span className="font-mono">{gameState.redScore} - {gameState.blueScore}</span></p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="text-sm">
            <span className="text-red-600 font-semibold">Red Win Rate:</span>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-red-600 h-2.5 rounded-full" 
                style={{ width: `${stats.redWinRate * 100}%` }}></div>
            </div>
            <span className="text-xs float-right">{formatNumber(stats.redWinRate * 100)}%</span>
          </div>
          <div className="text-sm">
            <span className="text-blue-600 font-semibold">Blue Win Rate:</span>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${stats.blueWinRate * 100}%` }}></div>
            </div>
            <span className="text-xs float-right">{formatNumber(stats.blueWinRate * 100)}%</span>
          </div>
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
        <h3 className="font-semibold mb-2">Learning Status</h3>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span>Training Mode:</span>
            <span className={`font-medium ${gameState.isTraining ? 'text-green-600' : 'text-gray-600'}`}>
              {gameState.isTraining ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Learning Rate:</span>
            <span className="font-mono">{gameConfig?.learningRate.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span>Exploration Rate:</span>
            <span className="font-mono">{gameConfig?.explorationRate.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Agent Strategy:</span>
            <span className="font-medium">
              {gameState.isTraining ? 'Learning' : 'Exploiting'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel; 