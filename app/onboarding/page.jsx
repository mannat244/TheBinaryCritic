"use client";

import React, { useState } from "react";
import Image from "next/image";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Toggle } from "@/components/ui/toggle";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { GradientBackground } from "@/components/ui/gradient-background";
import AnimatedSideImages from "@/components/AnimatedImages";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

/* ----------------------------------------
   SHADCN TOGGLE PILL COMPONENT
----------------------------------------- */
function MoviePill({ active, onClick, children }) {
  return (
    <Toggle
      pressed={active}
      onPressedChange={onClick}
      className={`
        rounded-full px-4 py-2 text-sm transition border
        border-neutral-700
        data-[state=on]:bg-purple-600/40
        data-[state=on]:border-purple-400
        data-[state=on]:text-white
        data-[state=off]:bg-neutral-900/40
        data-[state=off]:text-neutral-300
      `}
    >
      {children}
    </Toggle>
  );
}

/* ----------------------------------------
   MOVIE POSTERS
----------------------------------------- */
const MOVIES = [
  { id: 1, title: "Interstellar", poster: "/posters/p2.webp" },
  { id: 2, title: "Avengers", poster: "/posters/p3.webp" },
  { id: 3, title: "The Dark Knight", poster: "/posters/p4.webp" },
  { id: 4, title: "Fight Club", poster: "/posters/p5.webp" },
  { id: 5, title: "Joker", poster: "/posters/p6.webp" },
  { id: 6, title: "Animal", poster: "/posters/p7.webp" },
  { id: 7, title: "Salaar", poster: "/posters/p8.webp" },
  { id: 8, title: "Kalki 2898 AD", poster: "/posters/p9.webp" },
  { id: 9, title: "Master", poster: "/posters/p10.webp" },
  { id: 10, title: "DDLJ", poster: "/posters/p11.webp" },
  { id: 11, title: "Bajrangi Bhaijaan", poster: "/posters/p12.webp" },
  { id: 12, title: "3 Idiots", poster: "/posters/p13.webp" },
  { id: 13, title: "Dangal", poster: "/posters/p14.webp" },
  { id: 14, title: "Sita Ramam", poster: "/posters/p15.webp" },
  { id: 15, title: "KGF: Chapter 2", poster: "/posters/p16.webp" },
  { id: 16, title: "Baahubali 2", poster: "/posters/p17.webp" },
  { id: 17, title: "Ratsasan", poster: "/posters/p18.webp" },
  { id: 19, title: "Harry Potter", poster: "/posters/p20.webp" },
];

const QUESTIONS = [
  "What kind of movies do you naturally gravitate towards?",
  "How do you prefer watching movies in languages you don't speak?",
  "What kind of movies do you enjoy the most?",
  "Pick a few movies you've genuinely loved",
  "Is there anything you usually don't enjoy as much?",
];

const USER_LANG_OPTIONS = [
  { code: "hi", label: "Hindi" },
  { code: "en", label: "English" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada" }
];



export default function OnboardingPage() {
  const [step, setStep] = useState(0);

  const { data: session, update } = useSession();

  const [answers, setAnswers] = useState({
    q1: [],
    q2: "",
    q2UserLanguages: [],
    q3: [],
    q4: [],
    q5: [],
  });

  /* ---------------------------
     SELF-HEALING CHECK
  ---------------------------- */
  React.useEffect(() => {
    // If session says completed, ensure we sync and redirect
    if (session?.user?.onboardingCompleted) {
      update({ onboardingCompleted: true }).then(() => {
        window.location.href = "/";
      });
    }
  }, [session, update]);

  const progressValue = ((step + 1) / QUESTIONS.length) * 100;

  /* ---------------------------
      HANDLE MULTI SELECT
  ---------------------------- */
  const handleMultiSelect = (qKey, value) => {
    setAnswers((prev) => {
      const arr = prev[qKey];
      if (arr.includes(value)) {
        return { ...prev, [qKey]: arr.filter((v) => v !== value) };
      }
      return { ...prev, [qKey]: [...arr, value] };
    });
  };

  /* ---------------------------
      FINAL SUBMIT TO API
  ---------------------------- */
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    console.log("Submitting Onboarding Answers:", answers);

    try {
      await fetch("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          ...answers,
          userId: session?.user?.id,
          q2UserLanguages: answers.q2UserLanguages || []
        }),
        headers: { "Content-Type": "application/json" },
      });

      // Update session to reflect onboarding completion
      await update({ onboardingCompleted: true });

      window.location.href = "/";
    } catch (error) {
      console.error("Submission failed", error);
      setIsSubmitting(false); // Only re-enable on error
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white flex items-center justify-center overflow-hidden">

      <AnimatedSideImages position="left" />

      <GradientBackground className="
        absolute top-[-30vh] left-1/2 -translate-x-1/2
        w-[150vw] h-[40vh] opacity-20 blur-3xl rounded-full
        z-100 pointer-events-none
      " />

      <div className="relative z-10 w-full max-w-lg px-6">
        <h1 className="text-center relative -top-5 text-xl font-bold mb-4">The Binary Critic</h1>

        <Progress value={progressValue} className="mb-6" />

        <Card className="bg-neutral-900/40 border-neutral-700 backdrop-blur-xl">
          <CardHeader>
            <h2 className="text-lg font-semibold">{QUESTIONS[step]}</h2>
          </CardHeader>

          <CardContent>

            {/* ---------------- Q1 ---------------- */}
            {step === 0 && (
              <div className="flex flex-wrap gap-3">
                {[
                  "Bollywood / Hindi films",
                  "Hollywood films",
                  "South Indian cinema",
                  "Big mainstream blockbusters",
                  "International cinema",
                  "I watch anything interesting",
                ].map((opt) => (
                  <MoviePill
                    key={opt}
                    active={answers.q1.includes(opt)}
                    onClick={() => handleMultiSelect("q1", opt)}
                  >
                    {opt}
                  </MoviePill>
                ))}
              </div>
            )}

            {/* ---------------- Q2 ---------------- */}
            {step === 1 && (
              <div className="space-y-5">
                <RadioGroup
                  value={answers.q2}
                  onValueChange={(v) => setAnswers((p) => ({ ...p, q2: v }))}
                  className="space-y-3"
                >
                  {[
                    "Original audio with subtitles",
                    "Dubbed when available",
                    "Either works for me",
                    "I stick to languages I understand",
                  ].map((opt) => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer">
                      <RadioGroupItem value={opt} />
                      {opt}
                    </label>
                  ))}
                </RadioGroup>

                {(answers.q2 === "Dubbed when available" ||
                  answers.q2 === "I stick to languages I understand") && (
                    <div className="space-y-2">
                      <p className="text-sm text-neutral-300">Select languages you understand:</p>

                      <Select
                        onValueChange={(val) => {
                          setAnswers((prev) => {
                            const already = prev.q2UserLanguages || [];
                            if (!already.includes(val)) {
                              return { ...prev, q2UserLanguages: [...already, val] };
                            }
                            return prev;
                          });
                        }}
                      >
                        <SelectTrigger className="w-full bg-neutral-900 border-neutral-700">
                          <SelectValue placeholder="Choose languages..." />
                        </SelectTrigger>

                        <SelectContent>
                          {USER_LANG_OPTIONS.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {(answers.q2UserLanguages || []).map((code) => {
                          const item = USER_LANG_OPTIONS.find((l) => l.code === code);
                          return (
                            <Badge
                              key={code}
                              variant="secondary"
                              className="cursor-pointer bg-purple-700/40 hover:bg-purple-700"
                              onClick={() =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  q2UserLanguages: prev.q2UserLanguages.filter((c) => c !== code),
                                }))
                              }
                            >
                              {item?.label || code} ✕
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* ---------------- Q3 ---------------- */}
            {step === 2 && (
              <div className="flex flex-wrap gap-3">
                {[
                  "Action-packed",
                  "Thrillers",
                  "Comedy",
                  "Romance",
                  "Emotional drama",
                  "Mind-bending",
                  "Horror",
                  "Crime stories",
                  "Sci-fi",
                  "Family-friendly",
                  "Dark storytelling",
                  "Mass entertainers",
                ].map((opt) => (
                  <MoviePill
                    key={opt}
                    active={answers.q3.includes(opt)}
                    onClick={() => handleMultiSelect("q3", opt)}
                  >
                    {opt}
                  </MoviePill>
                ))}
              </div>
            )}

            {/* ---------------- Q4 (POSTER GRID) ---------------- */}
            {step === 3 && (
              <div className="
                grid 
                grid-cols-3 sm:grid-cols-4 lg:grid-cols-6
                gap-4 max-h-[60vh] overflow-y-auto pr-1
              ">
                {MOVIES.map((movie) => {
                  const isActive = answers.q4.includes(movie.id);

                  return (
                    <div
                      key={movie.id}
                      onClick={() => handleMultiSelect("q4", movie.id)}
                      className={`
                        group relative aspect-2/3 w-full cursor-pointer 
                        rounded-lg overflow-hidden border transition
                        ${isActive
                          ? "border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                          : "border-neutral-700"
                        }
                      `}
                    >
                      <Image
                        src={movie.poster}
                        alt={movie.title}
                        sizes="80px"
                        fill
                        className="object-cover"
                      />

                      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <p className="absolute bottom-2 left-2 right-2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">
                        {movie.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ---------------- Q5 ---------------- */}
            {step === 4 && (
              <div className="flex flex-wrap gap-3">
                {[
                  "Slow-paced films",
                  "Horror",
                  "Gore / brutality",
                  "Heavy emotional stories",
                  "Too many songs",
                  "Over-the-top comedy",
                  "Romance-heavy films",
                  "Confusing plots",
                  "Supernatural themes",
                  "Jump scares",
                ].map((opt) => (
                  <MoviePill
                    key={opt}
                    active={answers.q5.includes(opt)}
                    onClick={() => handleMultiSelect("q5", opt)}
                  >
                    {opt}
                  </MoviePill>
                ))}
              </div>
            )}

          </CardContent>

          {/* FOOTER */}
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>

            {step === QUESTIONS.length - 1 ? (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finishing...
                  </>
                ) : (
                  "Finish"
                )}
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <AnimatedSideImages position="right" />
    </div>
  );
}
