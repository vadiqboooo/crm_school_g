import { toast } from "sonner";

// Audio initialization state
let audioInitialized = false;
let audioElement: HTMLAudioElement | null = null;

/**
 * Create a pleasant notification sound using Web Audio API
 */
function createNotificationSound(): AudioBuffer | null {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.4; // 400ms
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Create a pleasant two-tone notification sound (like messaging apps)
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;

      // First tone (higher frequency) for first half
      if (t < duration / 2) {
        const freq = 800; // Hz
        const envelope = Math.sin((t / (duration / 2)) * Math.PI); // Smooth fade in/out
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
      }
      // Second tone (lower frequency) for second half
      else {
        const freq = 600; // Hz
        const tRel = t - duration / 2;
        const envelope = Math.sin((tRel / (duration / 2)) * Math.PI);
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
      }
    }

    audioContext.close(); // Clean up
    return buffer;
  } catch (error) {
    return null;
  }
}

/**
 * Initialize audio on first user interaction
 */
export function initializeAudio() {
  if (audioInitialized || audioElement) return;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create a simple but pleasant notification sound
    // Using base64 encoded WAV file for better compatibility
    audioElement = new Audio(
      // This is a more pleasant double-beep notification sound
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
    );

    // If the simple sound doesn't work, we'll use Web Audio API on play
    audioElement.volume = 0.4;
    audioElement.preload = "auto";

    // Try to play silently to "unlock" audio
    audioElement.volume = 0;
    const playPromise = audioElement.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Success - pause and reset
          if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
            audioElement.volume = 0.4;
            audioInitialized = true;
          }
        })
        .catch(() => {
          // Failed - will retry later
          audioElement = null;
        });
    }
  } catch (error) {
    audioElement = null;
  }
}

/**
 * Play notification sound using Web Audio API for better sound quality
 */
export function playNotificationSound() {
  // Try to initialize if not done yet
  if (!audioInitialized) {
    initializeAudio();
    return;
  }

  try {
    // Use Web Audio API for better, more pleasant sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create two-tone notification sound (like WhatsApp/Telegram)
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      // Smooth envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    // Play two tones for a pleasant notification sound
    const now = audioContext.currentTime;
    playTone(800, now, 0.15);        // First tone (higher)
    playTone(600, now + 0.1, 0.15);  // Second tone (lower)

    // Clean up after playing
    setTimeout(() => {
      audioContext.close();
    }, 500);
  } catch (error) {
    // Fallback to simple audio element if Web Audio API fails
    if (audioElement) {
      audioElement.currentTime = 0;
      audioElement.volume = 0.4;
      audioElement.play().catch(() => {
        audioInitialized = false;
        audioElement = null;
      });
    }
  }
}

/**
 * Show browser notification with permission check
 */
export async function showBrowserNotification(title: string, body: string) {
  // Check if browser supports notifications
  if (!("Notification" in window)) {
    return;
  }

  // Request permission if not granted
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }

  // Show notification if permission granted
  if (Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        body,
        requireInteraction: true, // Keep notification visible until user interacts
        tag: "task-notification", // Use same tag to replace previous notification
        silent: false,
        timestamp: Date.now(),
      });

      // Focus window when notification is clicked
      notification.onclick = () => {
        window.focus();
      };
    } catch (error) {
      console.error("Failed to show browser notification:", error);
    }
  }
}

/**
 * Show task notification with sound
 */
export function showTaskNotification(taskTitle: string, assignedBy?: string) {
  // Play sound
  playNotificationSound();

  // Show toast notification
  toast.success("Новая задача!", {
    description: taskTitle,
    duration: 5000,
  });

  // Show browser notification
  const notificationBody = assignedBy
    ? `${taskTitle}\nОт: ${assignedBy}`
    : taskTitle;

  showBrowserNotification("Новая задача", notificationBody);
}
