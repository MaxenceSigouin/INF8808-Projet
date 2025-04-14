import { Component } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AppRoutingModule } from './app.routes';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [SidebarComponent, RouterModule ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'projet-dataviz';
}
