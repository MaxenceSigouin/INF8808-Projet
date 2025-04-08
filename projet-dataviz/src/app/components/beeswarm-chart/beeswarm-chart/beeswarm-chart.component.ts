import * as d3 from 'd3';
import { Component } from '@angular/core';
import { DataProcessingService } from '../../../services/data-processsing/data-processing.service';
import { SimulationNodeDatum } from 'd3';
import { Player } from '../../../interfaces/Player';

@Component({
  selector: 'app-beeswarm-chart',
  imports: [],
  templateUrl: './beeswarm-chart.component.html',
  styleUrl: './beeswarm-chart.component.css',
})
export class BeeswarmChartComponent {
  CHART_HEIGTH: number = 500;
  CHART_WIDTH: number = 500;

  constructor(private dataSrv: DataProcessingService) {}
  ngAfterViewInit() {
    this.createBeeswarmChart();
  }

  /**
   * Create a beeswarm chart using D3.js
   */

  createBeeswarmChart(stat: keyof Player = 'points') {
    const svg = d3
      .select('body')
      .append('svg')
      .attr('height', this.CHART_HEIGTH)
      .attr('width', this.CHART_WIDTH);

    this.dataSrv.getDataAsPlayer().then((data: Player[]) => {
      data = data.filter((d) => d.year === 2010);
      console.log('Data:', data);
      const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(data, (d) => d[stat]) || 1])
        .range([2, 15]);

      const xScale = d3
        .scaleLinear()
        .domain([1, d3.max(data, (d) => d.overall_pick) || 210])
        .range([60, this.CHART_WIDTH - 60]);

      const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

      const simulation = d3
        .forceSimulation<Player>(data)
        .force(
          'x',
          d3.forceX((d) => xScale((d as Player).overall_pick)).strength(1)
        )
        .force('y', d3.forceY(this.CHART_HEIGTH / 2))
        .force(
          'collide',
          d3.forceCollide((d) => radiusScale(d[stat]) + 1)
        )
        .stop();

      for (let i = 0; i < 150; i++) simulation.tick();

      const tooltip = d3
        .select('body')
        .append('div')
        .style('position', 'absolute')
        .style('background', '#fff')
        .style('padding', '6px')
        .style('border', '1px solid #ccc')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('opacity', 0);

      const svg = d3
        .select('body')
        .append('svg')
        .attr('height', this.CHART_HEIGTH)
        .attr('width', this.CHART_WIDTH);

      svg
        .selectAll('circle')
        .data(data)
        .join('circle')
        .attr('cx', (d) => d.x!)
        .attr('cy', (d) => d.y!)
        .attr('r', (d) => radiusScale(d[stat]))
        .attr('fill', (d) => colorScale(d.nationality))
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5)
        .on('mouseover', (event, d) => {
          tooltip.transition().duration(200).style('opacity', 1);
          tooltip
            .html(
              `
            <strong>${d.player}</strong><br/>
            Rang: ${d.overall_pick}<br/>
            Points: ${d.points}<br/>
            Buts: ${d.goals}<br/>
            Assists: ${d.assists}<br/>
            Matchs: ${d.games_played}
          `
            )
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY - 30 + 'px');
        })
        .on('mouseout', () => {
          tooltip.transition().duration(200).style('opacity', 0);
        });

      svg
        .append('g')
        .attr('transform', `translate(0, ${this.CHART_HEIGTH - 30})`)
        .call(d3.axisBottom(xScale).ticks(10))
        .append('text')
        .attr('x', this.CHART_WIDTH / 2)
        .attr('y', 30)
        .attr('fill', '#000')
        .attr('text-anchor', 'middle')
        .text('Rang de sélection');
    });
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
