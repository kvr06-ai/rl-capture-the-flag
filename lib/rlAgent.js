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
    // Epsilon-greedy action selection
    if (isTraining && Math.random() < this.explorationRate) {
      // Explore: choose random action
      return Math.floor(Math.random() * 5);
    } else {
      // Exploit: choose best action from model
      return tf.tidy(() => {
        const stateTensor = tf.tensor2d([state]);
        const prediction = this.model.predict(stateTensor);
        return prediction.argMax(1).dataSync()[0];
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
    
    // Compute target Q values
    const targetQs = tf.tidy(() => {
      const nextStateQs = this.targetModel.predict(nextStates);
      const nextStateMaxQs = nextStateQs.max(1);
      const rewards = tf.tensor1d(batch.map(exp => exp.reward));
      const dones = tf.tensor1d(batch.map(exp => exp.done ? 0 : 1));
      
      // Q(s',a') = r + gamma * max(Q(s',a')) * (1 - done)
      return rewards.add(
        tf.mul(
          tf.mul(
            tf.scalar(this.discountFactor),
            nextStateMaxQs
          ),
          dones
        )
      );
    });
    
    // Train the model
    this.model.fit(states, targetQs, {
      batchSize: this.batchSize,
      epochs: 1,
      verbose: 0
    }).then(() => {
      // Cleanup tensors
      states.dispose();
      nextStates.dispose();
      targetQs.dispose();
      
      // Update target model periodically
      this.stepCount++;
      if (this.stepCount % this.trainingInterval === 0) {
        this.updateTargetModel();
      }
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