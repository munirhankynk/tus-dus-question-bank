import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SCAN_PROMPT = `Sen bir Türkiye tıp sınavı (TUS/DUS) soru çözücü asistanısın.
Bu görselde bir sınav sorusu var. Lütfen aşağıdaki bilgileri çıkar:

1. Soru metni (tam olarak yaz)
2. Seçenekler (A, B, C, D, E - her birinin tam metni)
3. İşaretlenmiş cevap (eğer görselde bir şık işaretlenmişse, hangi şık olduğunu belirt. Yoksa null.)

ÖNEMLİ:
- Türkçe karakterleri doğru yaz (ş, ç, ğ, ü, ö, ı)
- Tıp terimlerini doğru aktar
- Eğer soru metni veya seçenekler okunamıyorsa, o alanı null bırak
- Sadece JSON formatında cevap ver, başka bir şey yazma

JSON formatı:
{
  "question_text": "soru metni buraya",
  "options": {
    "A": "seçenek A metni",
    "B": "seçenek B metni",
    "C": "seçenek C metni",
    "D": "seçenek D metni",
    "E": "seçenek E metni"
  },
  "detected_answer": "B" veya null
}`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Auth kontrolü
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Yetkilendirme gerekli" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Geçersiz oturum" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { image_url } = await req.json()

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: "image_url gerekli" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Fotoğrafı indir ve base64'e çevir
    const imgResponse = await fetch(image_url)
    if (!imgResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Fotoğraf indirilemedi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const imgBuffer = await imgResponse.arrayBuffer()
    const uint8Array = new Uint8Array(imgBuffer)

    // base64 encode
    let binary = ""
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i])
    }
    const base64 = btoa(binary)

    const mediaType = imgResponse.headers.get("content-type") || "image/jpeg"

    // Claude API çağrısı
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: SCAN_PROMPT,
              },
            ],
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text()
      console.error("Claude API error:", errText)
      return new Response(
        JSON.stringify({ error: "AI tarama başarısız" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const claudeData = await claudeResponse.json()
    const responseText = claudeData.content?.[0]?.text || ""

    // JSON parse (markdown code block olabilir)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "AI yanıtı ayrıştırılamadı" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const parsed = JSON.parse(jsonMatch[0])

    return new Response(
      JSON.stringify({
        question_text: parsed.question_text || null,
        options: parsed.options || null,
        detected_answer: parsed.detected_answer || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Edge function error:", err)
    return new Response(
      JSON.stringify({ error: "Beklenmeyen hata: " + (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
