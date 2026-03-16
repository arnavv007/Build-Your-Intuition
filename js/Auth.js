/* ================================================================
   auth.js — Login creature, register, session, founder panel
================================================================ */
 
(function() {
 
/* ── STATE ── */
let mood = 'idle';       // idle | curious | typing | peek | happy | sad
let activeField = null;  // 'email' | 'password' | null
let pwVisible = false;
 
/* ── EYE TRACKING ── */
const EYE_RADIUS = 9; // max pupil travel in SVG units
 
function getSVGCoords(clientX, clientY) {
  const svg = document.getElementById('creature-svg');
  const rect = svg.getBoundingClientRect();
  const scaleX = 220 / rect.width;
  const scaleY = 200 / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top)  * scaleY
  };
}
 
function movePupils(cx, cy) {
  movePupil('pupil-l-group', 86, 106, cx, cy);
  movePupil('pupil-r-group', 134, 106, cx, cy);
}
 
function movePupil(groupId, eyeCx, eyeCy, targetX, targetY) {
  const dx = targetX - eyeCx;
  const dy = targetY - eyeCy;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const capped = Math.min(dist, EYE_RADIUS);
  const angle = Math.atan2(dy, dx);
  const tx = Math.cos(angle) * capped;
  const ty = Math.sin(angle) * capped;
  document.getElementById(groupId).setAttribute('transform', `translate(${tx.toFixed(2)},${ty.toFixed(2)})`);
}
 
function centerPupils() {
  document.getElementById('pupil-l-group').setAttribute('transform', 'translate(0,0)');
  document.getElementById('pupil-r-group').setAttribute('transform', 'translate(0,0)');
}
 
document.addEventListener('mousemove', function(e) {
  if(mood === 'peek' || mood === 'happy') return;
  if(!document.getElementById('login-overlay').classList.contains('open')) return;
  const pos = getSVGCoords(e.clientX, e.clientY);
  movePupils(pos.x, pos.y);
});
 
/* ── BROW HELPERS ── */
function setBrows(type) {
  const bl = document.getElementById('brow-l');
  const br = document.getElementById('brow-r');
  if(type === 'normal') {
    bl.setAttribute('d','M64,88 Q84,80 104,88');
    br.setAttribute('d','M116,88 Q136,80 156,88');
  } else if(type === 'raised') {
    bl.setAttribute('d','M64,82 Q84,72 104,82');
    br.setAttribute('d','M116,82 Q136,72 156,82');
  } else if(type === 'worried') {
    bl.setAttribute('d','M67,80 Q86,88 105,82');
    br.setAttribute('d','M115,82 Q134,88 153,80');
  } else if(type === 'angry') {
    bl.setAttribute('d','M67,86 Q86,96 105,90');
    br.setAttribute('d','M115,90 Q134,96 153,86');
  } else if(type === 'happy') {
    bl.setAttribute('d','M64,84 Q84,76 104,84');
    br.setAttribute('d','M116,84 Q136,76 156,84');
  }
}
 
function setMouth(type) {
  const m = document.getElementById('mouth');
  const t = document.getElementById('teeth');
  if(type === 'neutral') {
    m.setAttribute('d','M95,146 Q110,151 125,146');
    t.setAttribute('opacity','0');
  } else if(type === 'smile-small') {
    m.setAttribute('d','M93,145 Q110,157 127,145');
    t.setAttribute('opacity','0');
  } else if(type === 'smile-big') {
    m.setAttribute('d','M88,143 Q110,162 132,143');
    t.setAttribute('opacity','1');
  } else if(type === 'ooh') {
    m.setAttribute('d','M100,146 Q110,155 120,146');
    t.setAttribute('opacity','0');
  } else if(type === 'sad') {
    m.setAttribute('d','M93,153 Q110,143 127,153');
    t.setAttribute('opacity','0');
  } else if(type === 'flat') {
    m.setAttribute('d','M98,148 Q110,150 122,148');
    t.setAttribute('opacity','0');
  }
}
 
function setLids(ry) {
  document.getElementById('lid-l').setAttribute('ry', ry);
  document.getElementById('lid-r').setAttribute('ry', ry);
  document.getElementById('lid-l').setAttribute('cy', 106 + ry*0.5);
  document.getElementById('lid-r').setAttribute('cy', 106 + ry*0.5);
}
 
function setBlush(opacity) {
  document.getElementById('blush-l').setAttribute('opacity', opacity);
  document.getElementById('blush-r').setAttribute('opacity', opacity);
}
 
/* ── HANDS ── */
function showHands(show) {
  const hl = document.getElementById('hand-l');
  const hr = document.getElementById('hand-r');
  // inner pads — visible when idle (palm facing us), hidden when covering (back of paw)
  const padL = document.getElementById('pad-l');
  const padR = document.getElementById('pad-r');
  if(show) {
    hl.style.transform = 'translate(24px, -52px)';
    hr.style.transform = 'translate(-24px, -52px)';
    if(padL) padL.setAttribute('opacity','0');
    if(padR) padR.setAttribute('opacity','0');
  } else {
    hl.style.transform = 'translate(0px, 0px)';
    hr.style.transform = 'translate(0px, 0px)';
    if(padL) padL.setAttribute('opacity','0.6');
    if(padR) padR.setAttribute('opacity','0.6');
  }
}
 
/* ── MOODS ── */
function applyMood(m) {
  mood = m;
  // reset tears
  document.getElementById('tear-l').setAttribute('opacity','0');
  document.getElementById('tear-r').setAttribute('opacity','0');
  if(m === 'idle') {
    setBrows('normal'); setMouth('neutral'); setLids(0); setBlush(0);
    showHands(false); centerPupils();
  } else if(m === 'curious') {
    setBrows('raised'); setMouth('ooh'); setLids(0); setBlush(0);
    showHands(false);
  } else if(m === 'typing') {
    setBrows('normal'); setMouth('flat'); setLids(0); setBlush(0);
    showHands(false);
  } else if(m === 'peek') {
    setBrows('worried'); setMouth('flat'); setLids(0); setBlush(0);
    showHands(true); centerPupils();
    // peek pupils down after hands cover
    setTimeout(()=>{
      movePupils(110, 140);
    }, 350);
  } else if(m === 'sad') {
    setBrows('worried'); setMouth('sad'); setLids(0); setBlush(0);
    showHands(false);
    // show tears
    document.getElementById('tear-l').setAttribute('opacity','0.9');
    document.getElementById('tear-r').setAttribute('opacity','0.9');
  } else if(m === 'happy') {
    setBrows('happy'); setMouth('smile-big'); setLids(0); setBlush(0.85);
    showHands(false);
    setTimeout(()=>{
      movePupils(110, 55);
      setLids(0);
    }, 100);
    launchSparkles();
  }
}
 
/* ── SPARKLES ── */
function launchSparkles() {
  const container = document.getElementById('sparkles');
  container.innerHTML = '';
  const colors = ['#00e5c8','#f0b429','#ff6bdc','#7c5abf','#ffffff'];
  for(let i = 0; i < 22; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    const angle = (Math.random() * Math.PI * 2);
    const dist = 50 + Math.random() * 80;
    s.style.cssText = `
      left:${80 + Math.random()*60}px;
      top:${60 + Math.random()*60}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${4+Math.random()*6}px;
      height:${4+Math.random()*6}px;
      --dx:${(Math.cos(angle)*dist).toFixed(0)}px;
      --dy:${(Math.sin(angle)*dist).toFixed(0)}px;
      animation-delay:${(Math.random()*0.25).toFixed(2)}s;
      animation-duration:${(.6+Math.random()*.5).toFixed(2)}s;
    `;
    container.appendChild(s);
  }
  setTimeout(()=>{ container.innerHTML=''; }, 1200);
}
 
/* ── MODAL ── */
window.openLogin = function() {
  const ov = document.getElementById('login-overlay');
  ov.classList.add('open');
  // Reset form
  document.getElementById('inp-email').value = '';
  document.getElementById('inp-password').value = '';
  document.getElementById('inp-email').className = '';
  document.getElementById('inp-password').className = '';
  document.getElementById('err-email').textContent = '';
  document.getElementById('err-password').textContent = '';
  setGlobalMsg('','');
  document.getElementById('submit-btn').disabled = false;
  document.getElementById('submit-btn').textContent = 'Log In →';
  if(pwVisible) togglePw();
  applyMood('idle');
  setTimeout(()=> document.getElementById('inp-email').focus(), 200);
};
 
window.closeLogin = function() {
  document.getElementById('login-overlay').classList.remove('open');
  applyMood('idle');
};
 
// Click backdrop to close
window.addEventListener('DOMContentLoaded', function() {
  const ov = document.getElementById('login-overlay');
  if(ov) ov.addEventListener('click', function(e){ if(e.target===this) closeLogin(); });
});
 
/* ── FIELD HANDLERS ── */
window.handleFocus = function(field) {
  activeField = field;
  if(field === 'password') {
    applyMood('peek');
  } else {
    if(mood !== 'sad') applyMood('curious');
  }
};
 
window.handleBlur = function() {
  activeField = null;
  if(mood === 'curious' || mood === 'peek' || mood === 'typing') applyMood('idle');
};
 
window.handleInput = function(el, field) {
  // Clear errors as user types
  document.getElementById('err-' + field).textContent = '';
  el.classList.remove('state-err');
  setGlobalMsg('','');
  if(mood === 'sad') applyMood(field === 'password' ? 'peek' : 'typing');
  else if(field === 'password') applyMood('peek');
  else applyMood('typing');
};
 
/* ── PASSWORD TOGGLE ── */
window.togglePw = function() {
  const inp = document.getElementById('inp-password');
  const btn = document.getElementById('pw-toggle');
  pwVisible = !pwVisible;
  inp.type = pwVisible ? 'text' : 'password';
  btn.textContent = pwVisible ? '🙈' : '👁';
  if(pwVisible && activeField === 'password') applyMood('curious');
  else if(!pwVisible && activeField === 'password') applyMood('peek');
};
 
/* ── GLOBAL MSG ── */
function setGlobalMsg(text, type) {
  const el = document.getElementById('global-msg');
  el.textContent = text;
  el.className = type ? 'show-' + type : '';
}
 
/* ── VALIDATION & LOGIN ── */
const KNOWN_EMAILS = ['taken@example.com'];
 
window.doLogin = function() {
  const email = document.getElementById('inp-email').value.trim();
  const pw    = document.getElementById('inp-password').value;
  let errors = false;
 
  // Clear previous
  ['email','password'].forEach(f => {
    document.getElementById('err-'+f).textContent = '';
    document.getElementById('inp-'+f).classList.remove('state-err','state-ok');
  });
  setGlobalMsg('','');
 
  // Email
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!email) {
    markErr('email', 'Email is required.');
    errors = true;
  } else if(!emailRe.test(email)) {
    markErr('email', 'That does not look like a valid email.');
    errors = true;
  } else if(KNOWN_EMAILS.includes(email.toLowerCase())) {
    markErr('email', 'No account found with this email.');
    errors = true;
  }
 
  // Password
  const weakPws = ['password','12345678','11111111','qwerty123','00000000','iloveyou'];
  if(!pw) {
    markErr('password', 'Password is required.');
    errors = true;
  } else if(pw.length < 8) {
    markErr('password', 'Too short — at least 8 characters.');
    errors = true;
  } else if(weakPws.includes(pw.toLowerCase())) {
    markErr('password', 'Too simple. Try something stronger!');
    errors = true;
  }
 
  if(errors) {
    applyMood('sad');
    setGlobalMsg('Hmm, something is not right up there.','err');
    shakeCard();
    return;
  }
 
  // SUCCESS
  applyMood('happy');
  document.getElementById('inp-email').classList.add('state-ok');
  document.getElementById('inp-password').classList.add('state-ok');
  setGlobalMsg('You are in! Welcome back.','ok');
  const btn = document.getElementById('submit-btn');
  btn.textContent = '✓ Logged in!';
  btn.disabled = true;
  setTimeout(closeLogin, 2200);
};
 
function markErr(field, msg) {
  document.getElementById('err-'+field).textContent = msg;
  document.getElementById('inp-'+field).classList.add('state-err');
}
 
function shakeCard() {
  const card = document.getElementById('login-card');
  card.classList.remove('do-shake');
  void card.offsetWidth;
  card.classList.add('do-shake');
  card.addEventListener('animationend', ()=> card.classList.remove('do-shake'), {once:true});
}
 
/* ── KEYBOARD ── */
document.addEventListener('keydown', function(e) {
  if(!document.getElementById('login-overlay').classList.contains('open')) return;
  if(e.key === 'Enter')  doLogin();
  if(e.key === 'Escape') closeLogin();
});
 
// Wire up the Log In button — deferred so DOM is ready
window.addEventListener('DOMContentLoaded', function() {
  const btn = document.querySelector('.btn-ghost');
  if(btn) btn.addEventListener('click', openLogin);
});
 
// Expose creature functions globally so auth system can use them
window.setGlobalMsg  = setGlobalMsg;
window.markErr       = markErr;
window.shakeCard     = shakeCard;
window.applyMood     = applyMood;
 
})();
 
/* ================================================================
   auth.js — Supabase Auth + Posts system
   Replaces all localStorage-based auth
================================================================ */
 
// ── CURRENT SESSION ────────────────────────────────────────────
let currentUser = null;   // { id, email, name, isFounder }
 
// ── LISTEN FOR AUTH STATE CHANGES ─────────────────────────────
window._sb.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    const { data: profile } = await window._sb
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
 
    currentUser = {
      id:        session.user.id,
      email:     session.user.email,
      name:      profile?.username || session.user.email.split('@')[0],
      isFounder: session.user.email === FOUNDER_EMAIL,
    };
  } else {
    currentUser = null;
  }
  updateNav();
});
 
 
// ── SIGN UP ────────────────────────────────────────────────────
window.doRegister = async function () {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pw    = document.getElementById('reg-password').value;
 
  clearRegErr();
 
  if (!name || name.length < 2) {
    document.getElementById('err-reg-name').textContent = 'Name must be at least 2 characters.';
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('err-reg-email').textContent = 'Enter a valid email.';
    return;
  }
  if (!pw || pw.length < 8) {
    document.getElementById('err-reg-pw').textContent = 'Password must be at least 8 characters.';
    return;
  }
 
  const { data: existing } = await window._sb
    .from('profiles').select('id').eq('username', name).maybeSingle();
  if (existing) {
    document.getElementById('err-reg-name').textContent = 'This username is already taken.';
    return;
  }
 
  const { data, error } = await window._sb.auth.signUp({
  email,
  password: pw,
  options: { data: { username: name } }
});

if (error) {
  document.getElementById('reg-global-err').textContent = error.message;
  return;
}

if (!data.session) {
  showToast("Check your email to confirm your account 📧");
} else {
  showToast("Account created! Welcome 🎉");
}
};
 
 
// ── LOG IN ─────────────────────────────────────────────────────
window.doLogin = async function () {
  const email = document.getElementById('inp-email').value.trim();
  const pw    = document.getElementById('inp-password').value;
  let errors  = false;
 
  ['email','password'].forEach(f => {
    document.getElementById('err-' + f).textContent = '';
    document.getElementById('inp-' + f).classList.remove('state-err','state-ok');
  });
  setGlobalMsg('','');
 
  if (!email) { markErr('email','Email is required.');     errors = true; }
  if (!pw)    { markErr('password','Password is required.'); errors = true; }
  if (errors) { applyMood('sad'); setGlobalMsg('Check the fields above.','err'); shakeCard(); return; }
 
  const { data, error } = await window._sb.auth.signInWithPassword({ email, password: pw });
 
  if (error) {
    applyMood('sad');
    markErr('password','Incorrect email or password.');
    shakeCard();
    return;
  }
 
  // SUCCESS — onAuthStateChange handles currentUser + nav update
  applyMood('happy');
  document.getElementById('inp-email').classList.add('state-ok');
  document.getElementById('inp-password').classList.add('state-ok');
  setGlobalMsg('Welcome back! 🎉','ok');
  const btn = document.getElementById('submit-btn');
  btn.textContent = '✓ Logged in!'; btn.disabled = true;
  setTimeout(closeLogin, 1800);
};
 
 
// ── FOUNDER LOGIN SHORTCUT ─────────────────────────────────────
const _origOpenLogin = window.openLogin;
window.openLogin = function () {
  _origOpenLogin();
  setTimeout(() => {
    if (!document.getElementById('founder-login-link')) {
      const foot = document.querySelector('.card-foot');
      if (foot) {
        const link = document.createElement('p');
        link.id = 'founder-login-link';
        link.style.cssText = 'text-align:center;font-size:12px;color:rgba(255,255,255,.35);margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);';
        link.innerHTML = '<a href="#" onclick="fillFounder()" style="color:rgba(240,180,41,0.75);text-decoration:none;">✦ Log in as Founder</a>';
        foot.parentNode.insertBefore(link, foot.nextSibling);
      }
    }
  }, 50);
};
 
window.fillFounder = function () {
  document.getElementById('inp-email').value    = FOUNDER_EMAIL;
  document.getElementById('inp-password').value = '@244466666_X007';
  applyMood('curious');
};
 
 
// ── LOG OUT ────────────────────────────────────────────────────
window.doLogout = async function () {
  await window._sb.auth.signOut();
  currentUser = null;
  updateNav();
  showPage('home', null);
  showToast('Logged out.');
};
 
 
// ── UPDATE NAV ─────────────────────────────────────────────────
function updateNav() {
  const nr = document.getElementById('nav-right');
  if (!nr) return;
  if (currentUser) {
    const isF = currentUser.isFounder;
    nr.innerHTML = `
      ${isF ? `<button class="btn-ghost" onclick="openFounder()" style="color:#f0b429;border-color:rgba(240,180,41,0.4);">✦ Founder Panel</button>` : ''}
      <div style="display:flex;align-items:center;gap:8px;padding:6px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:100px;font-size:13px;color:rgba(255,255,255,0.7);font-family:'Syne',sans-serif;">
        <div style="width:26px;height:26px;border-radius:50%;background:${isF ? 'linear-gradient(135deg,#f0b429,#e8891a)' : 'linear-gradient(135deg,#00e5c8,#0099aa)'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#080810;">${currentUser.name[0].toUpperCase()}</div>
        ${currentUser.name.split(' ')[0]}
        <button onclick="doLogout()" style="background:none;border:none;color:rgba(255,255,255,0.3);cursor:pointer;font-size:12px;padding:0;margin-left:4px;" title="Log out">✕</button>
      </div>`;
  } else {
    nr.innerHTML = `
      <button class="btn-ghost" onclick="openLogin()">Log In</button>
      <button class="btn-primary" onclick="openRegister()">Join Free</button>`;
  }
}
 
 
// ── FETCH AND RENDER POSTS ──────────────────────────────────────
async function renderPosts(topicFilter) {
  const expGrid = document.getElementById('posts-grid');
  const insGrid = document.getElementById('insights-grid');
 
  let query = window._sb
    .from('posts')
    .select(`id, title, body, type, post_format, upvotes, created_at,
             profiles ( id, username, is_founder ),
             categories ( name )`)
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
 
  if (topicFilter) {
    const { data: cat } = await window._sb.from('categories').select('id').eq('name', topicFilter).single();
    if (cat) query = query.eq('category_id', cat.id);
  }
 
  const { data: posts, error } = await query;
  if (error) { console.error('renderPosts:', error); return; }
 
  const isFounder = currentUser?.isFounder;
 
  if (expGrid) {
    const expPosts = posts.filter(p => p.type === 'explanation');
    expGrid.innerHTML = expPosts.length
      ? expPosts.map(p => postCardHTML(p, isFounder)).join('')
      : `<p style="color:rgba(255,255,255,0.3);font-size:15px;grid-column:1/-1;text-align:center;padding:40px 0;">${topicFilter ? 'No posts in this topic yet.' : 'No explanations yet. Be the first!'}</p>`;
  }
 
  if (insGrid) {
    const insPosts = posts.filter(p => p.type === 'insight');
    insGrid.innerHTML = insPosts.length
      ? insPosts.map((p, i) => insightCardHTML(p, i, isFounder)).join('')
      : `<p style="color:rgba(255,255,255,0.3);font-size:15px;grid-column:1/-1;text-align:center;padding:40px 0;">${topicFilter ? 'No posts in this topic yet.' : 'No insights yet. Share one!'}</p>`;
  }
}
 
function postCardHTML(p, isFounder) {
  const authorName    = p.profiles?.username || 'Unknown';
  const isPostFounder = p.profiles?.is_founder;
  const canDelete     = isFounder || currentUser?.id === p.profiles?.id;
  return `<div class="p-card${isPostFounder ? ' creator' : ''}">
    <div class="pc-cat">${esc(p.categories?.name || '')}</div>
    <div class="pc-title">${esc(p.title)}</div>
    <p class="pc-body">${esc((p.body || '').slice(0, 160))}${(p.body || '').length > 160 ? '...' : ''}</p>
    <div class="pc-foot">
      <div class="pc-auth">
        <div class="av${isPostFounder ? ' gold' : ''}">${authorName[0].toUpperCase()}</div>
        ${esc(authorName)}${isPostFounder ? ' <span style="font-size:9px;color:var(--gold);">✦</span>' : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span>▲ ${p.upvotes || 0}</span>
        ${canDelete ? `<button onclick="deletePost('${p.id}')" style="background:rgba(255,85,119,0.12);border:1px solid rgba(255,85,119,0.25);color:#ff7799;font-size:10px;padding:3px 8px;border-radius:5px;cursor:pointer;font-family:'Syne',sans-serif;font-weight:600;">Delete</button>` : ''}
      </div>
    </div>
  </div>`;
}
 
function insightCardHTML(p, i, isFounder) {
  const authorName    = p.profiles?.username || 'Unknown';
  const isPostFounder = p.profiles?.is_founder;
  const canDelete     = isFounder || currentUser?.id === p.profiles?.id;
  const tall          = i === 0 ? ' tall' : '';
  return `<div class="i-card${tall}">
    <div class="i-big-num">0${i + 1}</div>
    <div class="i-lbl">Insight · ${esc(p.categories?.name || '')}</div>
    <div class="i-title">${esc(p.title)}</div>
    <p class="i-body">${esc((p.body || '').slice(0, 200))}${(p.body || '').length > 200 ? '...' : ''}</p>
    <div class="i-foot" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div style="display:flex;gap:12px;align-items:center;">
        <span>▲ ${p.upvotes || 0}</span>
        <span style="color:rgba(255,255,255,0.3)">·</span>
        <span>${esc(authorName)}${isPostFounder ? ' ✦' : ''}</span>
      </div>
      ${canDelete ? `<button onclick="deletePost('${p.id}')" style="background:rgba(255,85,119,0.12);border:1px solid rgba(255,85,119,0.25);color:#ff7799;font-size:10px;padding:3px 8px;border-radius:5px;cursor:pointer;font-family:'Syne',sans-serif;font-weight:600;">Delete</button>` : ''}
    </div>
  </div>`;
}
 
 
// ── DELETE POST ─────────────────────────────────────────────────
window.deletePost = async function (id) {
  if (!confirm('Delete this post?')) return;
  const { error } = await window._sb.from('posts').delete().eq('id', id);
  if (error) { showToast('Could not delete post.'); return; }
  renderPosts();
  showToast('Post deleted.');
};
 
 
// ── VOTE ────────────────────────────────────────────────────────
window.votePost = async function (postId) {
  if (!currentUser) { openLogin(); return; }
  const { data: existing } = await window._sb.from('votes')
    .select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle();
  if (existing) { await window._sb.from('votes').delete().eq('id', existing.id); }
  else          { await window._sb.from('votes').insert({ user_id: currentUser.id, post_id: postId }); }
  renderPosts();
};
 
 
// ── LEADERBOARD ─────────────────────────────────────────────────
async function renderLeaderboard() {
  const { data: posts } = await window._sb
    .from('posts')
    .select('author_id, upvotes, profiles(username, is_founder)')
    .eq('is_published', true).is('deleted_at', null);
 
  if (!posts) return;
  const map = {};
  posts.forEach(p => {
    const key = p.author_id;
    if (!map[key]) map[key] = { name: p.profiles?.username || 'Unknown', isFounder: p.profiles?.is_founder, score: 0, postCount: 0 };
    map[key].score     += (p.upvotes || 0);
    map[key].postCount += 1;
  });
  const sorted  = Object.values(map).sort((a, b) => b.score - a.score);
  const medals  = ['g','s','b'];
  const el      = document.getElementById('lb-dynamic');
  if (!el) return;
  el.innerHTML  = sorted.length
    ? sorted.map((u, i) => `
      <div class="lb-row">
        <div class="lb-rk ${medals[i] || ''}">${i + 1}</div>
        <div class="lba ${u.isFounder ? 'gold-av' : ''}">${u.name[0].toUpperCase()}</div>
        <div class="lb-info">
          <div class="lb-nm">${esc(u.name)}${u.isFounder ? ' <span style="font-size:9px;color:var(--gold);">✦ FOUNDER</span>' : ''}</div>
          <div class="lb-mt">${u.postCount} post${u.postCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="lb-sc">${u.score}</div>
      </div>`).join('')
    : '<p style="color:rgba(255,255,255,.3);padding:24px 0;">No posts yet.</p>';
}
 
 
// ── FOUNDER PANEL ───────────────────────────────────────────────
window.openFounder  = function () { document.getElementById('founder-overlay').style.display = 'flex'; fpTab('posts'); };
window.closeFounder = function () { document.getElementById('founder-overlay').style.display = 'none'; };
 
window.fpTab = function (tab) {
  document.getElementById('fp-posts-panel').style.display = tab === 'posts' ? 'block' : 'none';
  document.getElementById('fp-users-panel').style.display = tab === 'users' ? 'block' : 'none';
  document.getElementById('tab-posts').classList.toggle('active-tab', tab === 'posts');
  document.getElementById('tab-users').classList.toggle('active-tab', tab === 'users');
  if (tab === 'posts') renderFounderPosts(); else renderFounderUsers();
};
 
async function renderFounderPosts() {
  const { data: posts } = await window._sb
    .from('posts')
    .select('id, title, type, upvotes, created_at, profiles(username), categories(name)')
    .order('created_at', { ascending: false });
  const el = document.getElementById('fp-posts-list');
  if (!el) return;
  el.innerHTML = (posts || []).map(p => `
    <div class="fp-row">
      <div class="fp-info">
        <div class="fp-ptitle">${esc(p.title)}</div>
        <div class="fp-pmeta">${p.type} · ${p.categories?.name || ''} · by ${esc(p.profiles?.username || '')} · ${(p.created_at || '').slice(0,10)} · ▲${p.upvotes}</div>
      </div>
      <button class="fp-del" onclick="deletePost('${p.id}')">Delete</button>
    </div>`).join('') || '<p style="color:rgba(255,255,255,0.3)">No posts yet.</p>';
}
 
async function renderFounderUsers() {
  const { data: users } = await window._sb.from('profiles').select('id, username, is_founder, created_at');
  const el = document.getElementById('fp-users-list');
  if (!el) return;
  el.innerHTML = (users || []).map(u => `
    <div class="user-row">
      <div class="user-av" style="background:${u.is_founder ? 'linear-gradient(135deg,#f0b429,#e8891a)' : 'linear-gradient(135deg,#00e5c8,#0099aa)'};color:#080810;">${u.username[0].toUpperCase()}</div>
      <div class="user-info">
        <div class="user-name">${esc(u.username)}${u.is_founder ? ' <span style="color:var(--gold);font-size:11px;">✦ Founder</span>' : ''}</div>
        <div class="user-email">Joined ${(u.created_at || '').slice(0,10)}</div>
      </div>
    </div>`).join('') || '<p style="color:rgba(255,255,255,0.3)">No users yet.</p>';
}
 
 
// ── PAGE NAVIGATION ─────────────────────────────────────────────
window.showPage = function (page, linkEl) {
  ['explanations','insights','leaderboard'].forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active-link'));
  const navMap = { home:'nav-home', explanations:'nav-exp', insights:'nav-ins', leaderboard:'nav-lb' };
  const activeId = navMap[page];
  if (activeId) { const el = document.getElementById(activeId); if (el) el.classList.add('active-link'); }
 
  if (page === 'home') {
    document.body.classList.remove('page-open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const overlay = document.getElementById('page-' + page);
  if (overlay) {
    overlay.style.display = 'block';
    overlay.scrollTop = 0;
    document.body.classList.add('page-open');
    if (page === 'explanations' || page === 'insights') renderPosts();
    if (page === 'leaderboard') renderLeaderboard();
  }
};
 
window.filterPosts = function (topic, section) {
  const barId = section === 'exp' ? 'exp-topic-bar' : 'ins-topic-bar';
  const bar = document.getElementById(barId);
  if (bar) { bar.querySelectorAll('.t-pill').forEach(p => p.classList.remove('on')); event.target.classList.add('on'); }
  renderPosts(topic === 'all' ? null : topic);
};
 
 
// ── TOAST ────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#0f0f1e;border:1px solid rgba(0,229,200,0.3);color:#00e5c8;font-family:Syne,sans-serif;font-size:13px;font-weight:600;padding:12px 24px;border-radius:100px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.5);white-space:nowrap;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
 
 
// ── HELPERS ──────────────────────────────────────────────────────
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
 
window.clearRegErr = function () {
  ['reg-name','reg-email','reg-pw'].forEach(id => { const el = document.getElementById('err-' + id); if (el) el.textContent = ''; });
  const ge = document.getElementById('reg-global-err'); if (ge) ge.style.display = 'none';
};
 
window.openRegister = function () { document.getElementById('register-overlay').style.display = 'flex'; setTimeout(() => document.getElementById('reg-name').focus(), 100); };
window.closeRegister = function () { document.getElementById('register-overlay').style.display = 'none'; };
 
 
// ── INIT ─────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function () {
  // Restore existing session on page load/refresh
  window._sb.auth.getSession().then(({ data: { session } }) => {
    if (!session) updateNav();
  });
 
  // Close overlays on backdrop click
  ['register-overlay','post-overlay','founder-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', function (e) { if (e.target === this) this.style.display = 'none'; });
  });
 
  // Wire Log In button
  const btn = document.querySelector('.btn-ghost');
  if (btn) btn.addEventListener('click', openLogin);
 
  // Home nav active on load
  const hn = document.getElementById('nav-home');
  if (hn) hn.classList.add('active-link');
});