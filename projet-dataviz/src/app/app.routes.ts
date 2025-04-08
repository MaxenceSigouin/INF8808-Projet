import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { BeeswarmChartComponent } from './components/beeswarm-chart/beeswarm-chart/beeswarm-chart.component';
import { BubbleChartComponent } from './components/bubble-chart/bubble-chart/bubble-chart.component';
import { NgModule } from '@angular/core';

export const routes: Routes = [{ path: '', component: HomePageComponent },
                               { path: "bubble", component: BubbleChartComponent },
                               { path: "beeswarm", component: BeeswarmChartComponent }];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})

export class AppRoutingModule { }   