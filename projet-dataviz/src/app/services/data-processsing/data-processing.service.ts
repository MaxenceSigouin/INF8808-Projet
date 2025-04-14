import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Player } from '../../interfaces/Player';
import { PlayersPerPeriod } from '../../interfaces/PlayersPerPeriod'

@Injectable({
  providedIn: 'root',
})
export class DataProcessingService {
  private csvData: d3.DSVRowArray<string> | undefined;
  constructor() {
    if (!this.csvData) {
      this.loadCSVData();
    }
  }
  private loadCSVData(): Promise<void> {
    return d3.csv('assets/nhldraft.csv').then((data) => {
      this.csvData = data as d3.DSVRowArray<string>;
      console.log('CSV data loaded:', this.csvData);
    });
  }
  /**
   * Get the data from the CSV file
   * @returns The data from the CSV file
   */
  async getData(): Promise<d3.DSVRowArray<string> | undefined> {
    if (!this.csvData) {
      await this.loadCSVData();
    }
    return this.csvData;
  }

  async getDataAsPlayer(): Promise<Player[]> {
    if (!this.csvData) {
      await this.loadCSVData();
    }
    return (
      this.csvData?.map((row) => {
        const typedRow = row as unknown as Record<string, string>;
        return {
          overall_pick: +typedRow['overall_pick'],
          nationality: typedRow['nationality'] || 'Others',
          player: typedRow['player'] || '',
          goals: +typedRow['goals'],
          assists: +typedRow['assists'],
          points: +typedRow['points'],
          games_played: +typedRow['games_played'],
          position: typedRow['position'] || '',
          year: +typedRow['year'],
          specificNationality: '',
          // Optionally add other fields
        };
      }) || []
    );
  }

  async getAmountOfPlayersInDecades(): Promise<PlayersPerPeriod[]> {
    if (!this.csvData) {
      await this.loadCSVData();
    }
    const dataArray = this.csvData?.map((row) => {
      const typedRow = row as unknown as Record<string, string>;
      return {
        overall_pick: +typedRow['overall_pick'],
        nationality: typedRow['nationality'] || 'Others',
        player: typedRow['player'] || '',
        goals: +typedRow['goals'],
        assists: +typedRow['assists'],
        points: +typedRow['points'],
        games_played: +typedRow['games_played'],
        position: typedRow['position'] || '',
        year: +typedRow['year'],
        // Optionally add other fields
      };
    }) || []
    const periodData: PlayersPerPeriod[] = [];
    const draftPeriods = Array.from(new Set(dataArray.map((d) => d.year.toString().substring(0, 3))));
    for (const period of draftPeriods) {
      const newPeriodData: PlayersPerPeriod = { period: period+'X', CA: 0, CZ: 0, FI: 0, SE: 0, SK:0, RU: 0, US: 0, Others: 0 };
      dataArray.filter((d) => d.year.toString().substring(0, 3) === period).forEach((player) => {
        switch (player.nationality) {
          case 'CA':
            newPeriodData.CA += 1;
            break;
          case 'CZ':
            newPeriodData.CZ += 1;
            break;
          case 'FI':
            newPeriodData.FI += 1;
            break;
          case 'SE':
            newPeriodData.SE += 1;
            break;
          case 'SK':
            newPeriodData.SK += 1;
            break;
          case 'RU':
            newPeriodData.RU += 1;
            break;
          case 'US':
            newPeriodData.US += 1;
            break;
          default:
            newPeriodData.Others += 1;
        }
      })
      periodData.push(newPeriodData);
    }

    return periodData;
  }
}
