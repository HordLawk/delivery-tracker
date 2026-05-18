import { Component, input } from '@angular/core';
import { Deliveryitem } from '../deliveryitem';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-delivery-item',
    imports: [RouterLink],
    templateUrl: './delivery-item.component.html',
    styleUrl: './delivery-item.component.css'
})
export class DeliveryItemComponent {
    deliveryItem = input.required<Deliveryitem>();
}
