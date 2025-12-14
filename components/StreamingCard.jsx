"use client";

import { useEffect, useState } from "react";
import { browserCacheFetch } from "@/lib/browserCache";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function StreamingCard({ tmdbId, type }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const key = `streaming_${type}_${tmdbId}`;
        
        const data = await browserCacheFetch(
          key,
          async () => {
            const res = await fetch("/api/streaming", {
              method: "POST",
              body: JSON.stringify({ tmdbId, type }),
            });
            if (!res.ok) throw new Error("Network response was not ok");
            return res.json();
          },
          24 * 60 * 60 // 24 hours
        );

        setSources(Array.isArray(data?.sources) ? data.sources : []);

      } catch (error) {
        console.error("Failed to fetch streaming sources", error);
        setSources([]);
      } finally {
        setLoading(false);
      }
    };

    if (tmdbId) {
      fetchSources();
    }
  }, [tmdbId, type]);

  if (loading) return null; // Or a skeleton if preferred
  if (!sources || sources.length === 0) return null;

  // Group sources by type
  const grouped = sources.reduce((acc, source) => {
    const type = source.type; // sub, rent, buy, free
    if (!acc[type]) acc[type] = [];
    // Avoid duplicates
    if (!acc[type].find((s) => s.name === source.name)) {
      acc[type].push(source);
    }
    return acc;
  }, {});

  const typeLabels = {
    sub: "Stream",
    rent: "Rent",
    buy: "Buy",
    free: "Free",
  };

  const typeOrder = ["sub", "free", "rent", "buy"];

  return (
    <Card className="overflow-hidden bg-transparent border-0 shadow-none w-fit">
      <CardContent className="pt-1 px-0 border-0 space-y-1">
        {typeOrder.map((typeKey) => {
          const items = grouped[typeKey];
          if (!items || items.length === 0) return null;

          return (
            <div key={typeKey} className="space-y-3">
              <h4 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
                {typeLabels[typeKey]}
              </h4>
              <div className="flex flex-wrap gap-2">
                {items.map((source) => (
                  <a
                    key={source.source_id + source.name}
                    href={source.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-neutral-800 mt-2 xl:text-sm text-xs cursor-pointer border-neutral-700 hover:bg-neutral-700 hover:text-white text-neutral-200 gap-2"
                    >
                      {source.name}
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </Button>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
