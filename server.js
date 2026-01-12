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
app.use(express.static(__dirname)); // serve index.html

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const PORT = process.env.PORT || 3000;

// In-memory session store
const sessions = {};

// ---------------- NFT FETCH ----------------
// Dynamic NFT fetch for multiple tokenIds per wallet
const CONFIG = {
  NFT_CONTRACT: "0x1C37df48Fa365B1802D0395eE9F7Db842726Eb81"
};

async function fetchNFTByTokenId(tokenId) {
  const url = `https://api.opensea.io/api/v2/metadata/polygon/${CONFIG.NFT_CONTRACT}/${tokenId}`;
  try {
    const resp = await fetch(url, {
      headers: {
        'X-API-KEY': process.env.OPENSEA_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      console.error('OpenSea fetch failed for token', tokenId, ':', await resp.text());
      return null;
    }

    const nft = await resp.json();
    return {
      tokenId,
      name: nft.name,
      image: nft.image,
      traits: nft.traits || []
    };
  } catch (err) {
    console.error('fetchNFTByTokenId error:', err);
    return null;
  }
}

// Fetch all NFTs from a wallet for gating
async function fetchUserNFTs(address) {
  try {
    // Use OpenSea API to list NFTs in the collection for this address
    const url = `https://api.opensea.io/api/v2/chain/polygon/account/${address.toLowerCase()}/nfts?collection=cyberpetsai&limit=50`;
    const resp = await fetch(url, {
      headers: {
        'X-API-KEY': process.env.OPENSEA_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      console.error('OpenSea wallet fetch failed:', await resp.text());
      return [];
    }

    const data = await resp.json();
    const nfts = data.nfts?.map(nft => ({
      tokenId: nft.identifier,
      name: nft.name,
      image: nft.image_url,
      traits: nft.traits || []
    })) || [];

    return nfts;
  } catch (err) {
    console.error('fetchUserNFTs error:', err);
    return [];
  }
}

// ---------------- ROUTES ----------------

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Auth (cookie-only MVP)
app.post('/api/auth', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Missing wallet address' });

  const sessionId = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  let nfts = [];

  try {
    nfts = await fetchUserNFTs(address.toLowerCase());
    if (nfts.length === 0) {
      console.log(`No CyberpetsAi NFTs found for address: ${address}`);
    }
  } catch (err) {
    console.error('Error fetching NFTs:', err);
  }

  // ----- SAVE SESSION -----
  sessions[sessionId] = {
    address: address.toLowerCase(),
    nfts,          // array of NFTs stored here
    history: []
  };

  // ----- SET COOKIE & RETURN -----
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });

  res.json({
    sessionId,
    nfts // frontend can choose which NFT image to display
  });
});

// Chat
app.post('/api/chat', async (req, res) => {
  const { input } = req.body;
  const sessionId = req.cookies.sessionId;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!input) return res.status(400).json({ error: 'Missing input' });

  const session = sessions[sessionId];
  const history = session.history || [];
  const nfts = session.nfts;

  // Build NFT-aware context (show all owned NFTs)
  const nftContext = nfts.length > 0
    ? `User owns the following CyberpetsAi NFTs:\n${nfts.map(n => `"${n.name}" (Token #${n.tokenId})\nTraits:\n${n.traits.map(t => `- ${t.trait_type}: ${t.value}`).join('\n')}`).join('\n\n')}`
    : 'User has no verified NFT.';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + nftContext },
    ...history.slice(-8),
    { role: 'user', content: input }
  ];

  try {
    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
        temperature: 0.8
      }),
    });

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      console.error('OpenAI error:', errText);
      return res.status(500).json({ error: 'OpenAI failed' });
    }

    const data = await openaiResp.json();
    const text = data.choices?.[0]?.message?.content ?? 'No response';

    // Save memory
    session.history.push({ role: 'user', content: input });
    session.history.push({ role: 'assistant', content: text });

    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error contacting AI' });
  }
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
