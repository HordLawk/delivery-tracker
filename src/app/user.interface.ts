import { Sector } from './sector.interface';

export interface User {
    sub: string;
    name: string;
    pictureUrl: string;
    sectorId?: string;
    sector?: Sector;
}
