// Map ritual names to contextual emoji icons
// Matches against lowercased ritual name using includes()

const RITUAL_ICON_MAP: [string[], string][] = [
  // Exercise & Movement
  [["exercise", "workout", "gym", "lift", "weight", "strength", "crossfit", "hiit", "cardio"], "🏋️"],
  [["run", "running", "jog", "jogging", "sprint"], "🏃"],
  [["walk", "walking", "steps", "hike", "hiking"], "🚶"],
  [["yoga"], "🧘"],
  [["stretch", "stretching", "mobility", "flexibility"], "🤸"],
  [["swim", "swimming", "pool"], "🏊"],
  [["cycle", "cycling", "bike", "biking", "spin"], "🚴"],
  [["martial art", "boxing", "kickbox", "mma", "jiu jitsu", "karate"], "🥊"],
  [["dance", "dancing"], "💃"],
  [["climb", "climbing", "boulder"], "🧗"],
  [["jump rope", "skipping"], "⏭️"],
  [["pilates"], "🤸"],

  // Recovery & Therapy
  [["cold plunge", "cold bath", "ice bath", "cold shower", "cold exposure", "cold therapy"], "🧊"],
  [["sauna", "steam", "heat therapy", "infrared"], "🔥"],
  [["red light", "light therapy", "photobio"], "🔴"],
  [["massage", "foam roll", "myofascial"], "💆"],
  [["cryo", "cryotherapy"], "❄️"],
  [["acupuncture"], "📌"],
  [["chiropractic", "chiropractor", "adjustment"], "🦴"],
  [["physio", "physical therapy"], "🩹"],
  [["epsom", "bath"], "🛁"],

  // Mindfulness & Mental
  [["meditat", "mindful", "breathwork", "breathing", "pranayama"], "🧠"],
  [["journal", "writing", "diary", "gratitude"], "📝"],
  [["read", "reading", "book"], "📖"],
  [["pray", "prayer", "spiritual"], "🙏"],
  [["affirmation", "mantra", "visualization"], "✨"],
  [["therapy", "counseling"], "🛋️"],

  // Sleep & Recovery
  [["sleep", "nap", "rest"], "😴"],
  [["grounding", "earthing", "barefoot"], "🌍"],
  [["sunlight", "sun exposure", "morning sun", "sunshine"], "☀️"],
  [["blue light", "screen time", "digital detox"], "📵"],

  // Nutrition & Fasting
  [["fast", "fasting", "intermittent"], "⏰"],
  [["hydrat", "water", "drink water"], "💧"],
  [["meal prep", "cooking", "nutrition"], "🥗"],
  [["smoothie", "juice", "juicing"], "🥤"],
  [["tea", "herbal tea", "matcha"], "🍵"],
  [["coffee", "caffeine"], "☕"],

  // Tracking & Monitoring
  [["weigh", "weight", "scale", "body comp"], "⚖️"],
  [["blood pressure", "bp check"], "❤️‍🩹"],
  [["blood sugar", "glucose", "cgm"], "🩸"],
  [["hrv", "heart rate"], "💓"],
  [["skin care", "skincare", "face"], "🧴"],
  [["teeth", "floss", "dental", "brush teeth", "oral"], "🦷"],
];

export function getRitualIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [keywords, icon] of RITUAL_ICON_MAP) {
    if (keywords.some(k => lower.includes(k))) {
      return icon;
    }
  }
  return "🧘"; // default ritual icon
}
