import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import GameCanvas from '../components/GameCanvas';
import ControlPanel from '../components/ControlPanel';
import StatsPanel from '../components/StatsPanel';

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
    currentEpisode: 0
  });

  const handleConfigChange = useCallback((newConfig) => {
    setGameConfig(prevConfig => ({...prevConfig, ...newConfig}));
  }, []);

  const handleGameControl = useCallback((action) => {
    switch(action) {
      case 'start':
        setGameState(prevState => ({...prevState, isRunning: true}));
        break;
      case 'pause':
        setGameState(prevState => ({...prevState, isRunning: false}));
        break;
      case 'reset':
        setGameState({
          isRunning: false,
          isTraining: false,
          redScore: 0,
          blueScore: 0,
          currentEpisode: 0
        });
        break;
      case 'train':
        setGameState(prevState => ({...prevState, isTraining: !prevState.isTraining}));
        break;
      default:
        break;
    }
  }, []);

  // Allow updating scores from child components
  const updateScore = useCallback((team, value) => {
    setGameState(prevState => {
      const key = team === 'red' ? 'redScore' : 'blueScore';
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
            />
          </div>
          
          <div className="space-y-6">
            <ControlPanel 
              gameConfig={gameConfig} 
              onConfigChange={handleConfigChange}
              onGameControl={handleGameControl}
              gameState={gameState}
            />
            
            <StatsPanel gameState={gameState} />
          </div>
        </div>
      </main>

      <footer className="container mx-auto py-6 text-center text-gray-500">
        <p>Developed using TensorFlow.js and React</p>
      </footer>
    </div>
  );
} 