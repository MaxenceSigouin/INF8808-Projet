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
  // Save the union of nationalities for stacking.
  private nationalities: string[] = [];
  // Define margins and dimensions for the chart.
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
      // Now aggregate the data by decade and nationality.
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
        const decadeStart = Math.floor(year / 10) * 10;
        const decadeEnd = decadeStart + 9;
        d['decade'] = `${decadeStart}-${decadeEnd}`;
      }
      return d;
    });
  }

  /**
   * Aggregates the data by decade, breaking down the count by nationality.
   *
   * This method uses d3.rollup to first group the data by decade, then by nationality,
   * which results in a nested Map. We then convert this nested structure into an array
   * of objects. Each object has a 'decade' field, a 'total' field (the overall count for that decade),
   * and one property per nationality containing the count for that nationality.
   *
   * The array is sorted in descending order (most recent decades first).
   */
  private countYAxis(data: any[]): any[] {
    // Create a nested Map of: decade => (nationality => count).
    const nested = d3.rollup(data, v => v.length, (d: any) => d.decade, (d: any) => d.nationality);

    // Determine the union of all nationalities.
    const natSet = new Set<string>();
    data.forEach(d => natSet.add(d.nationality));
    this.nationalities = Array.from(natSet);

    const aggregatedData: any[] = [];
    // Convert the nested Map into an array of objects.
    nested.forEach((natMap, decade) => {
      const obj: any = { decade };
      let total = 0;
      // For each nationality (ensure all are represented even if zero)
      this.nationalities.forEach(nat => {
        const count = natMap.get(nat) || 0;
        obj[nat] = count;
        total += count;
      });
      obj.total = total;
      aggregatedData.push(obj);
    });

    // Sort the array by decade (descending order based on the starting year of the decade).
    aggregatedData.sort((a, b) => {
      const startA = parseInt(a.decade.split('-')[0]);
      const startB = parseInt(b.decade.split('-')[0]);
      return startB - startA;
    });

    return aggregatedData;
  }

  private createSvg(): void {
    // Create the SVG container inside the element with id "barChart".
    this.svg = d3.select('figure#barChart')
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
  }

  /**
   * Draws a stacked bar chart.
   * Each bar represents a decade; within each bar, segments (stacks) represent counts for each nationality.
   */
  private drawBars(): void {
    // Create the X scale using the decades.
    const x = d3.scaleBand()
      .domain(this.data.map((d: any) => d.decade))
      .range([0, this.width])
      .padding(0.2);

    // Y scale: based on the total counts per decade.
    const maxTotal = d3.max(this.data, (d: any) => d.total)!;
    const y = d3.scaleLinear()
      .domain([0, maxTotal])
      .range([this.height, 0]);

    // Create a color scale for the nationalities.
    const color = d3.scaleOrdinal()
      .domain(this.nationalities)
      .range(d3.schemeCategory10);

    // Prepare the data for stacking.
    const stack = d3.stack().keys(this.nationalities);
    const stackedData = stack(this.data);

    // Draw the stacked bars.
    this.svg.selectAll("g.layer")
      .data(stackedData)
      .enter()
      .append("g")
      .attr("class", "layer")
      .attr("fill", (d: any) => color(d.key))
      .selectAll("rect")
      .data((d: any) => d)
      .enter()
      .append("rect")
      .attr("x", (d: any) => x(d.data.decade)!)
      .attr("y", (d: any) => y(d[1]))
      .attr("height", (d: any) => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());

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
