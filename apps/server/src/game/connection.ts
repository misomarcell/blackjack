/** A socket as seen by game code: who is on it and how to message them. */
export interface Connection<Message> {
	readonly user: { id: number; username: string };
	send(message: Message): void;
}
