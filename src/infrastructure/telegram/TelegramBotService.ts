import { Telegraf, Context, Markup, SessionState } from 'telegraf';
import type { IActualBudgetService } from '../actual-budget/ActualBudgetService';
import type { AddTransactionUseCase } from '../../use-cases/budget/AddTransactionUseCase';

// Transaction parser
const parseTransaction = (text: string): { payee: string; amount: number; category: string } | null => {
  // Format: B/Pays Makan 15k atau J/Gaji 2jt
  const commandMatch = text.match(/^(B|J|Pays|Gaji|Bayar|beli|paid|transfer)\s+(.*)\s+(-?\d+([.,]\d+)?)\s*(rb|rb|ribu| jt|jt|juta)?/i);
  if (commandMatch) {
    const rawAmount = commandMatch[3].replace(',', '.');
    const unit = commandMatch[4]?.toLowerCase() || '';
    let amount = parseFloat(rawAmount);
    if (unit.includes('jt') || unit.includes('juta')) {
      amount *= 1000000;
    } else if (unit.includes('rb') || unit.includes('ribu')) {
      amount *= 1000;
    }
    const payee = commandMatch[2].trim();
    return {
      payee,
      amount: Math.round(amount * 100), // cents
      category: 'Expense'
    };
  }

  // Natural language: "beli makan 50k", "gaji 500k", "bayar listrik 100k"
  const naturalMatch = text.match(/\b(beli|bayar|transfer|paid|gaji|salary|income|income|earn)\s*(.*)\s+(-?\d+([.,]\d+)?)\s*(rb|rb|ribu|jt|juta)?/i);
  if (naturalMatch) {
    const rawAmount = naturalMatch[3].replace(',', '.');
    const unit = naturalMatch[4]?.toLowerCase() || '';
    let amount = parseFloat(rawAmount);
    if (unit.includes('jt') || unit.includes('juta')) {
      amount *= 1000000;
    } else if (unit.includes('rb') || unit.includes('ribu')) {
      amount *= 1000;
    }
    const payee = naturalMatch[2]?.trim() || 'Unknown';
    return {
      payee,
      amount: Math.round(amount * 100), // cents
      category: text.match(/gaji|salary|income|earn/) ? 'Income' : 'Expense'
    };
  }

  return null;
};

export class TelegramBotService {
  private bot: Telegraf<Context>;
  private actualBudgetService?: IActualBudgetService;
  private addTransactionUseCase?: AddTransactionUseCase;

  constructor(botToken: string, actualBudgetService?: IActualBudgetService, addTransactionUseCase?: AddTransactionUseCase) {
    this.bot = new Telegraf(botToken);
    this.actualBudgetService = actualBudgetService;
    this.addTransactionUseCase = addTransactionUseCase;

    this.setupHandlers();
  }

  private setupHandlers() {
    // Start command
    this.bot.start(async (ctx) => {
      await ctx.reply(
        `👋 Halo! Saya *Budget Bot*.\n\nSaya bisa membantu Anda mencatat transaksi ke Actual Budget.\n\nKirim pesan seperti:\n• *B Makan nasi 15k*\n• *beli makan 50k*\n• *gaji 500k*\n\nAtau gunakan perintah:\n• /start — Mulai\n• /status — Status budget\n• /help — Bantuan`,
        { parse_mode: 'Markdown' }
      );
    });

    // Help command
    this.bot.help(async (ctx) => {
      await ctx.reply(
        `*Panduan Penggunaan* 📝\n\nKirim pesan dengan format:\n• *B [Nama] [jumlah] [unit]* — Transaksi expense (misal: B Makan nasi 15k)\n• *J [Nama] [jumlah] [unit]* — Transaksi income (misal: J Gaji 500k)\n• *beli [Nama] [jumlah] [unit]* — Expense natural (misal: beli makan 50k)\n• *gaji [jumlah] [unit]* — Income natural (misal: gaji 500k)\n\nUnit: k/ribu, jt/juta\nDapat auto-detect dari konteks pesan.`,
        { parse_mode: 'Markdown' }
      );
    });

    // Status command
    this.bot.command('status', async (ctx) => {
      try {
        if (!this.actualBudgetService) {
          await ctx.reply('⚠️ Actual Budget service belum terhubung. Mohon hubungi admin.');
          return;
        }
        const accounts = await this.actualBudgetService.getAccounts();
        const cats = await this.actualBudgetService.getCategories();
        await ctx.reply(
          `*Status Budget* 📊\n\nAkun: ${accounts.length} tersedia\nKategori: ${cats.length} tersedia\n\nJika akun belum tersedia, gunakan perintah /start untuk setup.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error: any) {
        console.error('Status error:', error);
        await ctx.reply('❌ Gagal ambil status budget: ' + (error.message || ''));
      }
    });

    // Default message handler
    this.bot.on('text', async (ctx) => {
      const text = ctx.text.trim();
      if (!text || text.startsWith('/')) return;

      // Parse transaction
      const parsed = parseTransaction(text);
      if (!parsed) {
        await ctx.reply('⚠️ Format tidak dikenali. Kirim /help untuk panduan.');
        return;
      }

      // Sync ke Actual Budget
      try {
        if (!this.addTransactionUseCase) {
          await ctx.reply('⚠️ Fitur sync Actual Budget belum tersedia.');
          return;
        }

        const accountId = 'cash';
        await this.addTransactionUseCase.execute(accountId, [{
          date: new Date().toISOString().split('T')[0],
          amount: parsed.amount,
          payee: parsed.payee,
          category: parsed.category,
          notes: text
        }]);

        await ctx.reply(`✅ Transaksi tersimpan:\n• *${parsed.category}:* ${parsed.payee}\n• *Rp ${parsed.amount.toLocaleString('id-ID')}*`, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Sync error:', error);
        await ctx.reply('❌ Error sync ke Actual Budget: ' + (error instanceof Error ? error.message : ''));
      }
    });
  }

  public async launch(): Promise<void> {
    const port = parseInt(process.env.TELEGRAM_BOT_PORT || '9000', 10);
    await this.bot.launch();
    console.log('Telegram bot launched.');
  }

  public stop(): Promise<void> {
    return this.bot.stop();
  }
}
