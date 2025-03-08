import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import GameCanvas from '../components/GameCanvas';
import ControlPanel from '../components/ControlPanel';
import StatsPanel from '../components/StatsPanel';
import { GameController } from '../lib/gameController';

export default function Home() {
  const [gameConfig, setGameConfig] = useState({
    teamSize: 3,
    learningRate: 0.001,
    discountFactor: 0.95,
    explorationRate: 0.2,
    rewardWeights: {
      offense: 1.0,
      defense: 1.0,
      cooperation: 1.0
    }
  });
  
  const [gameState, setGameState] = useState({
    isRunning: false,
    isTraining: false,
    redScore: 0,
    blueScore: 0,
    currentEpisode: 0,
    reset: false
  });
  
  const [gameController, setGameController] = useState(null);
  const gameLoopRef = useRef(null);
  
  // Initialize game controller
  useEffect(() => {
    const controller = new GameController(
      20,
      gameConfig.teamSize,
      gameConfig.rewardWeights
    );
    
    setGameController(controller);
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, []);
  
  // Update game state from controller
  useEffect(() => {
    if (!gameController || !gameState.isRunning) return;
    
    // Set up interval to fetch game state
    gameLoopRef.current = setInterval(() => {
      const controllerState = gameController.getGameState();
      
      setGameState(prevState => ({
        ...prevState,
        redScore: controllerState.redScore,
        blueScore: controllerState.blueScore,
        currentEpisode: controllerState.episode,
        isTraining: controllerState.isTraining
      }));
    }, 500);
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameController, gameState.isRunning]);

  const handleConfigChange = useCallback((newConfig) => {
    setGameConfig(prevConfig => {
      const updatedConfig = {...prevConfig, ...newConfig};
      
      // Update game controller with new config if it exists
      if (gameController) {
        gameController.updateParameters(updatedConfig);
      }
      
      return updatedConfig;
    });
  }, [gameController]);

  const handleGameControl = useCallback((action) => {
    switch(action) {
      case 'start':
        setGameState(prevState => ({...prevState, isRunning: true}));
        break;
      case 'pause':
        setGameState(prevState => ({...prevState, isRunning: false}));
        break;
      case 'reset':
        if (gameController) {
          gameController.reset();
        }
        setGameState({
          isRunning: false,
          isTraining: false,
          redScore: 0,
          blueScore: 0,
          currentEpisode: 0,
          reset: true
        });
        // Reset the reset flag after a short delay
        setTimeout(() => {
          setGameState(prev => ({...prev, reset: false}));
        }, 100);
        break;
      case 'train':
        setGameState(prevState => {
          const newState = {
            ...prevState, 
            isTraining: true,
            isRunning: true
          };
          return newState;
        });
        break;
      case 'stopTraining':
        if (gameController) {
          gameController.stopTraining();
        }
        setGameState(prevState => ({
          ...prevState,
          isTraining: false
        }));
        break;
      default:
        break;
    }
  }, [gameController]);

  // Handle score updates from the game canvas
  const updateScore = useCallback((team, value) => {
    setGameState(prevState => {
      const key = team === 'red' ? 'redScore' : 'blueScore';
      console.log(`Updating ${team} score by ${value}, new score: ${prevState[key] + value}`);
      return {
        ...prevState,
        [key]: prevState[key] + value
      };
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>RL Capture the Flag</title>
        <meta name="description" content="Interactive Multi-Agent Reinforcement Learning Simulation" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold text-center mb-8">
          Capture-the-Flag: Multi-Agent Reinforcement Learning
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GameCanvas 
              gameConfig={gameConfig} 
              gameState={gameState}
              updateScore={updateScore}
              gameController={gameController}
            />
          </div>
          
          <div className="space-y-6">
            <ControlPanel 
              gameConfig={gameConfig} 
              onConfigChange={handleConfigChange}
              onGameControl={handleGameControl}
              gameState={gameState}
              gameController={gameController}
            />
            
            <StatsPanel 
              gameState={gameState} 
              gameConfig={gameConfig}
              gameController={gameController}
            />
          </div>
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-bold mb-4">About This Simulation</h2>
          <p className="mb-4">
            This application demonstrates multi-agent reinforcement learning in a classic Capture-the-Flag scenario. 
            Agents learn to navigate the environment, capture enemy flags, and develop team strategies through 
            deep Q-learning.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Game Rules</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Each team has a flag in their territory</li>
                <li>Agents try to capture the enemy flag and return it to their base</li>
                <li>Agents can tag enemies in their own territory to send them back to their base</li>
                <li>The team with more flag captures wins</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Reinforcement Learning</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Agents use Deep Q-Networks (DQN) for decision making</li>
                <li>Experience replay improves learning stability</li>
                <li>Exploration vs. exploitation is controlled by Epsilon</li>
                <li>Reward weights shape agent behavior toward offensive or defensive strategies</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="container mx-auto py-6 text-center text-gray-500">
        <p>Developed using TensorFlow.js and React</p>
      </footer>
    </div>
  );
} 