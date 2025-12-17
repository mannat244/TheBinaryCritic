import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Community from "@/models/social/Community";
import CommunityMember from "@/models/social/CommunityMember";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (id) {
    // Single Community Fetch
    try {
      const community = await Community.findById(id).lean();
      if (!community) {
        return NextResponse.json({ error: "Community not found" }, { status: 404 });
      }

      let isJoined = false;
      let role = null;

      if (userId) {
        const membership = await CommunityMember.findOne({
          communityId: id,
          userId
        }).lean();

        if (membership) {
          isJoined = true;
          role = membership.role;
        }
      }

      return NextResponse.json({
        ...community,
        isJoined,
        userRole: role
      });
    } catch {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
  }

  // List Communities
  const communities = await Community.find({})
    .select("name description type membersCount postsCount")
    .lean();

  if (!userId) return NextResponse.json(communities);

  const memberships = await CommunityMember.find({ userId })
    .select("communityId")
    .lean();

  const joined = new Set(
    memberships.map(m => m.communityId.toString())
  );

  return NextResponse.json(
    communities.map(c => ({
      ...c,
      joined: joined.has(c._id.toString())
    }))
  );
}


export async function POST(req) {
  await connectDB();

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, description, type, isPrivate } = await req.json();

    if (!name || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();

    const community = await Community.create({
      name,
      description,
      type,
      isPrivate: !!isPrivate,
      slug,
      createdBy: session.user.id,
      // Initial count, will update if we add more admins
      membersCount: 1
    });


    // 1. Prepare members to add (starting with the creator)
    await addAdminsToCommunity(community._id, session.user.id);

    // Refresh community to get updated membersCount if needed, or just return as is (count might be 1 + other admins)
    // For accuracy we can re-fetch or just accept the slight race condition in return value
    const updatedCommunity = await Community.findById(community._id);

    return NextResponse.json(updatedCommunity);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    // Only allow admin to seed? Or just anyone for now as user said "i will run it"
    // Assuming user is authenticated at least
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const created = [];

    for (const data of SEED_DATA) {
      // Check if exists
      const exists = await Community.findOne({ name: data.name });
      if (exists) continue;

      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const community = await Community.create({
        ...data,
        slug,
        createdBy: session.user.id,
        membersCount: 1
      });

      await addAdminsToCommunity(community._id, session.user.id);
      created.push(community.name);
    }

    return NextResponse.json({ message: "Seeding complete", created });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

}

async function addAdminsToCommunity(communityId, creatorId) {
  // 1. Prepare members to add (starting with the creator)
  const membersToAdd = [{
    communityId: communityId,
    userId: creatorId,
    role: "admin"
  }];

  // 2. Find other global admins
  const otherAdmins = await User.find({
    isAdmin: true,
    _id: { $ne: creatorId }
  }).select("_id");

  // 3. Add them to the list
  otherAdmins.forEach(admin => {
    membersToAdd.push({
      communityId: communityId,
      userId: admin._id,
      role: "admin"
    });
  });

  // 4. Bulk insert all members
  // Use upsert or ignore duplicates to be safe, but insertMany with ordered:false or checking first is okay.
  // Since this is fresh creation, insertMany is fine. 
  // However, for robustness in helper:
  try {
    await CommunityMember.insertMany(membersToAdd, { ordered: false });
  } catch (e) {
    // Ignore duplicate key errors if any
  }

  // 5. Update member count
  if (membersToAdd.length > 1) {
    await Community.findByIdAndUpdate(communityId, {
      membersCount: membersToAdd.length
    });
  }
}

const SEED_DATA = [
  {
    name: "Bollywood Diaries",
    type: "industry",
    subtext: "Hindi Cinema Forever",
    image: "https://m.media-amazon.com/images/M/MV5BNGZkNGU0ZTEtNWRlYi00NzY1LTgwYjUtYzVmMDY2NzVmNzVkXkEyXkFqcGdeQXVyMTA4NjE0NjEy._V1_.jpg", // DDLJ or similar iconic
    description: "From Raj-Simran's palat to Ranveer's Rocky, SRK's charm to Ranbir's heartbreak - yahan sab kuch filmy hai!"
  },
  {
    name: "South Cinema Storm",
    type: "industry",
    subtext: "Mass Meets Class",
    image: "https://m.media-amazon.com/images/M/MV5BMjI0NDFjODktMzExMC00ZSWyLWE5ZjgtNTRmYzM0YTE4YTViXkEyXkFqcGc@._V1_.jpg", // Baahubali/RRR vibe
    description: "Pushpa jhukega nahi! RRR's rage, Baahubali's roar, KGF's swag - Telugu, Tamil, Malayalam mass that owns the box office"
  },
  {
    name: "Marvel & DC Universe",
    type: "fanbase",
    subtext: "Superhero Central",
    image: "https://m.media-amazon.com/images/M/MV5BNDYxNjQyMjAtNTdiOS00NGYwLWFmNTAtNThmYjU5ZGI2YTI1XkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_.jpg", // Avengers
    description: "Avengers Assemble to The Batman's vengeance - theorize multiverse madness, mourn Tony Stark, debate who's worthy"
  },
  {
    name: "Anime Central",
    type: "genre",
    subtext: "Your Anime Home",
    image: "https://m.media-amazon.com/images/M/MV5BNGY0OTA2ODEtODQzMC00ZGQyLWI3ZjYtNDI2NDJjNzVjNzEwXkEyXkFqcGc@._V1_.jpg", // One Piece/Demon Slayer
    description: "Plus Ultra! Whether you're hunting Demons, catching Titans, or going Beyond - your shonen and seinen home"
  },
  {
    name: "K-Content Kingdom",
    type: "industry",
    subtext: "The Korean Wave",
    image: "https://m.media-amazon.com/images/M/MV5BMWEwNjhkYzYtNjgzZi00YjllLWE4YWEtZmM1MWI3YjZiYmI1XkEyXkFqcGdeQXVyMTEzMTI1Mjk3._V1_.jpg", // Squid Game
    description: "From Peninsula to Sweet Home, Crash Landing to Hellbound - the Korean wave that makes you ugly cry at 3 AM"
  },
  {
    name: "Indian Originals",
    type: "industry",
    subtext: "Homegrown Stories",
    image: "https://m.media-amazon.com/images/M/MV5BMTE3NmY2MzAtMjA5OC00MljhLTg2M2ItMmI5NmQ3MThiMWJmXkEyXkFqcGdeQXVyODMyNTM0MjM@._V1_.jpg", // Family Man / Mirzapur
    description: "The Family Man to Mirzapur, Sacred Games to Panchayat - where Indian writers, directors, and stories own streaming platforms"
  },
  {
    name: "Hollywood Hub",
    type: "industry",
    subtext: "Global Cinema",
    image: "https://m.media-amazon.com/images/M/MV5BMDBmYTZjNjUtN2M1MS00MTQ2LTk2ODgtNzc2M2QyZGE5NTVjXkEyXkFqcGdeQXVyNzAwMjU2MTY@._V1_.jpg", // Oppenheimer
    description: "Oppenheimer's brilliance to Dune's epicness, Barbenheimer debates to Scorsese marathons - cinema that demands big screens"
  },
  {
    name: "Binge & Chill",
    type: "fanbase",
    subtext: "Series Addiction Support",
    image: "https://m.media-amazon.com/images/M/MV5BZjRjOTFkOTktZWUzMi00YzMyLThkMmYtMjEwNmQyNzliYTNmXkEyXkFqcGdeQXVyNzQ1ODk3MTQ@._V1_.jpg", // Rick and Morty / Breaking Bad
    description: "Just one more episode turned into Succession debates, The Last of Us tears, and The Bear's anxiety - we've all been there"
  },
  {
    name: "Cinema Unplugged",
    type: "genre",
    subtext: "For Film Buffs",
    image: "https://m.media-amazon.com/images/M/MV5BYWgxZTJyYTItNjA1MC00NmI4LTkzYmQtYzY1ZTU2ODQ0NDFjXkEyXkFqcGc@._V1_.jpg", // Parasite/A24
    description: "For Parasite lovers and A24 addicts - where we discuss Kore-eda's poetry, Iranian cinema, and films that linger"
  },
  {
    name: "The Watercooler",
    type: "fanbase",
    subtext: "Entertainment Gossip Central",
    image: "https://m.media-amazon.com/images/M/MV5BMjA4NzkxNTg5NF5BMl5BanBnXkFtZTgwMTE3OTY5MDI@._V1_.jpg", // Koffee with Karan / Reality
    description: "Did you see that post-credit scene?! Real-time reactions, hot takes hotter than chai, and the chaos of loving it all"
  },
  {
    name: "Meme Wars & Edits",
    type: "fanbase",
    subtext: "Viral Content Factory",
    image: "https://m.media-amazon.com/images/M/MV5BMTY0OTQ3ODcyOV5BMl5BanBnXkFtZTgwOTcxMTMzMjE@._V1_.jpg", // Hera Pheri (Meme king)
    description: "Sigma male grindset meets 'Bhai ne bola tha' edits - where Homelander's stare and Allu Arjun's walk live forever"
  },
  {
    name: "Music & Soundtracks",
    type: "genre",
    subtext: "When Music Hits",
    image: "https://m.media-amazon.com/images/M/MV5BNTI5OTExZDAtZGYwNC00NjFiLTliMzEtYmFmOGQyYjY2MzQ5XkEyXkFqcGdeQXVyMTA3MDk2NDg2._V1_.jpg", // Rockstar / Musical
    description: "Apna Time Aayega still hits! From Anirudh's drops to Zimmer's BWAAAH, AR Rahman's soul to BTS collabs we deserved"
  },
  {
    name: "Creators' Corner",
    type: "industry",
    subtext: "Filmmakers Unite",
    image: "https://m.media-amazon.com/images/M/MV5BODlhODMyNDgtOTYyZS00YmUyLWE5ODQtMzgwNmU1NDY4ZWY0XkEyXkFqcGc@._V1_.jpg", // Fabelmans / Camera
    description: "Shot on iPhone, edited on laptop, dreaming Oscars - share reels, learn color grading, find your crew. Spielberg started somewhere too"
  },
  {
    name: "Gaming Arena",
    type: "genre",
    subtext: "Gamers Assemble",
    image: "https://m.media-amazon.com/images/M/MV5BNGU3NjQ4Y2YtMzM4MC00MmJmLWFmZDctN2ExYmRiNmFjNDY1XkEyXkFqcGc@._V1_.jpg", // Last of Us Game / Arcane
    description: "GG EZ! From BGMI clutches to GTA 6 hype, Valorant aces to FC 25 rage - where respawn is life and one more match never ends"
  },
  {
    name: "Sports & Reality Shows",
    type: "genre",
    subtext: "Beyond The Game",
    image: "https://m.media-amazon.com/images/M/MV5BNmEwYzgxZTMtNjFlMC00M2YzLWE5MjMtMDVkN2E1YmU1NzUyXkEyXkFqcGdeQXVyMTEzMTI1Mjk3._V1_.jpg", // Ted Lasso / Sports
    description: "Dhoni's helicopter, Undertaker's gong, Salman's Weekend Ka Vaar - where IPL auctions meet WWE returns meet reality TV drama"
  }
];

