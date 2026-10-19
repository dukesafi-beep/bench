// Netlify function: send-audit.js
// Usage: set environment variables SENDGRID_API_KEY and FROM_EMAIL in your Netlify site settings.
// This function accepts a JSON POST and sends an HTML email to info@altigra.be and safi@altigra.be.

const sgMail = require('@sendgrid/mail');

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.FROM_EMAIL || 'no-reply@altigra.be';

  if (!apiKey) {
    return { statusCode: 500, body: 'SendGrid API key not configured (SENDGRID_API_KEY)' };
  }

  sgMail.setApiKey(apiKey);

  // Basic validation
  const business = body.business || {};
  if (!business.name && !business.url) {
    return { statusCode: 400, body: 'Missing business name or url' };
  }

  // NOTE: This function does NOT implement persistent duplicate-blocking by itself.
  // For true one-time enforcement, add a persistent store (DynamoDB, Supabase, KV, etc.)
  // and check/record the normalized business key there.

  // Build a simple HTML report from the payload.
  function esc(s){ return String(s || '').replace(/[&<>\"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]; }); }

  const title = `Visibility Gap Check: ${business.name || business.url}`;

  let html = `<h2>${esc(business.name || business.url)}</h2>`;
  html += `<p><strong>Search term:</strong> ${esc(body.kw)} &nbsp; <strong>Region:</strong> ${esc(body.city)} &nbsp; <strong>Submitted:</strong> ${esc(body.timestamp)}</p>`;

  // Scores table
  if (body.scores) {
    html += '<h3>Scores</h3><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">';
    html += '<tr><th>Entity</th><th>Overall</th>';
    body.catOrder && body.catOrder.forEach(function(c){ html += `<th>${esc(c.name)}</th>` });
    html += '</tr>';
    body.scores.forEach(function(row){
      html += `<tr><td>${esc(row.name)}</td><td>${esc(row.overall)}</td>`;
      (row.cats || []).forEach(function(v){ html += `<td>${esc(v)}</td>` });
      html += '</tr>';
    });
    html += '</table>';
  }

  // Weaknesses list
  if (body.gaps && body.gaps.length) {
    html += '<h3>Top gaps (ranked)</h3><ol>';
    body.gaps.forEach(function(g){ html += `<li><strong>${esc(g.title)}</strong><div>${esc(g.fix)}</div><div style="color:#666">${esc(g.who)}</div></li>` });
    html += '</ol>';
  }

  // Attach raw JSON for record
  html += '<h3>Raw report (JSON)</h3><pre style="white-space:pre-wrap;max-width:900px">' + esc(JSON.stringify(body, null, 2)) + '</pre>';

  const msg = {
    to: ['info@altigra.be', 'safi@altigra.be'],
    from: from,
    subject: title,
    html: html
  };

  try {
    await sgMail.send(msg);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('sendgrid error', err && err.response && err.response.body || err);
    return { statusCode: 500, body: 'Failed to send email' };
  }
}
