import { Component } from '@angular/core';
import { BeeswarmChartComponent } from '../../components/beeswarm-chart/beeswarm-chart/beeswarm-chart.component';
import { DataProcessingService } from '../../services/data-processsing/data-processing.service';

@Component({
  selector: 'app-home-page',
  imports: [BeeswarmChartComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent {
  constructor(dataProcessingService: DataProcessingService) {}
}
