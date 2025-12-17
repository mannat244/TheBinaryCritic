"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Smile, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function CreatePost({ communityId, onSuccess }) {
    const { data: session } = useSession();
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

    // Image Upload State
    const [selectedImage, setSelectedImage] = useState(null); // File object (unnecessary if direct upload)
    const [previewUrl, setPreviewUrl] = useState(null); // Local URL for preview
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // Final URL from server
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const abortControllerRef = useRef(null);

    if (!session) return null;

    const authorInitial = session.user?.name?.[0]?.toUpperCase() || "U";
    const hasContent = content.trim().length > 0;

    // Handlers
    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    // Image Compression Helper
    const compressImage = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1920;
                    const MAX_HEIGHT = 1080;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            // Fallback to original if compression fails
                            resolve(file);
                            return;
                        }
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    }, 'image/jpeg', 0.8); // 80% quality
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Cancel any previous pending upload
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // 1. Preview locally (immediate)
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setIsUploading(true);
        setUploadedImageUrl(null); // Reset previous upload

        try {
            // 2. Compress
            const compressedFile = await compressImage(file);

            // Check if aborted during compression
            if (controller.signal.aborted) return;

            // 3. Upload
            const formData = new FormData();
            formData.append("source", compressedFile);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
                signal: controller.signal,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Upload failed");
            }

            const data = await res.json();
            // data.image.url is the one we want
            if (data.image?.url) {
                setUploadedImageUrl(data.image.url);
                toast.success("Image uploaded");
            } else {
                throw new Error("Invalid response from upload server");
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log("Upload cancelled");
                return;
            }
            console.error(err);
            toast.error(err.message || "Failed to upload image");
            setPreviewUrl(null); // Clear preview on failure
        } finally {
            if (!controller.signal.aborted) {
                setIsUploading(false);
                // Reset input so same file can be selected again if needed (though rare)
                e.target.value = "";
            }
        }
    };

    const removeImage = () => {
        // Abort pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setPreviewUrl(null);
        setUploadedImageUrl(null);
        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        if ((!hasContent && !uploadedImageUrl) || loading || isUploading) return;

        setLoading(true);
        try {
            const payload = {
                communityId,
                content: content.trim(),
                media: uploadedImageUrl ? [uploadedImageUrl] : [],
            };

            const res = await fetch("/api/post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error();

            const newPost = await res.json();

            // Reset State
            setContent("");
            setPreviewUrl(null);
            setUploadedImageUrl(null);

            toast.success("Posted");
            onSuccess?.(newPost);
        } catch {
            toast.error("Failed to create post");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={session.user?.image} />
                        <AvatarFallback className="bg-violet-600/20 text-violet-300">
                            {authorInitial}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-3">
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Start a discussion..."
                            rows={3}
                            className="
                resize-none
                dark:bg-transparent
                border-none
                px-0
                py-2
                text-base
                text-medium
                text-zinc-100
                placeholder:text-zinc-500
                focus-visible:ring-0
                leading-relaxed
              "
                        />

                        {/* Image Preview Area */}
                        {previewUrl && (
                            <div className="relative mt-2 w-fit group">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className={`max-h-64 rounded-lg border border-zinc-800 object-cover ${isUploading ? 'opacity-50' : ''}`}
                                />
                                {isUploading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    </div>
                                )}
                                <button
                                    onClick={removeImage}
                                    className={`absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 transition-opacity hover:bg-black/80 ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                    title="Remove image"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
                            <div className="flex gap-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={handleImageClick}
                                    disabled={isUploading || !!uploadedImageUrl}
                                >
                                    <ImageIcon className="h-4 w-4 text-zinc-400" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-3">
                                {hasContent && (
                                    <span className="text-xs text-zinc-500">
                                        {content.length}/2000
                                    </span>
                                )}

                                <Button
                                    size="sm"
                                    onClick={handleSubmit}
                                    disabled={(!hasContent && !uploadedImageUrl) || loading || isUploading}
                                    className="rounded-full px-4"
                                >
                                    {loading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    ) : (
                                        <>
                                            Post <Send className="ml-1 h-3 w-3" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
