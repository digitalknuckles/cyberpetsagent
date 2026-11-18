import crypto from 'node:crypto';
import fetch from 'node-fetch';
import {createAdventureStore} from './adventure-store.js';
import {linklinkPrompt} from './linklink-core.js';
const CONTRACT='0x1c37df48fa365b1802d0395ee9f7db842726eb81';
const initial=()=>({location:'Forgotten Scrapyard',scene:'A damaged service robot warns that explorer Mara Voss disappeared beneath Maintenance Hatch Seven.',inventory:[],quests:['Find Mara Voss'],characters:{'Service Robot':'Wary'},flags:[],turn:0});
const clean=(x,n=140)=>String(x??'').slice(0,n);
const compact=(s)=>({location:clean(s.location,80),scene:clean(s.scene,300),inventory:s.inventory.slice(0,12),quests:s.quests.slice(0,8),characters:s.characters,flags:s.flags.slice(0,16),turn:s.turn});
const safeState=(raw,old)=>({
 location:clean(raw?.location??old.location,80),scene:clean(raw?.scene??old.scene,300),
 inventory:Array.isArray(raw?.inventory)?raw.inventory.slice(0,12).map(x=>clean(x,60)):old.inventory,
 quests:Array.isArray(raw?.quests)?raw.quests.slice(0,8).map(x=>clean(x,100)):old.quests,
 characters:raw?.characters && typeof raw.characters==='object' && !Array.isArray(raw.characters)?Object.fromEntries(Object.entries(raw.characters).slice(0,10).map(([k,v])=>[clean(k,50),clean(v,80)])):old.characters,
 flags:Array.isArray(raw?.flags)?raw.flags.slice(0,16).map(x=>clean(x,70)):old.flags,
 turn:old.turn+1
});
export function mountAdventures(app,{pg,connectionString,getSession,openaiKey}){
 const db=createAdventureStore(pg,connectionString);
 const auth=async(req,res)=>{const session=await getSession(req);if(!session){res.status(401).json({error:'Connect and authenticate your wallet'});return null;}return session;};
 const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
 app.get('/api/adventures',wrap(async(req,res)=>{const s=await auth(req,res);if(s)res.json(await db.list(s.address));}));
 app.post('/api/adventures',wrap(async(req,res)=>{const s=await auth(req,res);if(!s)return;const tokenId=String(req.body?.tokenId??'');if(!s.nfts.some(n=>String(n.tokenId)===tokenId))return res.status(403).json({error:'Select an owned Cyberpet'});const a=await db.create(s.address,crypto.randomUUID(),CONTRACT,tokenId,initial());res.json({id:a.id,state:a.state,recent:a.recent,revision:a.revision,tokenId});}));
 app.get('/api/adventures/:id',wrap(async(req,res)=>{const s=await auth(req,res);if(!s)return;const a=await db.get(s.address,req.params.id);if(!a)return res.status(404).json({error:'Adventure not found'});res.json({id:a.id,tokenId:a.token_id,state:a.state,recent:a.recent,revision:a.revision});}));
 app.post('/api/adventures/:id/turn',wrap(async(req,res)=>{
  const s=await auth(req,res);if(!s)return;
  const a=await db.get(s.address,req.params.id);if(!a)return res.status(404).json({error:'Adventure not found'});
  if(!s.nfts.some(n=>String(n.tokenId)===a.token_id))return res.status(403).json({error:'Cyberpet ownership must be reverified on connection'});
  const action=req.body?.action;if(typeof action!=='string'||!action.trim()||action.length>1200)return res.status(400).json({error:'Action must be 1-1200 characters'});
  const save=req.body?.save!==false;
  // Save OFF: client supplies temporary branch state; never write it to PostgreSQL.
  // On Vercel this ephemeral branch is browser-held, not a server session.
  const state=save?a.state:(req.body?.draft?.state||a.state);
  const recent=save?a.recent:(req.body?.draft?.recent||a.recent);
  if(!state||!Array.isArray(state.inventory)||!Array.isArray(state.quests)||!Array.isArray(state.flags)||!Number.isInteger(state.turn)||state.turn<0||state.turn>100000||JSON.stringify(state).length>5000||!Array.isArray(recent)||JSON.stringify(recent).length>2500)return res.status(400).json({error:'Invalid draft'});
  if(save && req.body?.revision!==a.revision)return res.status(409).json({error:'Adventure changed in another tab. Reload before saving.'});
  const messages=[
   {role:'system',content:linklinkPrompt(action,'adventure narrator')+'\nReturn ONLY JSON: {"narration":"1-3 short sentences","state":{"location":"","scene":"","inventory":[],"quests":[],"characters":{},"flags":[]}}. Narrate fictional outcomes, not on-chain changes. Keep state coherent; no invented rewards or player XP.'},
   {role:'user',content:JSON.stringify({companionTokenId:a.token_id,state:compact(state),recent:recent.slice(-3),action})}
  ];
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${openaiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini',messages,response_format:{type:'json_object'},max_tokens:260,temperature:0.75})});
  if(!response.ok)return res.status(502).json({error:'Adventure narrator unavailable'});
  const body=await response.json();let result;try{result=JSON.parse(body.choices?.[0]?.message?.content||'{}');}catch{return res.status(502).json({error:'Invalid narrator response'});}
  if(typeof result.narration!=='string'||!result.narration.trim())return res.status(502).json({error:'Narration unavailable'});
  const narration=clean(result.narration,1800);const next=safeState(result.state,state);
  const nextRecent=[...recent.slice(-2),{action:clean(action,300),narration:clean(narration,450)}];
  if(save){const changed=await db.update(s.address,a.id,a.revision,next,nextRecent);if(!changed)return res.status(409).json({error:'Save conflict. Reload your adventure.'});return res.json({narration,state:next,recent:nextRecent,revision:changed.revision,saved:true});}
  res.json({narration,state:next,recent:nextRecent,revision:a.revision,saved:false});
 }));
 app.get('/api/adventures/:id/checkpoints',wrap(async(req,res)=>{const s=await auth(req,res);if(s)res.json(await db.checkpoints(s.address,req.params.id));}));
 app.post('/api/adventures/:id/checkpoints',wrap(async(req,res)=>{const s=await auth(req,res);if(!s)return;const label=clean(req.body?.label||'Checkpoint',70);const cp=await db.checkpoint(s.address,req.params.id,crypto.randomUUID(),label);if(!cp)return res.status(404).json({error:'Adventure not found'});res.json(cp);}));
 app.post('/api/adventures/:id/load-checkpoint',wrap(async(req,res)=>{const s=await auth(req,res);if(!s)return;const a=await db.get(s.address,req.params.id);if(!a)return res.status(404).json({error:'Adventure not found'});if(!s.nfts.some(n=>String(n.tokenId)===a.token_id))return res.status(403).json({error:'Cyberpet not owned'});const result=await db.loadCheckpoint(s.address,a.id,req.body?.checkpointId,req.body?.revision);if(!result)return res.status(409).json({error:'Checkpoint not found or save conflict'});res.json(result);}));
 app.delete('/api/adventures/:id',wrap(async(req,res)=>{const s=await auth(req,res);if(!s)return;await db.remove(s.address,req.params.id);res.json({ok:true});}));
}
