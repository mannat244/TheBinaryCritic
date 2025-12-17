import mongoose from "mongoose";

const CommentLikeSchema = new mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    }
  },
  {
    timestamps: false
  }
);

CommentLikeSchema.index(
  { commentId: 1, userId: 1 },
  { unique: true }
);

export default mongoose.models.CommentLike ||
  mongoose.model("CommentLike", CommentLikeSchema);
