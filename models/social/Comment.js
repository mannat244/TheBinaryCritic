import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true
    },

    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

// 🔥 Load comments fast for a post
CommentSchema.index({ postId: 1, createdAt: 1 });

export default mongoose.models.Comment ||
  mongoose.model("Comment", CommentSchema);
