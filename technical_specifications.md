# Capture-the-Flag: Interactive Multi-Agent Reinforcement Learning Web App

## Overview
"Capture-the-Flag" (CTF) is an interactive web app designed to demonstrate multi-agent reinforcement learning (MARL). Users observe AI-controlled agents competing in a virtual CTF game, tweaking reward parameters and environmental variables to witness strategic behavior emergence in real-time.

## Product Goals
- Demonstrate core MARL concepts: cooperation, competition, strategy emergence, and reward shaping.
- Engage users interactively, enabling real-time experimentation with reinforcement learning parameters.
- Provide intuitive visualizations of strategic dynamics in MARL environments.

## Features & Functionalities

### Gameplay Dynamics
- Two AI teams, each with 3-5 agents.
- Classic Capture-the-Flag rules:
  - Capture opponent's flag and return it to home base.
  - Tagging opponents in home territory resets opponent position.
  - Game ends when a team captures the opposing team's flag.

### Environment and Customization
- Grid-based playing field:
  - Obstacles placement (walls/barriers).
  - Flag locations (configurable by users).
- Adjustable team strategies via reward functions (offense, defense, cooperation incentives).

### Reinforcement Learning Algorithm
- Algorithm: Multi-Agent Deep Q-Learning (Independent DQN).
- Libraries: TensorFlow.js for neural network implementation.

### Interactive RL Controls & UI Elements
- **Reward Configuration Panel:**
  - Offense reward weight (capturing flags).
  - Defense reward weight (protecting own flag).
  - Cooperation reward (team-based actions).
- **Exploration/Exploitation (`epsilon`):**
  - Adjustable range: 0.01 to 1.0
  - Default: 0.2
- **Learning Rate (`alpha`):**
  - Adjustable range: 0.0001 - 0.01
  - Default: 0.001
- **Discount Factor (`gamma`):**
  - Adjustable range: 0.5 - 0.99
  - Default: 0.95

### Visualization & Analytics
- Real-time strategic heatmaps showing agent position frequency.
- Live game status panel:
  - Scoreboard (flag captures).
  - Agent status (offense/defense/cooperation indicators).
- Interactive graph displaying cumulative rewards per team over rounds.

## Technical Stack
- **Frontend:**
  - HTML5 Canvas/WebGL for rendering
  - React for dynamic UI interactions
  - TailwindCSS for styling
  - TensorFlow.js for in-browser RL training
- **Backend:**
  - Serverless hosting compatible (Vercel, GitHub Pages)

## Architecture & Data Flow
1. User adjusts environmental parameters and reward structures via React UI.
2. Parameters update TensorFlow.js MARL agents.
3. Gameplay Initiation:
   - Agents select actions based on independent DQN policies.
   - Actions determined by exploration-exploitation parameters.
4. Game Simulation:
   - Real-time movement and interactions.
   - Reward feedback from environment for learning updates.
5. Continuous training loop updates agent strategies and visualizations.

## Neural Network Specifications
- **Input Layer:**
  - Grid representation (flag positions, agent positions, obstacles).
- **Hidden Layers:**
  - Two dense layers, each 64 neurons (ReLU activation).
- **Output Layer:**
  - Q-values for actions (move directions, stay, interact).
- **Loss Function:** Mean Squared Error (MSE).
- **Optimizer:** Adam with adjustable learning rate.

## User Interface (UI)
### Main Simulation Screen
- Grid-based game visualization.
- Real-time status updates (flag captures, tags).

### Control Panel
- Adjustable sliders/input fields for hyperparameters.
- Buttons to pause, reset, and resume simulation.
- Heatmap and cumulative reward visualization.

### Responsive & Mobile-Friendly
- Fully responsive design for desktop and mobile interaction.
- Touch-compatible controls and UI adjustments.

## Performance Considerations
- Optimized rendering for consistent 60 FPS experience.
- Efficient neural network computations via TensorFlow.js.

## Accessibility
- Keyboard navigation supported for all interactions.
- Clear and descriptive labels on all UI components.

## Deployment & Versioning
- GitHub repository structured for collaborative development (`main`, `dev`, `feature/*`).
- Continuous deployment pipeline (GitHub Pages, Vercel).

## Testing & Quality Assurance
- Unit testing via Jest and React Testing Library.
- Simulation testing for strategic behavior consistency.
- User experience testing for interface usability.

## Project Timeline & Milestones
- **Phase 1** (Weeks 1-2): Basic environment setup and frontend UI.
- **Phase 2** (Weeks 3-4): RL agents implementation, core gameplay.
- **Phase 3** (Weeks 5-6): Visualization components and user interactions.
- **Phase 4** (Weeks 7-8): Optimization, deployment, and documentation.

## Future Enhancements
- User-controlled agents vs. AI.
- More advanced MARL techniques (MADDPG, PPO).
- Customizable maps and user-generated scenarios.

