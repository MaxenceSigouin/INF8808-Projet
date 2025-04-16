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
  styleUrls: ['./beeswarm-chart.component.css'],
})
export class BeeswarmChartComponent {
  DEFAULT_CHART_HEIGTH: number = window.innerHeight - 100;
  DEFAULT_CHART_WIDTH: number = window.innerWidth - 320;
  VIEW_BY_NATION_CHART_HEIGTH: number = 1400;
  VIEW_BY_NATION_CHART_WIDTH: number = window.innerWidth - 320;
  viewSelected: string = 'default';
  xScale: d3.ScaleLinear<number, number> | undefined;
  yScale: d3.ScalePoint<string> | undefined;
  radiusScale: d3.ScaleLinear<number, number> | undefined;
  currentData: Player[] = [];
  draftYears: number[] = [];
  draftYearSelected: number = 2010;

  statsToShow: string[] = ['points', 'goals', 'assists', 'games_played'];
  statsSelected: string = 'points';

  constructor(
    private dataSrv: DataProcessingService,
    private chartStyleSrv: ChartStyleManagerService
  ) {}

  ngAfterViewInit() {
    this.updateDraftYearsAvailable();
    this.updateBeeswarmChart(this.draftYearSelected, this.statsSelected);
  }

  createBeeswarmChart(stat: keyof Player = 'points') {
    d3.select('#beeswarm-chart').remove(); // Remove the SVG
    d3.selectAll('.tooltip').remove(); // Remove tooltips
    d3.selectAll('.chart-title').remove(); // Remove the title
    d3.select('#legend-container').remove(); // Remove the legend
    const title = d3
      .select('#beeswarm-container')
      .append('div')
      .attr('class', 'chart-title')
      .style('text-align', 'center')
      .style('font-size', '24px')
      .style('font-weight', 'bold')
      .style('margin-bottom', '10px')
      .style('font-family', 'Orbitron')
      .text(
        'Behind the Draft: How NHL Players Performed After Being Selected (as of 2022)'
      );
    const maxRadius =
      Math.min(this.DEFAULT_CHART_HEIGTH, this.DEFAULT_CHART_WIDTH) * 0.04;
    this.radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(this.currentData, (d) => d[stat]) || 1])
      .range([5, maxRadius]);

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
        const [x, y] = d3.pointer(event); // Get mouse position relative to the container

        tooltip.transition().duration(200).style('opacity', 1);

        tooltip
          .html(
            `<strong>${d.player} (${d.specificNationality})</strong><br/>
            Rang: ${d.overall_pick}<br/>
            Points: ${d.points}<br/>
            Goals: ${d.goals}<br/>
            Assists: ${d.assists}<br/>
            Games: ${d.games_played}<br/>
            Click to reveal performance breakdown.`
          )
          .style('left', `${x + 30}px`) // Adjust tooltip position relative to the mouse
          .style('top', `${y + 30}px`);
      })
      .on('mouseout', () => {
        tooltip.transition().duration(200).style('opacity', 0);
      })
      .on('click', (event, d) => this.createRadarChart(d));

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
    this.transitionView(stat);
  }

  createRadarChart(player: Player): void {
    // Remove any previous radar chart if it exists
    d3.select('#radar-chart').remove();
    d3.selectAll('.radar-tooltip').remove();

    const radarWidth = 300;
    const radarHeight = 300;
    const margin = 40;
    const radius = Math.min(radarWidth, radarHeight) / 2 - margin;
    const cx = radarWidth / 2;
    const cy = radarHeight / 2;

    // Compute maximum values for each stat based on the current year's players
    const maxGoals = d3.max(this.currentData, (d) => d.goals) || 1;
    const maxAssists = d3.max(this.currentData, (d) => d.assists) || 1;
    const maxPoints = d3.max(this.currentData, (d) => d.points) || 1;
    const maxGames = d3.max(this.currentData, (d) => d.games_played) || 1;

    const stats = [
      { label: 'Goals', value: player.goals, max: maxGoals },
      { label: 'Assists', value: player.assists, max: maxAssists },
      { label: 'Points', value: player.points, max: maxPoints },
      { label: 'Games', value: player.games_played, max: maxGames },
    ];

    // Create a tooltip for radar points
    const tooltip = d3
      .select('#beeswarm-container')
      .append('div')
      .attr('class', 'radar-tooltip')
      .style('position', 'absolute')
      .style('background', '#fff')
      .style('padding', '6px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    // Create SVG container for the radar chart and position it at the top left
    const svg = d3
      .select('#beeswarm-container')
      .append('svg')
      .attr('id', 'radar-chart')
      .attr('width', radarWidth)
      .attr('height', radarHeight)
      .style('position', 'fixed')
      .style('top', '50%')
      .style('left', '50%')
      .style('transform', 'translate(-50%, -50%)');

    svg
      .append('rect')
      .attr('width', radarWidth)
      .attr('height', radarHeight)
      .attr('fill', 'rgba(100, 100, 100, 0.85)')
      .attr('rx', 12)
      .attr('ry', 12);

    svg
      .append('text')
      .attr('x', radarWidth - 10)
      .attr('y', 28)
      .attr('text-anchor', 'end')
      .attr('font-size', '28px')
      .attr('font-weight', 'bold')
      .attr('cursor', 'pointer')
      .style('fill', 'red')
      .text('✕') // you can also use a nicer X symbol here
      .on('click', () => {
        svg.remove();
      });

    const g = svg.append('g').attr('transform', `translate(${cx}, ${cy})`);

    const levels = 4;
    for (let i = 1; i <= levels; i++) {
      g.append('circle')
        .attr('r', radius * (i / levels))
        .attr('fill', 'none')
        .attr('stroke', '#ccc')
        .attr('stroke-dasharray', '2,2');
    }

    stats.forEach((stat, i) => {
      const angle = ((Math.PI * 2) / stats.length) * i - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#ccc')
        .attr('stroke-dasharray', '2,2');

      g.append('text')
        .attr('x', x * 1.1)
        .attr('y', y * 1.1)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .style('fill', '#fff')
        .text(stat.label);
    });

    const computedPoints = stats.map((stat, i) => {
      const angle = ((Math.PI * 2) / stats.length) * i - Math.PI / 2;
      const r = (stat.value / stat.max) * radius;
      return { stat: stat, x: r * Math.cos(angle), y: r * Math.sin(angle) };
    });

    g.append('polygon')
      .datum(computedPoints)
      .attr('points', (d) => d.map((pt) => [pt.x, pt.y].join(',')).join(' '))
      .attr('fill', 'rgba(255,0,0,0.5)')
      .attr('stroke', 'red')
      .attr('stroke-width', 2);

    computedPoints.forEach((pt) => {
      g.append('circle')
        .attr('cx', pt.x)
        .attr('cy', pt.y)
        .attr('r', 3)
        .attr('fill', 'red')
        .on('mouseover', (event) => {
          tooltip.transition().duration(200).style('opacity', 1);
          tooltip
            .html(`${pt.stat.label}: ${pt.stat.value}`)
            .style('left', event.pageX + 5 + 'px')
            .style('top', event.pageY - 28 + 'px');
        })
        .on('mouseout', () => {
          tooltip.transition().duration(200).style('opacity', 0);
        });
    });

    svg
      .append('text')
      .attr('x', cx)
      .attr('y', margin / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .style('fill', '#fff')
      .text(`${player.player}, ${player.position}`);
  }

  transitionView(stat: keyof Player) {
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
              d3.forceCollide((d) => this.radiusScale!(d[stat]))
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

        const orderedPositions = ['F', 'D', 'G']; // Define the desired order
        const sortedGroupedByPosition = new Map(
          orderedPositions.map((key) => [key, groupedByPosition.get(key) || []])
        );

        d3.select('#beeswarm-chart')
          .attr('height', this.DEFAULT_CHART_HEIGTH)
          .attr('width', this.DEFAULT_CHART_WIDTH);

        d3.select('#x-axis').attr(
          'transform',
          `translate(0, ${this.DEFAULT_CHART_HEIGTH - 40})`
        );

        this.yScale = d3
          .scalePoint()
          .domain(Array.from(sortedGroupedByPosition.keys()))
          .range([300, this.DEFAULT_CHART_HEIGTH - 100]);

        sortedGroupedByPosition.forEach((players, position) => {
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
              d3.forceCollide((d) => this.radiusScale!(d[stat]))
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

        sortedGroupedByPosition.forEach((_, position) => {
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

  updateBeeswarmChart(year: number, stat: keyof Player) {
    this.dataSrv.getDataAsPlayer().then((allData: Player[]) => {
      const data = allData.filter((d) => d.year === year);

      data.forEach((d) => {
        d.specificNationality = d.nationality;
        if (!this.chartStyleSrv.color.domain().includes(d.nationality)) {
          d.nationality = 'Others';
        }
      });

      this.currentData = data;

      // Recalculate radiusScale based on the selected statistic
      const maxRadius =
        Math.min(this.DEFAULT_CHART_HEIGTH, this.DEFAULT_CHART_WIDTH) * 0.04;
      this.radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(this.currentData, (d) => d[stat]) || 1])
        .range([5, maxRadius]);

      this.createBeeswarmChart(stat);
      this.transitionView(stat);
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
