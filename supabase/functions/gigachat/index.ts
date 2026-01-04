import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache for access token
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const authKey = Deno.env.get("GIGACHAT_AUTH_KEY");
  if (!authKey) {
    throw new Error("GIGACHAT_AUTH_KEY is not configured");
  }

  console.log("Fetching new GigaChat access token...");

  const response = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "RqUID": crypto.randomUUID(),
      "Authorization": `Basic ${authKey}`,
    },
    body: "scope=GIGACHAT_API_PERS",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OAuth error:", response.status, errorText);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  
  // Cache the token (expires_at is in milliseconds)
  cachedToken = {
    token: data.access_token,
    expiresAt: data.expires_at || Date.now() + 1800000, // Default 30 min if not provided
  };

  console.log("Got new access token, expires at:", new Date(cachedToken.expiresAt).toISOString());
  return cachedToken.token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("messages array is required");
    }

    const accessToken = await getAccessToken();

    // Prepare messages for GigaChat format
    const gigaChatMessages = [
      {
        role: "system",
        content: `Ты — ИИ-помощник образовательной платформы СИНТАГМА. 
Твоя задача — помогать ученикам с вопросами по обучению, объяснять материалы курсов, отвечать на вопросы.
Отвечай дружелюбно, понятно и по существу. Используй примеры когда это уместно.
Если не знаешь ответа — честно скажи об этом.`,
      },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    console.log("Sending request to GigaChat with", gigaChatMessages.length, "messages");

    const response = await fetch("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: "GigaChat",
        messages: gigaChatMessages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GigaChat API error:", response.status, errorText);
      
      // If token expired, clear cache and retry once
      if (response.status === 401) {
        cachedToken = null;
        throw new Error("Token expired, please retry");
      }
      
      throw new Error(`GigaChat API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "Извините, не удалось получить ответ.";

    console.log("GigaChat response received, length:", assistantMessage.length);

    return new Response(
      JSON.stringify({ content: assistantMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("GigaChat function error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
