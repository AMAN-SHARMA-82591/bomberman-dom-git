# Twilight Inferno

Twilight Inferno is a real-time multiplayer Bomberman-style game. Players navigate a grid-based arena, place bombs to destroy walls and opponents, and collect power-ups to gain advantages. The last player standing wins!

## Features

- Real-time multiplayer (2-4 players)
- Place bombs, destroy walls, and eliminate opponents
- Collect power-ups: bomb count, flame range, speed
- In-game chat
- Atmospheric visuals and music

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/twilight-inferno.git
   cd twilight-inferno
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Game

1. Start the WebSocket server:

   ```bash
   node server/server.js
   ```

2. Open the game in your browser:
   - If you have VS Code with Live Server extension, right-click on `index.html` and select "Open with Live Server"
   - Or use any other static file server of your choice

## How to Play

- **Movement**: Use arrow keys or WASD to move your character
- **Place Bombs**: Press SPACE to place a bomb
- **Collect Power-ups**:
  - 💣 Bomb: Increases the number of bombs you can place
  - 🔥 Flame: Increases explosion range
  - ⚡ Speed: Makes your character move faster
- **Objective**: Be the last player standing by eliminating your opponents

## Game Flow

1. Enter your nickname on the start screen
2. Wait in the lobby for other players to join (2-4 players)
3. When enough players join, a countdown begins
4. The match starts—destroy walls, collect power-ups, and hunt opponents
5. The last player standing wins, or it's a draw if all players are eliminated

## Technical Details

- **Frontend**: Vanilla JavaScript
- **Backend**: Node.js WebSocket server
- **Communication**: Real-time WebSocket protocol
- **State Management**: Server-authoritative game state

## Credits

- Game concept inspired by the classic Bomberman series
- Custom artwork and visual design
- Background music and sound effects
