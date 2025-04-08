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
        // If you want to chart another field, do the conversion here too.
      });
      this.data = data;
      this.createSvg();
      this.drawBars();
    }).catch(error => {
      console.error('Error loading CSV:', error);
    });
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
    // Create the X scale using player names (or another unique field)
    const x = d3.scaleBand()
      .domain(this.data.map(d => d.player))
      .range([0, this.width])
      .padding(0.2);

    // Create the Y scale using overall pick. Using d3.max for the domain.
    // If using a metric where lower values are "better" (like overall_pick), you may wish to invert the scale.
    const y = d3.scaleLinear()
      .domain([0, d3.max(this.data, d => d.overall_pick)!])
      .range([this.height, 0]);

    // Append bars (rectangles) for each data entry.
    this.svg.selectAll('rect')
      .data(this.data)
      .enter()
      .append('rect')
      .attr('x', (d: any) => x(d.player)!)
      .attr('y', (d: any) => y(d.overall_pick))
      .attr('width', x.bandwidth())
      .attr('height', (d: any) => this.height - y(d.overall_pick))
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
