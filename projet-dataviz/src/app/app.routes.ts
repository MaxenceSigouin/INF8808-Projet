import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { BarChartComponent } from './components/bar-chart/bar-chart.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'bar-chart', component: BarChartComponent },
];
