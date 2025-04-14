import { SimulationNodeDatum } from 'd3';

export interface Player extends SimulationNodeDatum {
  overall_pick: number;
  nationality: string;
  player: string;
  goals: number;
  assists: number;
  points: number;
  games_played: number;
  position: string;
  year: number;
  specificNationality: string;
  [key: string]: any;
}
