import { TuiRoot } from "@taiga-ui/core";
import { Component } from '@angular/core';
import { LayoutComponent } from './layout/layout.component';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [LayoutComponent, TuiRoot],
  templateUrl: './app.component.html',
  styleUrl: './app.component.less'
})
export class AppComponent {
}
