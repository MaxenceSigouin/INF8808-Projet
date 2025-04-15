import { Component } from '@angular/core';
import { DataProcessingService } from '../../services/data-processsing/data-processing.service';
import { ChartStyleManagerService } from '../../services/chart-style-manager/chart-style-manager.service';
import { Player } from '../../interfaces/Player';
import { HeatmapPlayerClass } from '../../interfaces/HeatmapPlayerClass';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import * as d3 from 'd3';

@Component({
  selector: 'app-heatmap',
  imports: [
    MatButtonToggleModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.css',
})
export class HeatmapComponent {
  margin = { top: 40, right: 120, bottom: 90, left: 90 };
  DEFAULT_CHART_HEIGHT: number = window.innerHeight - 150; // Default to 800 if window height is unavailable
  DEFAULT_CHART_WIDTH: number = window.innerWidth - 520;
  xScaleHeight: number = this.DEFAULT_CHART_HEIGHT;
  yScaleWidth: number = this.DEFAULT_CHART_WIDTH;

  xScale = d3.scaleBand().padding(0.1);
  yScale = d3.scaleBand().padding(0.1);
  colorScale = d3.scaleSequentialSqrt(
    d3.interpolateRgb('rgb(255, 255, 255)', 'rgb(215, 48, 39)')
  );

  periodStart: number = 1980;
  periodEnd: number = 2020;
  rankStart: number = 1;
  rankEnd: number = 50;
  gameThreshold: number = 1;
  currentData: HeatmapPlayerClass[] = [];

  minPoints: number = 0;
  maxPoints: number = 0;
  tickSize: number = 0;
  pointClassesAmount: number = 20;
  pointClasses: number[][] = [];
  tickLabels: string[] = [];

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
    const data = allData.filter(
      (d) =>
        d.year >= this.periodStart &&
        d.year <= this.periodEnd &&
        d.overall_pick >= this.rankStart &&
        d.overall_pick <= this.rankEnd &&
        d.games_played > this.gameThreshold
    );

    // Get points categories for y axis
    this.maxPoints = d3.max(data, (d) => d.points) || 0;
    this.tickSize = this.maxPoints / this.pointClassesAmount;
    this.pointClasses = [];
    this.tickLabels = [];
    for (let i = 0; i < this.pointClassesAmount; i++) {
      if (i == 0) {
        this.pointClasses.push([0, Math.floor(this.tickSize)]);
        this.tickLabels.push(String('0 - ' + Math.floor(this.tickSize)));
      } else {
        this.pointClasses.push([
          Math.floor(this.tickSize * i) + 1,
          Math.floor(this.tickSize * (i + 1)),
        ]);
        this.tickLabels.push(
          String(
            Math.floor(this.tickSize * i) +
              1 +
              ' - ' +
              Math.floor(this.tickSize * (i + 1))
          )
        );
      }
    }

    // console.log(this.tickLabels);

    const groupedData = d3
      .flatRollup(
        data,
        (v) => v.length,
        (d) => d.year,
        (d) => {
          let currentPointClass = [0, 0];
          for (const pointClass of this.pointClasses) {
            if (d.points >= pointClass[0] && d.points <= pointClass[1]) {
              currentPointClass = pointClass;
            }
          }
          return currentPointClass;
        }
      )
      .map((d) => {
        return { year: d[0], pointRange: d[1], amount: d[2] };
      });

    const fullData = [];
    for (const pointRange of this.pointClasses) {
      for (let i = this.periodStart; i <= this.periodEnd; i++) {
        const count = groupedData.find(
          (d) => d.year == i && d.pointRange == pointRange
        );
        if (count !== undefined)
          fullData.push({
            pointsRange: pointRange,
            year: i,
            amount: count.amount,
          });
        else fullData.push({ pointsRange: pointRange, year: i, amount: 0 });
      }
    }
    this.currentData = fullData;
  }

  updateXScale() {
    const years: string[] = [];
    for (let i = this.periodStart; i <= this.periodEnd; i++) {
      years.push(String(i));
    }
    this.xScale.domain(years);
    this.xScale.range([0, this.DEFAULT_CHART_WIDTH]);
  }

  updateYScale() {
    const ranges: string[] = [];
    for (const pointClass of this.pointClasses) {
      ranges.push(String(pointClass));
    }
    this.yScale.domain(ranges);
    this.yScale.range([this.DEFAULT_CHART_HEIGHT, 0]);
  }

  createHeatmap() {
    d3.select('svg').remove();
    d3.selectAll('.tooltip').remove(); // Remove tooltips

    this.colorScale.domain([
      0,
      d3.max(this.currentData, (d) => d.amount) as number,
    ]);
    this.updateXScale();
    this.updateYScale();

    const tooltip = d3
      .select('#heatmap-container')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', '#fff')
      .style('padding', '6px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    const svg = d3
      .select('#heatmap-container')
      .append('svg')
      .attr('id', 'heatmap')
      .attr(
        'height',
        this.DEFAULT_CHART_HEIGHT + this.margin.top + this.margin.bottom
      )
      .attr(
        'width',
        this.DEFAULT_CHART_WIDTH + this.margin.left + this.margin.right
      );

    svg
      .selectAll('.cell')
      .data(this.currentData)
      .enter()
      .append('g')
      .append('rect')
      .attr('class', 'cell')
      .attr('x', (d) => {
        return this.xScale(String(d.year)) || 0;
      })
      .attr('width', this.xScale.bandwidth())
      .attr('y', (d) => {
        return this.yScale(String(d.pointsRange)) || 0;
      })
      .attr('height', this.yScale.bandwidth())
      .style('fill', (d) => {
        return this.colorScale(d.amount);
      })
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5)
      .on('mouseover', (event, d) => {
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip
          .html(
            `<strong>${d.year}, from ${d.pointsRange[0]} to ${d.pointsRange[1]} points</strong><br/>
            Amount of players: ${d.amount}<br/>`
          )
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 30 + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition().duration(200).style('opacity', 0);
      });

    this.appendXAxis();
    this.appendYAxis();
    this.appendLegend();
  }

  appendXAxis() {
    const svg = d3.select('#heatmap');
    svg
      .append('g')
      .attr('transform', `translate(0, ${this.xScaleHeight})`)
      .call(d3.axisBottom(this.xScale))
      .select('.domain')
      .remove();
  }

  appendYAxis() {
    const svg = d3.select('#heatmap');
    svg
      .append('g')
      .attr('transform', `translate(${this.yScaleWidth}, 0)`)
      .call(d3.axisRight(this.yScale).tickFormat((d, i) => this.tickLabels[i]))
      .select('.domain')
      .remove();
  }

  appendLegend() {
    const svg = d3.select('#heatmap');

    // Remove any existing legend if present
    svg.select('#legend-container').remove();

    const legendContainer = svg
      .append('g')
      .attr('id', 'legend-container')
      .attr('transform', `translate(${this.DEFAULT_CHART_WIDTH + 140}, 30)`);

    // Create a linear gradient for the legend color scale
    const colorLegend = legendContainer
      .append('defs')
      .append('linearGradient')
      .attr('id', 'color-gradient')
      .attr('x1', '0%')
      .attr('x2', '0%')
      .attr('y1', '100%')
      .attr('y2', '0%');

    // Define the gradient stops based on the color scale
    colorLegend
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', this.colorScale(0));

    colorLegend
      .append('stop')
      .attr('offset', '100%')
      .attr(
        'stop-color',
        this.colorScale(d3.max(this.currentData, (d) => d.amount) as number)
      );

    // Draw the gradient bar
    legendContainer
      .append('rect')
      .attr('width', 25) // Adjust width of the legend bar
      .attr('height', 400) // Height of the gradient bar
      .style('fill', 'url(#color-gradient)');

    // Add axis for the legend
    const scale = d3
      .scaleSqrt()
      .domain(this.colorScale.domain())
      .range([400, 0]); // Same width as the gradient bar
    const axis = d3.axisLeft(scale).ticks(this.pointClassesAmount).tickSize(6);

    // Append axis to the legend
    legendContainer
      .append('g')
      .attr('transform', 'translate(-10, 0)') // Position the axis below the gradient bar
      .call(axis)
      .select('.domain')
      .remove(); // Remove the axis line

    // Optional: Add a label for the legend
    legendContainer
      .append('text')
      .attr('x', 0) // Centered horizontally
      .attr('y', -10) // Position below the axis
      .attr('text-anchor', 'middle')
      .text('Amount of Players');
  }
}
