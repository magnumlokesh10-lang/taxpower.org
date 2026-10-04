import http from 'node:http';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import {validateTicket} from './validation.mjs';
const required=['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','MAIL_FROM','ALLOWED_ORIGINS'];
for(const key of required)if(!process.env[key])throw Error('Configure '+key+' before starting.');
const allowed=new Set(process.env.ALLOWED_ORIGINS.split(',').map(v=>v.trim()));
const recipient='info@magnuminfosystem.com';
const smtp=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT),secure:process.env.SMTP_PORT==='465',requireTLS:process.env.SMTP_PORT!=='465',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:10000,socketTimeout:20000});
const rates=new Map(),requests=new Map();
setInterval(()=>{const now=Date.now();for(const [k,v]of rates)if(v.until<now)rates.delete(k);for(const [k,v]of requests)if(v.until<now)requests.delete(k);},60000).unref();
const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  if(req.url!=='/api/support-ticket')return json(404,{error:'Not found.'});
  if(!origin||!allowed.has(origin))return json(403,{error:'Origin not allowed.'});
  res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.writeHead(204);return res.end();}
  if(req.method!=='POST')return json(405,{error:'POST required.'});
  if(!String(req.headers['content-type']).startsWith('application/json'))return json(415,{error:'JSON required.'});
  // Only trust the reverse-proxy header when the backend is not publicly reachable.
  const ip=process.env.TRUST_PROXY==='1'?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim():req.socket.remoteAddress;
  const now=Date.now(),rate=rates.get(ip)||{count:0,until:now+15*60000};
  if(rate.until<now){rate.count=0;rate.until=now+15*60000;}
  rate.count++;rates.set(ip,rate);if(rate.count>10)return json(429,{error:'Too many attempts. Please wait or call support.'});
  let body='',size=0;
  try{for await(const chunk of req){size+=chunk.length;if(size>3*1024*1024){json(413,{error:'Request is too large.'});return;}body+=chunk;}}catch{return;}
  let ticket;try{ticket=validateTicket(JSON.parse(body));}catch(error){return json(400,{error:error.message});}
  const fingerprint=crypto.createHash('sha256').update(body).digest('hex');
  const cached=requests.get(ticket.requestId);
  if(cached){if(cached.fingerprint!==fingerprint)return json(409,{error:'Request details changed. Please review and retry.'});const result=await cached.promise;return json(result.code,result.body);}
  if(requests.size>5000)return json(503,{error:'Support is busy. Please call or email.'});
  const promise=(async()=>{
    const ticketId='TP-'+crypto.randomBytes(6).toString('hex').toUpperCase();
    try{
      const result=await smtp.sendMail({from:process.env.MAIL_FROM,to:recipient,replyTo:ticket.email,subject:`[${ticketId}] ${ticket.product} support`,text:`Support reference: ${ticketId}\nCustomer / License ID: ${ticket.license}\nCompany: ${ticket.company}\nReply email: ${ticket.email}\nProduct: ${ticket.product}\n\nProblem:\n${ticket.problem}\n`,attachments:ticket.attachment?[ticket.attachment]:[]});
      if(!result.accepted?.length)throw Error('Email not accepted');
      return {code:200,body:{ok:true,ticketId}};
    }catch{console.error('Support email could not be confirmed:',ticketId);return {code:502,body:{error:'Email delivery could not be confirmed. Please contact Magnum by phone or email.'}};}
  })();
  requests.set(ticket.requestId,{fingerprint,promise,until:now+24*60*60000});
  const result=await promise;return json(result.code,result.body);
});
server.requestTimeout=30000;server.headersTimeout=15000;
await smtp.verify();
server.listen(Number(process.env.PORT)||8787,process.env.HOST||'127.0.0.1',()=>console.log('Support email API ready.'));
