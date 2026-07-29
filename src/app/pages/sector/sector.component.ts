import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { MembershipsService } from '../../services/memberships.service';
import { Facility } from '../../interfaces/facility.interface';
import { Member } from '../../interfaces/member.interface';
import { form, FormField } from '@angular/forms/signals';

@Component({
    selector: 'app-sector',
    imports: [FormField],
    templateUrl: './sector.component.html',
    styleUrl: './sector.component.css',
})
export class SectorComponent {
    route = inject(ActivatedRoute);

    apiService = inject(ApiService);

    membershipsService = inject(MembershipsService);

    facilities = signal<Facility[]>([]);

    members = signal<Member[]>([]);

    ownMembership = signal<Member | null>(null);

    newFacilityModel = signal({name: ''});

    newFacilityForm = form(this.newFacilityModel);

    constructor(){
        const orgId = this.route.snapshot.paramMap.get('id');
        const sectorId = this.route.snapshot.paramMap.get('sectorId');
        this.apiService
            .getResources<Facility>(`orgs/${orgId}/facilities?sectorId=${sectorId}`)
            .then(this.facilities.set);
        this.apiService.getResources<Member>(`orgs/${orgId}/memberships?sectorId=${sectorId}`).then(this.members.set);
        this.membershipsService.getMembershipByOrganizationId(orgId ?? '').then(this.ownMembership.set);
    }

    async submitFacility(event: Event){
        event.preventDefault();
        const newFacility = await this.apiService.createOrUpdateResource<Facility>(
            `orgs/${this.route.snapshot.paramMap.get('id')}/facilities`,
            {
                data: {
                    name: this.newFacilityForm.name().value(),
                    sectorId: this.route.snapshot.paramMap.get('sectorId'),
                },
            },
        );
        this.facilities.update(facilities => facilities.concat(newFacility));
        this.newFacilityForm().reset();
    }
}
