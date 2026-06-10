/**
 * Telegram Bot Service — Telegraf-based
 * Langsung terintegrasi dengan Actual Budget via AddTransactionUseCase
 * Tidak ada self-HTPP-call (axios ke diri sendiri)
 */

import { Telegraf, Context } from 'telegraf';
import { AddTransactionUseCase } from '../../use-cases/budget/AddTransactionUseCase';
import type { IActualBudgetService } from '../../domain/interfaces/IActualBudgetService';

// Regex patterns untuk parsing transaksi
const CMD_PATTERN = /^([BJ])\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;
const NATURAL_PATTERN = /^(?:beli|bayar|b)\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;
const INCOME_PATTERN = /^(?:jual|j|terima|gaji|deposit)\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;

export interface ParsedTransaction {
  type: 'expense' | 'income';
  category: string;
  description: string;
  amount: number;
  raw: string;
}

export class TelegramBotService {
  private bot: Telegraf;
  private addTransactionUseCase: AddTransactionUseCase;
  private actualBudgetService: IActualBudgetService;

  constructor(
    botToken: string,
    actualBudgetService: IActualBudgetService,
    addTransactionUseCase: AddTransactionUseCase
  ) {
    this.bot = new Telegraf(botToken);
    this.actualBudgetService = actualBudgetService;
    this.addTransactionUseCase = addTransactionUseCase;
  }

  /**
   * Parse nominal amount dengan format k, jt, m, rb
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
  private detectTransaction(text: string): ParsedTransaction | null {
    text = text.trim();

    // Command format: B Makan nasi 15k
    let match = text.match(CMD_PATTERN);
    if (match?.[1] && match[2] && match[4]) {
      const amount = this.parseAmount(match[4]);
      if (!amount) return null;
      const isExpense = match[1].toUpperCase() === 'B';
      return {
        type: isExpense ? 'expense' : 'income',
        category: match[2],
        description: match[3] || '',
        amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
        raw: text,
      };
    }

    // Natural: beli makan nasi 15k
    match = text.match(NATURAL_PATTERN);
    if (match?.[1] && match[3]) {
      const amount = this.parseAmount(match[3]);
      if (!amount) return null;
      return { type: 'expense', category: match[1], description: match[2] || '', amount: -Math.abs(amount), raw: text };
    }

    // Income natural: gaji project 500k
    match = text.match(INCOME_PATTERN);
    if (match?.[1] && match[3]) {
      const amount = this.parseAmount(match[3]);
      if (!amount) return null;
      return { type: 'income', category: match[1], description: match[2] || '', amount: Math.abs(amount), raw: text };
    }

    return null;
  }

  /**
   * Setup all Telegram bot commands and handlers
   */
  public setup(): void {
    // Command: /start
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        '👋 Halo! Saya Budget Bot.\n\n' +
        '*Cara catat transaksi:*\n' +
        '• `B Makan nasi 15k` — pengeluaran\n' +
        '• `J Gaji project 2jt` — pemasukan\n' +
        '• `beli kopi 25k` — natural language\n\n' +
        '*Commands:*\n' +
        '• `/status` — cek budget\n' +
        '• `/accounts` — lihat akun\n' +
        '• `/help` — bantuan\n\n' +
        '_format: B = Beli/Pengeluaran, J = Jual/Pemasukan_',
        { parse_mode: 'Markdown' }
      );
    });

    // Command: /status
    this.bot.command('status', async (ctx) => {
      try {
        const accounts = await this.actualBudgetService.getAccounts();
        const categories = await this.actualBudgetService.getCategories();
        await ctx.reply(
          `✅ *Budget Status*\n\n` +
          `Akun: ${accounts.length} (${accounts.map(a => a.name).join(', ')})\n` +
          `Kategori: ${categories.length}\n` +
          `Status: Terhubung langsung ke Actual Budget\n` +
          `Waktu: ${new Date().toLocaleString('id-ID')}\n` +
          `User: ${ctx.from?.first_name || ctx.from?.username || 'N/A'}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        await ctx.reply(`❌ Gagal cek status: ${(error as Error).message}`);
      }
    });

    // Command: /accounts
    this.bot.command('accounts', async (ctx) => {
      try {
        const accounts = await this.actualBudgetService.getAccounts();
        if (accounts.length === 0) {
          await ctx.reply('📭 Belum ada akun. Pastikan Actual Budget sudah di-setup.');
          return;
        }
        const lines = accounts.map((a, i) =>
          `${i + 1}. *${a.name}* — ${a.offbudget ? 'off-budget' : 'on-budget'}${a.balance_current != null ? ` (saldo: ${a.balance_current})` : ''}`
        );
        await ctx.reply(`📋 *Akun Budget*\n\n${lines.join('\n')}`, { parse_mode: 'Markdown' });
      } catch (error) {
        await ctx.reply(`❌ Gagal mengambil akun: ${(error as Error).message}`);
      }
    });

    // Command: /help
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        '*Budget Bot Commands:*\n\n' +
        '📝 `/start` — Mulai bot\n' +
        '📊 `/status` — Cek budget status\n' +
        '📁 `/accounts` — Lihat daftar akun\n' +
        '❓ `/help` — Bantuan\n\n' +
        '*Format transaksi:*\n' +
        '• `B Kategori deskripsi jumlah` = Pengeluaran\n' +
        '• `J Kategori deskripsi jumlah` = Pemasukan\n' +
        '• `beli Kategori deskripsi jumlah` = Pengeluaran (natural)\n' +
        '• `gaji Kategori deskripsi jumlah` = Pemasukan (natural)\n\n' +
        '*Contoh:*\n' +
        '`B Makan nasi goreng 15k`\n' +
        '`J Gaji freelance 2jt`\n' +
        '`beli kopi 25k`',
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
        // Simpan langsung ke Actual Budget
        const defaultAccountId = '1'; // Default account, bisa diatur nanti
        await this.addTransactionUseCase.execute(defaultAccountId, [
          {
            date: new Date().toISOString().split('T')[0] || new Date().toISOString().slice(0, 10),
            amount: transaction.amount,
            payee_name: transaction.category + (transaction.description ? ' - ' + transaction.description : ''),
            category: transaction.category,
            notes: transaction.raw,
          },
        ]);

        const amountFormatted = Math.abs(transaction.amount).toLocaleString('id-ID');
        const typeLabel = transaction.type === 'expense' ? '💸 *Pengeluaran*' : '💰 *Pemasukan*';

        await ctx.reply(
          `✅ *Tersimpan ke Actual Budget!*\n\n${typeLabel}\n` +
          `Kategori: ${transaction.category}\n` +
          `Detail: ${transaction.description || '-'}\n` +
          `Jumlah: Rp${amountFormatted}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('[TELEGRAM BOT] Failed to save transaction:', error);
        await ctx.reply(`❌ Gagal menyimpan: ${(error as Error).message}`);
      }
    });

    // Global error handler
    this.bot.catch((err) => {
      console.error('[TELEGRAM BOT] Unhandled error:', err);
    });
  }

  /**
   * Start polling for updates
   */
  public startPolling(): void {
    this.bot.launch();
    console.log('[TELEGRAM BOT] Polling started');
  }

  /**
   * Stop polling gracefully
   */
  public async stop(): Promise<void> {
    await this.bot.stop();
    console.log('[TELEGRAM BOT] Polling stopped');
  }
}