import { Component } from '@angular/core';
import { BeeswarmChartComponent } from '../../components/beeswarm-chart/beeswarm-chart/beeswarm-chart.component';
import { DataProcessingService } from '../../services/data-processsing/data-processing.service';
import { BubbleChartComponent } from '../../components/bubble-chart/bubble-chart/bubble-chart.component';

@Component({
  selector: 'app-home-page',
  imports: [BeeswarmChartComponent, BubbleChartComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent {
  constructor(dataProcessingService: DataProcessingService) {}
}
