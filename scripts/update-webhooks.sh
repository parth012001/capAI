#!/bin/bash
# Webhook URL Management Script
# Use this to update Pub/Sub subscriptions when URLs change
# Documentation: docs/operations/WEBHOOK_MANAGEMENT.md

set -e

PROJECT_ID="chief-ai-470506"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📡 Chief AI - Webhook URL Management${NC}\n"

# Function to update production URL
update_prod() {
    if [ -z "$1" ]; then
        echo "❌ Error: Railway URL required"
        echo "Usage: ./update-webhooks.sh prod https://your-app.railway.app"
        exit 1
    fi

    echo -e "${BLUE}Updating PRODUCTION subscription...${NC}"
    gcloud pubsub subscriptions modify-push-config gmail-notifications-sub \
        --project=$PROJECT_ID \
        --push-endpoint="$1/webhooks/gmail"

    echo -e "${GREEN}✅ Production subscription updated to: $1${NC}"
}

# Function to update development URL
update_dev() {
    if [ -z "$1" ]; then
        echo "❌ Error: ngrok URL required"
        echo "Usage: ./update-webhooks.sh dev https://abc123.ngrok-free.app"
        exit 1
    fi

    echo -e "${BLUE}Updating DEVELOPMENT subscription...${NC}"
    gcloud pubsub subscriptions modify-push-config gmail-notifications-dev \
        --project=$PROJECT_ID \
        --push-endpoint="$1/webhooks/gmail"

    echo -e "${GREEN}✅ Development subscription updated to: $1${NC}"
}

# Function to show current status
show_status() {
    echo -e "${BLUE}Current Subscriptions:${NC}\n"
    gcloud pubsub subscriptions list \
        --project=$PROJECT_ID \
        --format="table(name.basename(),pushConfig.pushEndpoint,state)"
}

# Main command handler
case "$1" in
    prod)
        update_prod "$2"
        ;;
    dev)
        update_dev "$2"
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage:"
        echo "  ./update-webhooks.sh prod <railway-url>   # Update production URL"
        echo "  ./update-webhooks.sh dev <ngrok-url>      # Update development URL"
        echo "  ./update-webhooks.sh status               # Show current URLs"
        echo ""
        echo "Examples:"
        echo "  ./update-webhooks.sh prod https://chief.railway.app"
        echo "  ./update-webhooks.sh dev https://abc123.ngrok-free.app"
        echo "  ./update-webhooks.sh status"
        exit 1
        ;;
esac
