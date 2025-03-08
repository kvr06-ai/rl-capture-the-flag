import * as tf from '@tensorflow/tfjs';

export class RLAgent {
  constructor(id, team, learningRate = 0.001, discountFactor = 0.95, explorationRate = 0.2) {
    this.id = id;
    this.team = team;
    this.learningRate = learningRate;
    this.discountFactor = discountFactor;
    this.explorationRate = explorationRate;
    this.memory = []; // Experience replay buffer
    this.memoryCapacity = 1000;
    this.batchSize = 32;
    this.trainingInterval = 4; // Train every 4 steps
    this.stepCount = 0;
    
    // Initialize models
    this.model = this.createModel();
    this.targetModel = this.createModel();
    this.updateTargetModel(); // Initial sync
    
    // Training statistics
    this.totalReward = 0;
    this.episodeReward = 0;
    this.successRate = 0;
    this.isTraining = false;
  }
  
  createModel() {
    const model = tf.sequential();
    // Input layer expects state representation
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [123] // 11x11 grid (121) + flag status (1) + position (1)
    }));
    
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dense({
      units: 5, // Up, down, left, right, stay
      activation: 'linear'
    }));
    
    model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'meanSquaredError'
    });
    
    return model;
  }
  
  updateTargetModel() {
    // Copy weights from main model to target model
    const weights = this.model.getWeights();
    this.targetModel.setWeights(weights);
  }
  
  selectAction(state, isTraining = false) {
    // Epsilon-greedy action selection with decay
    if (isTraining && Math.random() < this.explorationRate) {
      // Smarter exploration: Bias toward unexplored areas
      const possibleActions = [0, 1, 2, 3, 4]; // Stay, Up, Right, Down, Left
      
      // Get the agent's position from the state representation
      // The last element is the relative position indicator
      const relPosX = state[state.length - 1];
      
      // Bias actions based on position and exploration needs
      let actionWeights = [1, 1, 1, 1, 1]; // Default equal weights
      
      // Agent in own territory (left side for red, right side for blue)
      if ((this.team === 'red' && relPosX < 0) || 
          (this.team === 'blue' && relPosX > 0)) {
        // Bias toward enemy territory
        if (this.team === 'red') {
          actionWeights[2] = 3; // Right - toward enemy
        } else {
          actionWeights[4] = 3; // Left - toward enemy
        }
      } 
      // When carrying flag (second to last element in state)
      else if (state[state.length - 2] === 1) {
        // Bias toward own territory
        if (this.team === 'red') {
          actionWeights[4] = 3; // Left - toward home
        } else {
          actionWeights[2] = 3; // Right - toward home
        }
      }
      
      // Discourage staying in place to avoid getting stuck
      actionWeights[0] = 0.2;
      
      // Choose action based on weights
      const totalWeight = actionWeights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalWeight;
      let cumulativeWeight = 0;
      
      for (let i = 0; i < possibleActions.length; i++) {
        cumulativeWeight += actionWeights[i];
        if (r <= cumulativeWeight) {
          return possibleActions[i];
        }
      }
      
      // Fallback to random action
      return Math.floor(Math.random() * 5);
      
    } else {
      // Exploit: choose best action from model
      return tf.tidy(() => {
        const stateTensor = tf.tensor2d([state]);
        const prediction = this.model.predict(stateTensor);
        
        // Get action with highest Q-value
        const action = prediction.argMax(1).dataSync()[0];
        
        // Apply small random chance of deviation even when exploiting
        // to avoid getting stuck in repeated patterns
        if (Math.random() < 0.05) {  // 5% chance of deviation
          const randomAction = Math.floor(Math.random() * 5);
          return randomAction;
        }
        
        return action;
      });
    }
  }
  
  remember(state, action, reward, nextState, done) {
    // Store experience in replay memory
    this.memory.push({
      state,
      action,
      reward,
      nextState,
      done
    });
    
    // Limit memory size
    if (this.memory.length > this.memoryCapacity) {
      this.memory.shift(); // Remove oldest memory
    }
    
    // Update statistics
    this.totalReward += reward;
    this.episodeReward += reward;
    
    if (done) {
      this.successRate = 0.95 * this.successRate + 0.05 * (reward > 0 ? 1 : 0);
      this.episodeReward = 0;
    }
  }
  
  replay() {
    // Perform experience replay if we have enough samples
    if (this.memory.length < this.batchSize) {
      return;
    }
    
    // Sample a batch from memory
    const batch = this.sampleBatch();
    
    // Extract tensors for training
    const states = tf.tensor2d(batch.map(exp => exp.state));
    const nextStates = tf.tensor2d(batch.map(exp => exp.nextState));
    
    // Compute Q values and targets
    tf.tidy(() => {
      // Get current Q values for all actions
      const qValues = this.model.predict(states);
      
      // Get max Q values for next states from target network
      const nextQValues = this.targetModel.predict(nextStates);
      const maxNextQValues = nextQValues.max(1);
      
      // Create target Q values by copying current Q values (to retain values for actions not taken)
      const targetQValues = qValues.clone();
      
      // Update only the Q values for the actions that were taken
      batch.forEach((experience, index) => {
        const { action, reward, done } = experience;
        
        // Calculate target Q value for the action that was taken:
        // Q(s,a) = r + gamma * max(Q(s',a')) * (1 - done)
        let targetValue = reward;
        if (!done) {
          const nextMaxQ = maxNextQValues.dataSync()[index];
          targetValue += this.discountFactor * nextMaxQ;
        }
        
        // Update the specific action's Q value in the target tensor
        const currentActionValues = targetQValues.slice([index, 0], [1, 5]);
        const values = currentActionValues.dataSync();
        values[action] = targetValue;
        
        // Update the entry in the target tensor
        const updatedValues = tf.tensor1d(values);
        tf.engine().startScope(); // Start scope to avoid memory leaks
        targetQValues.slice([index, 0], [1, 5]).dispose();
        updatedValues.as2D(1, 5).assignToTypedArray(
          targetQValues.bufferSync().slice([index, 0], [1, 5]).toTensor().dataSync()
        );
        tf.engine().endScope();
        updatedValues.dispose();
      });
      
      // Train the model
      this.model.fit(states, targetQValues, {
        batchSize: this.batchSize,
        epochs: 1,
        verbose: 0
      }).then(() => {
        // Cleanup tensors
        states.dispose();
        nextStates.dispose();
        targetQValues.dispose();
        
        // Update target model periodically
        this.stepCount++;
        if (this.stepCount % this.trainingInterval === 0) {
          this.updateTargetModel();
        }
      });
    });
  }
  
  sampleBatch() {
    // Randomly sample experiences from memory
    const batch = [];
    const sampleSize = Math.min(this.batchSize, this.memory.length);
    
    // Simple random sampling
    for (let i = 0; i < sampleSize; i++) {
      const index = Math.floor(Math.random() * this.memory.length);
      batch.push(this.memory[index]);
    }
    
    return batch;
  }
  
  updateParameters(learningRate, discountFactor, explorationRate) {
    this.learningRate = learningRate;
    this.discountFactor = discountFactor;
    this.explorationRate = explorationRate;
    
    // Update model optimizer
    const optimizer = tf.train.adam(this.learningRate);
    this.model.compile({
      optimizer,
      loss: 'meanSquaredError'
    });
  }
  
  async saveModel(path) {
    await this.model.save(`localstorage://${path}`);
  }
  
  async loadModel(path) {
    this.model = await tf.loadLayersModel(`localstorage://${path}`);
    this.updateTargetModel();
  }
  
  setTrainingMode(isTraining) {
    this.isTraining = isTraining;
  }
  
  getStats() {
    return {
      totalReward: this.totalReward,
      episodeReward: this.episodeReward,
      successRate: this.successRate
    };
  }
} 