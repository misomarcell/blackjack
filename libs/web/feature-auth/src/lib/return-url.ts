/** Only follow in-app paths after login, never another origin. */
export function safeReturnUrl(url: string | undefined): string {
	return url?.startsWith('/') && !url.startsWith('//') ? url : '/lobby';
}
