import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { DeliveryItemComponent } from '../../components/delivery-item/delivery-item.component';
import { Deliveryitem } from '../../interfaces/deliveryitem.interface';
import { form, FormField } from '@angular/forms/signals';
import { ApiService } from '../../services/api.service';
import { ActivatedRoute } from '@angular/router';
import { MembershipsService } from '../../services/memberships.service';
import { Member } from '../../interfaces/member.interface';

@Component({
  selector: 'app-deliveries',
    imports: [DeliveryItemComponent, FormField],
  templateUrl: './deliveries.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './deliveries.component.css'
})
export class DeliveriesComponent {
    apiService = inject(ApiService);

    route = inject(ActivatedRoute);

    membershipsService = inject(MembershipsService);
    
    ownMembership = signal<Member | null>(null);

    deliveryItems = signal<Deliveryitem[]>([]);

    newItemModel = signal({
        name: '',
        description: '',
        price: 0,
        weight: 0,
        originFacilityId: '',
        destinationAddress: '',
    });

    newItemForm = form(this.newItemModel);

    constructor(){
        const organizationId = this.route.snapshot.paramMap.get('id');
        this.apiService
            .getResources<Deliveryitem>(`orgs/${organizationId}/items`)
            .then(items => this.deliveryItems.set(items));
        this.membershipsService
            .getMembershipByOrganizationId(organizationId ?? '')
            .then(membership => this.ownMembership.set(membership));
    }

    async submitDeliveryItem(event: Event) {
        event.preventDefault();
        const newItem = await this.apiService.createOrUpdateResource<Deliveryitem>(
            `orgs/${this.route.snapshot.paramMap.get('id')}/items`,
            {data: this.newItemForm().value()},
        );
        this.deliveryItems.update(items => items.concat(newItem));
        this.newItemForm().reset();
    }
}
