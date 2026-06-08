#!/bin/bash
# model-switch-handler.sh — polls for model switch requests from Telegram bot
# Run as cron: * * * * * /home/moh_solehuddin190805/integrate-actual-budget-service/scripts/model-switch-handler.sh

REQUEST_FILE="/tmp/model-switch-request.txt"
LOG_FILE="/tmp/model-switch.log"

if [ ! -f "$REQUEST_FILE" ]; then
  exit 0
fi

MODEL=$(cat "$REQUEST_FILE" | tr -d '\n' | tr -d '\r')
if [ -z "$MODEL" ]; then
  rm -f "$REQUEST_FILE"
  exit 0
fi

# Get current model
CURRENT_MODEL=$(hermes config get model.default 2>/dev/null || echo "unknown")

if [ "$MODEL" = "$CURRENT_MODEL" ]; then
  echo "$(date): Model $MODEL already active" >> "$LOG_FILE"
  rm -f "$REQUEST_FILE"
  exit 0
fi

# Attempt switch
echo "$(date): Switching model from $CURRENT_MODEL to $MODEL..." >> "$LOG_FILE"
if hermes config set model.default "$MODEL" 2>> "$LOG_FILE"; then
  echo "$(date): ✅ Model switched to $MODEL" >> "$LOG_FILE"
  
  # Notify via Telegram
  TOKEN=$(grep "TELEGRAM_BOT_TOKEN" /home/moh_solehuddin190805/.hermes/.env | cut -d'=' -f2)
  CHAT_ID=$(grep "TELEGRAM_HOME_CHANNEL" /home/moh_solehuddin190805/.hermes/.env | cut -d'=' -f2)
  MSG="🤖 *Model Switched*%0A%0AFrom: %60$CURRENT_MODEL%60%0ATo: %60$MODEL%60%0A%0A✅ Active now"
  curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}" \
    -d "text=${MSG}" \
    -d "parse_mode=Markdown" > /dev/null 2>&1
else
  echo "$(date): ❌ Failed to switch to $MODEL" >> "$LOG_FILE"
  
  TOKEN=$(grep "TELEGRAM_BOT_TOKEN" /home/moh_solehuddin190805/.hermes/.env | cut -d'=' -f2)
  CHAT_ID=$(grep "TELEGRAM_HOME_CHANNEL" /home/moh_solehuddin190805/.hermes/.env | cut -d'=' -f2)
  MSG="❌ *Model Switch Failed*%0A%0ATarget: %60$MODEL%60%0A%0ACheck logs: %60/tmp/model-switch.log%60"
  curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}" \
    -d "text=${MSG}" \
    -d "parse_mode=Markdown" > /dev/null 2>&1
fi

rm -f "$REQUEST_FILE"
