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
    this.updateData();
    // this.createBeeswarmChart();
    // this.transitionView();
  }

  updateData() {
    this.dataSrv.getDataAsPlayer().then((allData: Player[]) => {
      const data = allData.filter((d) => d.year >= this.periodStart && d.year <= this.periodEnd && d.overall_pick >= this.rankStart && d.overall_pick <= this.rankEnd);
      // this.currentData = data;

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
    });
  }
}
