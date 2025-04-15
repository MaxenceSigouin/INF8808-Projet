import * as d3 from 'd3';
import { Component } from '@angular/core';
import { DataProcessingService } from '../../../services/data-processsing/data-processing.service';

@Component({
  selector: 'app-bubble-chart',
  imports: [],
  templateUrl: './bubble-chart.component.html',
  styleUrl: './bubble-chart.component.css',
})
export class BubbleChartComponent {
  // private rowSpacing: number = 70;
  private yearGroups: string[] = [];
  private countByCountry: Record<string, Record<string, number>> = {};
  private yScale: d3.ScalePoint<string> = d3.scalePoint();
  private xScale: d3.ScalePoint<string> = d3.scalePoint();
  private sizeScale: d3.ScalePower<number, number> = d3.scaleSqrt();
  private allYears: Set<number> = new Set();
  private margin = { top: 40, right: 350, bottom: 40, left: 350 };

  constructor(private dataSrv: DataProcessingService) {}

  ngAfterViewInit() {
    this.preprocess().then((country) => {
      this.countByCountry = country;
      console.log(this.countByCountry);
      this.buildGraph();
      this.setYScale();
      this.drawYScale();
      this.setXScale();
      this.drawXScale();
      this.setSizeScale();

      this.drawData();

      d3.selectAll('.axis path').style('opacity', '0');
      d3.selectAll('.axis text')
        .style('font-family', 'Roboto')
        .style('cursor', 'default');
      d3.selectAll('.tick line').style('visibility', 'hidden');
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
            acc[row['nationality']]['total'] =
              (acc[row['nationality']]['total'] || 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1]['total'] - a[1]['total']);

        const top7 = countByCountry.slice(0, 7);

        const othersCount = countByCountry
          .slice(7)
          .reduce((acc: Record<string, number>, entry) => {
            Object.entries(entry[1]).forEach(([key, value]) => {
              acc[key] = acc[key] + value || value;
            });
            return acc;
          }, {});

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
            return (
              this.countByCountry[b]['total'] - this.countByCountry[a]['total']
            ); // Sort by count descending
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
        `translate(${-this.margin.left / 4}, ${this.margin.top / 2})`
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
      .attr('transform', `translate(0, ${-this.margin.top / 2})`)
      .call(d3.axisTop(this.xScale));
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

  setSizeScale() {
    const maxTotal = Math.max(
      ...Object.values(this.countByCountry).map(
        (countryData) => countryData['total']
      )
    );
    this.sizeScale.domain([0, maxTotal]).range([0, 40]);
  }

  drawData() {
    console.log(Object.entries(this.countByCountry));
    d3.select('svg #graph-g')
      .selectAll('.country')
      .data(Object.entries(this.countByCountry))
      .join('g')
      .attr('class', 'country')
      .attr(
        'transform',
        (d) => `translate(0, ${(this.yScale(d[0]) ?? 0) + this.margin.top / 2})`
      )
      .selectAll('.count')
      .data((d) => Object.entries(d[1]))
      .join('g')
      .attr('class', 'count')
      .append('circle')
      .attr('transform', (d) => `translate(${this.xScale(d[0])}, 0)`)
      .attr('r', (d) => this.sizeScale(d[1]))
      .on('mouseover', () => {});
    // .attr('transform', d => `translate(${this.xScale(d[1])}, ${})`);
  }
}
