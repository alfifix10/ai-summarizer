export const runtime = 'nodejs';
import { NextRequest, NextResponse } from "next/server";
import * as pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { fileTypeFromBuffer } from "file-type";

const MAX_BYTES = 20 * 1024 * 1024; // 20MB
const CHUNK_WORDS = 1500;

function splitIntoChunks(text: string, wordsPerChunk = CHUNK_WORDS) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }
  return chunks;
}

async function extractText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error("الملف أكبر من الحد المسموح (20MB)");

  const kind = await fileTypeFromBuffer(buf);
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt")) {
    return buf.toString("utf8");
  }
  if (name.endsWith(".pdf") || kind?.mime === "application/pdf") {
    const res = await (pdfParse as any)(buf);
    return res.text || "";
  }
  if (
    name.endsWith(".docx") ||
    kind?.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const res = await mammoth.extractRawText({ buffer: buf });
    return res.value || "";
  }
  throw new Error("نوع الملف غير مدعوم. الرجاء رفع PDF أو DOCX أو TXT");
}

async function summarizeChunk(prompt: string, chunk: string) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.MODEL || "llama-3.1-8b-instant";
  // مسار تجريبي في حال عدم ضبط المفتاح: يعيد تلخيصاً بسيطاً بدون نموذج
  if (!apiKey) {
    const sentences = chunk
      .split(/(?<=[.!؟\?\n])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    return `ملخص تجريبي (بدون نموذج):\n- ${sentences.join("\n- ")}`;
  }

  const body = {
    model,
    messages: [
      {
        role: "system",
        content:
          "أنت مساعد يلخص نصوصاً بالعربية بشكل منظم. أعد: عنوان موجز، عناوين فرعية مختصرة، نقاط رئيسية، وكلمات مفتاحية.",
      },
      {
        role: "user",
        content: `${prompt}\n\nالنص:\n${chunk}`,
      },
    ],
    temperature: 0.2,
  };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`فشل استدعاء النموذج: ${t}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

function mergeSummaries(parts: string[]) {
  // دمج بسيط: استخدام أول سطور كنقاط رئيسية
  const joined = parts.join("\n\n");
  const bullets = joined
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 15);
  return {
    title: "ملخص المستند",
    outline: [],
    bullets,
    keywords: [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const textInput = (form.get("text") ?? "") as string;
    const file = form.get("file");

    const t0 = Date.now();
    let raw = "";
    if (typeof textInput === "string" && textInput.trim().length > 0) {
      raw = textInput.trim();
    } else if (file instanceof File) {
      raw = (await extractText(file)).trim();
    } else {
      return NextResponse.json({ error: "الرجاء رفع ملف أو لصق نص" }, { status: 400 });
    }
    if (!raw) return NextResponse.json({ error: "تعذر استخراج نص من الملف" }, { status: 400 });

    const chunks = splitIntoChunks(raw);
    const prompt =
      "لخّص النص التالي بالعربية في صيغة منظمة: عنوان موجز، عناوين فرعية، نقاط رئيسية قصيرة، وكلمات مفتاحية عربية. لا تكرر النص حرفياً.";

    const concurrency = 3;
    const results: string[] = [];
    for (let i = 0; i < chunks.length; i += concurrency) {
      const batch = chunks.slice(i, i + concurrency);
      const partial = await Promise.all(batch.map((c) => summarizeChunk(prompt, c)));
      results.push(...partial);
    }

    const merged = mergeSummaries(results);
    const data = {
      ...merged,
      word_count: raw.split(/\s+/).filter(Boolean).length,
      processing_time_ms: Date.now() - t0,
    };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "خطأ غير متوقع" }, { status: 500 });
  }
}
