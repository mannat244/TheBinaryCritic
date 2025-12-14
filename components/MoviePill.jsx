import { Toggle } from "@/components/ui/toggle";

export function MoviePill({ active, onClick, children }) {
  return (
    <Toggle
      pressed={active}
      onPressedChange={onClick}
      className={`
        rounded-full px-4 py-2 text-sm transition
        border border-neutral-700
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
