"use client";

import React from "react";
import { RadialBarChart, RadialBar, PolarRadiusAxis, Label } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Star } from "lucide-react";

const VERDICTS = {
  masterpiece: { label: "Must Watch", color: "#a855f7" },
  worth_it: { label: "Worth Your Time", color: "#22c55e" },
  it_depends: { label: "One-Time Watch", color: "#38bdf8" },
  skip_it: { label: "Skip", color: "#ef4444" },
};

export default function VerdictRadialChart({
  stats,
  voteAvg = 0,
  voteCount = 0,
}) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Return a skeleton or null during SSR to avoid mismatch
    return (
      <Card className="bg-black border-white/10 h-[260px] animate-pulse">
        <CardContent className="h-full" />
      </Card>
    );
  }

  const tbcReviews = stats?.totalReviews || 0;
  const hasTMDB = voteCount > 0 && voteAvg > 0;
  // Show TBC if:
  // 1. We have enough reviews (>= 5) - High Confidence override
  // 2. We have ANY reviews (> 0) AND TMDB is missing - Low Confidence fallback
  const hasTBC = tbcReviews >= 5 || (tbcReviews > 0 && !hasTMDB);

  /* ----------------------------------
     CASE 1: USE TBC DATA
  ---------------------------------- */
  if (hasTBC && stats?.verdictCounts) {
    const v = stats.verdictCounts;

    const total =
      v.masterpiece + v.worth_it + v.it_depends + v.skip_it || 1;

    // Dominant Verdict Logic
    // Sorter: Find the category with the most votes
    // We filter using the keys we know to avoid stray data
    const sortedVerdicts = ["masterpiece", "worth_it", "it_depends", "skip_it"]
      .map(key => ({ key, count: v[key] || 0 }))
      .sort((a, b) => b.count - a.count);

    const dominantItem = sortedVerdicts[0];
    const dominantKey = dominantItem.key;
    const dominantCount = dominantItem.count;

    // Score is simply the % of the dominant verdict
    const score = Math.round((dominantCount / total) * 100);

    const dominant = VERDICTS[dominantKey];

    const data = [
      {
        masterpiece: v.masterpiece,
        worth_it: v.worth_it,
        it_depends: v.it_depends,
        skip_it: v.skip_it,
      },
    ];

    return (
      <Card className="bg-black border-white/10">
        <CardHeader className="pb-2">
          <h3 className="text-lg font-semibold text-white">
            Community Verdict
          </h3>
        </CardHeader>

        <CardContent className="flex flex-col items-center">
          <RadialBarChart
            width={300}
            height={200}
            data={data}
            innerRadius={90}
            outerRadius={140}
            startAngle={180}
            endAngle={0}
          >
            <PolarRadiusAxis tick={false} axisLine={false}>
              <Label
                content={({ viewBox }) => (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                    <tspan
                      className="fill-white text-4xl font-bold"
                      x={viewBox.cx}
                      dy={-4}
                    >
                      {score}%
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      dy={28}
                      className="fill-neutral-300 text-sm font-medium"
                    >
                      {dominant?.label}
                    </tspan>
                  </text>
                )}
              />
            </PolarRadiusAxis>

            {Object.keys(VERDICTS).map((key) => (
              <RadialBar
                key={key}
                dataKey={key}
                stackId="a"
                fill={VERDICTS[key].color}
                cornerRadius={6}
              />
            ))}
          </RadialBarChart>

          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-neutral-400">
            {Object.entries(VERDICTS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: v.color }}
                />
                {v.label}
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-neutral-500">
            Based on {tbcReviews} community review{tbcReviews > 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ----------------------------------
    CASE 2: FALLBACK TO TMDB
 ---------------------------------- */
  if (hasTMDB) {
    const score = Math.round((voteAvg / 10) * 100);

    const data = [{ value: score }];

    return (
      <Card className="bg-black border-white/10">
        <CardHeader className="pb-2">
          <h3 className="text-lg font-semibold text-white">
            TMDB Rating
          </h3>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center min-h-[260px]">
          <RadialBarChart
            width={260}
            height={200}
            data={data}
            innerRadius={85}
            outerRadius={120}
            startAngle={180}
            endAngle={0}
          >
            <PolarRadiusAxis tick={false} axisLine={false}>
              <Label
                content={({ viewBox }) => (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                  >
                    <tspan
                      className="fill-purple-400 text-4xl font-bold"
                      x={viewBox.cx}
                      dy={-2}
                    >
                      {score}%
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      dy={26}
                      className="fill-neutral-300 text-sm"
                    >
                      Audience Approval
                    </tspan>
                  </text>
                )}
              />
            </PolarRadiusAxis>

            <RadialBar
              dataKey="value"
              fill="#a855f7"
              cornerRadius={8}
            />
          </RadialBarChart>

          <p className="mt-3 text-xs text-neutral-500">
            Based on {voteCount.toLocaleString()} TMDB votes
          </p>
        </CardContent>
      </Card>
    );
  }


  /* ----------------------------------
     CASE 3: NO DATA YET
  ---------------------------------- */
  return (
    <Card className=" flex bg-black flex-col border-white/10">
      <CardHeader className="">
        <h3 className="text-lg font-semibold text-white">
          Verdict Pending
        </h3>
      </CardHeader>

      <CardContent className="text-center relative -top-3 flex-col flex my-auto justify-center items-center text-sm text-neutral-400">
        <div className="w-10 mb-2 h-10 flex items-center justify-center bg-neutral-900 rounded-full">
          <Star />
        </div>


        Not enough data yet.
        <br />
        Be among the first to review.
      </CardContent>
    </Card>
  );
}
