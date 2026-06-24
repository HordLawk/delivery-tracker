import { Organization } from "./org.interface";

export interface Sector {
    id: string;
    name: string;
    organizationId: string;
    organization?: Organization;
    createdAt: Date;
}
