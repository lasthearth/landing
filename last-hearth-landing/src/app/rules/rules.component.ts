import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TuiExpand, TuiIcon } from '@taiga-ui/core';

@Component({
    standalone: true,
    selector: 'app-rules',
    imports: [TuiExpand, TuiIcon, CommonModule],
    templateUrl: './rules.component.html',
    styleUrl: './rules.component.less'
})
export class RulesComponent  {
    protected isBase: boolean = false;
    protected isPlayersType: boolean = false;
    protected isSinglePlayers: boolean = false;
    protected isCommons: boolean = false;
    protected isCities: boolean = false;
    protected isRegion: boolean = false;
    protected isMerchantGuild1: boolean = false;
    protected isMerchantGuild2: boolean = false;
    protected isMercenaryGuild1: boolean = false;
    protected isPlayersActions: boolean = false;
    protected isTheft: boolean = false;
    protected isKills: boolean = false;
    protected isProtectors: boolean = false;
    protected isColonization: boolean = false;
}
