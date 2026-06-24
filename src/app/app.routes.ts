import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { DetailsComponent } from './details/details.component';
import { authGuard } from './auth.guard';
import { DeliveriesComponent } from './deliveries/deliveries.component';
import { MembersComponent } from './members/members.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        title: 'Home',
        canActivate: [authGuard],
    },
    {
        path: ':id/members',
        component: MembersComponent,
        canActivate: [authGuard],
    },
    {
        path: 'deliveries/:id',
        component: DetailsComponent,
        canActivate: [authGuard],
    },
    {
        path: 'deliveries',
        component: DeliveriesComponent,
        canActivate: [authGuard],
    },
];
