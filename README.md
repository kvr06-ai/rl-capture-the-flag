# Capture-the-Flag: Interactive Multi-Agent Reinforcement Learning Web App

An interactive web application demonstrating multi-agent reinforcement learning (MARL) in a classic Capture-the-Flag game scenario. Users can observe AI-controlled agents competing in a virtual CTF game and tweak various parameters to witness the emergence of strategic behavior in real-time.

## Features

- **Multi-Agent Reinforcement Learning**: Observe how agents learn to cooperate and compete using Deep Q-Learning.
- **Interactive Controls**: Adjust reinforcement learning parameters and reward weights in real-time.
- **Live Visualizations**: See agent strategies and performance via intuitive visualizations.
- **Fully Customizable**: Modify team sizes, exploration rates, and more.

## Tech Stack

- **Frontend**: React/Next.js
- **Reinforcement Learning**: TensorFlow.js
- **Styling**: TailwindCSS

## Getting Started

### Prerequisites

- Node.js 14+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd rl-ctf
npm install
```

### Running Locally

```bash
npm run dev
```

The application will run at [http://localhost:3000](http://localhost:3000).

## How to Use

1. **Starting the Simulation**: Use the Start button to begin the simulation.
2. **Adjusting Parameters**: Modify the reinforcement learning parameters to see how they affect agent behavior:
   - **Learning Rate (α)**: How quickly agents learn from new experiences (0.0001-0.01)
   - **Discount Factor (γ)**: How much agents value future rewards (0.5-0.99)
   - **Exploration Rate (ε)**: How often agents explore vs. exploit (0.01-1.0)

3. **Reward Weights**: Balance these to influence team strategies:
   - **Offense Reward**: Encourages flag capturing
   - **Defense Reward**: Promotes defending territory
   - **Cooperation Reward**: Fosters team coordination

4. **Apply Changes**: After adjusting parameters, click "Apply Changes" to update the simulation.

## How It Works

The application implements an Independent Deep Q-Network (DQN) approach where each agent maintains its own neural network for decision-making. Agents observe the environment (grid positions, flag status, etc.) and learn to maximize their rewards through trial and error.

The reinforcement learning loop consists of:

1. **State Observation**: Agents perceive their environment
2. **Action Selection**: Agents choose actions based on learned policies
3. **Environment Interaction**: Actions affect the game state
4. **Reward Calculation**: Agents receive feedback based on their actions
5. **Learning Update**: Neural networks adjust to improve future decisions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- This project is based on research in multi-agent reinforcement learning
- Inspired by classic Capture-the-Flag games and their applications in AI research 