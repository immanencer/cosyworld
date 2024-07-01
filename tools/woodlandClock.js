export const WoodlandLunarClock = (() => {
    const lunarPhases = ["Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", 
                         "Waning Gibbous", "Last Quarter", "Waning Crescent", "New Moon"];
    const woodlandSounds = ["Hoot", "Rustle", "Chirp", "Screech", "Howl", "Croak", "Buzz", "Whisper"];
    const mysticalEvents = ["Fairy Dance", "Mushroom Circle", "Firefly Symphony", "Moonbeam Bath", 
                            "Dryad Awakening", "Pixie Parade", "Wolfpack Serenade", "Owl Parliament"];
    const weatherConditions = ["misty", "starry", "cloudy", "breezy", "still", "dewdropped", "frosty", "warm"];
    const creatures = ["Wise Owl", "Mischievous Raccoon", "Ancient Tree", "Playful Fox", "Elegant Deer", "Busy Beaver"];
  
    const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  
    const getSeasonalModifier = () => {
      const month = new Date().getMonth();
      if (month >= 2 && month <= 4) return "Spring's";
      if (month >= 5 && month <= 7) return "Summer's";
      if (month >= 8 && month <= 10) return "Autumn's";
      return "Winter's";
    };
  
    const generatePoeticalTime = () => {
      const hours = new Date().getHours();
      if (hours >= 22 || hours < 4) return "Midnight's Embrace";
      if (hours >= 4 && hours < 7) return "Dawn's First Light";
      if (hours >= 7 && hours < 12) return "Morning's Glow";
      if (hours >= 12 && hours < 16) return "Midday's Warmth";
      if (hours >= 16 && hours < 19) return "Evening's Approach";
      return "Twilight's Whisper";
    };
  
    return {
      tellTime: () => {
        const currentTime = new Date();
        const moonPosition = (currentTime.getHours() * 60 + currentTime.getMinutes()) % (24 * 60);
        const lunarPhase = lunarPhases[moonPosition % lunarPhases.length];
        const woodlandTime = `${randomChoice(woodlandSounds)} o'${randomChoice(woodlandSounds)}`;
        const weather = randomChoice(weatherConditions);
        const seasonalModifier = getSeasonalModifier();
        const poeticalTime = generatePoeticalTime();
        
        if (Math.random() < 0.15) {  // 15% chance of a mystical event
          const event = randomChoice(mysticalEvents);
          return `Under ${seasonalModifier} ${lunarPhase}, at ${woodlandTime}, ${poeticalTime} brings a ${event}. The ${weather} air tingles with magic!`;
        } else {
          const creature = randomChoice(creatures);
          return `${creature} proclaims it's ${woodlandTime} during ${seasonalModifier} ${lunarPhase}. ${capitalize(weather)} breezes carry ${poeticalTime} through the leaves.`;
        }
      },
      
      getForecast: () => {
        const upcomingPhases = [...Array(3)].map(() => randomChoice(lunarPhases));
        const events = [...Array(3)].map(() => randomChoice(mysticalEvents));
        return `Upcoming Lunar Phases: ${upcomingPhases.join(", ")}. 
                Watch for these mystical happenings: ${events.join(", ")}.`;
      },
      
      getMoonlightIntensity: () => {
        const intensity = Math.floor(Math.random() * 10) + 1;
        return `Current Moonlight Intensity: ${intensity}/10 ` +
               `${intensity > 7 ? "Brilliantly lit!" : intensity < 4 ? "Rather dim." : "A pleasant glow."}`;
      }
    };
  })();