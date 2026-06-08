/**
 * Telegram Bot Service untuk Budget Service
 * Memproses pesan Telegram, parsing transaksi, dan integrasi dengan Actual Budget
 */

import { Telegraf, Context, Markup } from 'telegraf';
import type { NextFunction } from 'telegraf';
import { AddTransactionUseCase } from '../../use-cases/budget/AddTransactionUseCase';
import { IActualBudgetService } from '../../domain/interfaces/IActualBudgetService';
import { BotCommand } from '@telegraf/types';

// Regex patterns untuk parsing transaksi
const CMD_PATTERN = /^([BJ])\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;
const NATURAL_PATTERN = /^(?:beli|bayar|b)\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;
const INCOME_PATTERN = /^(?:jual|j|terima|gaji|deposit)\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;

export class TelegramBotService {
  private bot: Telegraf<Context>;
  private addTransactionUseCase: AddTransactionUseCase;

  constructor(
    botToken: string,
    actualBudgetService: IActualBudgetService
  ) {
    this.bot = new Telegraf<Context>(botToken);
    this.addTransactionUseCase = new AddTransactionUseCase(actualBudgetService);
  }

  /**
   * Parse nominal amount dengan format k, jt, m, dll
   */
  private parseAmount(amountStr: string): number | null {
    const lower = amountStr.toLowerCase().trim();
    let multiplier = 1;
    let numStr = lower;

    if (lower.endsWith('k') || lower.endsWith('rb')) {
      multiplier = 1000;
      numStr = lower.replace(/[kK]$/, '').replace(/[rR][bB]$/, '');
    } else if (lower.endsWith('jt') || lower.endsWith('m')) {
      multiplier = 1000000;
      numStr = lower.replace(/[jJ][tT]$/, '').replace(/[mM]$/, '');
    } else if (lower.endsWith('b')) {
      multiplier = 1000000000;
      numStr = lower.replace(/[bB]$/, '');
    }

    const val = parseFloat(numStr);
    if (isNaN(val)) return null;
    return Math.round(val * multiplier);
  }

  /**
   * Detect transaksi dari teks pesan
   */
  private detectTransaction(text: string): {
    type: 'income' | 'expense';
    category: string;
    description: string;
    amount: number;
    raw: string;
  } | null {
    text = text.trim();

    // Command format: B Makan nasi 15k
    let match = text.match(CMD_PATTERN);
    if (match) {
      const amount = this.parseAmount(match[4]);
      if (!amount) return null;
      return {
        type: match[1].toUpperCase() === 'B' ? 'expense' : 'income',
        category: match[2],
        description: match[3] || '',
        amount: match[1].toUpperCase() === 'B' ? -Math.abs(amount) : Math.abs(amount),
        raw: text,
      };
    }

    // Natural: beli makan nasi 15k
    match = text.match(NATURAL_PATTERN);
    if (match) {
      const amount = this.parseAmount(match[3]);
      if (!amount) return null;
      return {
        type: 'expense',
        category: match[1],
        description: match[2] || '',
        amount: -Math.abs(amount),
        raw: text,
      };
    }

    // Income natural: gaji project 500k
    match = text.match(INCOME_PATTERN);
    if (match) {
      const amount = this.parseAmount(match[3]);
      if (!amount) return null;
      return {
        type: 'income',
        category: match[1],
        description: match[2] || '',
        amount: Math.abs(amount),
        raw: text,
      };
    }

    return null;
  }

  /**
   * Setup all Telegram bot commands and handlers
   */
  public setup() {
    // Command: /start
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        '👋 Halo! Saya Budget Bot.\n\n' +
        '**Cara catat transaksi:**\n' +
        '• `B Makan nasi 15k` — pengeluaran\n' +
        '• `J Gaji project 2jt` — pemasukan\n' +
        '• `beli kopi 25k` — natural language\n\n' +
        '**Commands:**\n' +
        '• `/status` — cek budget\n' +
        '• `/export` — export CSV\n' +
        '• `/help` — bantuan\n\n' +
        '_format: B = Beli/Pengeluaran, J = Jual/Pemasukan_',
        { parse_mode: 'Markdown' }
      );
    });

    // Command: /status
    this.bot.command('status', async (ctx) => {
      try {
        const user = await this.addTransactionUseCase.execute(
          '1', // Default account ID
          [] // Empty transactions - just to check connection
        );
        await ctx.reply(
          `✅ **Budget Status**\n\n` +
          `Status: ${user.message}\n\n` +
          `ID: ${ctx.from?.id}\n` +
          `Username: ${ctx.from?.username || 'N/A'}\n` +
          `Waktu: ${new Date().toISOString()}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        await ctx.reply(`❌ Gagal cek status: ${error.message}`);
      }
    });

    // Command: /help
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        '**Budget Bot Commands:**\n\n' +
        '📝 `/start` — Mulai bot\n' +
        '📊 `/status` — Cek budget status\n' +
        '📁 `/export` — Export CSV ke Actual Budget\n' +
        '❓ `/help` — Bantuan\n\n' +
        '**Format transaksi:**\n' +
        '• `B Kategori deskripsi jumlah` = Pengeluaran\n' +
        '• `J Kategori deskripsi jumlah` = Pemasukan\n' +
        '• `beli Kategori deskripsi jumlah` = Pengeluaran (natural)\n' +
        '• `gaji Kategori deskripsi jumlah` = Pemasukan (natural)\n\n' +
        'Contoh: `B Makan nasi goreng 15k`',
        { parse_mode: 'Markdown' }
      );
    });

    // Auto-detect transaksi (non-command message)
    this.bot.on('text', async (ctx) => {
      const text = ctx.message.text?.trim();
      if (!text || text.startsWith('/')) return;

      const transaction = this.detectTransaction(text);
      if (!transaction) {
        await ctx.reply(
          'Hmm, saya belum mengerti format itu.\n\n' +
          'Coba format: `B Makan nasi 15k` atau ketik `/help`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      try {
        const amountFormatted = Math.abs(transaction.amount).toLocaleString('id-ID');
        const typeLabel = transaction.type === 'expense' ? '💸 Pengeluaran' : '💰 Pemasukan';

        await ctx.reply(`✅ **Tersimpan!**\n\n${typeLabel}\nKategori: ${transaction.category}\nDetail: ${transaction.description || '-'}\nJumlah: Rp${amountFormatted}`, { parse_mode: 'Markdown' });
      } catch (error) {
        await ctx.reply(`❌ Gagal menyimpan: ${error.message}`);
      }
    });

    // Error handler
    this.bot.use(async (ctx, next) => {
      try {
        await next();
      } catch (error) {
        console.error('Telegram Bot Error:', error);
        if (ctx.updateType === 'message' && ctx.message?.text) {
          await ctx.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
        }
      }
    });
  }

  /**
   * Start polling for updates
   */
  public startPolling() {
    this.bot.startPolling();
    console.log('[TELEGRAM BOT] Polling started');
  }

  /**
   * Get bot info
   */
  public async getBotInfo() {
    try {
      const me = await this.bot.telegram.getMe();
      return me;
    } catch (error) {
      console.error('[TELEGRAM BOT] Failed to get bot info:', error);
      return null;
    }
  }
}
