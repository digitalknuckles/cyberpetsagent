import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 if(req.method!=="POST") return res.status(405).end();
 if(!req.cookies.session) return res.status(401).end();

 const { input } = req.body;
 if(!input) return res.status(400).end();

 res.writeHead(200,{
  "Content-Type":"text/plain; charset=utf-8",
  "Transfer-Encoding":"chunked"
 });

 const openai=await fetch("https://api.openai.com/v1/chat/completions",{
  method:"POST",
  headers:{
   "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,
   "Content-Type":"application/json"
  },
  body:JSON.stringify({
   model:"gpt-4o-mini",
   stream:true,
   messages:[{role:"user",content:input}]
  })
 });

 const reader=openai.body!.getReader();
 const dec=new TextDecoder();

 while(true){
  const {value,done}=await reader.read();
  if(done)break;
  const chunk=dec.decode(value);
  chunk.split("\n").forEach(l=>{
   if(l.startsWith("data: ")){
    const d=l.replace("data: ","");
    if(d==="[DONE]") return res.end();
    try{
     const j=JSON.parse(d);
     const t=j.choices?.[0]?.delta?.content;
     if(t) res.write(t);
    }catch{}
   }
  });
 }
 res.end();
}
