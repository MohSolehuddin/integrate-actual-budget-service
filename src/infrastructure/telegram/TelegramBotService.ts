import { Telegraf } from 'telegraf';
import type { IActualBudgetService } from '../actual-budget/ActualBudgetService';
import { AddTransactionUseCase } from '../../use-cases/budget/AddTransactionUseCase';
import type { TransactionInput } from '../../domain/entities/Transaction';

export function registerTelegramBot(actualBudgetService: IActualBudgetService) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN not set, skipping Telegram bot initialization');
    return null;
  }

  const addTransactionUseCase = new AddTransactionUseCase(actualBudgetService);
  const botService = new Telegraf(botToken);

  // Transaction parser helper
  const parseTransaction = (text: string): { payee: string; amount: number; category: string } | null => {
    const commandMatch = text.match(/^(B|J|Pays|Gaji|Bayar|beli|paid|transfer)\s+(.*)\s+(-?\d+([.,]\d+)?)\s*(rb|rb|ribu| jt|jt|juta)?/i);
    if (commandMatch) {
      const rawAmount = commandMatch[3].replace(',', '.');
      const unit = commandMatch[4]?.toLowerCase() || '';
      let amount = parseFloat(rawAmount);
      if (unit.includes('jt') || unit.includes('juta')) amount *= 1000000;
      else if (unit.includes('rb') || unit.includes('ribu')) amount *= 1000;
      const payee = commandMatch[2].trim();
      return { payee, amount: Math.round(amount * 100), category: 'Expense' };
    }

    const naturalMatch = text.match(/\b(beli|bayar|transfer|paid|gaji|salary|income|earn)\s*(.*)\s+(-?\d+([.,]\d+)?)\s*(rb|rb|ribu|jt|juta)?/i);
    if (naturalMatch) {
      const rawAmount = naturalMatch[3].replace(',', '.');
      const unit = naturalMatch[4]?.toLowerCase() || '';
      let amount = parseFloat(rawAmount);
      if (unit.includes('jt') || unit.includes('juta')) amount *= 1000000;
      else if (unit.includes('rb') || unit.includes('ribu')) amount *= 1000;
      const payee = naturalMatch[2]?.trim() || 'Unknown';
      return { payee, amount: Math.round(amount * 100), category: text.match(/gaji|salary|income|earn/) ? 'Income' : 'Expense' };
    }
    return null;
  };

  // Start command
  botService.start(async (ctx) => {
    await ctx.reply(`👋 Halo! Saya *Budget Bot*.\n\nKirim pesan seperti:\n• *B Makan nasi 15k*\n• *beli makan 50k*\n• *gaji 500k*`, { parse_mode: 'Markdown' });
  });

  // Help command
  botService.help(async (ctx) => {
    await ctx.reply(`*Panduan* 📝\n• *B [Nama] [ jumlah] [unit]* — Expense\n• *gaji [jumlah]* — Income\n• *beli [Nama] [jumlah]* — Natural`, { parse_mode: 'Markdown' });
  });

  // Default message handler (auto-sync to Actual Budget)
  botService.on('text', async (ctx) => {
    const text = ctx.text.trim();
    if (!text || text.startsWith('/')) return;

    const parsed = parseTransaction(text);
    if (!parsed) {
      await ctx.reply('⚠️ Format tidak dikenali. Kirim /help.');
      return;
    }

    try {
      if (!addTransactionUseCase) {
        await ctx.reply('⚠️ Sync belum tersedia.');
        return;
      }

      await addTransactionUseCase.execute('cash', [{
        date: new Date().toISOString().split('T')[0],
        amount: parsed.amount,
        payee_name: parsed.payee,
        category: parsed.category,
        notes: text
      } as TransactionInput]);

      await ctx.reply(`✅ *${parsed.category}:* ${parsed.payee}\n*Rp ${parsed.amount.toLocaleString('id-ID')}*`, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[Telegram] Sync error:', error);
      await ctx.reply('❌ Error sync ke Actual Budget: ' + (error instanceof Error ? error.message : ''));
    }
  });

  try {
    await botService.launch();
    console.log('[Telegram] Bot launched successfully');
    return botService;
  } catch (error) {
    console.error('[Telegram] Failed to launch:', error);
    return null;
  }
}
