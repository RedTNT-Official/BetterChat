import { ServerPlayer } from "bdsx/bds/player";

const messages: ChatMessage[] = [];

export class ChatHistory {
    limit: number;

    constructor(limit: number) {
        this.limit = limit;
    }

    addMessage(author: ServerPlayer, message: string) {
        if (messages.length >= this.limit) messages.shift();
        messages.push({
            author: author.getName(),
            content: message
        });
    }

    get lines(): ChatMessage[] {
        return messages;
    }
}

type ChatMessage = {
    author: string;
    content: string;
}