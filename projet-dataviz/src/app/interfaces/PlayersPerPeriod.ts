import {SimulationNodeDatum} from 'd3';

export interface PlayersPerPeriod extends SimulationNodeDatum {
  period: string;
  US: number,
  SK: number,
  FI: number,
  RU: number,
  CA: number,
  SE: number,
  CZ: number,
  Others: number,

  [key: string]: any;
}
