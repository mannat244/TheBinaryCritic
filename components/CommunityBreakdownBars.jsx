"use client";

const COLORS = {
  pacing: "#22c55e",
  story: "#a855f7",
  performances: "#38bdf8",
};

function getWinner(obj) {
  const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
  const [key, value] = Object.entries(obj).sort((a, b) => b[1] - a[1])[0];
  return { key, percent: Math.round((value / total) * 100) };
}

export function CommunityBreakdown({ stats }) {
  if (!stats?.advancedStats) return null;

  const pacing = getWinner(stats.advancedStats.pacing);
  const story = getWinner(stats.advancedStats.story);
  const perf = getWinner(stats.advancedStats.performances);

  const Row = ({ label, value, percent, color }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-neutral-400">
          {percent}% ({value.replace("_", " ")})
        </span>
      </div>
      <div className="h-5 rounded bg-white/10 overflow-hidden">
        <div
          className="h-full rounded"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );

  return (
    <div className="bg-black border border-white/10 rounded-xl p-6 space-y-6">
      <h3 className="text-lg font-semibold">What People Liked</h3>

      <Row
        label="Pacing"
        value={pacing.key}
        percent={pacing.percent}
        color={COLORS.pacing}
      />
      <Row
        label="Story"
        value={story.key}
        percent={story.percent}
        color={COLORS.story}
      />
      <Row
        label="Performances"
        value={perf.key}
        percent={perf.percent}
        color={COLORS.performances}
      />

      <p className="text-xs text-neutral-500">
        Early community signals based on limited reviews
      </p>
    </div>
  );
}
