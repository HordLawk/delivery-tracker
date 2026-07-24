import { Facility } from "./facility.interface";

enum Status {
    Scheduled,
    Available,
    InProgress,
    AwaitingForm,
    AwaitingSignature,
    Completed,
}

export interface Deliveryitem {
    id: number;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    status: Status;
    startedAt: Date;
    endedAt: Date | null;
    weight: number;
    originFacilityId: number;
    originFacility?: Facility;
    destinationAddress: string;
    createdAt: Date;
}
