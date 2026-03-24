/**
 * Notification sound utilities using Web Audio API
 * Provides a simple notification sound that works in browsers
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a notification sound using Web Audio API
 * This creates a pleasant chime-like sound
 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    
    // Create oscillator for the main tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Create a second oscillator for harmony
    const oscillator2 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();
    
    // Configure main oscillator (higher pitch)
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    oscillator.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A6
    
    // Configure second oscillator (lower harmony)
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(440, ctx.currentTime); // A4
    oscillator2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    
    // Configure gain for fade out
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    gainNode2.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(ctx.destination);
    
    // Start and stop
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
    
    oscillator2.start(ctx.currentTime);
    oscillator2.stop(ctx.currentTime + 0.4);
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}

/**
 * Show a browser notification if permission is granted
 */
export function showBrowserNotification(title: string, body: string, icon?: string): void {
  if (!('Notification' in window)) {
    return;
  }
  
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/logo.png',
      badge: '/logo.png',
      tag: 'stock-buddy-notification',
      requireInteraction: false,
    });
  }
}

/**
 * Request notification permission from the browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  return await Notification.requestPermission();
}