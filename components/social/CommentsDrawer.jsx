"use client";

import CommentsSection from "./CommentsSection";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";

export default function CommentsDrawer({ isOpen, onClose, postId, initialCommentsCount, onCommentAdded }) {
    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="h-[80vh] flex flex-col bg-zinc-950 border-zinc-800 text-zinc-100">
                <DrawerHeader className="border-b border-zinc-800 pb-4">
                    <div className="flex items-center justify-between">
                        <DrawerTitle className="text-zinc-100">Comments</DrawerTitle>
                        <DrawerClose asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <X className="h-4 w-4" />
                            </Button>
                        </DrawerClose>
                    </div>
                </DrawerHeader>

                <CommentsSection postId={postId} onCommentAdded={onCommentAdded} />
            </DrawerContent>
        </Drawer>
    );
}
