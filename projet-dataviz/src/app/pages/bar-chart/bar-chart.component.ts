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
  private margin = { top: 40, right: 20, bottom: 70, left: 60 };
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
      
      // Pre-process the data to add a decade property.
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
   * Records with year >= 2020 and <= 2022 will be set to "2020-2022",
   * while all others are grouped by full decades (e.g., "1960-1969").
   */
  private preprocessData(data: any[]): any[] {
    return data.map(d => {
      const year = +d['year'];
      if (year >= 2020 && year <= 2022) {
        d['decade'] = "2020-2022";
      } else {
        // Determine the starting year of the decade.
        const decadeStart = Math.floor(year / 10) * 10;
        const decadeEnd = decadeStart + 9;
        d['decade'] = `${decadeStart}-${decadeEnd}`;
      }
      return d;
    });
  }

  /**
   * Aggregates the data by decade, counting the number of entries per decade.
   * Returns an array where each object has the fields:
   * - decade: string (e.g. "1960-1969" or "2020-2022")
   * - total: number (the count of points/entries for that decade)
   *
   * The resulting array is sorted in descending order based on the
   * starting year of the decade.
   */
  private countYAxis(data: any[]): any[] {
    // Use d3.rollup to create a Map with decade as key and number of records as value.
    const aggregatedMap = d3.rollup(data, v => v.length, (d: any) => d.decade);
    // Convert the Map into an array of objects.
    let aggregatedData = Array.from(aggregatedMap, ([decade, total]) => ({ decade, total }));

    // Sort the decades in descending order.
    aggregatedData.sort((a, b) => {
      // Extract the starting year from the decade strings.
      const startA = parseInt(a.decade.split('-')[0]);
      const startB = parseInt(b.decade.split('-')[0]);
      return startB - startA;
    });

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

    // Add titles and axis labels.
    this.addLabels();
  }

  /**
   * Adds a title to the chart and labels for the x and y axes.
   */
  private addLabels(): void {
    // Add chart title.
    this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', -this.margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text('Number of Points by Decade');

    // Add X-axis label.
    this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', this.height + this.margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Decade');

    // Add Y-axis label.
    this.svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -this.height / 2)
      .attr('y', -this.margin.left + 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Number of Points');
  }
}
