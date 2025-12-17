import mongoose from "mongoose";

const CommunitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },

    description: {
      type: String,
      default: ""
    },

    subtext: {
      type: String,
      default: ""
    },

    image: {
      type: String,
      default: ""
    },

    type: {
      type: String,
      enum: ["industry", "genre", "fanbase"],
      required: true
    },

    membersCount: {
      type: Number,
      default: 0
    },

    postsCount: {
      type: Number,
      default: 0
    },

    isPrivate: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Community ||
  mongoose.model("Community", CommunitySchema);
