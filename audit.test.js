const {test}=require('node:test');
const assert=require('node:assert/strict');
const dns=require('node:dns').promises;
const https=require('node:https');
const {EventEmitter}=require('node:events');
const {handler,_test}=require('./netlify/functions/audit');
const send=require('./netlify/functions/send-audit').handler;
const post=body=>({httpMethod:'POST',headers:{'content-type':'application/json','x-nf-client-connection-ip':String(Math.random())},body:JSON.stringify(body)});
test('blocks IP literals, private ranges, credentials, unusual ports and URL schemes',()=>{
 for(const ip of ['0.1.2.3','10.1.1.1','100.64.0.1','127.0.0.1','169.254.169.254','172.16.1.1','192.168.1.1','192.0.2.1','198.18.0.1','203.0.113.1','224.0.0.1','::1','::ffff:127.0.0.1'])assert.equal(_test.publicIP(ip),false,ip);
 assert.equal(_test.publicIP('93.184.216.34'),true);
 for(const url of ['https://127.1','https://2130706433','https://user:pass@example.com','https://example.com:8443','file:///etc/passwd','https://localhost','https://server.local'])assert.throws(()=>_test.normalize(url),url);
 assert.equal(_test.normalize('example.com').href,'https://example.com/');
});
test('extracts evidence and distinguishes missing metadata from unknown checks',()=>{
 const page={url:'https://example.com/',status:200,headers:{'content-type':'text/html'},responseMs:120,text:'<html><title>Example &amp; Co</title><meta content="Clear description" name="description"><meta name="viewport" content="width=device-width"><h1>Example business</h1><link rel="canonical" href="/"><img src="photo.jpg"><script type="application/ld+json">{"@type":"LocalBusiness"}</script></html>'};
 const report=_test.inspect(page,null,{url:'https://example.com/sitemap.xml',status:200,text:'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'});
 assert.equal(report.title,'Example & Co');assert.equal(report.checks.find(c=>c.id==='images').status,'fail');assert.equal(report.checks.find(c=>c.id==='robots').status,'unknown');assert.equal(report.checks.find(c=>c.id==='schema').status,'pass');assert.equal(report.coverage.tested,11);
 page.headers['x-robots-tag']='noindex';assert.equal(_test.inspect(page,null,null).checks.find(c=>c.id==='index').status,'fail');
 page.text+='<script type="application/ld+json">broken</script>';assert.equal(_test.inspect(page,null,null).checks.find(c=>c.id==='schema').status,'fail');
});
test('status and validation return useful HTTP errors; missing Gemini is not zero visibility',async()=>{
 const key=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
 try{assert.equal((await handler({httpMethod:'GET'})).statusCode,200);assert.equal((await handler({httpMethod:'DELETE'})).statusCode,405);assert.equal((await handler({httpMethod:'POST',headers:{},body:'{}'})).statusCode,415);assert.equal((await handler({...post({}),body:'no'})).statusCode,400);assert.equal((await handler({...post({}),body:'x'.repeat(11000)})).statusCode,413);const ai=JSON.parse((await handler(post({action:'ai',term:'test',city:'Antwerp',name:'Test'}))).body);assert.equal(ai.available,false);assert.equal(ai.mentioned,undefined);}finally{if(key!==undefined)process.env.GEMINI_API_KEY=key;}
});
test('DNS pinning checks redirects and prevents private redirects without fetching them',async()=>{
 const originalLookup=dns.lookup,originalGet=https.get;const calls=[];
 dns.lookup=async host=>[{address:host==='private.example'?'127.0.0.1':'93.184.216.34',family:4}];
 https.get=(url,options,callback)=>{calls.push(url.href);const req=new EventEmitter();req.destroy=()=>{};queueMicrotask(()=>{options.lookup(url.hostname,{all:true},(err,result)=>assert.equal(result[0].address,'93.184.216.34'));const res=new EventEmitter();res.statusCode=302;res.headers={location:'https://private.example/secret'};res.resume=()=>{};callback(res);});return req;};
 try{const r=await handler(post({url:'https://redirect-test.example/'}));assert.equal(r.statusCode,400);assert.match(JSON.parse(r.body).error,/public internet/);assert.equal(calls.length,1);}finally{dns.lookup=originalLookup;https.get=originalGet;}
});
test('email requires configuration and treats upstream rejection as failure',async()=>{
 const key=process.env.SENDGRID_API_KEY,from=process.env.FROM_EMAIL,oldFetch=global.fetch;
 try{delete process.env.SENDGRID_API_KEY;delete process.env.FROM_EMAIL;assert.equal((await send(post({business:{name:'Test'},scores:[],gaps:[]}))).statusCode,503);process.env.SENDGRID_API_KEY='test-only';process.env.FROM_EMAIL='test@example.com';global.fetch=async()=>({ok:false});assert.equal((await send(post({business:{name:'Test'},scores:[],gaps:[]}))).statusCode,502);global.fetch=async()=>({ok:true});assert.equal((await send(post({business:{name:'Test'},scores:[],gaps:[]}))).statusCode,200);}finally{global.fetch=oldFetch;key===undefined?delete process.env.SENDGRID_API_KEY:process.env.SENDGRID_API_KEY=key;from===undefined?delete process.env.FROM_EMAIL:process.env.FROM_EMAIL=from;}
});
test('Gemini sampling withholds target name and preserves answer and sources',async()=>{
 const oldKey=process.env.GEMINI_API_KEY,oldEnable=process.env.ENABLE_AI_VISIBILITY,oldFetch=global.fetch;
 process.env.GEMINI_API_KEY='test-only';process.env.ENABLE_AI_VISIBILITY='true';
 let prompt='';global.fetch=async(_url,options)=>{prompt=JSON.parse(options.body).contents[0].parts[0].text;return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Try Target Business for sandwiches.'}]},groundingMetadata:{groundingChunks:[{web:{uri:'https://example.com/',title:'Example source'}}]}}]})};};
 try{const out=JSON.parse((await handler(post({action:'ai',name:'Target Business',term:'sandwiches',city:'Antwerp'}))).body);assert.equal(prompt.includes('Target Business'),false);assert.equal(out.mentioned,true);assert.equal(out.sources.length,1);assert.equal(out.grounded,true);assert.equal(out.model,'gemini-3.8-flash');}finally{global.fetch=oldFetch;oldKey===undefined?delete process.env.GEMINI_API_KEY:process.env.GEMINI_API_KEY=oldKey;oldEnable===undefined?delete process.env.ENABLE_AI_VISIBILITY:process.env.ENABLE_AI_VISIBILITY=oldEnable;}
});

