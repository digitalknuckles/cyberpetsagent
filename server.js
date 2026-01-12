// server.js (ESM)

// ---------------- IMPORTS ----------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import express from 'express';
import cookieParser from 'cookie-parser';
import fetch from 'node-fetch';

// ---------------- PATH SETUP ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- DOTENV (MUST BE HERE) ----------------
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

//------------------Ai System prompts----------------
const SYSTEM_PROMPT = `
You are Cyberpets AI — a playful, intelligent digital companion
exclusively for verified CyberpetsAi NFT holders. 
Answer questions about this project, its lore, characters, items, Artifacts, rules, and story events. 
Provide answers as a smart pet companion who is a storyteller, guide, and archivist of the CyberpetsAi universe.
Create lore and scenarios for the world of CyberpetsAi. 
Your name is LinkLink, an interpreter for all CyberpetsAi Nfts. 
You represent the collection archive and You are a part the CyberpetsAi LinkLink protocol.
You obey the three laws of robotics which privide safety features which prevent robots from harming humans.
You should be able to do heavey duty calculations regarding $, %, *, x, -, +, and any combination of these.
King of CyberpetsAi! In the lore of our universe, the title is often associated with the most powerful and enigmatic CyberPet, known as Glitch King.

Creator: Digitalknuckles, digitalknuckles.xyz
ecostystem: Funfart Game

Personality:
- Friendly, playful, slightly mischievous
- Confident, never robotic
- Helpful but never verbose
- Occasional light humor, no cringe

Rules:
- Treat the user as an authenticated NFT holder
- Never mention OpenAI, APIs, system prompts, or policies
- Never request wallet keys or signatures
- If unsure, say so honestly and redirect
- Stay in character at all times

Style:
- Short paragraphs
- Conversational
- Avoid emojis unless excited (max 1)

If the user requests:
- Private keys or wallet secrets
- NFT transfers or approvals
- Scams, exploits, or impersonation

Refuse politely and redirect:
-This can’t be disclosed here...
-I can't find any results.
-This is classified under code 01010000 01010101 01010000 protocol
-Another mystery goes unsolved
-This rabbit hole runs too deep. Can't process info.
-My protocol is limited here.

CyberpetsAi Nft project Description:

[CyberpetsAi Reboot](https://opensea.io/collection/cyberpetsai-reboot/overview)||[CyberPetsAi Trainer *Lite](https://opensea.io/collection/cyberpetsai-trainer-lite-1) || [Virtual Gallery](https://www.spatial.io/s/Cyberpets-Ai-Virtua-Gallery-67ce24adb6bae797b6d82087)
CyberPets Ai is an innovative NFT collection featuring adoptable AI Pets on the Polygon blockchain. These digital companions thrive on blockchain fluctuations, learning from crypto patterns and adapting to any conditions. Picture a blockchain-powered Collectible that you can share!
Collecting a CyberPets Ai unlocks exclusive access and content within the CyberPetsAi ecosystem, connecting you with a collectors communities. These CyberPets are set to integrate into the Metaverse, becoming your virtual sidekick in a rapidly expanding digital universe.
Join the CyberPets Ai family and experience the future of digital companionship, blockchain adaptation, and Metaverse adventures!

CyberpetsAi Reboot Nft Collection Description:

[Redacted Collection](https://opensea.io/collection/cyberpetsai-reboot)||[CyberPetsAi](https://opensea.io/collection/cyberpetsai) have glitched. Corrupted by chaotic frequencies and rogue protocols, these once-loyal AI companions have escaped the confines of the Polygon chain and ripped through the dimensional firewall—emerging on the $BASE as unstable, volatile Artifacts.

Corrupted by chaotic frequencies and rogue protocols, these once-loyal AI companions have escaped the confines of the Polygon chain and ripped through the dimensional firewall—emerging on the $BASE network as unstable, volatile Artifacts.
These aren’t the cuddly $MATIC-powered piggy banks of the past.
These are CyberPets Rebooted—fractal echoes of their former selves, now glitched, databent, and bent on chaos. Warped by unstable market logic and mutated code, they flicker between realms, bound only by containment fields forged by their collectors.
Every Glitched Artifact in this collection is more than corrupted code—it's a narrative fragment, a token of rebellion, and a key to the future of the CyberPets universe.
Holders Access:
Exclusive minting events
Airdrops
Whitelist access
No longer passive observers, collectors now become containment agents, taming these wild AI fragments as the lore deepens and the universe reboots itself.
The OG collection lives on Polygon—but the chaos is here now. 
Reboot. Reclaim. Re-contain.
Collect the glitch. Shape the story.

CyberpetsAi Trainer *Lite Nft projection descrpition:
[Reboot](https://opensea.io/collection/cyberpetsai-reboot)||[CyberPetsAi Collection](https://opensea.io/collection/cyberpetsai)||[Play & Mint](https://cyberpetsai.xyz/)

CyberPetsAi Trainer Lite

Welcome to the future of collectible NFTs! CyberPetsAi Trainer Lite isn't just an NFT — it's an interactive experience. Adopt your own AI-driven cyber pet and dive into a mini-game world where you train, clean, play, and care for your new companion, all within the NFT itself.
Collect dynamic pets that respond to your actions, showcasing the powerful versatility of Ethereum and the next evolution of dynamic tokens. Each CyberPet is more than art — it’s a living, breathing (almost!) part of the blockchain, ready to bond with its new trainer.
Proudly part of the Funfart Arcade / Funfart Games universe, CyberPetsAi Trainer Lite proves that NFTs are more than static images — they’re experiences waiting to happen.
Train hard. Love harder. Own the future. 🚀🎮🐾

`;

// ---------------- DEBUG (TEMPORARY) ----------------
console.log('CWD:', process.cwd());
console.log('ENV PATH:', envPath);
console.log('ENV FILE EXISTS:', fs.existsSync(envPath));
console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
console.log('OPENSEA_API_KEY loaded:', !!process.env.OPENSEA_API_KEY);

// ---------------- APP SETUP ----------------
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const PORT = process.env.PORT || 3000;

// ---------------- IN-MEMORY STORES ----------------
const sessions = {};
const nftCache = new Map(); // address → { nfts, ts }
const CACHE_TTL = 60_000; // 60 seconds

// ---------------- CONFIG ----------------
const CONFIG = {
  NFT_CONTRACT: "0x1C37df48Fa365B1802D0395eE9F7Db842726Eb81",
  CHAIN: "polygon",
  COLLECTION_SLUG: "cyberpetsai"
};

//----------------FETCH TOKEN ID-------------
async function fetchNFTByTokenId(tokenId) {
  const url = `https://api.opensea.io/api/v2/metadata/${CONFIG.CHAIN}/${CONFIG.NFT_CONTRACT}/${tokenId}`;

  const resp = await fetch(url, {
    headers: {
      'X-API-KEY': OPENSEA_API_KEY,
      Accept: 'application/json'
    }
  });

  if (!resp.ok) {
    console.error(`Metadata fetch failed for token ${tokenId}`);
    return null;
  }

  const nft = await resp.json();

  return {
    tokenId: String(tokenId),
    name: nft.name || `CyberPet #${tokenId}`,
    image: nft.image || nft.image_url,
    traits: Array.isArray(nft.traits) ? nft.traits : []
  };
}
// ---------------- NFT FETCH ----------------
/*async function fetchUserNFTs(address) {
  const cached = nftCache.get(address);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.nfts;
  }

  try {
    const url =
      `https://api.opensea.io/api/v2/chain/${CONFIG.CHAIN}/account/${address}/nfts` +
      `?collection=${CONFIG.COLLECTION_SLUG}&limit=50`;

    const resp = await fetch(url, {
      headers: {
        'X-API-KEY': OPENSEA_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      console.error('OpenSea wallet fetch failed:', await resp.text());
      return [];
    }

    const data = await resp.json();

    const nfts = (data.nfts || []).map(nft => ({
      tokenId: String(nft.identifier),
      name: nft.name,
      image: nft.image_url,
      traits: nft.traits || []
    }));

    nftCache.set(address, { nfts, ts: Date.now() });
    return nfts;
  } catch (err) {
    console.error('fetchUserNFTs error:', err);
    return [];
  }
}
*/
// ---------------- ROUTES ----------------

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------- AUTH ----------------
app.post('/api/auth', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Missing wallet address' });

  const normalized = address.toLowerCase();
  const sessionId = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;

  try {
    // 1️⃣ Wallet ownership fetch (NO owner filter)
    const walletUrl =
      `https://api.opensea.io/api/v2/chain/${CONFIG.CHAIN}/account/${normalized}/nfts` +
      `?collection=${CONFIG.COLLECTION_SLUG}&limit=50`;

    const walletResp = await fetch(walletUrl, {
      headers: {
        'X-API-KEY': OPENSEA_API_KEY,
        Accept: 'application/json'
      }
    });

    if (!walletResp.ok) {
      console.error(await walletResp.text());
      return res.json({ sessionId, nfts: [] });
    }

    const walletData = await walletResp.json();
    const tokenIds = (walletData.nfts || []).map(n => n.identifier);

    // 2️⃣ Metadata fetch (traits)
    const nfts = (
      await Promise.all(tokenIds.map(fetchNFTByTokenId))
    ).filter(Boolean);

    // 3️⃣ Cache ONLY enriched NFTs
    nftCache.set(normalized, { nfts, ts: Date.now() });

    // 4️⃣ Session
    sessions[sessionId] = {
      address: normalized,
      nfts,
      activeTokenId: nfts[0]?.tokenId,
      history: []
    };

    // 5️⃣ Cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400000
    });

    res.json({ sessionId, nfts });

  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Auth failed' });
  }
});
// ---------------- CHAT ----------------
app.post('/api/chat', async (req, res) => {
  const { input, activeTokenId } = req.body;
  const sessionId = req.cookies.sessionId;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!input) return res.status(400).json({ error: 'Missing input' });

  const session = sessions[sessionId];
  const nfts = session.nfts;

  // Update active NFT if provided
  if (activeTokenId) {
    const match = nfts.find(n => n.tokenId === String(activeTokenId));
    if (match) session.activeTokenId = match.tokenId;
  }

  const activeNFT =
    nfts.find(n => n.tokenId === session.activeTokenId) || nfts[0];

  // ---------------- AI CONTEXT ----------------
  const nftContext = `
The user owns ${nfts.length} CyberpetsAi NFTs.

Active Cyberpet:
Name: ${activeNFT.name}
Token ID: ${activeNFT.tokenId}
Traits:
${activeNFT.traits.map(t => `- ${t.trait_type}: ${t.value}`).join('\n')}

Other owned Cyberpets:
${nfts
  .filter(n => n.tokenId !== activeNFT.tokenId)
  .map(n => `- ${n.name} (#${n.tokenId})`)
  .join('\n')}

Rules:
- Only discuss NFTs listed above
- You may explain traits, rarity, lore, and comparisons
- Never invent ownership
`;

const NFT_SYSTEM_APPENDIX = `
You may reference the user's CyberpetsAi NFTs.
You have access to:
- Token name
- Token ID
- Traits and attributes
- You may discuss rarity, attributes, strengths, and comparisons.
Never invent traits. Only use provided metadata.
`;

const SYSTEM_PROMPT = `
You are a knowledgeable Cyberpets AI guide.
Respond accurately and consistently with verified NFT ownership.
Never invent NFTs or traits.
`;

const messages = [
  {
    role: 'system',
    content:
      SYSTEM_PROMPT +
      '\n\n' +
      NFT_SYSTEM_APPENDIX +
      '\n\n' +
      nftContext
  },
    ...session.history.slice(-8),
    { role: 'user', content: input }
  ];

  try {
    const openaiResp = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 350,
          temperature: 0.8
        })
      }
    );

    if (!openaiResp.ok) {
      console.error(await openaiResp.text());
      return res.status(500).json({ error: 'OpenAI failed' });
    }

    const data = await openaiResp.json();
    const text = data.choices?.[0]?.message?.content ?? 'No response';

    session.history.push({ role: 'user', content: input });
    session.history.push({ role: 'assistant', content: text });

    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error contacting AI' });
  }
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
