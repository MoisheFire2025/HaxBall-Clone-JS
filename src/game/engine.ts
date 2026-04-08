import { Player, Ball } from './entities';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, 
  PLAYER_SPEED, PLAYER_RADIUS, BALL_RADIUS,
  GOAL_SIZE, GOAL_DEPTH
} from './constants';
import { dist, resolveCollision, normalize, mul, add } from './physics';

export interface GameState {
  players: Player[];
  ball: Ball;
  score: { red: number; blue: number };
}

export class GameEngine {
  state: GameState;
  isHost: boolean;

  constructor(isHost: boolean) {
    this.isHost = isHost;
    this.state = {
      players: [],
      ball: new Ball(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2),
      score: { red: 0, blue: 0 }
    };
  }

  addPlayer(id: string, name: string, team: 'red' | 'blue') {
    const x = team === 'red' ? 100 : CANVAS_WIDTH - 100;
    const y = CANVAS_HEIGHT / 2;
    const player = new Player(id, name, team, x, y);
    this.state.players.push(player);
  }

  removePlayer(id: string) {
    this.state.players = this.state.players.filter(p => p.id !== id);
  }

  update(inputs: Record<string, { up: boolean; down: boolean; left: boolean; right: boolean; kick: boolean }>) {
    if (!this.isHost) return;

    // Update players based on inputs
    this.state.players.forEach(player => {
      const input = inputs[player.id] || { up: false, down: false, left: false, right: false, kick: false };
      
      let moveX = 0;
      let moveY = 0;
      if (input.up) moveY -= 1;
      if (input.down) moveY += 1;
      if (input.left) moveX -= 1;
      if (input.right) moveX += 1;

      if (moveX !== 0 || moveY !== 0) {
        const dir = normalize({ x: moveX, y: moveY });
        player.vel.x += dir.x * 0.5;
        player.vel.y += dir.y * 0.5;
        
        // Cap speed
        const speed = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
        if (speed > PLAYER_SPEED) {
          player.vel.x = (player.vel.x / speed) * PLAYER_SPEED;
          player.vel.y = (player.vel.y / speed) * PLAYER_SPEED;
        }
      }

      player.kicking = input.kick;
      player.update();

      // Boundary checks
      player.pos.x = Math.max(player.radius, Math.min(CANVAS_WIDTH - player.radius, player.pos.x));
      player.pos.y = Math.max(player.radius, Math.min(CANVAS_HEIGHT - player.radius, player.pos.y));
    });

    // Update ball
    this.state.ball.update();

    // Ball boundaries & Goal check
    const ball = this.state.ball;
    if (ball.pos.y < ball.radius || ball.pos.y > CANVAS_HEIGHT - ball.radius) {
      ball.vel.y *= -0.8;
      ball.pos.y = ball.pos.y < ball.radius ? ball.radius : CANVAS_HEIGHT - ball.radius;
    }

    if (ball.pos.x < ball.radius || ball.pos.x > CANVAS_WIDTH - ball.radius) {
      const isGoalArea = ball.pos.y > (CANVAS_HEIGHT - GOAL_SIZE) / 2 && ball.pos.y < (CANVAS_HEIGHT + GOAL_SIZE) / 2;
      
      if (isGoalArea) {
        if (ball.pos.x < 0) {
          this.state.score.blue++;
          this.resetPositions();
        } else if (ball.pos.x > CANVAS_WIDTH) {
          this.state.score.red++;
          this.resetPositions();
        }
      } else {
        ball.vel.x *= -0.8;
        ball.pos.x = ball.pos.x < ball.radius ? ball.radius : CANVAS_WIDTH - ball.radius;
      }
    }

    // Collisions: Player vs Player
    for (let i = 0; i < this.state.players.length; i++) {
      for (let j = i + 1; j < this.state.players.length; j++) {
        const p1 = this.state.players[i];
        const p2 = this.state.players[j];
        if (dist(p1.pos, p2.pos) < p1.radius + p2.radius) {
          const result = resolveCollision(p1.pos, p1.vel, p1.mass, p2.pos, p2.vel, p2.mass);
          p1.vel = result.v1;
          p2.vel = result.v2;
          
          // Separate
          const overlap = (p1.radius + p2.radius) - dist(p1.pos, p2.pos);
          const dir = normalize(sub(p1.pos, p2.pos));
          p1.pos = add(p1.pos, mul(dir, overlap / 2));
          p2.pos = sub(p2.pos, mul(dir, overlap / 2));
        }
      }
    }

    // Collisions: Player vs Ball
    this.state.players.forEach(player => {
      if (dist(player.pos, ball.pos) < player.radius + ball.radius) {
        const result = resolveCollision(player.pos, player.vel, player.mass, ball.pos, ball.vel, ball.mass);
        // Player is much heavier or we want more control, so we only affect ball mostly
        ball.vel = result.v2;
        
        if (player.kicking) {
          const dir = normalize(sub(ball.pos, player.pos));
          ball.vel = add(ball.vel, mul(dir, 5));
        }

        // Separate
        const overlap = (player.radius + ball.radius) - dist(player.pos, ball.pos);
        const dir = normalize(sub(ball.pos, player.pos));
        ball.pos = add(ball.pos, mul(dir, overlap));
      }
    });
  }

  resetPositions() {
    this.state.ball.pos = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    this.state.ball.vel = { x: 0, y: 0 };
    this.state.players.forEach(p => {
      p.pos = { 
        x: p.team === 'red' ? 100 : CANVAS_WIDTH - 100, 
        y: CANVAS_HEIGHT / 2 
      };
      p.vel = { x: 0, y: 0 };
    });
  }

  setState(newState: any) {
    // Sync state for guests
    this.state.score = newState.score;
    this.state.ball.pos = newState.ball.pos;
    this.state.ball.vel = newState.ball.vel;
    
    // Sync players
    newState.players.forEach((pData: any) => {
      let player = this.state.players.find(p => p.id === pData.id);
      if (!player) {
        player = new Player(pData.id, pData.name, pData.team, pData.pos.x, pData.pos.y);
        this.state.players.push(player);
      }
      player.pos = pData.pos;
      player.vel = pData.vel;
      player.kicking = pData.kicking;
    });

    // Remove disconnected
    this.state.players = this.state.players.filter(p => newState.players.some((pd: any) => pd.id === p.id));
  }
}

function sub(v1: {x:number, y:number}, v2: {x:number, y:number}) {
  return { x: v1.x - v2.x, y: v1.y - v2.y };
}
