import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // تخطّي أخطاء ESLint أثناء البناء على Vercel لتسريع النشر الأولي
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
