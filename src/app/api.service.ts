import { Service } from '@angular/core';
import { environment } from '../environments/environment';

@Service()
export class ApiService {
    async getResources<T>(url: string): Promise<T[]> {
        const response = await fetch(`${environment.baseURL}/api/${url}`);
        if(!response.ok) return [];
        const documents: T[] = await response.json();
        return documents;
    }

    async createResource<T>(url: string, data: any): Promise<T | null> {
        const response = await fetch(`${environment.baseURL}/api/${url}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data),
        });
        if(!response.ok) return null;
        const resource: T = await response.json();
        return resource;
    }
}
