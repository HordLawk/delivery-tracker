import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { DetailsComponent } from './pages/details/details.component';
import { authGuard } from './guards/auth.guard';
import { DeliveriesComponent } from './pages/deliveries/deliveries.component';
import { MembersComponent } from './pages/members/members.component';
import { InvitesComponent } from './pages/invites/invites.component';
import { OrganizationComponent } from './pages/organization/organization.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'invites',
                component: InvitesComponent,
                canActivate: [authGuard],
            },
            {
                path: ':id',
                component: OrganizationComponent,
                canActivate: [authGuard],
                children: [
                    {
                        path: '',
                        redirectTo: 'deliveries',
                        pathMatch: 'full',
                    },
                    {
                        path: 'members',
                        component: MembersComponent,
                    },
                    {
                        path: 'deliveries',
                        component: DeliveriesComponent,
                    },
                ],
            },
        ]
    },
];
