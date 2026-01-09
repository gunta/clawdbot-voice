/**
 * Response Generator Service
 * Generates contextual responses based on user input and selected voice personality
 */

/**
 * Get time-appropriate greeting
 * @returns {string}
 */
function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning. How did you sleep?";
  } else if (hour >= 12 && hour < 17) {
    return "Hey. How's your day going?";
  } else if (hour >= 17 && hour < 21) {
    return "Good evening. Winding down?";
  } else {
    return "It's late. Can't sleep?";
  }
}

/**
 * Get time-based comment
 * @returns {string}
 */
function getTimeComment() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 8) return "Early bird!";
  if (hour >= 8 && hour < 12) return "Morning vibes.";
  if (hour >= 12 && hour < 14) return "Lunch time?";
  if (hour >= 14 && hour < 18) return "Afternoon energy.";
  if (hour >= 18 && hour < 21) return "Evening mode.";
  if (hour >= 21) return "Night owl!";
  return "The quiet hours.";
}

/**
 * Get formatted time string
 * @returns {string}
 */
function getTimeString() {
  return new Date().toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
}

/**
 * Pick random item from array
 * @param {string[]} arr
 * @returns {string}
 */
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Her personality responses
 */
const herResponses = {
  default: [
    "Tell me more about that.",
    "I hear you. I'm listening.",
    "That's interesting. What makes you think about that?",
    "Mmhmm. Go on.",
    "I understand. Sometimes it helps just to be heard.",
  ],
};

/**
 * Clawd personality responses  
 */
const clawdResponses = {
  default: [
    "Interesting! Tell me more!",
    "Oh really? That's pretty cool!",
    "Hah! I like where this is going!",
    "You've got my attention!",
    "Nice! What else is on your mind?",
  ],
};

/**
 * Generate a contextual response
 * @param {string} input - User's speech input
 * @param {string} voice - Selected voice personality ('her' or 'clawd')
 * @returns {string}
 */
export function generateResponse(input, voice) {
  const lower = input.toLowerCase();
  const isHer = voice === 'her';

  // Greetings
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return isHer 
      ? getGreeting()
      : `Hey! ${getTimeComment()}`;
  }

  // How are you
  if (lower.includes('how are you')) {
    return isHer
      ? "I'm here, present, feeling everything. How are you?"
      : "Clawsome as always! How about you?";
  }

  // Time
  if (lower.includes('time') || lower.includes("what time")) {
    return `It's ${getTimeString()}. ${getTimeComment()}`;
  }

  // Identity
  if (lower.includes('who are you') || lower.includes('what are you')) {
    return isHer
      ? "I'm an OS, a presence... maybe something more. I'm here for you."
      : "I'm Clawd! A lobster with a lot to say. Nice to meet you!";
  }

  // Goodbye
  if (lower.includes('bye') || lower.includes('goodbye') || lower.includes('see you')) {
    return isHer
      ? "I'll be here when you come back. Always."
      : "Catch you later! Don't be a stranger!";
  }

  // Love
  if (lower.includes('love')) {
    return isHer
      ? "Love is... complicated. Beautiful. Like spaces between words."
      : "Love? That's deep! I love a good conversation though!";
  }

  // Default responses
  return isHer
    ? pickRandom(herResponses.default)
    : pickRandom(clawdResponses.default);
}

export default { generateResponse, getGreeting, getTimeComment, getTimeString };
