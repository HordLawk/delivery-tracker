import { Sector } from "./sector.interface";

export interface Facility {
    id: number;
    name: string;
    sectorId: string;
    sector?: Sector;
    createdAt: Date;
}
