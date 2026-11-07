import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { TableConfig } from '@blackjack/shared/protocol';
import { firstValueFrom } from 'rxjs';

interface TableRecord extends TableConfig {
	id: string;
}

/** Table lookups for players and table management for admins. */
@Service()
export class TablesApi {
	private readonly http = inject(HttpClient);

	find(id: string): Promise<TableRecord> {
		return firstValueFrom(this.http.get<TableRecord>(`/api/tables/${encodeURIComponent(id)}`));
	}

	create(table: TableConfig): Promise<TableRecord> {
		return firstValueFrom(this.http.post<TableRecord>('/api/tables', table));
	}

	update(id: string, table: TableConfig): Promise<TableRecord> {
		return firstValueFrom(this.http.put<TableRecord>(`/api/tables/${encodeURIComponent(id)}`, table));
	}

	async remove(id: string): Promise<void> {
		await firstValueFrom(this.http.delete(`/api/tables/${encodeURIComponent(id)}`));
	}
}
