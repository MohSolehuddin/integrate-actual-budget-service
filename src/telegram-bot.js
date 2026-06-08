// Telegram Bot Integration for Budget Service
// Supports: B/J commands + natural language parsing + model status + CSV export

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || (() => { try { return require('fs').readFileSync('/home/moh_solehuddin190805/.hermes/.env','utf8').match(/TELEGRAM_BOT_TOKEN=(.+)/)?.[1]?.trim(); } catch(e) { return null; } })();
const BUDGET_SERVICE_URL = process.env.BUDGET_SERVICE_URL || 'http://budget-service:3001';

if (!BOT_TOKEN) {
  console.error('[TELEGRAM BOT] TELEGRAM_BOT_TOKEN not set. Skipping bot initialization.');
  module.exports = { initTelegramBot: () => null };
  return;
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Regex patterns for transaction parsing
const CMD_PATTERN = /^([BJ])\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;
const NATURAL_PATTERN = /^(?:beli|bayar|b)\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;
const INCOME_PATTERN = /^(?:jual|j|terima|gaji|deposit)\s+(\S+)(?:\s+(.*?))?\s+(\d+(?:\.\d+)?[kKmMjJtTrRbB]*)\s*$/i;

function parseAmount(amountStr) {
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

function detectTransaction(text) {
  text = text.trim();
  
  // Command format: B Makan nasi 15k
  let match = text.match(CMD_PATTERN);
  if (match) {
    const amount = parseAmount(match[4]);
    if (!amount) return null;
    return {
      type: match[1].toUpperCase() === 'B' ? 'expense' : 'income',
      category: match[2],
      description: match[3] || '',
      amount: match[1].toUpperCase() === 'B' ? -Math.abs(amount) : Math.abs(amount),
      raw: text
    };
  }
  
  // Natural: beli makan nasi 15k
  match = text.match(NATURAL_PATTERN);
  if (match) {
    const amount = parseAmount(match[3]);
    if (!amount) return null;
    return {
      type: 'expense',
      category: match[1],
      description: match[2] || '',
      amount: -Math.abs(amount),
      raw: text
    };
  }
  
  // Income natural: gaji project 500k
  match = text.match(INCOME_PATTERN);
  if (match) {
    const amount = parseAmount(match[3]);
    if (!amount) return null;
    return {
      type: 'income',
      category: match[1],
      description: match[2] || '',
      amount: Math.abs(amount),
      raw: text
    };
  }
  
  return null;
}

async function sendToBudgetService(senderId, transaction) {
  try {
    const response = await axios.post(
      `${BUDGET_SERVICE_URL}/api/budget/transactions`,
      {
        accountId: '1',
        transactions: [{
          date: new Date().toISOString().split('T')[0],
          amount: transaction.amount,
          payee: transaction.category + (transaction.description ? ' - ' + transaction.description : ''),
          category: transaction.category,
          notes: transaction.description || transaction.raw
        }]
      },
      {
        headers: {
          'X-Telegram-Sender': senderId,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('[BUDGET API ERROR]', error.response?.data || error.message);
    throw error;
  }
}

// Message handler
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id.toString();
  const text = msg.text || '';
  
  console.log(`[TELEGRAM] ${senderId}: ${text}`);
  
  // Commands
  if (text.startsWith('/')) {
    const cmd = text.split(' ')[0].toLowerCase();
    
    switch (cmd) {
      case '/start':
        bot.sendMessage(chatId, 
          '👋 Halo! Saya Budget Bot.\n\n' +
          '**Cara catat transaksi:**\n' +
          '• `B Makan nasi 15k` — pengeluaran\n' +
          '• `J Gaji project 2jt` — pemasukan\n' +
          '• `beli kopi 25k` — natural language\n\n' +
          '**Commands:**\n' +
          '• `/status` — cek budget\n' +
          '• `/export` — export CSV\n' +
          '• `/model` — info model AI',
          { parse_mode: 'Markdown' }
        );
        return;
        
      case '/status':
        try {
          const res = await axios.get(`${BUDGET_SERVICE_URL}/api/budget/status`, {
            headers: { 'X-Telegram-Sender': senderId }
          });
          const data = res.data;
          bot.sendMessage(chatId,
            `✅ **Budget Status**\n` +
            `User: ${data.email}\n` +
            `Budget ID: ${data.budgetId}\n` +
            `Created: ${data.createdAt}`,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {
          bot.sendMessage(chatId, '❌ Gagal cek status: ' + (e.response?.data?.error || e.message));
        }
        return;
        
      case '/export':
        try {
          bot.sendMessage(chatId, '📊 Export CSV sedang diproses...');
          const res = await axios.get(`${BUDGET_SERVICE_URL}/api/budget/export/csv`, {
            headers: { 'X-Telegram-Sender': senderId },
            responseType: 'text'
          });
          // Save to temp file and send
          const fs = require('fs');
          const tmpFile = `/tmp/budget-export-${senderId}-${Date.now()}.csv`;
          fs.writeFileSync(tmpFile, res.data);
          await bot.sendDocument(chatId, tmpFile, {}, {
            caption: '📊 Actual Budget Export CSV',
            filename: 'actual-budget-export.csv'
          });
          fs.unlinkSync(tmpFile);
        } catch (e) {
          bot.sendMessage(chatId, '❌ Export gagal: ' + (e.response?.data?.error || e.message));
        }
        return;
        
      case '/model':
        const args = text.split(' ').slice(1);
        const fs = require('fs');
        if (args.length === 0) {
          bot.sendMessage(chatId,
            '🤖 **Model Selection**\n\n' +
            'Saat ini: `kimi-k2.6` (Ollama Cloud)\n\n' +
            'Untuk ganti model, ketik:\n' +
            '`/model qwen3-coder-next`\n' +
            '`/model nvidia/nemotron-3-ultra:free`\n' +
            '`/model kimi-k2.6`'
          );
        } else {
          const targetModel = args[0];
          // Write request file for model-switch-handler.sh
          fs.writeFileSync('/tmp/model-switch-request.txt', targetModel);
          bot.sendMessage(chatId,
            `⏳ *Model switch requested*\n` +
            `Target: \`${targetModel}\`\n\n` +
            `Sedang diproses... Cek notifikasi dalam 1 menit.`,
            { parse_mode: 'Markdown' }
          );
        }
        return;
        
      case '/help':
        bot.sendMessage(chatId,
          '**Budget Bot Commands:**\n\n' +
          '📝 `/start` — Mulai bot\n' +
          '📊 `/status` — Cek budget status\n' +
          '📁 `/export` — Export CSV ke Actual Budget\n' +
          '🤖 `/model [name]` — Info / ganti model AI\n' +
          '❓ `/help` — Bantuan\n\n' +
          '**Format transaksi:**\n' +
          '• `B Kategori deskripsi jumlah`\n' +
          '• `J Kategori deskripsi jumlah`\n' +
          '• `beli kategori deskripsi jumlah`\n' +
          '• `gaji kategori deskripsi jumlah`\n\n' +
          'Contoh: `B Makan nasi goreng 15k`'
        );
        return;
    }
  }
  
  // Auto-detect transaction
  const transaction = detectTransaction(text);
  if (transaction) {
    try {
      await bot.sendChatAction(chatId, 'typing');
      const result = await sendToBudgetService(senderId, transaction);
      
      const typeLabel = transaction.type === 'expense' ? '💸 Pengeluaran' : '💰 Pemasukan';
      const amountFormatted = Math.abs(transaction.amount).toLocaleString('id-ID');
      
      bot.sendMessage(chatId,
        `✅ **Tersimpan!**\n\n` +
        `${typeLabel}\n` +
        `Kategori: ${transaction.category}\n` +
        `Detail: ${transaction.description || '-'}\n` +
        `Jumlah: Rp${amountFormatted}\n\n` +
        `ID: #${result.data?.id || 'N/A'}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      bot.sendMessage(chatId, '❌ Gagal menyimpan: ' + (error.response?.data?.error || error.message));
    }
    return;
  }
  
  // Unknown message
  bot.sendMessage(chatId,
    'Hmm, saya belum mengerti format itu.\n\n' +
    'Coba format: `B Makan nasi 15k` atau ketik `/help`',
    { parse_mode: 'Markdown' }
  );
});

console.log('[TELEGRAM BOT] Polling started');

module.exports = { initTelegramBot: () => bot };
