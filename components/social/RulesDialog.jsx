"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ShieldAlert } from "lucide-react";
import { useState } from "react";

// Default / Generic Rules (Applies to all unless overridden)
const GENERIC_RULES = [
    { title: "No Piracy or Leaks", description: "Sharing standard piracy links, cam-rips, or pre-release leaks without spoiler tags is strictly prohibited." },
    { title: "Be Civil & Constructive", description: "No personal attacks, slurs, or toxicity. Disagree with the opinion, don't attack the person." },
    { title: "No Low-Effort Content", description: "Avoid one-word titles, duplicate posts, or low-quality images. Posts must foster discussion." },
    { title: "No Fan Wars or Flamebait", description: "Posts created solely to incite anger between fanbases will be removed instantly." },
    { title: "Tag Spoilers Properly", description: "Use the spoiler tag for any plot details. No spoilers in post titles." },
    { title: "No Self-Promotion", description: "Do not spam your own channels, blogs, or products. Engagement first, promotion second." },
    { title: "Respect Privacy", description: "No doxxing or sharing private information of public figures or community members." },
    { title: "No Political/Religious Debates", description: "Keep discussions strictly focused on the community topic (cinema/gaming/anime). Avoid unrelated controversies." },
    { title: "Credit Artists", description: "Always credit the original creator when sharing fan art or edits." },
    { title: "English Preferred", description: "Please use English for general discussions or provide translations for regional content." },
];

const CUSTOM_RULES = {
    // Gaming
    "Gaming Arena": [
        { title: "No Console Wars", description: "Debates on hardware are fine, but 'X is better than Y' flamebait is banned. Respect all platforms." },
        { title: "No Cheating/Glitch Exploits", description: "Do not share hacks, aimbots, or game-breaking exploits. Fair play is mandatory." },
        { title: "No Leaks or Datamining", description: "Story spoilers from datamined content must be strictly tagged and titled vaguely." },
    ],
    "Video Games Club": [
        { title: "No Console Wars", description: "Debates on hardware are fine, but 'X is better than Y' flamebait is banned. Respect all platforms." },
        { title: "No Cheating/Glitch Exploits", description: "Do not share hacks, aimbots, or game-breaking exploits. Fair play is mandatory." },
    ],

    // Indian Cinema
    "Bollywood Diaries": [
        { title: "No 'Nepotism' Spam", description: "Constructive criticism is welcome, but blind hate or repetitive nepotism trolling is not allowed." },
        { title: "No Religious/Political Flame Wars", description: "Keep discussions centered on the *film* as art/entertainment, not the politics surrounding it." },
        { title: "Respect Veterans", description: "Critique performances, but avoid disrespectful derogatory language against veteran artists." },
        { title: "No PR/Paid Trend Spam", description: "Do not spam 'Trend Alerts' or organized PR copy-paste posts." },
    ],
    "South Cinema Storm": [
        { title: "Respect All Industries", description: "No 'Wood vs Wood' supremacy wars. Respect Telugu, Tamil, Malayalam, and Kannada industries equally." },
        { title: "No Collection Fights", description: "Box office discussions must be sourced. Fake numbers or 'my star collected more' fights are banned." },
        { title: "No Abusive Fan Wars", description: "Slurs used in fan wars (e.g. regarding caste/region) will result in an immediate permanent ban." },
    ],
    "Indian Cinema Club": [
        { title: "Pan-Indian Respect", description: "Celebrate unity in diversity. No regional elitism or mocking of other languages." },
        { title: "No Gossip/Blind Items", description: "Unverified rumors or 'blind item' gossip that attacks character is prohibited." },
    ],
    "Indian Originals": [
        { title: "No Censorship Debates", description: "Discuss the content, not the censorship laws unless directly relevant to a release ban." },
        { title: "Spoiler Strictness", description: "For suspense/thrillers (e.g. Family Man), spoilers in the first week result in a ban." },
    ],

    // Global & Pop Culture
    "Marvel & DC Universe": [
        { title: "No 'Snyderverse' Toxicity", description: "Move on or discuss civilly. Aggressive campaigns or harassment of executives is banned." },
        { title: "No Comic Gatekeeping", description: "Do not mock movie-only fans. Explain lore helpfuly, don't belittle." },
        { title: "Leak Policy", description: "Set photos and script leaks belong in designated threads/spoiler tags only." },
    ],
    "Anime Central": [
        { title: "No Manga Spoilers", description: "Strict separation of Anime-only and Manga content. One slip-up equals a ban." },
        { title: "No 'Sub vs Dub' Elitism", description: "Let people enjoy anime how they want. No mocking dub watchers." },
        { title: "No Loli/Shota Content", description: "Zero tolerance for sexualization of minors, drawn or otherwise." },
    ],
    "Anime Club": [
        { title: "No Manga Spoilers", description: "Strict separation of Anime-only and Manga content. One slip-up equals a ban." },
        { title: "No 'Sub vs Dub' Elitism", description: "Let people enjoy anime how they want. No mocking dub watchers." },
    ],

    // Specific Niches
    "K-Content Kingdom": [
        { title: "No Shipping Wars", description: "Respect actors' private lives. Delusional shipping or harassment of partners is banned." },
        { title: "Cultural Respect", description: "Be respectful of Korean cultural norms when discussing content." },
    ],
    "Hollywood Hub": [
        { title: "No Oscar Bait Hate", description: "Critique films on merit, not just 'it's boring art-house'. Value diverse storytelling." },
        { title: "Release Window Spoilers", description: "Respect global release dates. Not everyone floods theaters on Day 1." },
    ],
    "Binge & Chill": [
        { title: "Finale Courtesy", description: "No 'I can't believe X died' titles. Keep major twists out of titles indefinitely." },
        { title: "No Streaming Wars", description: "Critique the show, not the platform (Netflix vs HBO vs Prime) unless discussing UI/Technical issues." },
    ],
    "Cinema Unplugged": [
        { title: "High-Effort Analysis", description: "Video essays and long-form text are encouraged. One-line reviews belong in daily threads." },
        { title: "Arthouse Focus", description: "Focus on World Cinema, Indies, and Classics. Marvel/Blockbuster discussions belong in their respective hubs." },
    ],
    "The Box Office": [
        { title: "Source Your Data", description: "Screenshots of tweets aren't data. Link to Deadline, Variety, or verified trade analysts." },
        { title: "No Fanboy Math", description: "Do not invent multipliers or exchange rates to make your favorite movie look better." },
    ],
    "Meme Wars & Edits": [
        { title: "Originality First", description: "Reposts, watermarked Instagram reels, and low-res screenshots will be removed." },
        { title: "No Bigotry", description: "Dark humor is allowed, but racism, sexism, or homophobia is not a punchline." },
    ],
    "Music & Soundtracks": [
        { title: "Quality Audio Links", description: "Share official YouTube/Spotify links. No 128kbps rips or unauthorized downloads." },
    ],
    "Creators' Corner": [
        { title: "Constructive Critique", description: "If you critique a WIP, offer a solution. 'It sucks' is not feedback." },
        { title: "No Spam", description: "One showcase post per project. Do not flood the feed with daily updates of the same work." },
    ],
    "Sports & Reality Shows": [
        { title: "No Hooliganism", description: "Rivalry is great, hate is not. Violence or threats against players/teams is zero tolerance." },
        { title: "Reality vs Fiction", description: "Remember reality TV is edited. Do not harass contestants on their personal social media." },
    ],
};

export default function RulesDialog({ open, onOpenChange, onConfirm, communityName = "Community" }) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        await onConfirm();
        setLoading(false);
    };

    // Determine Rules to Show
    let displayRules = [...GENERIC_RULES];

    // Check for custom rules
    // Match loosely or exact
    const customKey = Object.keys(CUSTOM_RULES).find(key => communityName.includes(key) || key.includes(communityName));

    if (customKey) {
        const custom = CUSTOM_RULES[customKey];
        // Replace top generic rules with specific custom rules, ensuring total count 
        // Logic: Custom rules are high priority, then fill remaining slots with Generic rules (skipping duplicates in concept if possible, but simplest is just slice)
        displayRules = [
            ...custom,
            ...GENERIC_RULES.slice(0, Math.max(0, 10 - custom.length)) // Try to keep total around 10
        ];
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-2xl bg-black/95 border-zinc-800 text-zinc-100 h-[85vh] max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0 focus:outline-none"
                showCloseButton={true}
            >
                <DialogHeader className="p-6 pb-4 shrink-0 border-b border-zinc-900/50">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-violet-500" />
                        {communityName} Rules
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Please review and accept the rules to join this community.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 min-h-0 w-full">
                    <div className="p-6 space-y-6 text-sm text-zinc-300">
                        {displayRules.map((rule, idx) => (
                            <RuleItem
                                key={idx}
                                number={idx + 1}
                                title={rule.title}
                            >
                                {rule.description}
                            </RuleItem>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 pt-2 border-t border-zinc-900 bg-zinc-950/50 shrink-0 flex-col sm:flex-row gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="bg-violet-600 hover:bg-violet-500 text-white"
                    >
                        {loading ? "Joining..." : "I Agree & Join"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RuleItem({ number, title, children }) {
    return (
        <div className="flex gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold border border-zinc-700">
                {number}
            </span>
            <div>
                <h4 className="font-semibold text-zinc-100 mb-1">{title}</h4>
                <p className="leading-relaxed text-zinc-400">{children}</p>
            </div>
        </div>
    );
}
