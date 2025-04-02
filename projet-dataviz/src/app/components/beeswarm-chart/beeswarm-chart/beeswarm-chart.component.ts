import * as d3 from 'd3';
import { Component } from '@angular/core';

@Component({
  selector: 'app-beeswarm-chart',
  imports: [],
  templateUrl: './beeswarm-chart.component.html',
  styleUrl: './beeswarm-chart.component.css',
})
export class BeeswarmChartComponent {
  CHART_HEIGTH: number = 500;
  CHART_WIDTH: number = 500;

  constructor() {}
  ngAfterViewInit() {
    this.createBeeswarmChart();
  }

  /**
   * Create a beeswarm chart using D3.js
   */
  createBeeswarmChart() {
    const svg = (d3.select('body') as any)
      .append('svg')
      .attr('height', this.CHART_HEIGTH)
      .attr('width', this.CHART_WIDTH);
  }
  // createBarChart(): void {
  //   const data = [25, 40, 15, 60, 30]; // Dumb/fake data

  //   const CHART_WIDTH = 500;
  //   const CHART_HEIGHT = 200;
  //   const BAR_WIDTH = 40;
  //   const BAR_PADDING = 10;

  //   // Clear existing chart if needed
  //   (d3.select('svg') as any).remove();

  //   const svg = (d3.select('body') as any)
  //     .append('svg')
  //     .attr('width', CHART_WIDTH)
  //     .attr('height', CHART_HEIGHT);

  //   svg
  //     .selectAll('rect')
  //     .data(data)
  //     .enter()
  //     .append('rect')
  //     .attr('x', (_d: any, i: number) => i * (BAR_WIDTH + BAR_PADDING))
  //     .attr('y', (d: number) => CHART_HEIGHT - d)
  //     .attr('width', BAR_WIDTH)
  //     .attr('height', (d: any) => d)
  //     .attr('fill', 'steelblue');
  // }
}
