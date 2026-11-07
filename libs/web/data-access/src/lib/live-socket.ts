import { signal } from '@angular/core';

const MIN_RETRY_MS = 1000;
const MAX_RETRY_MS = 10_000;

/** A JSON WebSocket to our own server that reconnects with backoff until closed on purpose. */
export class LiveSocket<Incoming, Outgoing> {
	private socket: WebSocket | null = null;
	private retryMs = MIN_RETRY_MS;
	private stopped = false;

	readonly connected = signal(false);

	constructor(
		private readonly path: string,
		private readonly onMessage: (message: Incoming) => void,
	) {}

	open(): void {
		const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
		const socket = new WebSocket(`${protocol}://${location.host}${this.path}`);
		socket.onopen = () => {
			this.connected.set(true);
			this.retryMs = MIN_RETRY_MS;
		};
		socket.onmessage = (event) => this.onMessage(JSON.parse(String(event.data)) as Incoming);
		socket.onclose = () => this.reconnect();
		this.socket = socket;
	}

	send(message: Outgoing): void {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(message));
		}
	}

	close(): void {
		this.stopped = true;
		this.socket?.close();
	}

	private reconnect(): void {
		this.connected.set(false);
		if (this.stopped) {
			return;
		}
		setTimeout(() => this.open(), this.retryMs);
		this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS);
	}
}
