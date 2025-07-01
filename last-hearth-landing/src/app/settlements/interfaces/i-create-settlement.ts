export interface ICreateSettlement {
    type: number;

    name: string;

    description: string;

    diplomacy: string;

    coordinates: {
        x: number,
        y: number
    }

    attachments: {
        data: string,

        description: string
    }[]
}
