import { Component } from '@angular/core';
import { DataProcessingService } from '../../services/data-processsing/data-processing.service';
import { ChartStyleManagerService } from '../../services/chart-style-manager/chart-style-manager.service';
import { Player } from '../../interfaces/Player';
import { HeatmapPlayerClass } from '../../interfaces/HeatmapPlayerClass';
import * as d3 from 'd3';

@Component({
  selector: 'app-heatmap',
  imports: [],
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.css'
})
export class HeatmapComponent {
  DEFAULT_CHART_HEIGTH: number = window.innerHeight - 100; // Default to 800 if window height is unavailable
  DEFAULT_CHART_WIDTH: number = window.innerWidth - 320;

  periodStart: number = 2010;
  periodEnd: number = 2019;
  rankStart: number = 1;
  rankEnd: number = 60;
  currentData: HeatmapPlayerClass[] = [];

  minPoints: number = 0;
  maxPoints: number = 0;
  tickSize: number = 0;
  pointClassesAmount: number = 10;
  pointClasses: number[][] = [];

 constructor(
   private dataSrv: DataProcessingService,
   private chartStyleSrv: ChartStyleManagerService
 ) {}

  ngAfterViewInit() {
    this.updateHeatmap();
  }

  updateHeatmap() {
    this.updateChart();
    // this.transitionView();
  }

  updateChart() {
    this.dataSrv.getDataAsPlayer().then((allData: Player[]) => {
      this.updateData(allData);
      this.createHeatmap();
    });
  }

  updateData(allData: Player[]) {
    const data = allData.filter((d) => d.year >= this.periodStart && d.year <= this.periodEnd && d.overall_pick >= this.rankStart && d.overall_pick <= this.rankEnd);

    // Get points categories for y axis
    this.maxPoints = d3.max(data, d => d.points) || 0;
    this.tickSize = this.maxPoints / this.pointClassesAmount;
    for (let i = 0; i < this.pointClassesAmount; i++) {
      if (i == 0) {
        this.pointClasses.push([0, Math.floor(this.tickSize)])
      }
      else {
        this.pointClasses.push([Math.floor(this.tickSize * i) + 1, Math.floor(this.tickSize * (i + 1))])
      }
    }

    const groupedData = d3.flatRollup(data, v => v.length, d => d.year, d => {
      let currentPointClass = [0, 0];
      for (const pointClass of this.pointClasses) {
        if (d.points >= pointClass[0] && d.points <= pointClass[1]) {
          currentPointClass = pointClass;
        }
      }
      return currentPointClass;
    }).map(d => {
      return { year: d[0], pointRange: d[1], amount: d[2] }
    });

    const fullData = []
    for (const pointRange of this.pointClasses) {
      for (let i = this.periodStart; i <= this.periodEnd; i++) {
        const count = groupedData.find(d => d.year == i && d.pointRange == pointRange)
        if (count !== undefined) fullData.push({ pointsRange: pointRange, year: i, amount: count.amount })
        else fullData.push({ pointsRange: pointRange, year: i, amount: 0 })
      }
    }
    console.log(fullData);
    this.currentData = fullData;
  }

  createHeatmap() {
    d3.select('svg').remove();

    console.log(this.currentData);
    const svg = d3
      .select('#heatmap-container')
      .append('svg')
      .attr('id', 'heatmap')
      .attr('height', this.DEFAULT_CHART_HEIGTH)
      .attr('width', this.DEFAULT_CHART_WIDTH);

    svg
      .selectAll('.cell')
      .data(this.currentData)
      .enter()
      .append('g')
      .append('rect')
      .attr('class', 'cell');
  }
}
