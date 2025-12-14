"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function TrailerDialog({ title, year, videos = [] }) {
  const [open, setOpen] = useState(false);
  const [videoId, setVideoId] = useState(null);

  useEffect(() => {
    if (videos && videos.length > 0) {
      // Find the best trailer: Official Trailer > Trailer > Teaser > Any YouTube video
      const trailer = videos.find(v => v.site === "YouTube" && v.type === "Trailer" && v.official) 
                   || videos.find(v => v.site === "YouTube" && v.type === "Trailer")
                   || videos.find(v => v.site === "YouTube");
      
      if (trailer) {
        setVideoId(trailer.key);
      }
    }
  }, [videos]);

  const handleOpen = () => {
    if (videoId) {
      setOpen(true);
    } else {
      // Fallback: Search on YouTube if no video ID found in API
      const query = encodeURIComponent(`${title} ${year} official trailer`);
      window.open(`https://www.youtube.com/results?search_query=${query}`, "_blank");
    }
  };

  return (
    <>
      {/* ---- BUTTON TO OPEN DIALOG ---- */}
      <Button 
        onClick={handleOpen} 
        className="font-medium ml-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all"
      >
        🎬 Watch Trailer
      </Button>

      {/* ---- DIALOG ---- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl bg-black border-white/10 p-0 overflow-hidden aspect-video">
          <DialogHeader className="sr-only">
            <DialogTitle>{title} Trailer</DialogTitle>
          </DialogHeader>

          {/* ----- EMBEDDED PLAYER ----- */}
          {videoId && (
            <div className="w-full h-full">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                title={`${title} Trailer`}
              ></iframe>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
