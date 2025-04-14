import * as d3 from 'd3';
import { Component } from '@angular/core';
import { DataProcessingService } from '../../../services/data-processsing/data-processing.service';
import { Player } from '../../../interfaces/Player';
import { ChartStyleManagerService } from '../../../services/chart-style-manager/chart-style-manager.service';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
@Component({
  selector: 'app-beeswarm-chart',
  imports: [
    MatButtonToggleModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  templateUrl: './beeswarm-chart.component.html',
  styleUrl: './beeswarm-chart.component.css',
})
export class BeeswarmChartComponent {
  DEFAULT_CHART_HEIGTH: number = window.innerHeight - 100; // Default to 800 if window height is unavailable
  DEFAULT_CHART_WIDTH: number = window.innerWidth - 100;
  VIEW_BY_NATION_CHART_HEIGTH: number = 1400;
  VIEW_BY_NATION_CHART_WIDTH: number = window.innerWidth - 100;
  viewSelected: string = 'default';
  xScale: d3.ScaleLinear<number, number> | undefined;
  yScale: d3.ScalePoint<string> | undefined;
  radiusScale: d3.ScaleLinear<number, number> | undefined;
  currentData: Player[] = [];
  draftYears: number[] = [];
  draftYearSelected: number = 2010;

  constructor(
    private dataSrv: DataProcessingService,
    private chartStyleSrv: ChartStyleManagerService
  ) {}

  ngAfterViewInit() {
    this.updateDraftYearsAvailable();
    this.updateBeeswarmChart(this.draftYearSelected);
  }

  createBeeswarmChart(stat: keyof Player = 'points') {
    d3.select('svg').remove();
    d3.selectAll('.tooltip').remove();

    this.radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(this.currentData, (d) => d[stat]) || 1])
      .range([5, 35]);

    this.xScale = d3
      .scaleLinear()
      .domain([1, d3.max(this.currentData, (d) => d.overall_pick) || 220])
      .range([200, this.DEFAULT_CHART_WIDTH - 80]);

    this.yScale = d3
      .scalePoint()
      .domain(this.chartStyleSrv.color.domain())
      .range([200, this.DEFAULT_CHART_HEIGTH - 100]);

    const simulation = d3
      .forceSimulation(this.currentData)
      .force(
        'x',
        d3.forceX((d: Player) => this.xScale!(d.overall_pick)).strength(1)
      )
      .force('y', d3.forceY(this.DEFAULT_CHART_HEIGTH / 2).strength(1))
      .force(
        'collide',
        d3.forceCollide((d) => this.radiusScale!(d[stat]))
      )
      .stop();

    for (let i = 0; i < 300; ++i) simulation.tick();

    this.currentData.forEach((d) => {
      d['x0'] = d.x!;
      d['y0'] = d.y!;
    });

    const tooltip = d3
      .select('#beeswarm-container')
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
      .select('#beeswarm-container')
      .append('svg')
      .attr('id', 'beeswarm-chart')
      .attr('height', this.DEFAULT_CHART_HEIGTH)
      .attr('width', this.DEFAULT_CHART_WIDTH);

    svg
      .selectAll('.beeswarm-circle')
      .data(this.currentData)
      .join('circle')
      .attr('class', 'beeswarm-circle')
      .attr('cx', (d) => d['x0'])
      .attr('cy', (d) => d['y0'])
      .attr('r', (d) => {
        return this.radiusScale!(d[stat]);
      })
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
      .attr('id', 'x-axis')
      .attr('transform', `translate(0, ${this.DEFAULT_CHART_HEIGTH - 40})`)
      .call(d3.axisBottom(this.xScale).ticks(10))
      .attr('font-size', '16px')
      .append('text')
      .attr('x', this.DEFAULT_CHART_WIDTH / 2)
      .attr('y', 40)
      .attr('fill', '#000')
      .attr('font-size', '16px')
      .attr('text-anchor', 'middle')
      .text('Overall Pick');

    svg
      .selectAll('.x-axis-line')
      .data(this.xScale ? this.xScale.ticks(10) : [])
      .enter()
      .append('line')
      .attr('class', 'x-axis-line')
      .attr('x1', (d) => this.xScale!(d))
      .attr('x2', (d) => this.xScale!(d))
      .attr('y1', 110)
      .attr('y2', this.DEFAULT_CHART_HEIGTH - 40)
      .attr('stroke', '#ccc')
      .attr('stroke-dasharray', '4')
      .attr('stroke-width', 1);

    this.createLegend();
    this.transitionView();
  }

  transitionView() {
    const dur = 1000;
    d3.selectAll('.group-label').remove();
    switch (this.viewSelected) {
      case 'nationality':
        const grouped = d3.group(this.currentData, (d) => d.nationality);
        d3.select('#beeswarm-chart')
          .attr('height', this.VIEW_BY_NATION_CHART_HEIGTH)
          .attr('width', this.VIEW_BY_NATION_CHART_WIDTH);

        d3.select('#x-axis').attr(
          'transform',
          `translate(0, ${this.VIEW_BY_NATION_CHART_HEIGTH - 40})`
        );

        this.yScale = d3
          .scalePoint()
          .domain(this.chartStyleSrv.color.domain())
          .range([200, this.VIEW_BY_NATION_CHART_HEIGTH - 100]);

        grouped.forEach((players, nationality) => {
          const y = this.yScale ? this.yScale(nationality)! : 0;

          const sim = d3
            .forceSimulation(players)
            .force(
              'x',
              d3
                .forceX((d: Player) => this.xScale!(d.overall_pick))
                .strength(0.5)
            )
            .force('y', d3.forceY(() => y).strength(1))
            .force(
              'collide',
              d3.forceCollide((d) => this.radiusScale!(d.points))
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

        d3.select('#beeswarm-container')
          .selectAll('.x-axis-line')
          .data(this.xScale?.ticks(10) ?? [])
          .join('line')
          .attr('class', 'x-axis-line')
          .attr('x1', (d) => this.xScale!(d))
          .attr('x2', (d) => this.xScale!(d))
          .attr('y1', 110)
          .attr('y2', this.VIEW_BY_NATION_CHART_HEIGTH - 40)
          .attr('stroke', '#ccc')
          .attr('stroke-dasharray', '4')
          .attr('stroke-width', 1);
        break;

      case 'position':
        this.currentData = this.currentData.map((player) => {
          if (player.position === 'G' || player.position === 'D') {
            return player;
          } else {
            player.position = 'F';
            return player;
          }
        });
        const groupedByPosition = d3.group(this.currentData, (d) => d.position);
        d3.select('#beeswarm-chart')
          .attr('height', this.DEFAULT_CHART_HEIGTH)
          .attr('width', this.DEFAULT_CHART_WIDTH);

        d3.select('#x-axis').attr(
          'transform',
          `translate(0, ${this.DEFAULT_CHART_HEIGTH - 40})`
        );

        this.yScale = d3
          .scalePoint()
          .domain(Array.from(groupedByPosition.keys()))
          .range([300, this.DEFAULT_CHART_HEIGTH - 100]);

        groupedByPosition.forEach((players, position) => {
          const y = this.yScale ? this.yScale(position)! : 0;

          const sim = d3
            .forceSimulation(players)
            .force(
              'x',
              d3
                .forceX((d: Player) => this.xScale!(d.overall_pick))
                .strength(0.5)
            )
            .force('y', d3.forceY(() => y).strength(1))
            .force(
              'collide',
              d3.forceCollide((d) => this.radiusScale!(d.points))
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

        d3.select('#beeswarm-container')
          .selectAll('.x-axis-line')
          .data(this.xScale?.ticks(10) ?? [])
          .join('line')
          .attr('class', 'x-axis-line')
          .attr('x1', (d) => this.xScale!(d))
          .attr('x2', (d) => this.xScale!(d))
          .attr('y1', 110)
          .attr('y2', this.VIEW_BY_NATION_CHART_HEIGTH - 40)
          .attr('stroke', '#ccc')
          .attr('stroke-dasharray', '4')
          .attr('stroke-width', 1);

        groupedByPosition.forEach((_, position) => {
          const y = this.yScale ? this.yScale(position)! : 0;

          // Add group label
          d3.select('#beeswarm-chart')
            .append('text')
            .attr('class', 'group-label')
            .attr('x', this.DEFAULT_CHART_WIDTH)
            .attr('y', y + 5)
            .attr('text-anchor', 'end')
            .attr('font-size', '20px')
            .attr('fill', '#BOBOBO')
            .text(() => {
              switch (position) {
                case 'F':
                  return 'Forward';
                case 'D':
                  return 'Defense';
                case 'G':
                  return 'Goalie';
                default:
                  return position;
              }
            });
        });

        break;

      default:
        d3.select('#beeswarm-chart')
          .attr('height', this.DEFAULT_CHART_HEIGTH)
          .attr('width', this.DEFAULT_CHART_WIDTH);

        d3.select('#x-axis').attr(
          'transform',
          `translate(0, ${this.DEFAULT_CHART_HEIGTH - 40})`
        );

        this.yScale = d3
          .scalePoint()
          .domain(this.chartStyleSrv.color.domain())
          .range([200, this.DEFAULT_CHART_HEIGTH - 100]);
        d3.selectAll<SVGCircleElement, Player>('.beeswarm-circle')
          .transition()
          .duration(dur)
          .ease(d3.easeCubicInOut)
          .attr('cx', (d) => d['x0'])
          .attr('cy', (d) => d['y0']);
        d3.select('#beeswarm-container')
          .selectAll('.x-axis-line')
          .data(this.xScale?.ticks(10) ?? [])
          .join('line')
          .attr('class', 'x-axis-line')
          .attr('x1', (d) => this.xScale!(d))
          .attr('x2', (d) => this.xScale!(d))
          .attr('y1', 110)
          .attr('y2', this.DEFAULT_CHART_HEIGTH - 40)
          .attr('stroke', '#ccc')
          .attr('stroke-dasharray', '4')
          .attr('stroke-width', 1);
        break;
    }
  }

  updateDraftYearsAvailable() {
    this.dataSrv.getDataAsPlayer().then((data: Player[]) => {
      this.draftYears = Array.from(new Set(data.map((d) => d.year)));
    });
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
      this.transitionView();
    });
  }

  createLegend() {
    const colorScale = this.chartStyleSrv.color;
    const colorMap = this.chartStyleSrv.customColors;

    const legend = d3
      .select('#beeswarm-chart')
      .append('g')
      .attr('id', 'legend-container')
      .attr(
        'transform',
        `translate(${10}, ${this.DEFAULT_CHART_HEIGTH / 2 - 80})`
      );

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
