import { Component, inject } from '@angular/core';
import { DeliveryItemComponent } from '../delivery-item/delivery-item.component';
import { Deliveryitem } from '../deliveryitem';
import { DeliveriesService } from '../deliveries.service';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'app-home',
    imports: [DeliveryItemComponent, ReactiveFormsModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {
    deliveryItems: Deliveryitem[] = [];

    deliveriesService = inject(DeliveriesService);

    applyForm = new FormGroup({
        name: new FormControl(''),
        description: new FormControl(''),
        price: new FormControl(0),
        weight: new FormControl(0),
        originFacilityId: new FormControl(0),
        destinationAddress: new FormControl(''),
    });

    constructor(){
        this.deliveriesService.getAllDeliveryItems().then(items => this.deliveryItems = items);
    }

    submitDeliveryItem(): void {
        this.deliveriesService.submitDeliveryItem(
            this.applyForm.value.name ?? '',
            this.applyForm.value.description ?? '',
            this.applyForm.value.price ?? 0,
            this.applyForm.value.weight ?? 0,
            this.applyForm.value.originFacilityId ?? 0,
            this.applyForm.value.destinationAddress ?? '',
        );
        this.deliveriesService.getAllDeliveryItems().then(items => this.deliveryItems = items);
        this.applyForm.reset();
    }
}
