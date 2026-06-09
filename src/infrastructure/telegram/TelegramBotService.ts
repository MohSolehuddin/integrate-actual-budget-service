import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import type { Pool } from 'pg';
import type { Message } from 'node-telegram-bot-api';

export interface ParsedTransaction {
  type: 'expense' | 'income';
  category: string;
  description: string;
  amount: number;
  raw: string;
}

export class TelegramBotService {
  private bot: TelegramBot | null = null;
  private pool: Pool;
  private budgetServiceUrl: string;

  constructor(pool: Pool, budgetServiceUrl?: string) {
    this.pool = pool;
    this.budgetServiceUrl = budgetServiceUrl || process.env.BUDGET_SERVICE_URL || 'http://localhost:3001';
  }

  async initialize(): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN not set. Skipping bot initialization.');
      return;
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.registerHandlers();
    console.log('[TelegramBot] Polling started');
  }

  private registerHandlers(): void {
    if (!this.bot) return;

    this.bot.on('message', async (msg: Message) => {
      const chatId = msg.chat?.id;
      const senderId = msg.from?.id?.toString() ?? 'unknown';
      const text = msg.text || '';

      if (!chatId) return;

      console.log(`[TelegramBot] ${senderId}: ${text}`);

      if (text.startsWith('/')) {
        await this.handleCommand(chatId, senderId, text);
        return;
      }

      const transaction = this.detectTransaction(text);
      if (transaction) {
        await this.handleTransaction(chatId, senderId, transaction);
        return;
      }

      this.bot?.sendMessage(chatId,
        'Hmm, saya belum mengerti format itu.\n\nCoba format: `B Makan nasi 15k` atau ketik `/help`',
        { parse_mode: 'Markdown' }
      );
    });
  }

  private async handleCommand(chatId: number, senderId: string, text: string): Promise<void> {
    if (!this.bot) return;
    const cmd = (text.split(' ')[0] ?? '').toLowerCase();

    switch (cmd) {
      case '/start':
        await this.bot.sendMessage(chatId,
          '👋 Halo! Saya Budget Bot.\n\n' +
          '**Cara catat transaksi:**\n' +
          '• `B Makan nasi 15k` — pengeluaran\n' +
          '• `J Gaji project 2jt` — pemasukan\n' +
          '• `beli kopi 25k` — natural language\n\n' +
          '**Commands:**\n' +
          '• `/status` — cek budget\n' +
          '• `/export` — export CSV\n' +
          '• `/help` — bantuan',
          { parse_mode: 'Markdown' }
        );
        break;

      case '/status':
        try {
          const res = await axios.get(`${this.budgetServiceUrl}/api/budget/status`, {
            headers: { 'X-Telegram-Sender': senderId },
            timeout: 5000,
          });
          const data = res.data;
          await this.bot.sendMessage(chatId,
            `✅ **Budget Status**\nUser: ${data.email ?? '-'}\nBudget ID: ${data.budgetId ?? '-'}\nCreated: ${data.createdAt ?? '-'}`,
            { parse_mode: 'Markdown' }
          );
        } catch (e: any) {
          await this.bot.sendMessage(chatId, '❌ Gagal cek status: ' + (e.response?.data?.error || e.message));
        }
        break;

      case '/export':
        try {
          await this.bot.sendMessage(chatId, '📊 Export CSV sedang diproses...');
          const res = await axios.get(`${this.budgetServiceUrl}/api/budget/export/csv`, {
            headers: { 'X-Telegram-Sender': senderId },
            responseType: 'text',
            timeout: 10000,
          });
          const tmpFile = `/tmp/budget-export-${senderId}-${Date.now()}.csv`;
          const fs = await import('fs');
          fs.writeFileSync(tmpFile, res.data);
          await this.bot.sendDocument(chatId, tmpFile, {}, {
            caption: '📊 Actual Budget Export CSV',
            filename: 'actual-budget-export.csv',
          });
          fs.unlinkSync(tmpFile);
        } catch (e: any) {
          await this.bot.sendMessage(chatId, '❌ Export gagal: ' + (e.response?.data?.error || e.message));
        }
        break;

      case '/help':
        await this.bot.sendMessage(chatId,
          '**Budget Bot Commands:**\n\n' +
          '📝 `/start` — Mulai bot\n' +
          '📊 `/status` — Cek budget status\n' +
          '📁 `/export` — Export CSV\n' +
          '❓ `/help` — Bantuan\n\n' +
          '**Format transaksi:**\n' +
          '• `B Kategori deskripsi jumlah`\n' +
          '• `J Kategori deskripsi jumlah`\n' +
          '• `beli kategori deskripsi jumlah`\n' +
          '• `gaji kategori deskripsi jumlah`\n\n' +
          'Contoh: `B Makan nasi goreng 15k`',
          { parse_mode: 'Markdown' }
        );
        break;
    }
  }

  private async handleTransaction(chatId: number, senderId: string, transaction: ParsedTransaction): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.sendChatAction(chatId, 'typing');
      const result = await axios.post(
        `${this.budgetServiceUrl}/api/budget/transactions`,
        {
          accountId: '1',
          transactions: [{
            date: new Date().toISOString().split('T')[0],
            amount: transaction.amount,
            payee: transaction.category + (transaction.description ? ' - ' + transaction.description : ''),
            category: transaction.category,
            notes: transaction.description || transaction.raw,
          }],
        },
        {
          headers: {
            'X-Telegram-Sender': senderId,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const typeLabel = transaction.type === 'expense' ? '💸 Pengeluaran' : '💰 Pemasukan';
      const amountFormatted = Math.abs(transaction.amount).toLocaleString('id-ID');

      await this.bot.sendMessage(chatId,
        `✅ **Tersimpan!**\n\n${typeLabel}\nKategori: ${transaction.category}\nDetail: ${transaction.description || '-'}\nJumlah: Rp${amountFormatted}\n\nID: #${result.data?.data?.id ?? 'N/A'}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error: any) {
      await this.bot.sendMessage(chatId, '❌ Gagal menyimpan: ' + (error.response?.data?.error || error.message));
    }
  }

  private detectTransaction(text: string): ParsedTransaction | null {
    const trimmed = text.trim();

    const CMD_PATTERN = /^([BJ])\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;
    const NATURAL_PATTERN = /^(?:beli|bayar|b)\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;
    const INCOME_PATTERN = /^(?:jual|j|terima|gaji|deposit)\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;

    let match = trimmed.match(CMD_PATTERN);
    if (match && match[1] && match[2] && match[4]) {
      const amount = this.parseAmount(match[4]);
      if (!amount) return null;
      const type = match[1].toUpperCase() === 'B' ? 'expense' : 'income';
      return {
        type,
        category: match[2],
        description: match[3] || '',
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        raw: trimmed,
      };
    }

    match = trimmed.match(NATURAL_PATTERN);
    if (match && match[1] && match[3]) {
      const amount = this.parseAmount(match[3]);
      if (!amount) return null;
      return { type: 'expense', category: match[1], description: match[2] || '', amount: -Math.abs(amount), raw: trimmed };
    }

    match = trimmed.match(INCOME_PATTERN);
    if (match && match[1] && match[3]) {
      const amount = this.parseAmount(match[3]);
      if (!amount) return null;
      return { type: 'income', category: match[1], description: match[2] || '', amount: Math.abs(amount), raw: trimmed };
    }

    return null;
  }

  private parseAmount(amountStr: string): number | null {
    if (!amountStr) return null;
    const lower = amountStr.toLowerCase().trim();
    let multiplier = 1;
    let numStr = lower;

    if (lower.endsWith('k') || lower.endsWith('rb')) {
      multiplier = 1000;
      numStr = lower.replace(/[kK]$/, '').replace(/[rR][bB]$/, '');
    } else if (lower.endsWith('jt') || lower.endsWith('m')) {
      multiplier = 1000000;
      numStr = lower.replace(/[jJ][tT]$/, '').replace(/[mM]$/, '');
    }

    const val = parseFloat(numStr);
    if (isNaN(val)) return null;
    return Math.round(val * multiplier);
  }
}
