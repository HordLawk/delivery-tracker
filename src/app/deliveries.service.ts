import { Injectable } from '@angular/core';
import { Deliveryitem } from './deliveryitem';

@Injectable({
    providedIn: 'root'
})
export class DeliveriesService {


    protected deliveryItems: Deliveryitem[] = [
        {
            id: 1,
            name: 'Sample Delivery Item',
            description: 'This is a sample delivery item',
            price: 100,
            imageUrl: 'https://placehold.co/400',
            status: 0,
            startedAt: new Date(),
            endedAt: null,
            weight: 10,
            originFacility: {
                id: 1,
                name: 'Sample Facility',
                sectorId: 1
            },
            destinationAddress: '123 Sample Street, Sample City'
        },
    ];

    getAllDeliveryItems(): Deliveryitem[] { 
        return this.deliveryItems;  
    }

    getDeliveryItemById(id: number): Deliveryitem | undefined {
        return this.deliveryItems.find(item => item.id === id);
    }

    submitDeliveryItem(name: string, description: string, price: number, weight: number, originFacilityId: number, destinationAddress: string): void {
        const newDeliveryItem: Deliveryitem = {
            id: this.deliveryItems.length ? this.deliveryItems.at(-1)!.id + 1 : 1,
            name,
            description,
            price,
            imageUrl: 'https://placehold.co/400',
            status: 0,
            startedAt: new Date(),
            endedAt: null,
            weight,
            originFacility: { id: originFacilityId },
            destinationAddress
        };
        console.log(newDeliveryItem);
        this.deliveryItems.push(newDeliveryItem);
    }

    constructor() { }
}
