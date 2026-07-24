import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { Deliveryitem } from '../../deliveryitem.interface';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-delivery-item',
    imports: [RouterLink],
    templateUrl: './delivery-item.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './delivery-item.component.css'
})
export class DeliveryItemComponent {
    deliveryItem = input.required<Deliveryitem>();
}
