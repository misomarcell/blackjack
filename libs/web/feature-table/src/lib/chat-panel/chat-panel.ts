import {
	afterRenderEffect,
	Component,
	computed,
	effect,
	type ElementRef,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import { form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { CHAT_MAX_LENGTH, type ChatMessage } from '@blackjack/shared/protocol';

/** Table chat in the bottom-left corner. Collapsible so it never hides the cards on small screens. */
@Component({
	selector: 'bj-chat-panel',
	imports: [FormField, FormRoot],
	templateUrl: './chat-panel.html',
	styleUrl: './chat-panel.scss',
})
export class ChatPanel {
	readonly messages = input.required<ChatMessage[]>();
	readonly send = output<string>();

	private readonly log = viewChild<ElementRef<HTMLElement>>('log');
	/** Starts collapsed on shorter screens so it does not cover the seats. */
	protected readonly open = signal(matchMedia('(min-height: 820px)').matches);
	/** Messages sent after this moment count as unread while the panel is collapsed. */
	private readonly seenAt = signal(Date.now());
	protected readonly unread = computed(() => {
		const seenAt = this.seenAt();
		return this.open()
			? 0
			: this.messages().filter((message) => Date.parse(message.sentAt) > seenAt).length;
	});

	private readonly model = signal({ text: '' });
	protected readonly chatForm = form(
		this.model,
		(path) => {
			required(path.text);
			maxLength(path.text, CHAT_MAX_LENGTH);
		},
		{
			submission: {
				action: async () => {
					this.send.emit(this.model().text.trim());
					this.chatForm().reset({ text: '' });
					return undefined;
				},
			},
		},
	);

	constructor() {
		effect(() => {
			this.messages();
			if (this.open()) {
				this.seenAt.set(Date.now());
			}
		});
		afterRenderEffect(() => {
			this.messages();
			const log = this.log()?.nativeElement;
			if (log) {
				log.scrollTop = log.scrollHeight;
			}
		});
	}

	protected time(sentAt: string): string {
		return new Date(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
}
