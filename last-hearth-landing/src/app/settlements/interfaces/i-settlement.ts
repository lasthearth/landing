import { IMember } from "../../services/interface/i-member";

export interface ISettlement {
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
    }[];

    created_at: string;

    updated_at: string;
}
