"use client";
import { useEffect, useState } from "react";
import { Tweet } from "@/lib/types";

export default function TweetFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  useEffect(() => {
    const load = async () => { const res = await fetch("/api/tweets?crypto=true&limit=20"); const data = await res.json(); if (data.ok) setTweets(data.tweets); };
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <h2 className="text-white font-semibold text-lg mb-4">Recent Signals <span className="ml-2 text-xs text-gray-500 font-normal">({tweets.length} crypto tweets)</span></h2>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {tweets.length === 0 && <p className="text-gray-500 text-sm">No tweets yet. Run the Python scraper first.</p>}
        {tweets.map((t, i) => (
          <div key={i} className="border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-blue-400 text-sm font-medium">@{t.username}</span>
              <span className="text-gray-600 text-xs">{t.time}</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">{t.text.slice(0, 200)}{t.text.length > 200 && "..."}</p>
            <div className="flex gap-3 mt-2 text-xs text-gray-600">
              <span>❤️ {t.likes}</span><span>🔄 {t.retweets}</span><span>💬 {t.replies}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
