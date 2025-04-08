import * as d3 from 'd3';
import { Component } from '@angular/core';
import { DataProcessingService } from '../../../services/data-processsing/data-processing.service';
import { Player } from '../../../interfaces/Player';
import { ChartStyleManagerService } from '../../../services/chart-style-manager/chart-style-manager.service';

@Component({
  selector: 'app-beeswarm-chart',
  imports: [],
  templateUrl: './beeswarm-chart.component.html',
  styleUrl: './beeswarm-chart.component.css',
})
export class BeeswarmChartComponent {
  CHART_HEIGTH: number = 800;
  CHART_WIDTH: number = 1000;

  xScale: d3.ScaleLinear<number, number> | undefined;
  yScale: d3.ScalePoint<string> | undefined;
  radiusScale: d3.ScaleLinear<number, number> | undefined;
  currentData: Player[] = [];

  constructor(
    private dataSrv: DataProcessingService,
    private chartStyleSrv: ChartStyleManagerService
  ) {}

  ngAfterViewInit() {
    this.createDraftYearSelector();
    this.updateBeeswarmChart(2010);
  }

  createBeeswarmChart(stat: keyof Player = 'points') {
    d3.select('svg').remove();
    d3.selectAll('.tooltip').remove();

    this.radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(this.currentData, (d) => d[stat]) || 1])
      .range([2, 15]);

    this.xScale = d3
      .scaleLinear()
      .domain([1, d3.max(this.currentData, (d) => d.overall_pick) || 210])
      .range([60, this.CHART_WIDTH - 60]);

    this.yScale = d3
      .scalePoint()
      .domain(this.chartStyleSrv.color.domain())
      .range([100, this.CHART_HEIGTH - 200])
      .padding(1);

    const simulation = d3
      .forceSimulation(this.currentData)
      .force(
        'x',
        d3.forceX((d: Player) => this.xScale!(d.overall_pick)).strength(1)
      )
      .force('y', d3.forceY(this.CHART_HEIGTH / 2).strength(0.8))
      .force(
        'collide',
        d3.forceCollide((d) => this.radiusScale!(d[stat]) + 2)
      )
      .stop();

    for (let i = 0; i < 120; ++i) simulation.tick();

    this.currentData.forEach((d) => {
      d['x0'] = d.x!;
      d['y0'] = d.y!;
    });

    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', '#fff')
      .style('padding', '6px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    const svg = d3
      .select('body')
      .append('svg')
      .attr('id', 'beeswarm-chart')
      .attr('height', this.CHART_HEIGTH)
      .attr('width', this.CHART_WIDTH);

    svg
      .selectAll('.beeswarm-circle')
      .data(this.currentData)
      .join('circle')
      .attr('class', 'beeswarm-circle')
      .attr('cx', (d) => d['x0'])
      .attr('cy', (d) => d['y0'])
      .attr('r', (d) => this.radiusScale!(d[stat]))
      .attr(
        'fill',
        (d) =>
          this.chartStyleSrv.customColors[
            d.nationality as keyof typeof this.chartStyleSrv.customColors
          ]
      )
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5)
      .on('mouseover', (event, d) => {
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip
          .html(
            `<strong>${d.player}</strong><br/>
            Rang: ${d.overall_pick}<br/>
            Points: ${d.points}<br/>
            Buts: ${d.goals}<br/>
            Assists: ${d.assists}<br/>
            Matchs: ${d.games_played}`
          )
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 30 + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition().duration(200).style('opacity', 0);
      });

    svg
      .append('g')
      .attr('transform', `translate(0, ${this.CHART_HEIGTH - 30})`)
      .call(d3.axisBottom(this.xScale).ticks(10))
      .append('text')
      .attr('x', this.CHART_WIDTH / 2)
      .attr('y', 30)
      .attr('fill', '#000')
      .attr('text-anchor', 'middle')
      .text('Rang de sélection');

    this.createLegend();
  }

  transitionView(view: 'default' | 'grouped') {
    const dur = 1000;

    if (view === 'default') {
      d3.selectAll<SVGCircleElement, Player>('.beeswarm-circle')
        .transition()
        .duration(dur)
        .ease(d3.easeCubicInOut)
        .attr('cx', (d) => d['x0'])
        .attr('cy', (d) => d['y0']);
    } else {
      const grouped = d3.group(this.currentData, (d) => d.nationality);

      grouped.forEach((players, nationality) => {
        const y = this.yScale ? this.yScale(nationality)! : 0;

        const sim = d3
          .forceSimulation(players)
          .force(
            'x',
            d3.forceX((d: Player) => this.xScale!(d.overall_pick)).strength(0.5)
          )
          .force('y', d3.forceY(() => y).strength(1))
          .force(
            'collide',
            d3.forceCollide((d) => this.radiusScale!(d.points) + 2)
          )
          .alphaDecay(0.05)
          .stop();

        for (let i = 0; i < 200; ++i) sim.tick();

        players.forEach((d) => {
          d['x1'] = d.x!;
          d['y1'] = d.y!;
        });
      });

      d3.selectAll<SVGCircleElement, Player>('.beeswarm-circle')
        .transition()
        .duration(dur)
        .ease(d3.easeCubicInOut)
        .attr('cx', (d) => d['x1'])
        .attr('cy', (d) => d['y1']);
    }
  }

  createDraftYearSelector() {
    const years = d3.range(1963, 2023);
    const select = d3
      .select('body')
      .append('select')
      .attr('id', 'year-selector')
      .on('change', (event) => {
        const selectedYear = +event.target.value;
        this.updateBeeswarmChart(selectedYear);
      });

    select
      .selectAll('option')
      .data(years)
      .join('option')
      .attr('value', (d) => d)
      .property('selected', (d) => d === 2010)
      .text((d) => d);

    d3.select('body')
      .append('button')
      .text('Grouper par nationalité')
      .on('click', () => this.transitionView('grouped'));

    d3.select('body')
      .append('button')
      .text('Vue par défaut')
      .on('click', () => this.transitionView('default'));
  }

  updateBeeswarmChart(year: number) {
    this.dataSrv.getDataAsPlayer().then((allData: Player[]) => {
      const data = allData.filter((d) => d.year === year);

      data.forEach((d) => {
        if (!this.chartStyleSrv.color.domain().includes(d.nationality)) {
          d.nationality = 'Others';
        }
      });

      this.currentData = data;
      this.createBeeswarmChart();
    });
  }

  createLegend() {
    const colorScale = this.chartStyleSrv.color;
    const colorMap = this.chartStyleSrv.customColors;
    const beeswarmChartSVG = d3.select('#beeswarm-chart');
    if (!beeswarmChartSVG) return;

    const legend = beeswarmChartSVG
      .append('g')
      .attr('transform', `translate(${this.CHART_WIDTH - 150}, 20)`);

    const legendData = colorScale.domain();

    legend
      .selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)
      .each(function (d) {
        d3.select(this)
          .append('circle')
          .attr('cx', 9)
          .attr('cy', 9)
          .attr('r', 9)
          .attr('stroke', '#333')
          .attr('fill', colorMap[d as keyof typeof colorMap]);

        d3.select(this).append('text').attr('x', 25).attr('y', 12).text(d);
      });
  }
}
