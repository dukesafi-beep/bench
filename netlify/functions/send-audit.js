// No external dependencies. API credentials stay in Netlify environment variables.
const reply = (statusCode, message) => ({statusCode, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body:JSON.stringify(message)});
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405,{error:'Method not allowed'});
  if (!String(event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase().startsWith('application/json')) return reply(415,{error:'JSON required'});
  if (event.isBase64Encoded || Buffer.byteLength(event.body || '', 'utf8') > 64000) return reply(413,{error:'Report too large'});
  let body;
  try {body=JSON.parse(event.body || '{}');} catch {return reply(400,{error:'Invalid JSON'});}
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400,{error:'Invalid report'});
  const business=body.business;
  if (!business || typeof business !== 'object' || ![business.name,business.url].some(v=>typeof v==='string' && v.trim() && v.length<=300)) return reply(400,{error:'Business required'});
  if (!Array.isArray(body.scores) || body.scores.length>4 || !Array.isArray(body.gaps) || body.gaps.length>30) return reply(400,{error:'Invalid assessment'});
  if (!process.env.SENDGRID_API_KEY || !process.env.FROM_EMAIL) return reply(503,{error:'Email delivery is not configured'});
  const subject=('ALTIGRA visibility assessment: '+String(business.name || business.url)).replace(/[\r\n]/g,' ').slice(0,180);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try {
    const response=await fetch('https://api.sendgrid.com/v3/mail/send',{method:'POST',signal:controller.signal,headers:{Authorization:'Bearer '+process.env.SENDGRID_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({personalizations:[{to:[{email:'info@altigra.be'},{email:'safi@altigra.be'}]}],from:{email:process.env.FROM_EMAIL},subject,content:[{type:'text/plain',value:'ALTIGRA assessment. Technical HTML checks and optional AI samples are not independently verified Google rankings. Manual answers remain user-supplied.\n\n'+JSON.stringify(body,null,2)}]})});
    return response.ok ? reply(200,{ok:true}) : reply(502,{error:'Email provider could not accept report'});
  } catch {return reply(502,{error:'Email delivery unavailable'});} finally {clearTimeout(timer);}
};
exports.config={rateLimit:{windowLimit:5,windowSize:60,aggregateBy:['ip','domain']}};
