import Dexie from 'dexie';

export class VaultDatabase extends Dexie {
    games!: Dexie.Table<any, string>;
    stats!: Dexie.Table<any, string>;
    saves!: Dexie.Table<any, string>;

    constructor() {
        super('VaultDatabase');
        this.version(1).stores({
            games: 'hash, title, system, fileRef, addedAt',
            stats: 'hash, playTimeSeconds, lastPlayed, launchCount',
            saves: 'id, gameHash, type, timestamp, dataRef'
        });
    }
}

export const db = new VaultDatabase();
