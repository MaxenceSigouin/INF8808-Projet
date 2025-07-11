import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { ChartStyleManagerService } from '../../services/chart-style-manager/chart-style-manager.service';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-bar-chart',
  imports: [
    MatButtonToggleModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css'],
})
export class BarChartComponent implements OnInit {
  // Original data loaded from the CSV file
  private originalData: any[] = [];

  // Processed data for the chart
  private data: any[] = [];

  // D3 SVG container
  private svg: any;

  // Predefined nationalities for the legend
  private predefinedNationalities: string[] = [];

  // Form control for selecting positions
  positionsControl = new FormControl<string[]>([
    'forward',
    'defensemen',
    'goalie',
  ]);

  // Margins for the chart
  private margin = { top: 80, right: 80, bottom: 90, left: 150 };

  // Chart dimensions
  private width =
    window.innerWidth - this.margin.left - this.margin.right - 320;
  private height =
    window.innerHeight - this.margin.top - this.margin.bottom - 200;

  // Selected categories for filtering
  selectedCategories: { [key: string]: boolean } = {
    forward: true, // includes LW, C, RW
    defensemen: true, // includes D
    goalie: true, // includes G
  };

  // Mapping of positions to their respective categories
  positionMapping: { [key: string]: string[] } = {
    forward: ['LW', 'C', 'RW'],
    defensemen: ['D'],
    goalie: ['G'],
  };

  // Currently selected position
  positionSelected: string = 'forward';

  constructor(private chartStyleSrv: ChartStyleManagerService) {}

  /**
   * Lifecycle hook that initializes the chart.
   * Loads the data, creates the SVG container, and sets up resize handling.
   */
  ngOnInit(): void {
    this.predefinedNationalities = this.chartStyleSrv.color.domain();
    d3.csv('/assets/nhldraft.csv')
      .then((data) => {
        // Process the data to group non-predefined nationalities into "Others"
        data.forEach((d: any) => {
          if (!this.chartStyleSrv.color.domain().includes(d['nationality'])) {
            d['nationality'] = 'Others';
          }
        });

        this.originalData = data;

        this.createSvg();
        this.updateFilteredData();

        // Add a resize listener to handle window resizing
        window.addEventListener('resize', () => this.onResize());
      })
      .catch((error) => {
        console.error('Error loading CSV:', error);
      });
  }

  /**
   * Handles window resizing by recalculating dimensions and redrawing the chart.
   */
  private onResize(): void {
    // Recalculate dimensions
    this.width = window.innerWidth - this.margin.left - this.margin.right - 100;
    this.height =
      window.innerHeight - this.margin.top - this.margin.bottom - 200;

    // Remove the existing SVG and redraw the chart
    d3.select('figure#barChart').select('svg').remove();
    this.createSvg();
    this.updateFilteredData();
  }

  /**
   * Updates the filtered data based on the selected positions and redraws the chart.
   */
  updateFilteredData(): void {
    let selectedPositions: string[] = [];
    this.positionsControl.value?.forEach((postion: string) => {
      selectedPositions.push(...this.positionMapping[postion]);
    });

    // Filter the data based on the selected positions
    let filteredData = this.originalData.filter(
      (d) => selectedPositions.includes(d['position'] as string) ?? false
    );

    // Preprocess and aggregate the data
    const processedData = this.preprocessData(filteredData);
    this.data = this.countYAxis(processedData);

    // Clear the SVG and redraw the bars
    this.svg.selectAll('*').remove();
    this.drawBars();
  }

  // HTML Button Event Handler
  toggleCategory(cat: string): void {
    this.selectedCategories[cat] = !this.selectedCategories[cat];
    const string = this.positionsControl.value;
    this.updateFilteredData();
  }

  // Addind de decade column to the data
  private preprocessData(data: any[]): any[] {
    return data
      .map((d) => {
        const year = +d['year'];
        if (year >= 2020 && year <= 2022) {
          return null; // Remove this entry
        } else {
          const decadeStart = Math.floor(year / 10) * 10;
          const decadeEnd = decadeStart + 9;
          d['decade'] = `${decadeStart}-${decadeEnd}`;
          return d;
        }
      })
      .filter((d) => d !== null); // Remove nulls
  }

  /**
   * Aggregates the data by decade and nationality, calculating the total points.
   * @param data - The preprocessed data.
   * @returns The aggregated data.
   */
  private countYAxis(data: any[]): any[] {
    const aggregatedData: any[] = [];

    // Group and sum the data by decade and nationality
    const nested = d3.rollup(
      data,
      (v) => d3.sum(v, (d) => +d.points),
      (d: any) => d.decade,
      (d: any) => d.nationality
    );

    // Format the aggregated data
    nested.forEach((natMap, decade) => {
      const obj: any = { decade };
      let total = 0;

      this.predefinedNationalities.forEach((nat) => {
        const sum = natMap.get(nat) || 0;
        obj[nat] = sum;
        total += sum;
      });

      obj.total = total;
      aggregatedData.push(obj);
    });

    return aggregatedData;
  }

  /**
   * Creates the SVG container for the chart.
   */
  private createSvg(): void {
    this.svg = d3
      .select('figure#barChart')
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
  }

  /**
   * Draws the stacked bar chart.
   */
  private drawBars(): void {
    // Create the X scale with decades
    const x = d3
      .scaleBand()
      .domain(
        this.data
          .slice() // Create a copy to avoid mutating original
          .sort((a: any, b: any) => {
            const aStart = parseInt(a.decade.split('-')[0]);
            const bStart = parseInt(b.decade.split('-')[0]);
            return aStart - bStart;
          })
          .map((d: any) => d.decade)
      )
      .range([0, this.width])
      .padding(0.2);

    // Create the Y scale based on the total counts per decade
    const maxTotal = d3.max(this.data, (d: any) => d.total)!;
    const y = d3.scaleLinear().domain([0, maxTotal]).range([this.height, 0]);

    // Use colors from ChartStyleManagerService
    const colorMapping = this.chartStyleSrv.customColors;

    // Prepare the data for stacking based on predefined nationalities
    const stack = d3.stack().keys(this.predefinedNationalities);
    const stackedData = stack(this.data);

    // Draw the stacked bars
    const layer = this.svg
      .selectAll('g.layer')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('class', 'layer')
      .attr(
        'fill',
        (d: { key: keyof typeof colorMapping }) => colorMapping[d.key]
      );

    const rects = layer
      .selectAll('rect')
      .data((d: any) => d)
      .enter()
      .append('rect')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('x', (d: any) => x(d.data.decade)!)
      .attr('y', (d: any) => y(d[1]))
      .attr('height', (d: any) => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth());

    // Add tooltip functionality
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('border', '1px solid #ccc')
      .style('padding', '10px')
      .style('pointer-events', 'none');

    rects
      .on('mouseover', (event: MouseEvent, d: any) => {
        const stats = this.predefinedNationalities
          .map((nat) => `${nat}: ${d.data[nat]}`)
          .join('<br/>');

        tooltip.transition().duration(200).style('opacity', 0.9);

        tooltip
          .html(`<strong>${d.data.decade}</strong><br/>${stats}`)
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition().duration(500).style('opacity', 0);
      });

    // Add the X axis
    this.svg
      .append('g')
      .attr('transform', `translate(0, ${this.height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '14px');

    // Add the Y axis
    this.svg
      .append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('font-size', '14px');

    this.addLabels();

    this.drawLegend(colorMapping);
  }

  /**
   * Draws the legend for the chart.
   * @param colorMapping - The mapping of nationalities to colors.
   */
  private drawLegend(colorMapping: Record<string, string>): void {
    const legend = this.svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${this.width - 100}, 0)`);

    this.chartStyleSrv.color.domain().forEach((nat, i) => {
      const legendRow = legend
        .append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendRow
        .append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', colorMapping[nat]);

      legendRow.append('text').attr('x', 24).attr('y', 14).text(nat);
    });
  }

  /**
   * Adds labels to the chart, including the title and axis labels.
   */
  private addLabels(): void {
    // Chart title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', -this.margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('font-family', 'Orbitron')
      .text('How NHL Draft Nationalities Performed Across Decades (1963–2022)');

    // X-axis label
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', this.height + this.margin.bottom)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .text('Decade');

    // Y-axis label
    this.svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -this.height / 2)
      .attr('y', -this.margin.left + 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .text('Number of Points');
  }
}
