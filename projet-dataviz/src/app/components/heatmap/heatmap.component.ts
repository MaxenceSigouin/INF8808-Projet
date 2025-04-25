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
  // Margins for the heatmap
  margin = { top: 40, right: 130, bottom: 90, left: 90 };

  // Default chart dimensions
  DEFAULT_CHART_HEIGHT: number = window.innerHeight - 300;
  DEFAULT_CHART_WIDTH: number = window.innerWidth - 600;

  // Scales for the heatmap
  xScale = d3.scaleBand().padding(0.1);
  yScale = d3.scaleBand().padding(0.1);
  colorScale = d3.scaleSequentialSqrt(
    d3.interpolateRgb('rgb(255, 255, 255)', 'rgb(215, 48, 39)')
  );

  // Dropdown options and filters
  allDraftYears: number[] = [];
  allRanks: number[] = [];
  allGameAmounts: number[] = [];
  allPointClassesAmounts: number[] = [];
  startDraftYears: number[] = [];
  endDraftYears: number[] = [];
  startRanks: number[] = [];
  endRanks: number[] = [];

  // Filters and thresholds
  periodStart: number = 1980;
  periodEnd: number = 2020;
  rankStart: number = 1;
  rankEnd: number = 50;
  gameThreshold: number = 1;
  pointClassesAmount: number = 20;
  maxPointClassesAmount: number = 50;

  // Data for the heatmap
  currentData: HeatmapPlayerClass[] = [];
  minPoints: number = 0;
  maxPoints: number = 0;
  tickSize: number = 0;
  pointClasses: number[][] = [];
  tickLabels: string[] = [];

  // Error message for validation
  error: string = '';

  constructor(
    private dataSrv: DataProcessingService,
    private chartStyleSrv: ChartStyleManagerService
  ) {}

  /**
   * Lifecycle hook that runs after the view is initialized.
   * Updates the heatmap and dropdown selectors.
   */
  ngAfterViewInit() {
    this.updateHeatmap();
    this.updateSelectors();
  }

  /**
   * Updates the dropdown selectors based on the current filters.
   */
  updateSelectors() {
    this.startDraftYears = this.allDraftYears.filter(
      (year) => year < this.periodEnd
    );
    this.endDraftYears = this.allDraftYears.filter(
      (year) => year > this.periodStart
    );
    this.startRanks = this.allRanks.filter((rank) => rank < this.rankEnd);
    this.endRanks = this.allRanks.filter((rank) => rank > this.rankStart);
  }

  /**
   * Updates the heatmap by validating fields and updating the chart.
   */
  updateHeatmap() {
    if (this.validateFields()) {
      this.updateChart();
    } else {
      alert(this.error);
    }
  }

  /**
   * Updates the chart by fetching data and creating the heatmap.
   */
  updateChart() {
    this.dataSrv.getDataAsPlayer().then((allData: Player[]) => {
      this.updateData(allData);
      this.createHeatmap();
    });
  }

  /**
   * Sets dropdown options for draft years, ranks, and game amounts.
   * @param allData - The dataset to process.
   */
  setDropdownOptions(allData: Player[]) {
    this.allDraftYears = Array.from(new Set(allData.map((d) => d.year)));
    this.allRanks = Array.from(new Set(allData.map((d) => d.overall_pick)));
    this.allGameAmounts = Array.from(
      new Set(allData.map((d) => d.games_played))
    ).sort((a, b) => a - b);

    for (let i = 1; i < this.maxPointClassesAmount; i++) {
      this.allPointClassesAmounts.push(i);
    }
  }

  /**
   * Updates the filtered data based on the selected filters.
   * @param allData - The dataset to process.
   */
  updateData(allData: Player[]) {
    this.setDropdownOptions(allData);
    this.updateSelectors();

    // Filter data based on the selected criteria
    const data = allData.filter(
      (d) =>
        d.year >= this.periodStart &&
        d.year <= this.periodEnd &&
        d.overall_pick >= this.rankStart &&
        d.overall_pick <= this.rankEnd &&
        d.games_played > this.gameThreshold
    );

    // Calculate point ranges for the Y-axis
    this.maxPoints = d3.max(data, (d) => d.points) || 0;
    this.tickSize = this.maxPoints / this.pointClassesAmount;
    this.pointClasses = [];
    this.tickLabels = [];
    for (let i = 0; i < this.pointClassesAmount; i++) {
      if (i == 0) {
        this.pointClasses.push([0, Math.floor(this.tickSize)]);
        this.tickLabels.push(`0 - ${Math.floor(this.tickSize)}`);
      } else {
        this.pointClasses.push([
          Math.floor(this.tickSize * i) + 1,
          Math.floor(this.tickSize * (i + 1)),
        ]);
        this.tickLabels.push(
          `${Math.floor(this.tickSize * i) + 1} - ${Math.floor(
            this.tickSize * (i + 1)
          )}`
        );
      }
    }

    // Group data by year and point range
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

    // Fill in missing data points with zero counts
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

  /**
   * Updates the X-axis scale based on the selected years.
   */
  updateXScale() {
    const years: string[] = [];
    for (let i = this.periodStart; i <= this.periodEnd; i++) {
      years.push(String(i));
    }
    this.xScale.domain(years);
    this.xScale.range([0, this.DEFAULT_CHART_WIDTH]);
  }

  /**
   * Updates the Y-axis scale based on the point ranges.
   */
  updateYScale() {
    const ranges: string[] = [];
    for (const pointClass of this.pointClasses) {
      ranges.push(String(pointClass));
    }
    this.yScale.domain(ranges);
    this.yScale.range([this.DEFAULT_CHART_HEIGHT, 0]);
  }

  /**
   * Creates the heatmap by drawing cells, axes, and the legend.
   */
  createHeatmap() {
    d3.selectAll('svg').remove();
    d3.selectAll('.tooltip').remove();

    // Update color scale domain
    this.colorScale.domain([
      0,
      d3.max(this.currentData, (d) => d.amount) as number,
    ]);
    this.updateXScale();
    this.updateYScale();

    // Create tooltip
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

    // Create SVG container
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

    // Draw heatmap cells
    svg
      .selectAll('.cell')
      .data(this.currentData)
      .enter()
      .append('g')
      .append('rect')
      .attr('class', 'cell')
      .attr('x', (d) => this.xScale(String(d.year)) || 0)
      .attr('width', this.xScale.bandwidth())
      .attr('y', (d) => this.yScale(String(d.pointsRange)) || 0)
      .attr('height', this.yScale.bandwidth())
      .style('fill', (d) => this.colorScale(d.amount))
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

  /**
   * Appends the X-axis to the heatmap.
   */
  appendXAxis() {
    const svg = d3.select('#heatmap');
    svg
      .append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, ${this.DEFAULT_CHART_HEIGHT})`)
      .call(d3.axisBottom(this.xScale))
      .select('.domain')
      .remove();

    svg
      .append('text')
      .attr('class', 'axis')
      .attr('text-anchor', 'middle')
      .attr('x', this.DEFAULT_CHART_WIDTH / 2)
      .attr('y', this.DEFAULT_CHART_HEIGHT + this.margin.bottom - 30)
      .style('font-size', '14px')
      .text('Draft Year');
  }

  /**
   * Appends the Y-axis to the heatmap.
   */
  appendYAxis() {
    const svg = d3.select('#heatmap');
    svg
      .append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, 0)`)
      .call(d3.axisLeft(this.yScale).tickFormat((d, i) => this.tickLabels[i]))
      .select('.domain')
      .remove();

    svg
      .append('text')
      .attr('class', 'axis')
      .attr('text-anchor', 'middle')
      .attr(
        'transform',
        `translate(${-this.margin.left + 20}, ${
          this.DEFAULT_CHART_HEIGHT / 2
        }) rotate(-90)`
      )
      .style('font-size', '14px')
      .text('Points Scored Range');
  }

  /**
   * Appends the legend to the heatmap.
   */
  appendLegend() {
    const svg = d3.select('#heatmap');

    // Remove any existing legend
    svg.select('#legend-container').remove();

    const legendContainer = svg
      .append('g')
      .attr('id', 'legend-container')
      .attr('transform', `translate(${this.DEFAULT_CHART_WIDTH + 155}, 30)`);

    // Create a linear gradient for the legend
    const colorLegend = legendContainer
      .append('defs')
      .append('linearGradient')
      .attr('id', 'color-gradient')
      .attr('x1', '0%')
      .attr('x2', '0%')
      .attr('y1', '100%')
      .attr('y2', '0%');

    // Define gradient stops
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
      .attr('width', 25)
      .attr('height', 400)
      .style('fill', 'url(#color-gradient)');

    // Add axis for the legend
    const scale = d3
      .scaleSqrt()
      .domain(this.colorScale.domain())
      .range([400, 0]);
    const axis = d3.axisLeft(scale).ticks(20).tickSize(6);

    legendContainer
      .append('g')
      .attr('transform', 'translate(-10, 0)')
      .call(axis)
      .select('.domain')
      .remove();

    legendContainer
      .append('text')
      .attr('x', 0)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .text('Amount of Players');
  }

  /**
   * Validates the input fields for the heatmap filters.
   * @returns True if all fields are valid, false otherwise.
   */
  validateFields(): boolean {
    if (
      this.periodStart < 1963 ||
      this.periodStart > 2022 ||
      this.periodEnd < 1963 ||
      this.periodEnd > 2022
    ) {
      this.error =
        'The selected years must be contained between 1963 and 2022 inclusively.';
      return false;
    }
    if (this.periodStart > this.periodEnd) {
      this.error =
        'The first selected year must be smaller than the last selected year.';
      return false;
    }
    if (
      this.rankStart < 1 ||
      this.rankStart > 293 ||
      this.rankEnd < 1 ||
      this.rankEnd > 293
    ) {
      this.error =
        'The selected ranks must be contained between 1 and 293 inclusively.';
      return false;
    }
    if (this.rankStart > this.rankEnd) {
      this.error =
        'The first selected rank must be smaller than the last selected rank.';
      return false;
    }
    if (this.gameThreshold < 0 || this.gameThreshold > 1779) {
      this.error =
        'The minimum amount of games must be contained between 0 and 1779 inclusively.';
      return false;
    }
    if (this.pointClassesAmount < 1 || this.pointClassesAmount > 50) {
      this.error =
        'The amount of point ranges must be contained between 1 and 50 inclusively.';
      return false;
    }
    return true;
  }
}
