import { Injectable } from '@angular/core';
import * as d3 from 'd3';

@Injectable({
  providedIn: 'root',
})
export class DataProcessingService {
  private csvData: any;
  constructor() {
    this.loadCSVData();
  }
  private loadCSVData() {
    d3.csv('assets/nhldraft.csv').then((data) => {
      this.csvData = data;
    });
  }

  getData() {
    return this.csvData;
  }
}
