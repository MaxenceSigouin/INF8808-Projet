import * as d3 from 'd3';
import { Component } from '@angular/core';
import { DataProcessingService } from '../../../services/data-processsing/data-processing.service';
import {
  MatSlideToggleChange,
  MatSlideToggleModule,
} from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-bubble-chart',
  imports: [MatSlideToggleModule, FormsModule],
  templateUrl: './bubble-chart.component.html',
  styleUrl: './bubble-chart.component.css',
})
export class BubbleChartComponent {
  // Whether to show total counts or grouped counts
  isTotalShow = false;

  // Year groups for the X-axis
  private yearGroups: string[] = [];

  // Data aggregated by country and year group
  private countByCountry: Record<string, Record<string, number>> = {};

  // Total counts by country
  private totalByCountry: Record<string, number> = {};

  // D3 scales for the chart
  private yScale = d3.scalePoint<string>();
  private xScale = d3.scalePoint<string>();
  private xScaleCollapse = d3.scalePoint<string>();
  private sizeScale = d3.scaleLinear<number, number>();

  // Set of all years in the dataset
  private allYears = new Set<number>();

  // Maximum domain value for the size scale
  private maxDomainValue = 0;

  // Margins for the chart
  private margin = { top: 40, right: 300, bottom: 40, left: 300 };

  constructor(private dataSrv: DataProcessingService) {}

  /**
   * Lifecycle hook that runs after the view is initialized.
   * Preprocesses the data and initializes the chart.
   */
  ngAfterViewInit() {
    this.preprocess().then((country) => {
      this.countByCountry = country;
      this.initializeChart();
    });
  }

  /**
   * Preprocesses the data by aggregating it by country and year group.
   * Filters the top countries and groups the rest into "Others".
   * @returns A promise resolving to the filtered data aggregated by country and year group.
   */
  private async preprocess(): Promise<Record<string, Record<string, number>>> {
    const data = await this.dataSrv.getData();
    if (!data) return {};

    // Extract years and generate year groups
    this.extractYears(data);
    this.generateYearGroups(6);

    // Aggregate data by country and calculate totals
    const countByCountry = this.aggregateDataByCountry(data);
    this.totalByCountry = this.calculateTotalByCountry(countByCountry);

    // Filter top countries and group the rest into "Others"
    return this.filterTopCountries(countByCountry);
  }

  /**
   * Initializes the chart by setting up scales, axes, and drawing the data.
   */
  private initializeChart() {
    this.buildGraph();
    this.setYScale();
    this.drawYScale();
    this.setXScales();
    this.drawXScale();
    this.updateChart();
  }

  /**
   * Builds the SVG container for the chart.
   */
  private buildGraph() {
    const containerNode = d3
      .select('#bubble-chart-container')
      .node() as HTMLElement;
    if (!containerNode) return;

    const { width, height } = containerNode.getBoundingClientRect();
    d3.select('#bubble-chart-container')
      .append('svg')
      .attr('id', 'bubble-chart-svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('id', 'graph-g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
  }

  /**
   * Sets the Y-axis scale based on the sorted countries.
   */
  private setYScale() {
    const containerNode = d3
      .select('#bubble-chart-container')
      .node() as HTMLElement;
    if (!containerNode) return;

    const { height } = containerNode.getBoundingClientRect();
    this.yScale
      .domain(this.getSortedCountries())
      .range([0, height - this.margin.top - this.margin.bottom]);
  }

  /**
   * Draws the Y-axis on the chart.
   */
  private drawYScale() {
    d3.select('svg #graph-g')
      .append('g')
      .attr('class', 'y axis')
      .attr(
        'transform',
        `translate(${-this.margin.left / 6}, ${this.margin.top / 2})`
      )
      .call(d3.axisLeft(this.yScale));
  }

  /**
   * Sets the X-axis scales for grouped and collapsed views.
   */
  private setXScales() {
    const containerNode = d3
      .select('#bubble-chart-container')
      .node() as HTMLElement;
    if (!containerNode) return;

    const { width } = containerNode.getBoundingClientRect();
    this.xScale
      .domain(this.yearGroups)
      .range([0, width - this.margin.left - this.margin.right]);

    this.xScaleCollapse.domain(['Total']).range([0, 0]);
  }

  /**
   * Draws the X-axis on the chart.
   */
  private drawXScale() {
    d3.select('.x').remove();
    d3.select('svg #graph-g')
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${-this.margin.top / 2 + 5})`)
      .call(d3.axisTop(this.isTotalShow ? this.xScaleCollapse : this.xScale));
  }

  /**
   * Updates the chart by redrawing the data and tooltips.
   */
  private updateChart() {
    this.removeScaleLine();
    this.setMaxDomainValue();
    this.drawData();
    this.addTooltip();
  }

  /**
   * Draws the data points (bubbles) on the chart.
   */
  private drawData() {
    d3.selectAll('.country').remove();

    this.isTotalShow
      ? d3
          .select('svg #graph-g')
          .selectAll('.country')
          .data(Object.entries(this.totalByCountry))
          .join('g')
          .attr('class', 'country')
          .attr(
            'transform',
            (d) =>
              `translate(0, ${(this.yScale(d[0]) ?? 0) + this.margin.top / 2})`
          )
          .selectAll('.count')
          .data((d) => [d])
          .join('g')
          .attr('class', 'count')
          .append('circle')
          .attr(
            'transform',
            (d) => `translate(${this.xScaleCollapse('Total')}, 0)`
          )
          .attr('r', (d) => this.sizeScale(d[1]))
          .style('fill', '#50a1df')
      : d3
          .select('svg #graph-g')
          .selectAll('.country')
          .data(Object.entries(this.countByCountry))
          .join('g')
          .attr('class', 'country')
          .attr(
            'transform',
            (d) =>
              `translate(0, ${(this.yScale(d[0]) ?? 0) + this.margin.top / 2})`
          )
          .selectAll('.count')
          .data((d) => Object.entries(d[1]))
          .join('g')
          .attr('class', 'count')
          .append('circle')
          .attr('transform', (d) => `translate(${this.xScale(d[0])}, 0)`)
          .attr('r', (d) => this.sizeScale(d[1]))
          .style('fill', '#50a1df');
  }

  /**
   * Adds tooltips to the data points (bubbles).
   */
  private addTooltip() {
    d3.select('.tooltip').remove();
    const tooltip = d3
      .select('#bubble-chart-container')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', '#fff')
      .style('border', '1px solid #ccc')
      .style('padding', '5px')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    d3.selectAll('circle')
      .on('mouseover', function (event, d) {
        tooltip
          .style('opacity', 1)
          .html(`Drafted Players: ${(d as number[])[1]}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 20}px`);
        d3.select(this).style('stroke', '#000').style('stroke-width', 2);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 20}px`);
      })
      .on('mouseout', function () {
        tooltip.style('opacity', 0);
        d3.select(this).style('stroke', 'none');
      });
  }

  /**
   * Removes unnecessary scale lines and styles the axes.
   */
  private removeScaleLine() {
    d3.selectAll('.axis path').style('opacity', '0');
    d3.selectAll('.axis text')
      .style('font-family', 'Roboto')
      .style('cursor', 'default')
      .style('font-size', '16px');
    d3.selectAll('.tick line').style('visibility', 'hidden');
  }

  /**
   * Handles the slide toggle event to switch between total and grouped views.
   * @param event - The slide toggle change event.
   */
  onSlideToggle(event: MatSlideToggleChange) {
    this.isTotalShow = event.checked;
    this.drawXScale();
    this.updateChart();
  }

  /**
   * Extracts all unique years from the dataset.
   * @param data - The dataset to process.
   */
  private extractYears(data: d3.DSVRowArray<string>) {
    data.forEach((row) => this.allYears.add(Number(row['year'])));
  }

  /**
   * Generates year groups for the X-axis based on the number of groups.
   * @param numGroups - The number of year groups to create.
   */
  private generateYearGroups(numGroups: number) {
    const years = Array.from(this.allYears).sort((a, b) => a - b);
    const groupSize = Math.ceil(years.length / numGroups);

    for (let i = 0; i < numGroups; i++) {
      const start = years[i * groupSize];
      const end = years[Math.min((i + 1) * groupSize - 1, years.length - 1)];
      this.yearGroups.push(`${start}-${end}`);
    }
  }

  /**
   * Aggregates the data by country and year group.
   * @param data - The dataset to process.
   * @returns The aggregated data by country and year group.
   */
  private aggregateDataByCountry(data: d3.DSVRowArray<string>) {
    return data.reduce((acc, row) => {
      const yearGroup = this.yearGroups.find((group) => {
        const [start, end] = group.split('-').map(Number);
        return Number(row['year']) >= start && Number(row['year']) <= end;
      });

      if (!yearGroup) return acc;

      const nationality = row['nationality'];
      acc[nationality] = acc[nationality] || {};
      acc[nationality][yearGroup] = (acc[nationality][yearGroup] || 0) + 1;

      return acc;
    }, {} as Record<string, Record<string, number>>);
  }

  /**
   * Calculates the total counts by country.
   * @param countByCountry - The data aggregated by country and year group.
   * @returns The total counts by country.
   */
  private calculateTotalByCountry(
    countByCountry: Record<string, Record<string, number>>
  ) {
    return Object.entries(countByCountry).reduce((acc, [country, years]) => {
      acc[country] = Object.values(years).reduce(
        (sum, count) => sum + count,
        0
      );
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Filters the top 7 countries and groups the rest into "Others".
   * @param countByCountry - The data aggregated by country and year group.
   * @returns The filtered data with top countries and "Others".
   */
  private filterTopCountries(
    countByCountry: Record<string, Record<string, number>>
  ) {
    const sortedCountries = Object.entries(this.totalByCountry).sort(
      (a, b) => b[1] - a[1]
    );
    const top7 = sortedCountries.slice(0, 7);
    const others = sortedCountries.slice(7);

    const othersCount = others.reduce((acc, [country]) => {
      Object.entries(countByCountry[country]).forEach(([year, count]) => {
        acc[year] = (acc[year] || 0) + count;
      });
      return acc;
    }, {} as Record<string, number>);

    this.totalByCountry = Object.fromEntries([
      ...top7,
      ['Others', others.reduce((sum, [, count]) => sum + count, 0)],
    ]);
    return Object.fromEntries([
      ...top7.map(([country]) => [country, countByCountry[country]]),
      ['Others', othersCount],
    ]);
  }

  /**
   * Gets the sorted list of countries, with "Others" always at the end.
   * @returns The sorted list of countries.
   */
  private getSortedCountries() {
    return Object.keys(this.countByCountry).sort((a, b) => {
      if (a === 'Others') return 1;
      if (b === 'Others') return -1;
      return this.totalByCountry[b] - this.totalByCountry[a];
    });
  }

  /**
   * Sets the maximum domain value for the size scale.
   */
  private setMaxDomainValue() {
    const values = this.isTotalShow
      ? Object.values(this.totalByCountry)
      : Object.values(this.countByCountry).flatMap((country) =>
          Object.values(country)
        );
    this.maxDomainValue = Math.max(...values);
    this.sizeScale.domain([0, this.maxDomainValue]).range([3, 40]);
  }
}
