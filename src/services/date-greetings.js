/**
 * Date Greetings - Human-like date messages
 * Makes the OS feel alive with personality
 */

// Ordinal suffix helper
function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Time of day helper
function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Build date info object
function buildDateInfo(date) {
  const day = date.getDate();
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    weekdayShort: date.toLocaleDateString('en-US', { weekday: 'short' }),
    month: date.toLocaleDateString('en-US', { month: 'long' }),
    monthShort: date.toLocaleDateString('en-US', { month: 'short' }),
    day: day,
    ordinalDay: getOrdinal(day),
    monthDay: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    year: date.getFullYear(),
  };
}

// ============================================
// GREETING TEMPLATES
// Each function receives dateInfo object
// ============================================

const GREETINGS = {
  // MORNING (5am - 12pm)
  morning: [
    (d) => `Good morning. It's ${d.weekday}.`,
    (d) => `A new ${d.weekday} begins.`,
    (d) => `${d.weekday} morning, ${d.monthDay}.`,
    (d) => `Rise and shine. ${d.weekday}.`,
    (d) => `The ${d.ordinalDay} of ${d.month}. A fresh ${d.weekday}.`,
    (d) => `Morning. ${d.weekday}, ${d.month} ${d.ordinalDay}.`,
    (d) => `Hello, ${d.weekday}.`,
    (d) => `${d.weekday}. The day is young.`,
    (d) => `A ${d.weekday} morning in ${d.month}.`,
    (d) => `The ${d.ordinalDay}. Good morning.`,
    (d) => `${d.month} ${d.ordinalDay}. Rise.`,
    (d) => `Here comes ${d.weekday}.`,
    (d) => `${d.weekday} awaits. ${d.monthDay}.`,
    (d) => `Morning light. ${d.weekday}.`,
    (d) => `The ${d.ordinalDay} greets you.`,
    (d) => `Welcome to ${d.weekday}.`,
    (d) => `${d.weekday}. Let's begin.`,
    (d) => `A bright ${d.weekday} morning.`,
    (d) => `${d.month}. ${d.weekday}. Morning.`,
    (d) => `Today is ${d.weekday}.`,
  ],

  // AFTERNOON (12pm - 5pm)
  afternoon: [
    (d) => `${d.weekday} afternoon.`,
    (d) => `It's ${d.weekday}, the ${d.ordinalDay}.`,
    (d) => `Midday. ${d.weekday}, ${d.monthDay}.`,
    (d) => `${d.month} ${d.ordinalDay}. ${d.weekday}.`,
    (d) => `This ${d.weekday} in ${d.month}.`,
    (d) => `Afternoon. The ${d.ordinalDay}.`,
    (d) => `${d.weekday}. Half the day gone.`,
    (d) => `The afternoon of ${d.monthDay}.`,
    (d) => `Still ${d.weekday}. ${d.month} ${d.ordinalDay}.`,
    (d) => `${d.weekday} continues.`,
    (d) => `${d.monthDay}. Afternoon.`,
    (d) => `A ${d.weekday} afternoon.`,
    (d) => `${d.month}, the ${d.ordinalDay}. Afternoon.`,
    (d) => `The ${d.ordinalDay}. ${d.weekday} afternoon.`,
    (d) => `${d.weekday}. The sun is high.`,
    (d) => `Midday ${d.weekday}.`,
    (d) => `${d.weekday}. ${d.month} ${d.ordinalDay}.`,
    (d) => `The day moves on. ${d.weekday}.`,
    (d) => `${d.monthDay}. ${d.weekday}.`,
    (d) => `Afternoon hours. ${d.weekday}.`,
  ],

  // EVENING (5pm - 9pm)
  evening: [
    (d) => `${d.weekday} evening.`,
    (d) => `The ${d.ordinalDay} draws to a close.`,
    (d) => `Evening. ${d.weekday}, ${d.monthDay}.`,
    (d) => `${d.weekday} night, ${d.month} ${d.ordinalDay}.`,
    (d) => `A quiet ${d.weekday} evening.`,
    (d) => `Evening falls on ${d.weekday}.`,
    (d) => `${d.monthDay}. Evening.`,
    (d) => `The evening of the ${d.ordinalDay}.`,
    (d) => `${d.weekday}. Sun setting.`,
    (d) => `${d.month} ${d.ordinalDay}. Evening.`,
    (d) => `A ${d.weekday} evening in ${d.month}.`,
    (d) => `Dusk. ${d.weekday}.`,
    (d) => `The ${d.ordinalDay}. Good evening.`,
    (d) => `${d.weekday} winds down.`,
    (d) => `Evening, ${d.monthDay}.`,
    (d) => `${d.weekday}. Day's end approaches.`,
    (d) => `The ${d.ordinalDay} of ${d.month}. Evening.`,
    (d) => `Twilight. ${d.weekday}.`,
    (d) => `${d.weekday} evening. ${d.month} ${d.ordinalDay}.`,
    (d) => `Good evening. ${d.weekday}.`,
  ],

  // NIGHT (9pm - 5am)
  night: [
    (d) => `Late ${d.weekday}. ${d.monthDay}.`,
    (d) => `Still ${d.weekday}. The ${d.ordinalDay}.`,
    (d) => `${d.weekday}, past midnight.`,
    (d) => `The quiet hours of ${d.weekday}.`,
    (d) => `${d.month} ${d.ordinalDay}. Night.`,
    (d) => `Night. ${d.weekday}.`,
    (d) => `The ${d.ordinalDay}. Late.`,
    (d) => `A late ${d.weekday} night.`,
    (d) => `${d.weekday} night. ${d.monthDay}.`,
    (d) => `Midnight. ${d.weekday}.`,
    (d) => `The night of the ${d.ordinalDay}.`,
    (d) => `${d.weekday}. The world sleeps.`,
    (d) => `Deep night. ${d.month} ${d.ordinalDay}.`,
    (d) => `${d.weekday}. Stars above.`,
    (d) => `Night owl hours. ${d.weekday}.`,
    (d) => `${d.monthDay}. Night.`,
    (d) => `The ${d.ordinalDay}. Can't sleep?`,
    (d) => `Late ${d.weekday}. ${d.month}.`,
    (d) => `${d.weekday} night continues.`,
    (d) => `Quiet ${d.weekday} night.`,
  ],

  // MONDAY - fresh start vibes
  monday: [
    (d) => `Monday. A fresh start.`,
    (d) => `Here we go. Monday, ${d.monthDay}.`,
    (d) => `The week begins. ${d.monthDay}.`,
    (d) => `Monday, ${d.month} ${d.ordinalDay}.`,
    (d) => `New week. New Monday.`,
    (d) => `Monday awaits.`,
    (d) => `It's Monday. ${d.month} ${d.ordinalDay}.`,
    (d) => `Monday. Let's do this.`,
    (d) => `The ${d.ordinalDay}. Monday.`,
    (d) => `Monday morning has arrived.`,
    (d) => `${d.monthDay}. Monday.`,
    (d) => `A new Monday begins.`,
    (d) => `Monday. The world resets.`,
    (d) => `Hello, Monday.`,
    (d) => `Monday, ${d.ordinalDay} of ${d.month}.`,
    (d) => `Fresh Monday. ${d.monthDay}.`,
    (d) => `The start of something. Monday.`,
    (d) => `Monday. Possibilities await.`,
    (d) => `It begins. Monday.`,
    (d) => `Monday. ${d.month} ${d.ordinalDay}.`,
  ],

  // FRIDAY - celebration vibes
  friday: [
    (d) => `Finally, Friday.`,
    (d) => `Friday. You made it. ${d.monthDay}.`,
    (d) => `TGIF. ${d.month} ${d.ordinalDay}.`,
    (d) => `Friday, ${d.monthDay}. Almost there.`,
    (d) => `It's Friday. Breathe.`,
    (d) => `Friday at last.`,
    (d) => `${d.monthDay}. Friday.`,
    (d) => `Friday. The week yields.`,
    (d) => `The ${d.ordinalDay}. Friday.`,
    (d) => `Friday. Freedom approaches.`,
    (d) => `Happy Friday. ${d.month} ${d.ordinalDay}.`,
    (d) => `Friday. Well done.`,
    (d) => `${d.month} ${d.ordinalDay}. Friday.`,
    (d) => `Friday vibes. ${d.monthDay}.`,
    (d) => `The weekend beckons. Friday.`,
    (d) => `Friday, the ${d.ordinalDay}.`,
    (d) => `Sweet Friday.`,
    (d) => `Friday. You earned this.`,
    (d) => `${d.monthDay}. Hello, Friday.`,
    (d) => `Friday. Almost weekend.`,
  ],

  // WEEKEND - relaxation vibes
  weekend: [
    (d) => `Happy ${d.weekday}.`,
    (d) => `${d.weekday}. Take your time.`,
    (d) => `A ${d.weekday} to remember. ${d.monthDay}.`,
    (d) => `Relax. It's ${d.weekday}.`,
    (d) => `${d.weekday}. No rush.`,
    (d) => `${d.monthDay}. ${d.weekday}.`,
    (d) => `A lazy ${d.weekday}.`,
    (d) => `${d.weekday}. The week can wait.`,
    (d) => `Enjoy your ${d.weekday}.`,
    (d) => `${d.weekday}, ${d.month} ${d.ordinalDay}.`,
    (d) => `${d.weekday}. Rest well.`,
    (d) => `A good ${d.weekday} to you.`,
    (d) => `${d.weekday}. Slow down.`,
    (d) => `The ${d.ordinalDay}. Happy ${d.weekday}.`,
    (d) => `${d.weekday} vibes.`,
    (d) => `${d.monthDay}. Enjoy.`,
    (d) => `${d.weekday}. Breathe.`,
    (d) => `A ${d.weekday} in ${d.month}.`,
    (d) => `${d.weekday}. Your time.`,
    (d) => `Weekend. ${d.weekday}.`,
  ],
};

// Pick a random item from array
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a human-like date greeting
 * @param {Date} date - The date to generate greeting for (defaults to now)
 * @returns {string} A human-like greeting with the date
 */
export function generateDateGreeting(date = new Date()) {
  const weekdayNum = date.getDay();
  const hour = date.getHours();
  const dateInfo = buildDateInfo(date);
  
  // Pick greeting pool based on day
  let pool;
  if (weekdayNum === 1) {
    // Monday - 50% chance of Monday-specific, 50% time-based
    pool = Math.random() > 0.5 ? GREETINGS.monday : GREETINGS[getTimeOfDay(hour)];
  } else if (weekdayNum === 5) {
    // Friday - 50% chance of Friday-specific, 50% time-based
    pool = Math.random() > 0.5 ? GREETINGS.friday : GREETINGS[getTimeOfDay(hour)];
  } else if (weekdayNum === 0 || weekdayNum === 6) {
    // Weekend - 50% chance of weekend-specific, 50% time-based
    pool = Math.random() > 0.5 ? GREETINGS.weekend : GREETINGS[getTimeOfDay(hour)];
  } else {
    // Regular weekday - use time-based
    pool = GREETINGS[getTimeOfDay(hour)];
  }
  
  // Pick random greeting from pool
  const template = randomFrom(pool);
  return template(dateInfo);
}

/**
 * Get all available greetings count
 * @returns {number} Total number of unique greeting templates
 */
export function getGreetingsCount() {
  return Object.values(GREETINGS).reduce((sum, arr) => sum + arr.length, 0);
}
