import { COLORS, CANVAS_WIDTH, CANVAS_HEIGHT, GOAL_SIZE, GOAL_DEPTH } from './constants';
import { Player, Ball } from './entities';

export const drawPitch = (ctx: CanvasRenderingContext2D) => {
  // Background
  ctx.fillStyle = COLORS.PITCH;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Lines
  ctx.strokeStyle = COLORS.LINES;
  ctx.lineWidth = 2;

  // Outer border
  ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Center line
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, 0);
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
  ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Goals
  ctx.fillStyle = COLORS.GOAL_RED;
  ctx.fillRect(-GOAL_DEPTH, (CANVAS_HEIGHT - GOAL_SIZE) / 2, GOAL_DEPTH, GOAL_SIZE);
  
  ctx.fillStyle = COLORS.GOAL_BLUE;
  ctx.fillRect(CANVAS_WIDTH, (CANVAS_HEIGHT - GOAL_SIZE) / 2, GOAL_DEPTH, GOAL_SIZE);
};

export const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
  ctx.beginPath();
  ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = player.team === 'red' ? COLORS.TEAM_RED : COLORS.TEAM_BLUE;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Name
  ctx.fillStyle = '#fff';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(player.name, player.pos.x, player.pos.y - player.radius - 5);
  
  // Kick indicator
  if (player.kicking) {
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }
};

export const drawBall = (ctx: CanvasRenderingContext2D, ball: Ball) => {
  ctx.beginPath();
  ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.BALL;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();
};
