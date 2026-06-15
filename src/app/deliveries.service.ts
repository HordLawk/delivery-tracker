import { Injectable } from '@angular/core';
import { Deliveryitem } from './deliveryitem.interface';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class DeliveriesService {

    async getAllDeliveryItems(): Promise<Deliveryitem[]> { 
        const response = await fetch(`${environment.baseURL}/api/items`);
        return response.json();
    }

    async getDeliveryItemById(id: number): Promise<Deliveryitem | null> {
        const response = await fetch(`${environment.baseURL}/api/items/${id}`);
        if(response.ok) return response.json();
        return null;
    }

    constructor() { }
}
