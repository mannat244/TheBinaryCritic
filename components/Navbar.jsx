"use client"
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { HomeIcon, Users, Flame, UserCircle, Search } from 'lucide-react'
import GlobalSearch from "@/components/GlobalSearch";

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [selected, setSelected] = useState('home')
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (!pathname) return;
    if (pathname === '/') setSelected('home');
    else if (pathname.startsWith('/community') || pathname.startsWith('/post')) setSelected('community');
    else if (pathname.startsWith('/foryou')) setSelected('foryou');
    else if (pathname.startsWith('/profile')) setSelected('profile');
    // Search is now a modal, so we don't necessarily select 'search' unless we are on the search page (if it still exists)
    // But if the user navigates to /search manually, we can highlight it.
    else if (pathname.startsWith('/search')) setSelected('search');
  }, [pathname]);

  return (
    <>
      <GlobalSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />

      {/* Top Navbar */}
      <nav className='bg-black/70 h-14 fixed top-0 z-100 backdrop-blur-xl w-full border-b border-zinc-700'>
        <div className='max-w-7xl mx-auto h-full px-4 flex items-center justify-between'>
          {/* Logo */}
          <div
            onClick={() => router.push('/')}
            className='font-bold text-xl bg-gradient-to-r from-purple-400 to-zinc-100 bg-clip-text text-transparent cursor-pointer'
          >
            The Binary Critic
          </div>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center gap-6'>
            <button
              onClick={() => { setSelected('home'); router.push('/'); }}
              className={`flex items-center overflow-hidden cursor-pointer ${selected === 'home' ? 'text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-zinc-400'} hover:text-white hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300`}
            >
              <HomeIcon className='w-6 h-6 stroke-[2.5] shrink-0' />
              <span className={`ml-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ${selected === 'home' ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'}`}>
                Home
              </span>
            </button>
            <button
              onClick={() => { setSelected('community'); router.push('/community'); }}
              className={`flex items-center overflow-hidden cursor-pointer ${selected === 'community' ? 'text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-zinc-400'} hover:text-white hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300`}
            >
              <Users className='w-6 h-6 stroke-[2.5] shrink-0' />
              <span className={`ml-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ${selected === 'community' ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'}`}>
                Community
              </span>
            </button>
            <button
              onClick={() => { setSelected('foryou'); router.push('/foryou'); }}
              className={`flex items-center overflow-hidden cursor-pointer ${selected === 'foryou' ? 'text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-zinc-400'} hover:text-white hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300`}
            >
              <Flame className='w-6 h-6 stroke-[2.5] shrink-0' />
              <span className={`ml-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ${selected === 'foryou' ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'}`}>
                For You
              </span>
            </button>
            <button
              onClick={() => { setSelected('profile'); router.push('/profile'); }}
              className={`flex items-center overflow-hidden cursor-pointer ${selected === 'profile' ? 'text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-zinc-400'} hover:text-white hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300`}
            >
              <UserCircle className='w-6 h-6 stroke-[2.5] shrink-0' />
              <span className={`ml-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ${selected === 'profile' ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'}`}>
                Profile
              </span>
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`flex items-center overflow-hidden cursor-pointer ${selected === 'search' ? 'text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-zinc-400'} hover:text-white hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300`}
            >
              <Search className='w-6 h-6 stroke-[2.5] shrink-0' />
              <span className={`ml-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ${selected === 'search' ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'}`}>
                Search
              </span>
            </button>
          </div>

          {/* Mobile Search Icon */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className={`md:hidden cursor-pointer ${selected === 'search' ? 'text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-zinc-400'} hover:text-white hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300`}
          >
            <Search className='w-6 h-6 stroke-[2.5]' />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className='md:hidden bg-black/70 h-16 fixed bottom-0 z-50 backdrop-blur-xl w-full border-t border-zinc-700 shadow-[0_-4px_20px_rgba(124,58,237,0.15)]'>
        <div className='h-full px-4 flex items-center justify-around'>
          <button
            onClick={() => { setSelected('home'); router.push('/'); }}
            className={`flex flex-col items-center gap-1 cursor-pointer ${selected === 'home' ? 'text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-zinc-400'} hover:text-white hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300`}
          >
            <HomeIcon className='w-6 h-6 stroke-[2.5]' />
            <span className='text-xs font-medium'>Home</span>
          </button>
          <button
            onClick={() => { setSelected('community'); router.push('/community'); }}
            className={`flex flex-col items-center gap-1 cursor-pointer ${selected === 'community' ? 'text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-zinc-400'} hover:text-white hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300`}
          >
            <Users className='w-6 h-6 stroke-[2.5]' />
            <span className='text-xs font-medium'>Community</span>
          </button>
          <button
            onClick={() => { setSelected('foryou'); router.push('/foryou'); }}
            className={`flex flex-col items-center gap-1 cursor-pointer ${selected === 'foryou' ? 'text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-zinc-400'} hover:text-white hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300`}
          >
            <Flame className='w-6 h-6 stroke-[2.5]' />
            <span className='text-xs font-medium'>For You</span>
          </button>
          <button
            onClick={() => { setSelected('profile'); router.push('/profile'); }}
            className={`flex flex-col items-center gap-1 cursor-pointer ${selected === 'profile' ? 'text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-zinc-400'} hover:text-white hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300`}
          >
            <UserCircle className='w-6 h-6 stroke-[2.5]' />
            <span className='text-xs font-medium'>Profile</span>
          </button>
        </div>
      </nav>
    </>
  )
}

export default Navbar
