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
  isTotalShow = false;
  private yearGroups: string[] = [];
  private countByCountry: Record<string, Record<string, number>> = {};
  private totalByCountry: Record<string, number> = {};
  private yScale = d3.scalePoint<string>();
  private xScale = d3.scalePoint<string>();
  private xScaleCollapse = d3.scalePoint<string>();
  private sizeScale = d3.scaleLinear<number, number>();
  private allYears = new Set<number>();
  private maxDomainValue = 0;
  private margin = { top: 40, right: 300, bottom: 40, left: 300 };

  constructor(private dataSrv: DataProcessingService) {}

  ngAfterViewInit() {
    this.preprocess().then((country) => {
      this.countByCountry = country;
      this.initializeChart();
    });
  }

  private async preprocess(): Promise<Record<string, Record<string, number>>> {
    const data = await this.dataSrv.getData();
    if (!data) return {};

    this.extractYears(data);
    this.generateYearGroups(6);

    const countByCountry = this.aggregateDataByCountry(data);
    this.totalByCountry = this.calculateTotalByCountry(countByCountry);

    return this.filterTopCountries(countByCountry);
  }

  private initializeChart() {
    this.buildGraph();
    this.setYScale();
    this.drawYScale();
    this.setXScales();
    this.drawXScale();
    this.updateChart();
  }

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

  private drawXScale() {
    d3.select('.x').remove();
    d3.select('svg #graph-g')
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${-this.margin.top / 2 + 5})`)
      .call(d3.axisTop(this.isTotalShow ? this.xScaleCollapse : this.xScale));
  }

  private updateChart() {
    this.removeScaleLine();
    this.setMaxDomainValue();
    this.drawData();
    this.addTooltip();
  }

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

  private removeScaleLine() {
    d3.selectAll('.axis path').style('opacity', '0');
    d3.selectAll('.axis text')
      .style('font-family', 'Roboto')
      .style('cursor', 'default')
      .style('font-size', '16px');
    d3.selectAll('.tick line').style('visibility', 'hidden');
  }

  onSlideToggle(event: MatSlideToggleChange) {
    this.isTotalShow = event.checked;
    this.drawXScale();
    this.updateChart();
  }

  private extractYears(data: d3.DSVRowArray<string>) {
    data.forEach((row) => this.allYears.add(Number(row['year'])));
  }

  private generateYearGroups(numGroups: number) {
    const years = Array.from(this.allYears).sort((a, b) => a - b);
    const groupSize = Math.ceil(years.length / numGroups);

    for (let i = 0; i < numGroups; i++) {
      const start = years[i * groupSize];
      const end = years[Math.min((i + 1) * groupSize - 1, years.length - 1)];
      this.yearGroups.push(`${start}-${end}`);
    }
  }

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
      ['Other', others.reduce((sum, [, count]) => sum + count, 0)],
    ]);
    return Object.fromEntries([
      ...top7.map(([country]) => [country, countByCountry[country]]),
      ['Other', othersCount],
    ]);
  }

  private getSortedCountries() {
    return Object.keys(this.countByCountry).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return this.totalByCountry[b] - this.totalByCountry[a];
    });
  }

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
