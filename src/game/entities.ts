import { Vector } from './physics';
import { PLAYER_RADIUS, BALL_RADIUS, PLAYER_MASS, BALL_MASS, FRICTION } from './constants';

export class Entity {
  pos: Vector;
  vel: Vector;
  radius: number;
  mass: number;

  constructor(x: number, y: number, radius: number, mass: number) {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.radius = radius;
    this.mass = mass;
  }

  update() {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.vel.x *= FRICTION;
    this.vel.y *= FRICTION;
  }
}

export class Player extends Entity {
  id: string;
  team: 'red' | 'blue';
  name: string;
  kicking: boolean = false;

  constructor(id: string, name: string, team: 'red' | 'blue', x: number, y: number) {
    super(x, y, PLAYER_RADIUS, PLAYER_MASS);
    this.id = id;
    this.name = name;
    this.team = team;
  }
}

export class Ball extends Entity {
  constructor(x: number, y: number) {
    super(x, y, BALL_RADIUS, BALL_MASS);
  }
}
