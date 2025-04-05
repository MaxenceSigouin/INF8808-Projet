import { Component } from '@angular/core';
import {DataProcessingService} from '../../services/data-processsing/data-processing.service';

@Component({
  selector: 'app-home-page',
  imports: [],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent {
  constructor(dataProcessingService: DataProcessingService) {}
}
