import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true
    },

    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    content: {
      type: String,
      required: false,
      trim: true,
      maxlength: 2000
    },

    media: [
      {
        type: String // image / video URLs (optional)
      }
    ],

    likesCount: {
      type: Number,
      default: 0
    },

    commentsCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// 🔥 Feed performance index
PostSchema.index({ communityId: 1, createdAt: -1 });

export default mongoose.models.Post ||
  mongoose.model("Post", PostSchema);
