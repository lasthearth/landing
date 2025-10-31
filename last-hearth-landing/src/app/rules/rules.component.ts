import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { TuiExpand, TuiIcon } from "@taiga-ui/core";

@Component({
    standalone: true,
    selector: "app-rules",
    imports: [TuiExpand, TuiIcon, CommonModule],
    templateUrl: "./rules.component.html",
    styleUrl: "./rules.component.less",
})
export class RulesComponent {
    protected isAllOpened = false;
    protected isDefendBuilds: boolean = false;
    protected isTypesAndStatuses: boolean = false;
    protected isTerminology: boolean = false;
    protected isBase: boolean = false;
    protected isPlayersType: boolean = false;
    protected isSinglePlayers: boolean = false;
    protected isCamp: boolean = false;
    protected isVillage: boolean = false;
    protected isTownship: boolean = false;
    protected isCity: boolean = false;
    protected isRegion: boolean = false;
    protected isSuzerain: boolean = false;
    protected isPlayersActions: boolean = false;
    protected isTheft: boolean = false;
    protected isKills: boolean = false;
    protected isColonization: boolean = false;
    protected isRaid: boolean = false;
    protected isRaid2: boolean = false;
    protected isRaid3: boolean = false;
    protected isRaid4: boolean = false;
    protected isWar: boolean = false;
    protected isSpy: boolean = false;
    protected isDefendBuildings: boolean = false;

    protected toggle(): void {
        this.isAllOpened = !this.isAllOpened

        if (this.isAllOpened) {
            this.isDefendBuilds = true;
            this.isTypesAndStatuses = true;
            this.isTerminology = true;
            this.isBase = true;
            this.isPlayersType = true;
            this.isSinglePlayers = true;
            this.isCamp = true;
            this.isVillage = true;
            this.isTownship = true;
            this.isCity = true;
            this.isRegion = true;
            this.isSuzerain = true;
            this.isPlayersActions = true;
            this.isTheft = true;
            this.isKills = true;
            this.isColonization = true;
            this.isRaid = true;
            this.isRaid2 = true;
            this.isRaid3 = true;
            this.isRaid4 = true;
            this.isWar = true;
            this.isSpy = true;
            this.isDefendBuildings = true;
        }
        else {
            this.isDefendBuilds = false;
            this.isTypesAndStatuses = false;
            this.isTerminology = false;
            this.isBase = false;
            this.isPlayersType = false;
            this.isSinglePlayers = false;
            this.isCamp = false;
            this.isVillage = false;
            this.isTownship = false;
            this.isCity = false;
            this.isRegion = false;
            this.isSuzerain = false;
            this.isPlayersActions = false;
            this.isTheft = false;
            this.isKills = false;
            this.isColonization = false;
            this.isRaid = false;
            this.isRaid2 = false;
            this.isRaid3 = false;
            this.isRaid4 = false;
            this.isWar = false;
            this.isSpy = false;
            this.isDefendBuildings = false;
        }
    }
}
