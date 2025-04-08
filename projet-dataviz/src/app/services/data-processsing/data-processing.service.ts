import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Player } from '../../interfaces/Player';
@Injectable({
  providedIn: 'root',
})
export class DataProcessingService {
  private csvData: d3.DSVRowArray<string> | undefined;
  constructor() {
    this.loadCSVData();
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
  getData(): d3.DSVRowArray<string> | undefined {
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
          // Optionally add other fields
        };
      }) || []
    );
  }
}
