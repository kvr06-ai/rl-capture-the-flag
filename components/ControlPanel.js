import { useState, useEffect } from 'react';

const ControlPanel = ({ gameConfig, onConfigChange, onGameControl, gameState, gameController }) => {
  const [localConfig, setLocalConfig] = useState({...gameConfig});
  const [trainingEpisodes, setTrainingEpisodes] = useState(100);
  const [saveEnabled, setSaveEnabled] = useState(false);
  
  // Check if model saving is available
  useEffect(() => {
    if (gameController) {
      // Check if browser supports localStorage (for model saving)
      const hasLocalStorage = typeof window !== 'undefined' && window.localStorage;
      setSaveEnabled(hasLocalStorage);
    }
  }, [gameController]);
  
  // Update local config when props change
  useEffect(() => {
    setLocalConfig({...gameConfig});
  }, [gameConfig]);
  
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
  
  const handleStartTraining = () => {
    if (gameController) {
      gameController.maxEpisodes = trainingEpisodes;
    }
    onGameControl('train');
  };
  
  const sliderProps = (min, max, step) => ({
    type: 'range',
    min,
    max,
    step,
    className: 'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
  });
  
  const saveModels = async () => {
    if (gameController) {
      const success = await gameController.saveAgents();
      if (success) {
        alert('Models saved successfully!');
      } else {
        alert('Failed to save models.');
      }
    }
  };
  
  const loadModels = async () => {
    if (gameController) {
      const success = await gameController.loadAgents();
      if (success) {
        alert('Models loaded successfully!');
      } else {
        alert('No saved models found or loading failed.');
      }
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-xl font-bold mb-4">Control Panel</h2>
      
      {/* Game controls */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Game Controls</h3>
        <div className="grid grid-cols-2 gap-2">
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
            onClick={handleStartTraining}
            className={`bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ${
              gameState.isTraining ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={gameState.isTraining}
          >
            {gameState.isTraining ? 'Training...' : 'Train Agents'}
          </button>
          
          {gameState.isTraining && (
            <button
              onClick={() => onGameControl('stopTraining')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Stop Training
            </button>
          )}
        </div>
        
        {/* Training episodes input */}
        <div className="mt-2">
          <label className="block text-sm font-medium mb-1">
            Training Episodes:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="10"
              max="10000"
              step="10"
              value={trainingEpisodes}
              onChange={(e) => setTrainingEpisodes(parseInt(e.target.value) || 100)}
              className="border rounded px-2 py-1 w-24 text-sm"
            />
            
            {saveEnabled && (
              <div className="flex space-x-1 ml-auto">
                <button
                  onClick={saveModels}
                  className="bg-purple-500 text-white text-xs px-2 py-1 rounded hover:bg-purple-600"
                  disabled={!gameController}
                >
                  Save Models
                </button>
                <button
                  onClick={loadModels}
                  className="bg-indigo-500 text-white text-xs px-2 py-1 rounded hover:bg-indigo-600"
                  disabled={!gameController}
                >
                  Load Models
                </button>
              </div>
            )}
          </div>
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
            Learning Rate (α): {localConfig.learningRate.toFixed(4)}
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
            Discount Factor (γ): {localConfig.discountFactor.toFixed(2)}
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
            Exploration Rate (ε): {localConfig.explorationRate.toFixed(2)}
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
            Offense Reward: {localConfig.rewardWeights.offense.toFixed(1)}
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
            Defense Reward: {localConfig.rewardWeights.defense.toFixed(1)}
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
            Cooperation Reward: {localConfig.rewardWeights.cooperation.toFixed(1)}
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