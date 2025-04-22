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
  // private rowSpacing: number = 70;
  isTotalShow = true;
  private yearGroups: string[] = [];
  private countByCountry: Record<string, Record<string, number>> = {};
  private totalByCountry: Record<string, number> = {};
  private yScale: d3.ScalePoint<string> = d3.scalePoint();
  private xScale: d3.ScalePoint<string> = d3.scalePoint();
  private xScaleCollapse: d3.ScalePoint<string> = d3.scalePoint();
  private sizeScale: d3.ScaleLinear<number, number> = d3.scaleLinear();
  private allYears: Set<number> = new Set();
  private maxDomainValue: number = 0;
  private margin = { top: 40, right: 300, bottom: 40, left: 300 };

  constructor(private dataSrv: DataProcessingService) {}

  ngAfterViewInit() {
    this.preprocess().then((country) => {
      this.countByCountry = country;
      this.buildGraph();
      this.setYScale();
      this.drawYScale();
      this.setXScale();
      this.setXScaleCollapse();
      if (this.isTotalShow) {
        this.drawXScaleCollapse();
      } else {
        this.drawXScale();
      }
      this.setMaxDomainValue();

      this.drawData();
      this.addTooltip();
      this.removeScaleLine();
    });
  }

  async preprocess(): Promise<Record<string, Record<string, number>>> {
    return this.dataSrv.getData().then((data) => {
      if (data) {
        this.getAllYear(data);
        this.getYearGroup(6);

        const countByCountry = Object.entries(
          data.reduce((acc: Record<string, Record<string, number>>, row) => {
            let rowYearGroup = '';
            for (const yearGroup of this.yearGroups) {
              const [start, end] = yearGroup.split('-').map(Number);
              const year = Number(row['year']);
              if (year >= start && year <= end) {
                rowYearGroup = yearGroup;
                break;
              }
            }

            if (!acc[row['nationality']]) {
              acc[row['nationality']] = {};
            }
            acc[row['nationality']][rowYearGroup] =
              (acc[row['nationality']][rowYearGroup] || 0) + 1;

            this.totalByCountry[row['nationality']] =
              (this.totalByCountry[row['nationality']] || 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => this.totalByCountry[b[0]] - this.totalByCountry[a[0]]);

        const top7 = countByCountry.slice(0, 7);

        const othersCount = countByCountry
          .slice(7)
          .reduce((acc: Record<string, number>, entry) => {
            Object.entries(entry[1]).forEach(([key, value]) => {
              acc[key] = acc[key] + value || value;
            });
            return acc;
          }, {});

        const totalSort = Object.entries(this.totalByCountry).sort(
          (a, b) => b[1] - a[1]
        );
        const totalTop7 = totalSort.slice(0, 7);

        const totalOthersCount = totalSort
          .slice(7)
          .reduce((acc: number, entry) => {
            return acc + entry[1];
          }, 0);

        this.totalByCountry = Object.fromEntries(
          totalOthersCount !== null
            ? totalTop7.concat([['Other', totalOthersCount]])
            : totalTop7
        );

        return Object.fromEntries(
          othersCount !== null ? top7.concat([['Other', othersCount]]) : top7
        );
      } else return {};
    });
  }

  buildGraph() {
    const containerNode = d3
      .select('#bubble-chart-container')
      .node() as HTMLElement;

    if (containerNode) {
      const containerBound = containerNode.getBoundingClientRect();
      d3.select('#bubble-chart-container')
        .append('svg')
        .attr('id', 'bubble-chart-svg')
        .attr('width', containerBound.width)
        .attr('height', containerBound.height)
        .append('g')
        .attr('id', 'graph-g')
        .attr(
          'transform',
          `translate(${this.margin.left}, ${this.margin.top})`
        );
    }
  }

  setYScale() {
    const node = d3.select('#bubble-chart-container').node() as HTMLElement;
    if (node) {
      const containerBound = node.getBoundingClientRect();
      this.yScale
        .domain(
          Object.keys(this.countByCountry).sort((a, b) => {
            if (a === 'Other') return 1; // Push 'Other' to the end
            if (b === 'Other') return -1; // Push 'Other' to the end
            return this.totalByCountry[b] - this.totalByCountry[a]; // Sort by count descending
          })
        )
        .range([
          0,
          containerBound.height - this.margin.top - this.margin.bottom,
        ]);
    }
  }

  drawYScale() {
    d3.select('svg #graph-g')
      .append('g')
      .attr('class', 'y axis')
      .attr(
        'transform',
        `translate(${-this.margin.left / 6}, ${this.margin.top / 2})`
      )
      .call(d3.axisLeft(this.yScale));
  }

  setXScale() {
    const node = d3.select('#bubble-chart-container').node() as HTMLElement;
    if (node) {
      const containerBound = node.getBoundingClientRect();
      this.xScale
        .domain(this.yearGroups.map((value) => value.toString()))
        .range([
          0,
          containerBound.width - this.margin.left - this.margin.right,
        ]);
    }
  }

  drawXScale() {
    d3.select('svg #graph-g')
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${-this.margin.top / 2 + 5})`)
      .call(d3.axisTop(this.xScale));
  }

  setXScaleCollapse() {
    const node = d3.select('#bubble-chart-container').node() as HTMLElement;
    if (node) {
      const containerBound = node.getBoundingClientRect();

      this.xScaleCollapse.domain(['Total']).range([0, 0]);
    }
  }

  drawXScaleCollapse() {
    d3.select('svg #graph-g')
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${-this.margin.top / 2 + 5})`)
      .call(d3.axisTop(this.xScaleCollapse));
  }

  getYearGroup(numGroups: number) {
    if (this.allYears.size === 0 || numGroups <= 0) return;

    const maxYear = Math.max(...this.allYears);
    const minYear = Math.min(...this.allYears);
    const groupSize = Math.ceil(this.allYears.size / numGroups);

    for (let i = 0; i < numGroups; i++) {
      const groupStart = minYear + i * groupSize;
      const groupEnd = Math.min(maxYear, groupStart + groupSize - 1);
      this.yearGroups.push(`${groupStart}-${groupEnd}`);

      if (groupEnd === maxYear) {
        break;
      }
    }
  }

  getAllYear(data: d3.DSVRowArray<string>) {
    for (const row of data) {
      if (!this.allYears.has(Number(row['year']))) {
        this.allYears.add(Number(row['year']));
      }
    }
  }

  setMaxDomainValue() {
    if (this.isTotalShow) {
      this.maxDomainValue = Math.max(
        ...Object.values(this.totalByCountry).map((total) => total)
      );
    } else {
      this.maxDomainValue = 0;
      Object.values(this.countByCountry).forEach((country) => {
        Object.values(country).forEach((count) => {
          if (this.maxDomainValue < count) {
            this.maxDomainValue = count;
          }
        });
      });
    }
    this.setSizeScale();
  }

  setSizeScale() {
    this.sizeScale.domain([0, this.maxDomainValue]).range([3, 40]);
  }

  drawData() {
    d3.selectAll('.country').remove();
    if (this.isTotalShow) {
      d3.select('svg #graph-g')
        .append('g')
        .attr('class', 'country')
        .selectAll('.count')
        .data(Object.entries(this.totalByCountry))
        .join('g')
        .attr('class', 'count')
        .append('circle')
        .attr(
          'transform',
          (d) =>
            `translate( ${this.xScaleCollapse('Total')}, ${
              (this.yScale(d[0]) ?? 0) + this.margin.top / 2
            })`
        )
        .attr('r', (d) => this.sizeScale(d[1]))
        .style('fill', '#50a1df');
    } else {
      d3.select('svg #graph-g')
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
  }

  addTooltip() {
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
        const data = d as [string, number];
        tooltip
          .style('opacity', 1)
          .html(`Drafted Players: ${data[1]}`)
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

  removeScaleLine() {
    d3.selectAll('.axis path').style('opacity', '0');
    d3.selectAll('.axis text')
      .style('font-family', 'Roboto')
      .style('cursor', 'default')
      .style('font-size', '16px');
    d3.selectAll('.tick line').style('visibility', 'hidden');
  }

  onSlideToggle(event: MatSlideToggleChange) {
    d3.select('.x').remove();
    if (event.checked) {
      this.drawXScaleCollapse();
    } else {
      this.drawXScale();
    }
    this.removeScaleLine();
    this.setMaxDomainValue();
    this.drawData();
    this.addTooltip();
  }
}
