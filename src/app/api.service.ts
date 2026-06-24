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
}
