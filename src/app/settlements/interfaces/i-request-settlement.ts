import { IMember } from "../../services/interface/i-member";

export interface IRequestSettlement {
    id: string,

    type: string;

    name: string;

    description: string;

    leader: IMember;

    members: IMember[];

    diplomacy: string;

    coordinates: {
        x: number,
        y: number
    }

    attachments: {
        url: string,

        desc: string
    }[]
}
