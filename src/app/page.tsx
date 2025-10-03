"use client";
import { useState } from "react";

export default function Home() {
  return (
    <main
      className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 text-slate-100"
      dir="rtl"
    >
      <section className="max-w-3xl mx-auto px-4 py-10">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">ملخص الملفات بالذكاء الاصطناعي</h1>
          <p className="text-slate-300 mt-2 text-sm md:text-base">ارفع مستندك أو ألصق نصاً وسيقوم النظام بتوليد ملخص عربي منظم.</p>
        </header>
        <UploadAndSummarize />
      </section>
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
      <form
        onSubmit={onSubmit}
        className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-sm space-y-5"
      >
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">اختيار الملف (PDF / DOCX / TXT)</label>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
          />
          <p className="text-xs text-slate-400">الحد الأقصى 20MB. يمكنك تركه فارغاً ولصق نص بدلاً من ذلك.</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="text" className="block text-sm text-slate-300">أو ألصق نصاً مباشراً</label>
          <textarea
            id="text"
            name="text"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-500"
            placeholder="الصق النص هنا (اختياري)"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={(!file && text.trim().length === 0) || loading}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {loading ? "جار المعالجة..." : "تلخيص"}
          </button>
          <span className="text-xs text-slate-400">سيتم إرسال البيانات بأمان ومعالجتها مؤقتاً فقط.</span>
        </div>
      </form>

      {error && (
        <p className="mt-4 text-sm text-rose-400 bg-rose-500/10 border border-rose-600/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {result && (
        <section className="mt-8">
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-3">الملخص</h2>
            {result.title && (
              <p className="mb-3 text-slate-200"><span className="font-semibold">العنوان:</span> {result.title}</p>
            )}
            {result.outline?.length > 0 && (
              <div className="mb-4">
                <p className="font-semibold mb-1">العناوين الفرعية:</p>
                <ul className="list-disc pr-6 space-y-1 text-slate-200">
                  {result.outline.map((it: string, i: number) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.bullets?.length > 0 && (
              <div className="mb-4">
                <p className="font-semibold mb-1">النقاط:</p>
                <ul className="list-disc pr-6 space-y-1 text-slate-200">
                  {result.bullets.map((it: string, i: number) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.keywords?.length > 0 && (
              <p className="text-slate-200"><span className="font-semibold">كلمات مفتاحية:</span> {result.keywords.join("، ")}</p>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
