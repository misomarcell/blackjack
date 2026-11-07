import { HttpErrorResponse } from '@angular/common/http';
import type { ApiError } from '@blackjack/shared/protocol';

function isApiError(body: unknown): body is ApiError {
	return typeof body === 'object' && body !== null && 'error' in body;
}

/** Human-readable message from a failed API call. */
export function apiErrorMessage(error: unknown): string {
	if (error instanceof HttpErrorResponse && isApiError(error.error)) {
		return error.error.error;
	}
	return 'Something went wrong, please try again';
}
