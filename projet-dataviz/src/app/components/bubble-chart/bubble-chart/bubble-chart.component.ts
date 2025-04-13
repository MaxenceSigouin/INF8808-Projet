import { Component } from '@angular/core';
import {DataProcessingService} from '../../../services/data-processsing/data-processing.service';
import {ChartStyleManagerService} from '../../../services/chart-style-manager/chart-style-manager.service';
import {Player} from '../../../interfaces/Player';
import {PlayersPerPeriod} from '../../../interfaces/PlayersPerPeriod';

@Component({
  selector: 'app-bubble-chart',
  imports: [],
  templateUrl: './bubble-chart.component.html',
  styleUrl: './bubble-chart.component.css'
})
export class BubbleChartComponent {
  constructor(
    private dataSrv: DataProcessingService,
    private chartStyleSrv: ChartStyleManagerService
  ) {}

  ngAfterViewInit() {
    this.dataSrv.getAmountOfPlayersInDecades().then((data: PlayersPerPeriod[]) => console.log(data));
  }
}
