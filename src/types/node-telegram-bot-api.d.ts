declare module 'node-telegram-bot-api' {
  import { EventEmitter } from 'events';

  export interface Message {
    message_id: number;
    from?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
    };
    date: number;
    text?: string;
  }

  export interface SendMessageOptions {
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
    disable_web_page_preview?: boolean;
    reply_to_message_id?: number;
    reply_markup?: any;
  }

  export interface SendDocumentOptions {
    caption?: string;
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
    reply_markup?: any;
    reply_to_message_id?: number;
    filename?: string;
  }

  export default class TelegramBot extends EventEmitter {
    constructor(token: string, options?: { polling?: boolean; webHook?: boolean | { port?: number; host?: string } });
    on(event: 'message', listener: (msg: Message) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    sendMessage(chatId: number | string, text: string, options?: SendMessageOptions): Promise<Message>;
    sendDocument(chatId: number | string, doc: string | Buffer | NodeJS.ReadableStream, options?: any, fileOptions?: SendDocumentOptions): Promise<Message>;
    sendChatAction(chatId: number | string, action: string): Promise<boolean>;
    stopPolling(): Promise<void>;
  }
}
