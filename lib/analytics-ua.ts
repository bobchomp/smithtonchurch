// Works out the device, browser and operating system from a browser's user agent, and spots bots.

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|scrapy|vercel/i;

export function isBot(ua: string): boolean {
  return !ua || BOT.test(ua);
}

export function describeAgent(ua: string, screenWidth?: number): { device: string; browser: string; os: string } {
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /CrOS/.test(ua)
        ? "ChromeOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X|Macintosh/.test(ua)
            ? /Mobile/.test(ua) ? "iOS" : "macOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "Other";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /OPR\/|Opera/.test(ua)
        ? "Opera"
        : /Firefox|FxiOS/.test(ua)
          ? "Firefox"
          : /CriOS|Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Other";
  const tablet = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) || (os === "iOS" && (screenWidth ?? 0) >= 768);
  const mobile = /Mobi|iPhone|iPod/.test(ua);
  return { device: tablet ? "tablet" : mobile ? "mobile" : "desktop", browser, os };
}
