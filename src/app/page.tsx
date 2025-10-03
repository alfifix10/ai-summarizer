"use client";
import { useState } from "react";

export default function Home() {
  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">ملخص الملفات بالذكاء الاصطناعي</h1>
      <UploadAndSummarize />
    </main>
  );
}

function UploadAndSummarize() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && text.trim().length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const form = new FormData();
    if (file) form.append("file", file);
    if (text.trim().length > 0) form.append("text", text.trim());
    try {
      const res = await fetch("/api/summarize", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block"
        />
        <div>
          <label htmlFor="text" className="block mb-1 font-medium">أو ألصق نصاً مباشراً:</label>
          <textarea
            id="text"
            name="text"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="الصق النص هنا (اختياري)"
          />
        </div>
        <button
          disabled={(!file && text.trim().length === 0) || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "جار المعالجة..." : "تلخيص"}
        </button>
      </form>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {result && (
        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">الملخص</h2>
          {result.title && <p className="font-medium">العنوان: {result.title}</p>}
          {result.outline?.length > 0 && (
            <>
              <p className="font-medium">العناوين الفرعية:</p>
              <ul className="list-disc pr-5">
                {result.outline.map((it: string, i: number) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </>
          )}
          {result.bullets?.length > 0 && (
            <>
              <p className="font-medium">النقاط:</p>
              <ul className="list-disc pr-5">
                {result.bullets.map((it: string, i: number) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </>
          )}
          {result.keywords?.length > 0 && (
            <p>
              <span className="font-medium">كلمات مفتاحية:</span>{" "}
              {result.keywords.join("، ")}
            </p>
          )}
        </section>
      )}
    </section>
  );
}
