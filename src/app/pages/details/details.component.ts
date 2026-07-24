import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Deliveryitem } from '../../interfaces/deliveryitem.interface';
import { DeliveriesService } from '../../services/deliveries.service';

@Component({
  selector: 'app-details',
  imports: [],
  templateUrl: './details.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
