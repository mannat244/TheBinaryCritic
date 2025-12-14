"use client";

import PosterWall from "@/components/vertical";
import { SignupForm } from "@/components/signup-form";
import { GradientBackground } from "@/components/ui/gradient-background";

export default function SignupPage() {
  return (
   <div className="relative h-screen w-full overflow-hidden bg-black text-white">
   
         <GradientBackground
           className="
             absolute top-[-30vh] left-1/2 -translate-x-1/2
             w-[150vw] h-[40vh] opacity-20 blur-3xl rounded-full
           "
         />
   
         <div className="relative  h-full w-full flex items-center justify-center ">
   
           <div className="hidden xl:flex mr-auto h-full w-[full]">
             <PosterWall alternate={false} />
           </div>
   
           {/* LOGIN BOX */}
           <div className="w-full  max-w-md px-6">
             <h1 className="text-center text-xl font-bold mb-4">The Binary Critic</h1>
             <SignupForm />
           </div>
   
           {/* RIGHT WALL */}
           <div className="hidden xl:flex h-full ml-auto w-[full]">
             <PosterWall  alternate={true}/>
           </div>
   
         </div>
       </div>
  );
}
