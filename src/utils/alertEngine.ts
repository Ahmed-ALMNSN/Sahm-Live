import { StockItem, AlertNotification, Language } from '../types.js';
import { getTranslation } from '../i18n/index.js';

class AlertEngine {
  private audioCtx: AudioContext | null = null;

  // Synthesize a clean, pleasant notification sound using Web Audio API
  playAlertChime(type: 'UPPER' | 'LOWER') {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }

      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      if (type === 'UPPER') {
        // Ascending chime for Upper Alert
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
      } else {
        // Descending / warning tone for Lower Alert
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(370, now + 0.18);
      }

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio not permitted yet or not supported
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'denied';
      }
      return await Notification.requestPermission();
    } catch (err) {
      console.warn('Notification permission request suppressed (e.g. iframe environment):', err);
      return 'denied';
    }
  }

  getNotificationPermission(): NotificationPermission {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
      return Notification.permission;
    } catch {
      return 'denied';
    }
  }

  sendBrowserNotification(
    alert: AlertNotification, 
    lang: Language,
    onSelectStock?: (symbol: string) => void
  ) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const t = getTranslation(lang);
    const title = `${t.alerts.notificationTitle} ${alert.symbol}`;
    const body = alert.type === 'UPPER'
      ? `${alert.symbol} ($${alert.triggeredPrice.toFixed(2)}) ${t.alerts.upperCrossed} ($${alert.targetPrice.toFixed(2)})`
      : `${alert.symbol} ($${alert.triggeredPrice.toFixed(2)}) ${t.alerts.lowerCrossed} ($${alert.targetPrice.toFixed(2)})`;

    try {
      const notification = new Notification(title, {
        body,
        tag: `stock-alert-${alert.symbol}-${alert.type}-${Date.now()}`,
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (onSelectStock) {
          onSelectStock(alert.symbol);
        }
      };
    } catch (err) {
      console.warn('Browser notification failed:', err);
    }
  }

  /**
   * Process a stock's latest price against its alert thresholds using crossing logic.
   * Returns newly triggered alerts (if any) and updated stock state.
   */
  evaluateStockAlerts(stock: StockItem): {
    updatedStock: StockItem;
    triggeredAlerts: AlertNotification[];
  } {
    const triggeredAlerts: AlertNotification[] = [];
    const updated = { ...stock };
    const currentPrice = stock.price;

    if (!stock.alertsEnabled || currentPrice <= 0) {
      return { updatedStock: updated, triggeredAlerts };
    }

    // 1. Evaluate Upper Alert
    if (stock.upperAlert !== null && stock.upperAlert > 0) {
      const target = stock.upperAlert;
      const isCurrentlyAbove = currentPrice >= target;
      const wasPreviouslyAbove = stock.upperCrossedState === true;

      if (isCurrentlyAbove) {
        if (!wasPreviouslyAbove) {
          // Transitioned from below to at/above => TRIGGER!
          triggeredAlerts.push({
            id: `upper_${stock.symbol}_${Date.now()}`,
            symbol: stock.symbol,
            companyName: stock.companyName,
            type: 'UPPER',
            targetPrice: target,
            triggeredPrice: currentPrice,
            timestamp: Date.now(),
          });
          updated.upperCrossedState = true;
        }
      } else {
        // Price is back below upper alert threshold => reset state
        updated.upperCrossedState = false;
      }
    }

    // 2. Evaluate Lower Alert
    if (stock.lowerAlert !== null && stock.lowerAlert > 0) {
      const target = stock.lowerAlert;
      const isCurrentlyBelow = currentPrice <= target;
      const wasPreviouslyBelow = stock.lowerCrossedState === true;

      if (isCurrentlyBelow) {
        if (!wasPreviouslyBelow) {
          // Transitioned from above to at/below => TRIGGER!
          triggeredAlerts.push({
            id: `lower_${stock.symbol}_${Date.now()}`,
            symbol: stock.symbol,
            companyName: stock.companyName,
            type: 'LOWER',
            targetPrice: target,
            triggeredPrice: currentPrice,
            timestamp: Date.now(),
          });
          updated.lowerCrossedState = true;
        }
      } else {
        // Price is back above lower alert threshold => reset state
        updated.lowerCrossedState = false;
      }
    }

    return { updatedStock: updated, triggeredAlerts };
  }
}

export const alertEngine = new AlertEngine();
