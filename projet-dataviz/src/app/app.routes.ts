import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { BubbleChartComponent } from './components/bubble-chart/bubble-chart/bubble-chart.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'bubble-chart', component: BubbleChartComponent },
];
