import mongoose from "mongoose";

const CommunityMemberSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member"
    },

    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// 🔥 Prevent duplicate joins
CommunityMemberSchema.index(
  { communityId: 1, userId: 1 },
  { unique: true }
);

export default mongoose.models.CommunityMember ||
  mongoose.model("CommunityMember", CommunityMemberSchema);
