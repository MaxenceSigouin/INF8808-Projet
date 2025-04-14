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
    this.dataSrv.getDataAsPlayer().then((allData: Player[]) => {
      const data = allData.filter((d) => d.year >= this.periodStart && d.year <= this.periodEnd && d.overall_pick >= this.rankStart && d.overall_pick <= this.rankEnd);
      // this.currentData = data;
      console.log(data);

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

      console.log(this.pointClasses);

      // this.createBeeswarmChart();
      // this.transitionView();
    });
  }

}
