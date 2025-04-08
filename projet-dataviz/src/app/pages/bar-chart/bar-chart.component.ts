import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css']
})
export class BarChartComponent implements OnInit {
  private originalData: any[] = [];
  private data: any[] = [];
  private svg: any;
  private predefinedNationalities: string[] = ["CA", "US", "FI", "SE", "RU", "Others"];
  private margin = { top: 40, right: 20, bottom: 70, left: 60 };
  private width = 800 - this.margin.left - this.margin.right;
  private height = 500 - this.margin.top - this.margin.bottom;
  selectedCategories: { [key: string]: boolean } = {
    forward: true,      // includes LW, C, RW
    defensemen: true,   // includes D
    goalie: true        // goalie includes G
  };
  positionMapping: { [key: string]: string[] } = {
    forward: ['LW', 'C', 'RW'],
    defensemen: ['D'],
    goalie: ['G']
  };

  constructor() {}

  ngOnInit(): void {
    d3.csv('/assets/nhldraft.csv').then(data => {
      data.forEach((d: any) => {
        const allowed = new Set(["CA", "US", "FI", "SE", "RU"]);
        d['nationality'] = allowed.has(d['nationality']) ? d['nationality'] : "Others";
      });
      
      this.originalData = data;
      
      this.createSvg();
      this.updateFilteredData();
    }).catch(error => {
      console.error('Error loading CSV:', error);
    });
  }

  updateFilteredData(): void {
    let selectedPositions: string[] = [];
    for (let cat in this.selectedCategories) {
      if (this.selectedCategories[cat]) {
        selectedPositions.push(...this.positionMapping[cat]);
      }
    }
    
    let filteredData = this.originalData.filter(d => selectedPositions.includes(d['position']));
    const processedData = this.preprocessData(filteredData);
    this.data = this.countYAxis(processedData);
    
    this.svg.selectAll("*").remove();
    this.drawBars();
  }

  // HTML Button Event Handler
  toggleCategory(cat: string): void {
    this.selectedCategories[cat] = !this.selectedCategories[cat];
    this.updateFilteredData();
  }

  // Addind de decade column to the data
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

  // Counting the amount of points by year for each decade column
  private countYAxis(data: any[]): any[] {
    const aggregatedData: any[] = [];
  
    const nested = d3.rollup(
      data,
      v => d3.sum(v, d => +d.points),
      (d: any) => d.decade,
      (d: any) => d.nationality
    );
  
    nested.forEach((natMap, decade) => {
      const obj: any = { decade };
      let total = 0;
  
      this.predefinedNationalities.forEach(nat => {
        const sum = natMap.get(nat) || 0;
        obj[nat] = sum;
        total += sum;
      });
  
      obj.total = total;
      aggregatedData.push(obj);
    });
  
    return aggregatedData;
  }
  

  private createSvg(): void {
    this.svg = d3.select('figure#barChart')
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
  }

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
  
    rects.on('mouseover', (event: MouseEvent, d: any) => {
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
  
    this.svg.append('g')
      .call(d3.axisLeft(y));
  
    this.addLabels();
  
    this.drawLegend(colorMapping);
  }
  
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
