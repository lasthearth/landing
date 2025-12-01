export interface IPlayer {
    user_id: string;
    user_game_name: string;
    avatar: {
        original: string;
        x96: string;
        x48: string;
    };
    isOnline: boolean;
}
