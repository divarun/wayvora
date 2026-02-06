"use client";
import { useEffect, useState } from "react";
import { gamificationService } from "@/services/gamification";
import { UserProgress, Achievement, Quest, MysteryBox, Stamp, Badge } from "@/types/gamification";
import { CATEGORY_CONFIG } from "@/utils/constants";

export default function PassportPanel() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "stamps" | "quests" | "achievements" | "mystery">("overview");

  useEffect(() => {
    const userProgress = gamificationService.getProgress();
    setProgress(userProgress);
  }, []);

  if (!progress) return null;

  const { passport, activeQuests, achievements, mysteryBoxes } = progress;
  const { level, statistics, badges, stamps } = passport;

  return (
    <div className="fixed right-3 top-20 w-80 glass rounded-2xl border border-white/[0.08] shadow-glass overflow-hidden z-10 max-h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] bg-gradient-to-r from-ocean-500/[0.2] to-ocean-600/[0.2]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-lg font-semibold text-white">
            Explorer Passport
          </h2>
          <div className="text-2xl">📖</div>
        </div>

        {/* Level Badge */}
        <div className="flex items-center gap-3">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${getLevelGradient(level.title)}`}>
            {getLevelEmoji(level.title)}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{level.title}</p>
            <p className="text-slate-400 text-xs">Level {level.level}</p>
            <div className="mt-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-ocean-400 to-ocean-500 transition-all duration-300"
                style={{ width: `${(level.xp / level.xpToNextLevel) * 100}%` }}
              />
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              {level.xp} / {level.xpToNextLevel} XP
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] bg-slate-900/[0.5] overflow-x-auto flex-shrink-0 sticky top-0 z-10">
        {[
          { id: "overview", label: "Stats", emoji: "📊" },
          { id: "stamps", label: "Stamps", emoji: "🎫" },
          { id: "quests", label: "Quests", emoji: "🎯" },
          { id: "achievements", label: "Badges", emoji: "🏆" },
          { id: "mystery", label: "Boxes", emoji: "🎁" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-shrink-0 px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "text-ocean-300 bg-ocean-500/[0.15] border-b-2 border-ocean-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            <span className="mr-1">{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "overview" && (
          <div className="space-y-3">
            <StatCard
              emoji="🎫"
              label="Stamps Collected"
              value={stamps.length}
              color="ocean"
              onClick={() => setActiveTab("stamps")}
            />
            <StatCard
              emoji="📍"
              label="POIs Visited"
              value={statistics.poisVisited}
              color="emerald"
            />
            <StatCard
              emoji="🌆"
              label="Cities Explored"
              value={statistics.citiesVisited}
              color="coral"
            />
            <StatCard
              emoji="🚶"
              label="Distance Traveled"
              value={`${(statistics.totalDistance / 1000).toFixed(1)} km`}
              color="emerald"
            />
            <StatCard
              emoji="✅"
              label="Quests Completed"
              value={statistics.questsCompleted}
              color="amber"
            />
            <StatCard
              emoji="🔥"
              label="Current Streak"
              value={`${statistics.currentStreak} days`}
              color="coral"
            />

            {badges.length > 0 && (
              <div className="pt-3 border-t border-white/[0.06]">
                <p className="text-slate-400 text-xs font-semibold mb-2">Recent Badges</p>
                <div className="flex flex-wrap gap-2">
                  {badges.slice(0, 6).map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-white/[0.06] rounded-lg px-2 py-1.5 border border-white/[0.08]"
                      title={badge.description}
                    >
                      <span className="text-lg">{badge.iconEmoji}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "stamps" && (
          <div className="space-y-3">
            {stamps.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-3">🎫</div>
                <p className="text-slate-400 text-sm font-semibold">No stamps yet</p>
                <p className="text-slate-600 text-xs mt-1">Visit neighborhoods to collect stamps!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-400 text-xs font-semibold">
                    {stamps.length} {stamps.length === 1 ? 'Stamp' : 'Stamps'} Collected
                  </p>
                  <div className="flex gap-1">
                    {getRarityDistribution(stamps).map(({ rarity, count }) => (
                      <div key={rarity} className="text-xs" title={`${count} ${rarity}`}>
                        {getRarityEmoji(rarity)}<span className="text-slate-500">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {stamps
                  .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
                  .map((stamp) => (
                    <StampCard key={stamp.id} stamp={stamp} />
                  ))}
              </>
            )}
          </div>
        )}

        {activeTab === "quests" && (
          <div className="space-y-3">
            {activeQuests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">No active quests</p>
                <p className="text-slate-600 text-xs mt-1">Visit POIs to unlock quests</p>
              </div>
            ) : (
              activeQuests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} />
              ))
            )}
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="space-y-2">
            {achievements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">No achievements yet</p>
                <p className="text-slate-600 text-xs mt-1">Start exploring to earn badges!</p>
              </div>
            ) : (
              achievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))
            )}
          </div>
        )}

        {activeTab === "mystery" && (
          <div className="space-y-3">
            {mysteryBoxes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">No mystery boxes</p>
                <p className="text-slate-600 text-xs mt-1">Keep exploring to earn them!</p>
              </div>
            ) : (
              mysteryBoxes.map((box) => (
                <MysteryBoxCard key={box.id} box={box} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================
   SUB-COMPONENTS
============================================ */

function StatCard({
  emoji,
  label,
  value,
  color,
  onClick,
}: {
  emoji: string;
  label: string;
  value: string | number;
  color: "ocean" | "coral" | "emerald" | "amber";
  onClick?: () => void;
}) {
  const colorMap = {
    ocean: "from-ocean-500/[0.15] to-ocean-600/[0.15] border-ocean-500/[0.2]",
    coral: "from-coral-500/[0.15] to-coral-600/[0.15] border-coral-500/[0.2]",
    emerald: "from-emerald-500/[0.15] to-emerald-600/[0.15] border-emerald-500/[0.2]",
    amber: "from-amber-500/[0.15] to-amber-600/[0.15] border-amber-500/[0.2]",
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`bg-gradient-to-r ${colorMap[color]} border rounded-xl px-3 py-2.5 flex items-center gap-3 ${
        onClick ? 'cursor-pointer hover:brightness-110 transition-all' : ''
      } w-full text-left`}
    >
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1">
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-white font-semibold text-lg">{value}</p>
      </div>
    </Component>
  );
}

function StampCard({ stamp }: { stamp: Stamp }) {
  const rarityColors = {
    common: "from-slate-500/[0.3] to-slate-600/[0.3] border-slate-500/[0.3]",
    rare: "from-ocean-500/[0.3] to-ocean-600/[0.3] border-ocean-500/[0.3]",
    legendary: "from-amber-600/[0.35] to-amber-700/[0.35] border-amber-600/[0.4]",
  };

  const rarityLabels = {
    common: "Common",
    rare: "Rare",
    legendary: "Legendary",
  };

  const formattedDate = new Date(stamp.earnedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className={`bg-gradient-to-r ${rarityColors[stamp.rarity]} border rounded-xl p-3`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getRarityEmoji(stamp.rarity)}</span>
            <div>
              <p className="text-white font-semibold text-sm">{stamp.neighborhoodName}</p>
              <p className="text-slate-200 text-xs">{stamp.cityName}, {stamp.countryCode}</p>
            </div>
          </div>
        </div>
        <span className={`text-xs font-semibold uppercase ${getRarityTextColor(stamp.rarity)}`}>
          {rarityLabels[stamp.rarity]}
        </span>
      </div>

      {stamp.aiDescription && (
        <div className="bg-slate-900/[0.3] rounded-lg p-2 mb-2 border border-white/[0.15]">
          <p className="text-slate-100 text-xs leading-relaxed">{stamp.aiDescription}</p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/[0.15]">
        <span className="text-slate-100 font-medium">
          {stamp.uniquePOIsVisited} {stamp.uniquePOIsVisited === 1 ? 'place' : 'places'} visited
        </span>
        <span className="text-slate-100 font-medium">{formattedDate}</span>
      </div>
    </div>
  );
}

function QuestCard({ quest }: { quest: Quest }) {
  const difficultyColors = {
    easy: "text-emerald-400",
    medium: "text-amber-400",
    hard: "text-coral-400",
    epic: "text-purple-400",
  };

  return (
    <div className="glass-card p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{quest.title}</p>
          <p className="text-slate-500 text-xs mt-0.5">{quest.description}</p>
        </div>
        <span className={`text-xs font-semibold ${difficultyColors[quest.difficulty]}`}>
          {quest.difficulty.toUpperCase()}
        </span>
      </div>

      {/* Progress */}
      <div className="bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-ocean-400 to-ocean-500 transition-all duration-300"
          style={{ width: `${quest.progress}%` }}
        />
      </div>

      {/* Requirements */}
      <div className="space-y-1">
        {quest.requirements.map((req) => (
          <div key={req.id} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{req.description}</span>
            <span className="text-slate-300 font-semibold">
              {req.current} / {req.target}
            </span>
          </div>
        ))}
      </div>

      {/* Reward */}
      <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-slate-500 text-xs">Reward</span>
        <span className="text-ocean-300 text-xs font-semibold">+{quest.reward.xp} XP</span>
      </div>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const tierColors = {
    bronze: "from-amber-700/[0.2] to-amber-800/[0.2] border-amber-600/[0.3]",
    silver: "from-slate-400/[0.2] to-slate-500/[0.2] border-slate-400/[0.3]",
    gold: "from-amber-400/[0.2] to-amber-500/[0.2] border-amber-400/[0.3]",
    platinum: "from-ocean-400/[0.2] to-ocean-500/[0.2] border-ocean-400/[0.3]",
  };

  return (
    <div className={`bg-gradient-to-r ${tierColors[achievement.tier]} border rounded-xl px-3 py-2.5 flex items-center gap-3`}>
      <span className="text-2xl">{achievement.iconEmoji}</span>
      <div className="flex-1">
        <p className="text-white font-semibold text-sm">{achievement.name}</p>
        <p className="text-slate-400 text-xs">{achievement.description}</p>
      </div>
      <span className="text-ocean-300 text-xs font-semibold">+{achievement.reward.xp} XP</span>
    </div>
  );
}

function MysteryBoxCard({ box }: { box: MysteryBox }) {
  const [isOpen, setIsOpen] = useState(box.opened);

  const rarityColors = {
    common: "from-slate-500/[0.2] to-slate-600/[0.2] border-slate-500/[0.3]",
    rare: "from-ocean-500/[0.2] to-ocean-600/[0.2] border-ocean-500/[0.3]",
    epic: "from-purple-500/[0.2] to-purple-600/[0.2] border-purple-500/[0.3]",
    legendary: "from-amber-400/[0.2] to-amber-500/[0.2] border-amber-400/[0.3]",
  };

  const handleOpen = () => {
    setIsOpen(true);
    // TODO: Trigger AI to generate actual reward content
  };

  return (
    <div className={`bg-gradient-to-r ${rarityColors[box.rarity]} border rounded-xl px-3 py-2.5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">🎁</span>
        <span className="text-xs font-semibold text-white uppercase">{box.rarity}</span>
      </div>

      {!isOpen ? (
        <button
          onClick={handleOpen}
          className="w-full btn-primary py-2 text-xs"
        >
          Open Mystery Box
        </button>
      ) : (
        <div className="bg-white/[0.06] rounded-lg p-2">
          <p className="text-slate-300 text-xs">{box.reward.content}</p>
        </div>
      )}
    </div>
  );
}

/* ============================================
   HELPER FUNCTIONS
============================================ */

function getLevelGradient(title: string): string {
  const gradients = {
    Tourist: "bg-gradient-to-br from-slate-500 to-slate-600",
    Traveler: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    Explorer: "bg-gradient-to-br from-ocean-500 to-ocean-600",
    "Local Guide": "bg-gradient-to-br from-purple-500 to-purple-600",
    "City Expert": "bg-gradient-to-br from-coral-500 to-coral-600",
    Legend: "bg-gradient-to-br from-amber-400 to-amber-500",
  };
  return gradients[title as keyof typeof gradients] || gradients.Tourist;
}

function getLevelEmoji(title: string): string {
  const emojis = {
    Tourist: "👤",
    Traveler: "🎒",
    Explorer: "🧭",
    "Local Guide": "🗺️",
    "City Expert": "⭐",
    Legend: "👑",
  };
  return emojis[title as keyof typeof emojis] || "👤";
}

function getRarityEmoji(rarity: "common" | "rare" | "legendary"): string {
  const emojis = {
    common: "🎫",
    rare: "✨",
    legendary: "🌟",
  };
  return emojis[rarity];
}

function getRarityTextColor(rarity: "common" | "rare" | "legendary"): string {
  const colors = {
    common: "text-slate-200",
    rare: "text-ocean-200",
    legendary: "text-amber-200",
  };
  return colors[rarity];
}

function getRarityDistribution(stamps: Stamp[]): { rarity: string; count: number }[] {
  const distribution = {
    common: 0,
    rare: 0,
    legendary: 0,
  };

  stamps.forEach((stamp) => {
    distribution[stamp.rarity]++;
  });

  return [
    { rarity: "legendary", count: distribution.legendary },
    { rarity: "rare", count: distribution.rare },
    { rarity: "common", count: distribution.common },
  ].filter(item => item.count > 0);
}