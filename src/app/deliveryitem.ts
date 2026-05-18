enum Status {
    Scheduled,
    Available,
    InProgress,
    AwaitingForm,
    AwaitingSignature,
    Completed,
}

interface Facility {
    id: number;
    name?: string;
    sectorId?: number;
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
    originFacility: Facility;
    destinationAddress: string;
}
