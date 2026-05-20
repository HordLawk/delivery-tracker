import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Deliveryitem } from '../deliveryitem';
import { DeliveriesService } from '../deliveries.service';

@Component({
  selector: 'app-details',
  imports: [],
  templateUrl: './details.component.html',
  styleUrl: './details.component.css'
})
export class DetailsComponent {
    route: ActivatedRoute = inject(ActivatedRoute);
    deliveryItem: Deliveryitem | null = null;
    deliveriesService = inject(DeliveriesService);

    constructor() {
        const deliveryItemId = Number(this.route.snapshot.paramMap.get('id'));
        this.deliveriesService.getDeliveryItemById(deliveryItemId).then((item) => this.deliveryItem = item);
    }
}
