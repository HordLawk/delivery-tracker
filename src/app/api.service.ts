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

    async createResource<T>(url: string, data: any): Promise<T> {
        const response = await fetch(`${environment.baseURL}/api/${url}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data),
        });
        if(!response.ok){
            const error = await response.json();
            throw {
                status: response.status,
                response: error,
            };
        }
        const resource: T = await response.json();
        return resource;
    }
}
