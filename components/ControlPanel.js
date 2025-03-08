import { useState } from 'react';

const ControlPanel = ({ gameConfig, onConfigChange, onGameControl, gameState }) => {
  const [localConfig, setLocalConfig] = useState({...gameConfig});
  
  const handleInputChange = (key, value, type = 'direct') => {
    let newValue = value;
    
    // Parse numeric values
    if (type === 'number') {
      newValue = parseFloat(value);
    } else if (type === 'reward') {
      newValue = {
        ...localConfig.rewardWeights,
        [key]: parseFloat(value)
      };
      key = 'rewardWeights';
    }
    
    // Update local state
    setLocalConfig({
      ...localConfig,
      [key]: newValue
    });
  };
  
  const applyChanges = () => {
    onConfigChange(localConfig);
  };
  
  const sliderProps = (min, max, step) => ({
    type: 'range',
    min,
    max,
    step,
    className: 'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
  });
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-xl font-bold mb-4">Control Panel</h2>
      
      {/* Game controls */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Game Controls</h3>
        <div className="flex space-x-2">
          {!gameState.isRunning ? (
            <button
              onClick={() => onGameControl('start')}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Start
            </button>
          ) : (
            <button
              onClick={() => onGameControl('pause')}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              Pause
            </button>
          )}
          <button
            onClick={() => onGameControl('reset')}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Reset
          </button>
          <button
            onClick={() => onGameControl('train')}
            className={`bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ${
              gameState.isTraining ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={gameState.isTraining}
          >
            {gameState.isTraining ? 'Training...' : 'Train Agents'}
          </button>
        </div>
      </div>
      
      {/* Team Configuration */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Team Size</h3>
        <div className="flex items-center space-x-2">
          <input
            {...sliderProps(1, 5, 1)}
            value={localConfig.teamSize}
            onChange={(e) => handleInputChange('teamSize', parseInt(e.target.value), 'number')}
          />
          <span className="w-8 text-center">{localConfig.teamSize}</span>
        </div>
      </div>
      
      {/* RL Parameters */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Reinforcement Learning Parameters</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Learning Rate (α): {localConfig.learningRate}
          </label>
          <div className="flex items-center space-x-2">
            <input
              {...sliderProps(0.0001, 0.01, 0.0001)}
              value={localConfig.learningRate}
              onChange={(e) => handleInputChange('learningRate', e.target.value, 'number')}
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Discount Factor (γ): {localConfig.discountFactor}
          </label>
          <div className="flex items-center space-x-2">
            <input
              {...sliderProps(0.5, 0.99, 0.01)}
              value={localConfig.discountFactor}
              onChange={(e) => handleInputChange('discountFactor', e.target.value, 'number')}
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Exploration Rate (ε): {localConfig.explorationRate}
          </label>
          <div className="flex items-center space-x-2">
            <input
              {...sliderProps(0.01, 1.0, 0.01)}
              value={localConfig.explorationRate}
              onChange={(e) => handleInputChange('explorationRate', e.target.value, 'number')}
            />
          </div>
        </div>
      </div>
      
      {/* Reward Weights */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Reward Weights</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Offense Reward: {localConfig.rewardWeights.offense}
          </label>
          <div className="flex items-center space-x-2">
            <input
              {...sliderProps(0, 2, 0.1)}
              value={localConfig.rewardWeights.offense}
              onChange={(e) => handleInputChange('offense', e.target.value, 'reward')}
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Defense Reward: {localConfig.rewardWeights.defense}
          </label>
          <div className="flex items-center space-x-2">
            <input
              {...sliderProps(0, 2, 0.1)}
              value={localConfig.rewardWeights.defense}
              onChange={(e) => handleInputChange('defense', e.target.value, 'reward')}
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Cooperation Reward: {localConfig.rewardWeights.cooperation}
          </label>
          <div className="flex items-center space-x-2">
            <input
              {...sliderProps(0, 2, 0.1)}
              value={localConfig.rewardWeights.cooperation}
              onChange={(e) => handleInputChange('cooperation', e.target.value, 'reward')}
            />
          </div>
        </div>
      </div>
      
      {/* Apply Changes Button */}
      <button
        onClick={applyChanges}
        className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600"
      >
        Apply Changes
      </button>
    </div>
  );
};

export default ControlPanel; 