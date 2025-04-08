import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css']
})
export class BarChartComponent implements OnInit {
  private originalData: any[] = [];  // Keep full copy of the CSV data.
  private data: any[] = [];          // Data that will be processed and used for the chart.
  private svg: any;
  // Predefined list for stacking and ordering (colors are used for nationalities).
  private predefinedNationalities: string[] = ["CA", "US", "FI", "SE", "RU", "Others"];

  // Define margins and dimensions for the chart.
  private margin = { top: 40, right: 20, bottom: 70, left: 60 };
  private width = 800 - this.margin.left - this.margin.right;
  private height = 500 - this.margin.top - this.margin.bottom;

  // Define position filter state (all selected by default).
  selectedCategories: { [key: string]: boolean } = {
    forward: true,      // forward includes LW, C, RW
    defensemen: true,   // defensemen includes D
    goalie: true        // goalie includes G
  };

  // Map each category to the actual positions.
  positionMapping: { [key: string]: string[] } = {
    forward: ['LW', 'C', 'RW'],
    defensemen: ['D'],
    goalie: ['G']
  };

  constructor() {}

  ngOnInit(): void {
    // Load the CSV data from the assets folder.
    d3.csv('/assets/nhldraft.csv').then(data => {
      // Convert numeric fields; adjust field names as needed.
      data.forEach((d: any) => {
        d['overall_pick'] = +d['overall_pick'];  // Convert overall_pick to number
        d['year'] = +d['year']; // Convert year to number

        // Normalize nationality: If not one of the predefined, mark it as 'Others'.
        const allowed = new Set(["CA", "US", "FI", "SE", "RU"]);
        d['nationality'] = allowed.has(d['nationality']) ? d['nationality'] : "Others";
      });
      
      // Keep a copy of the original data.
      this.originalData = data;
      
      // Create the SVG element once.
      this.createSvg();
      // Filter the data with default selected positions and update the chart.
      this.updateFilteredData();
    }).catch(error => {
      console.error('Error loading CSV:', error);
    });
  }

  /**
   * This method applies the current position filter, processes the filtered data,
   * aggregates it, and redraws the chart.
   */
  updateFilteredData(): void {
    // Collect positions to include based on the selected categories.
    let selectedPositions: string[] = [];
    for (let cat in this.selectedCategories) {
      if (this.selectedCategories[cat]) {
        selectedPositions.push(...this.positionMapping[cat]);
      }
    }
    
    // Filter the original data so only rows with the desired positions remain.
    let filteredData = this.originalData.filter(d => selectedPositions.includes(d['position']));
    
    // Process the filtered data
    const processedData = this.preprocessData(filteredData);
    // Aggregate the processed data by decade and nationality.
    this.data = this.countYAxis(processedData);
    
    // Redraw the chart: clear the existing SVG content and redraw.
    this.svg.selectAll("*").remove();
    this.drawBars();
  }

  /**
   * Toggle a given category (forward, defensemen, goalie) when a user clicks a button.
   * This will update the filtered data and redraw the chart.
   *
   * @param cat - The category to toggle.
   */
  toggleCategory(cat: string): void {
    this.selectedCategories[cat] = !this.selectedCategories[cat];
    this.updateFilteredData();
  }

  /**
   * Adds a 'decade' field to each record.
   * For years 2020-2022, assigns "2020-2022".
   * For others, groups by full decades (e.g., "1960-1969").
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
   * Aggregates the data by decade, further breaking down the count by nationality.
   * Returns an array of objects where each object has:
   * - decade: string (e.g., "1960-1969" or "2020-2022")
   * - total: number (the overall count for that decade)
   * - one property per nationality (the count for that nationality)
   *
   * The resulting array is sorted by decade in descending order.
   */
  private countYAxis(data: any[]): any[] {
    // Create a nested Map: decade => (nationality => count)
    const nested = d3.rollup(
      data,
      v => v.length,
      (d: any) => d.decade,
      (d: any) => d.nationality
    );

    const aggregatedData: any[] = [];
    // Convert the nested Map into an array of objects.
    nested.forEach((natMap, decade) => {
      const obj: any = { decade };
      let total = 0;
      // Iterate over all predefined nationalities to ensure each is represented.
      this.predefinedNationalities.forEach(nat => {
        const count = natMap.get(nat) || 0;
        obj[nat] = count;
        total += count;
      });
      obj.total = total;
      aggregatedData.push(obj);
    });

    // Sort the decades (most recent first) by extracting the starting year.
    aggregatedData.sort((a, b) => {
      const startA = parseInt(a.decade.split('-')[0]);
      const startB = parseInt(b.decade.split('-')[0]);
      return startB - startA;
    });

    return aggregatedData;
  }

  /**
   * Creates the SVG container inside the element with id "barChart".
   */
  private createSvg(): void {
    this.svg = d3.select('figure#barChart')
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
  }

  /**
   * Draws the stacked bar chart. Each bar is a decade and is divided by nationality.
   */
  private drawBars(): void {
    // Create the X scale with decades.
    const x = d3.scaleBand()
      .domain(this.data.map((d: any) => d.decade))
      .range([0, this.width])
      .padding(0.2);
  
    // Y scale: based on the total counts per decade.
    const maxTotal = d3.max(this.data, (d: any) => d.total)!;
    const y = d3.scaleLinear()
      .domain([0, maxTotal])
      .range([this.height, 0]);
  
    // Predefined color mapping for nationalities.
    const colorMapping: Record<string, string> = {
      "CA": "red",
      "US": "darkblue",
      "FI": "lightblue",
      "SE": "yellow",
      "RU": "black",
      "Others": "green"
    };
  
    // Prepare the data for stacking based on predefined nationalities.
    const stack = d3.stack().keys(this.predefinedNationalities);
    const stackedData = stack(this.data);
  
    // Draw the stacked bars.
    const layer = this.svg.selectAll("g.layer")
      .data(stackedData)
      .enter()
      .append("g")
      .attr("class", "layer")
      .attr("fill", (d: any) => colorMapping[d.key]);
  
    const rects = layer.selectAll("rect")
      .data((d: any) => d)
      .enter()
      .append("rect")
      .attr("x", (d: any) => x(d.data.decade)!)
      .attr("y", (d: any) => y(d[1]))
      .attr("height", (d: any) => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());
  
    // Create a tooltip div that is hidden by default.
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('border', '1px solid #ccc')
      .style('padding', '10px')
      .style('pointer-events', 'none');
  
    // Attach mouse events to show and hide tooltip.
    rects.on('mouseover', (event: MouseEvent, d: any) => {
      // Build a stats string using the aggregated values for each nationality.
      // These values are the same for the whole bar since d.data represents the aggregated data.
      const stats = this.predefinedNationalities
        .map(nat => `${nat}: ${d.data[nat]}`)
        .join('<br/>');
  
      tooltip.transition()
        .duration(200)
        .style('opacity', 0.9);
  
      tooltip.html(`<strong>${d.data.decade}</strong><br/>${stats}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => {
      tooltip.transition()
        .duration(500)
        .style('opacity', 0);
    });
  
    // Add the X axis.
    this.svg.append('g')
      .attr('transform', `translate(0, ${this.height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end');
  
    // Add the Y axis.
    this.svg.append('g')
      .call(d3.axisLeft(y));
  
    // Add chart titles and labels.
    this.addLabels();
  
    // Draw the legend.
    this.drawLegend(colorMapping);
  }
  
  /**
   * Adds a legend to the chart with a colored rectangle and label for each predefined nationality.
   *
   * @param colorMapping A mapping of nationality keys to their associated colors.
   */
  private drawLegend(colorMapping: Record<string, string>): void {
    // Adjust the legend placement as needed; here, we position it near the top-right corner.
    const legend = this.svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${this.width - 100}, 0)`);

    this.predefinedNationalities.forEach((nat, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
      
      legendRow.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", colorMapping[nat]);
      
      legendRow.append("text")
        .attr("x", 24)
        .attr("y", 14)
        .text(nat);
    });
  }

  /**
   * Adds titles and axis labels to the chart.
   */
  private addLabels(): void {
    // Chart title.
    this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', -this.margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text('Number of Points by Decade');

    // X-axis label.
    this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', this.height + this.margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Decade');

    // Y-axis label.
    this.svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -this.height / 2)
      .attr('y', -this.margin.left + 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Number of Points');
  }
}
