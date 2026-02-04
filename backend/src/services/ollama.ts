import dotenv from "dotenv";
dotenv.config();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const REQUEST_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 120000);

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  model: string;
}

export async function ollamaGenerate(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const body = {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: {
      temperature: 0.7,
      top_p: 0.9,
      num_predict: 1024,
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();

      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      return data.message?.content || data.response || "";
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Unknown error");
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError || new Error("Ollama request failed after retries.");
}

export async function generateRecommendations(
  selectedPois: { name: string; category: string; address: string }[],
  userPreferences?: string
): Promise<{ name: string; category: string; reason: string }[]> {
  const poiList = selectedPois
    .map((p, i) => `${i + 1}. ${p.name} (${p.category}) — ${p.address}`)
    .join("\n");

  const systemPrompt = `You are a knowledgeable local travel assistant. Given a list of places a traveler plans to visit, suggest 3-5 additional places they might enjoy. Return ONLY a valid JSON array with no extra text. Each object must have: "name" (string), "category" (one of: restaurant, cafe, attraction, park, museum), "reason" (short explanation string).`;

  const prompt = `The traveler is visiting these places:\n${poiList}\n${userPreferences ? `\nPreferences: ${userPreferences}` : ""}\n\nSuggest 3-5 complementary places they would enjoy nearby. Return only the JSON array.`;

  const raw = await ollamaGenerate(prompt, systemPrompt);

  // Extract JSON from response
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [
      { name: "Local Market", category: "restaurant", reason: "A great stop to experience local food culture." },
      { name: "Riverside Walk", category: "park", reason: "A relaxing break between sightseeing stops." },
    ];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 5).map((item: Record<string, string>) => ({
        name: item.name || "Unknown Place",
        category: ["restaurant", "cafe", "attraction", "park", "museum"].includes(item.category)
          ? item.category
          : "attraction",
        reason: item.reason || "Recommended based on your travel profile.",
      }));
    }
  } catch {}

  return [
    { name: "Local Market", category: "restaurant", reason: "A great stop to experience local food culture." },
    { name: "Riverside Walk", category: "park", reason: "A relaxing break between sightseeing stops." },
  ];
}

export async function generateTravelTips(poi: {
  name: string;
  category: string;
  address: string;
}): Promise<{ description: string; tips: string[]; localInsights: string }> {
  const systemPrompt = `You are a local travel expert. Given a place name, category, and address, provide a short description, 2-4 practical travel tips, and a local insight. Return ONLY valid JSON with keys: "description" (string), "tips" (array of strings), "localInsights" (string). No extra text.`;

  const prompt = `Place: ${poi.name}\nCategory: ${poi.category}\nAddress: ${poi.address}\n\nProvide travel info as JSON.`;

  const raw = await ollamaGenerate(prompt, systemPrompt);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      description: `${poi.name} is a ${poi.category} located at ${poi.address}. A worthwhile stop on your journey.`,
      tips: ["Check opening hours before visiting.", "Bring cash as a backup."],
      localInsights: "Ask locals for their favorite nearby spots — they often know hidden gems.",
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      description: parsed.description || `${poi.name} is a notable ${poi.category}.`,
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 4) : ["Arrive early for the best experience."],
      localInsights: parsed.localInsights || parsed.local_insights || "A local favorite worth exploring.",
    };
  } catch {}

  return {
    description: `${poi.name} is a ${poi.category} worth visiting.`,
    tips: ["Check opening hours.", "Bring cash as a backup."],
    localInsights: "Ask locals for hidden gem recommendations nearby.",
  };
}

/**
 * Generate a unique, interesting fact about a neighborhood
 * This is called when users earn stamps for visiting new neighborhoods
 */
export async function generateNeighborhoodFact(
  neighborhoodName: string,
  cityName: string
): Promise<string> {
  const systemPrompt = `You are a knowledgeable local historian and cultural expert.
Your task is to generate a single fascinating, unique fact about a neighborhood.
The fact should be:
- Interesting and engaging
- Historically or culturally significant
- Under 100 words
- Written in a conversational, enthusiastic tone
- Start with "Did you know?" or a similar engaging opener

Focus on history, architecture, culture, famous residents, unique characteristics, or interesting trivia.`;

  const prompt = `Generate a fascinating fact about the ${neighborhoodName} neighborhood in ${cityName}.
Make it memorable and specific to this location.`;

  try {
    const raw = await ollamaGenerate(prompt, systemPrompt);

    // Clean up the response
    let fact = raw.trim();

    // Remove any markdown formatting
    fact = fact.replace(/\*\*/g, '');
    fact = fact.replace(/\*/g, '');

    // Ensure it starts with an engaging opener if it doesn't already
    if (!fact.match(/^(Did you know|Fun fact|Interesting)/i)) {
      fact = `Did you know? ${fact}`;
    }

    // Limit to reasonable length
    if (fact.length > 250) {
      fact = fact.substring(0, 247) + "...";
    }

    return fact;
  } catch (error) {
    console.error("Error generating neighborhood fact:", error);
    // Return a generic but personalized fallback
    return `Did you know? ${neighborhoodName} is a distinctive part of ${cityName}, known for its unique character and local charm. Each visit here reveals something new about the city's rich tapestry.`;
  }
}

/**
 * Generate historical context for a specific POI
 * Used for the historical view feature
 */
export async function generateHistoricalContext(poi: {
  name: string;
  category: string;
  address: string;
}): Promise<string> {
  const systemPrompt = `You are a historian specializing in urban history and architecture.
Provide a brief historical context (2-3 sentences) about a location, focusing on its origins,
historical significance, or how it has evolved over time.`;

  const prompt = `Provide historical context for: ${poi.name} (${poi.category}) located at ${poi.address}.`;

  try {
    const raw = await ollamaGenerate(prompt, systemPrompt);
    return raw.trim();
  } catch (error) {
    console.error("Error generating historical context:", error);
    return `${poi.name} has been a notable ${poi.category} in this area, serving as a gathering place for locals and visitors alike.`;
  }
}

/**
 * Generate a personalized city summary based on user's exploration
 */
export async function generateCitySummary(
  cityName: string,
  neighborhoodsVisited: string[],
  poisVisited: number
): Promise<string> {
  const systemPrompt = `You are an enthusiastic travel writer. Create a personalized,
encouraging summary of someone's exploration of a city. Keep it upbeat and motivating,
2-3 sentences max.`;

  const neighborhoods = neighborhoodsVisited.slice(0, 5).join(", ");
  const prompt = `A traveler has visited ${poisVisited} places across ${neighborhoodsVisited.length} neighborhoods in ${cityName}, including ${neighborhoods}.
Write a brief, encouraging summary of their exploration journey.`;

  try {
    const raw = await ollamaGenerate(prompt, systemPrompt);
    return raw.trim();
  } catch (error) {
    console.error("Error generating city summary:", error);
    return `You've explored ${neighborhoodsVisited.length} neighborhoods in ${cityName}, discovering ${poisVisited} unique places. Your journey through this city is building an amazing collection of memories!`;
  }
}