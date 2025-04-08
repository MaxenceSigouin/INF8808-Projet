import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css']
})
export class BarChartComponent implements OnInit {
  private data: any[] = [];
  private svg: any;
  // Define margins and dimensions for the chart
  private margin = { top: 20, right: 20, bottom: 70, left: 50 };
  private width = 800 - this.margin.left - this.margin.right;
  private height = 500 - this.margin.top - this.margin.bottom;

  constructor() {}

  ngOnInit(): void {
    // Load the CSV data from the assets folder.
    d3.csv('/assets/nhldraft.csv').then(data => {
      // Convert numeric fields; adjust field names as needed.
      data.forEach((d: any) => {
        d['overall_pick'] = +d['overall_pick'];  // Convert overall_pick to number
        d['year'] = +d['year']; // Convert year to number
      });
      this.data = data;
      
      // Pre-process the data to add a decade property. For this example, we are grouping full decades.
      this.data = this.preprocessData(this.data);
      // Now aggregate the data: count the number of records per decade.
      this.data = this.countYAxis(this.data);
      
      this.createSvg();
      this.drawBars();
    }).catch(error => {
      console.error('Error loading CSV:', error);
    });
  }

  /**
   * Adds a 'decade' field to each record.
   * Groups the years into full decades. For example: 1960-1969, 1970-1979, etc.
   */
  private preprocessData(data: any[]): any[] {
    return data.map(d => {
      const year = +d['year'];
      // Determine the starting year of the decade.
      const decadeStart = Math.floor(year / 10) * 10;
      const decadeEnd = decadeStart + 9;
      // Create a new field 'decade'
      d['decade'] = `${decadeStart}-${decadeEnd}`;
      return d;
    });
  }

  /**
   * Aggregates the data by decade, counting the number of entries per decade.
   * Returns an array where each object has the fields:
   * - decade: string (e.g. "1960-1969")
   * - total: number (the count of points/entries for that decade)
   */
  private countYAxis(data: any[]): any[] {
    // Use d3.rollup to create a Map with decade as key and number of records as value.
    const aggregatedMap = d3.rollup(data, v => v.length, (d: any) => d.decade);
    // Convert the Map into an array of objects.
    const aggregatedData = Array.from(aggregatedMap, ([decade, total]) => ({ decade, total }));
    return aggregatedData;
  }

  private createSvg(): void {
    // Create the SVG container inside the element with id "barChart"
    this.svg = d3.select('figure#barChart')
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
  }

  private drawBars(): void {
    // Create the X scale using the decades.
    const x = d3.scaleBand()
      .domain(this.data.map(d => d.decade))
      .range([0, this.width])
      .padding(0.2);

    // Create the Y scale using the aggregated count.
    const y = d3.scaleLinear()
      .domain([0, d3.max(this.data, d => d.total)!])
      .range([this.height, 0]);

    // Append bars (rectangles) for each decade's total count.
    this.svg.selectAll('rect')
      .data(this.data)
      .enter()
      .append('rect')
      .attr('x', (d: any) => x(d.decade)!)
      .attr('y', (d: any) => y(d.total))
      .attr('width', x.bandwidth())
      .attr('height', (d: any) => this.height - y(d.total))
      .attr('fill', '#69b3a2');

    // Add the X axis to the bottom of the chart.
    this.svg.append('g')
      .attr('transform', `translate(0, ${this.height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end');

    // Add the Y axis.
    this.svg.append('g')
      .call(d3.axisLeft(y));
  }
}
