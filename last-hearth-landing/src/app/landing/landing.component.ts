import { Component, inject, OnInit } from '@angular/core';
import { HeaderComponent } from '../layout/header/header.component';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ServerInformationService } from '../services/server-information.service';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs';

@Component({
    standalone: true,
    selector: 'app-landing',
    imports: [HeaderComponent, RouterOutlet, RouterLink, AsyncPipe],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.less'
})
export class LandingComponent {
    private readonly serverInformationService = inject(ServerInformationService);

    protected online$ = this.serverInformationService.getOnlinePlayersCount().pipe(map((info) => info.count));
}
