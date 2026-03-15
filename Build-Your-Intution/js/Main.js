(function(){
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  let W, H, stars = [], shootings = [];
 
  function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
 
  function makeStars(){
    stars = [];
    const n = Math.floor(W * H / 3200);
    for(let i = 0; i < n; i++){
      const rand = Math.random();
      stars.push({
        x: Math.random()*W, y: Math.random()*H,
        r: 0.2 + Math.random()*1.5,
        a: 0.2 + Math.random()*0.8,
        speed: 0.003 + Math.random()*0.01,
        dir: Math.random() > 0.5 ? 1 : -1,
        color: rand > 0.94 ? '#00e5c8' : rand > 0.88 ? '#f0b429' : '#ffffff'
      });
    }
  }
 
  function newShoot(){
    shootings.push({
      x: W*0.05 + Math.random()*W*0.9,
      y: Math.random()*H*0.55,
      len: 70 + Math.random()*140,
      angle: 0.35 + Math.random()*0.7,
      prog: 0,
      speed: 0.013 + Math.random()*0.018
    });
    setTimeout(newShoot, 600 + Math.random()*1200);
  }
 
  function draw(){
    ctx.clearRect(0,0,W,H);
    for(const s of stars){
      s.a += s.speed * s.dir;
      if(s.a >= 0.9){ s.a = 0.9; s.dir = -1; }
      if(s.a <= 0.1){ s.a = 0.1; s.dir = 1; }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.a;
      ctx.fill();
    }
    for(let i = shootings.length-1; i >= 0; i--){
      const s = shootings[i];
      s.prog += s.speed;
      if(s.prog >= 1){ shootings.splice(i,1); continue; }
      const tl = s.len * s.prog;
      const ex = s.x + Math.cos(s.angle)*tl;
      const ey = s.y + Math.sin(s.angle)*tl;
      const fade = s.prog > 0.65 ? 1-(s.prog-0.65)/0.35 : 1;
      const g = ctx.createLinearGradient(s.x, s.y, ex, ey);
      g.addColorStop(0,'rgba(0,229,200,0)');
      g.addColorStop(0.5,`rgba(0,229,200,${0.6*fade})`);
      g.addColorStop(1,`rgba(255,255,255,${fade})`);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = fade;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
 
  window.addEventListener('resize',()=>{ resize(); makeStars(); });
  resize(); makeStars(); draw();
  setTimeout(newShoot, 400);
})();
 
/* ── SCROLL TO ── */
function goTo(e, id){
  if(e) e.preventDefault();
  const el = document.getElementById(id);
  if(!el) return;
  // Instantly reveal if hidden (in case reveal animation hasn't fired yet)
  el.classList.add('visible');
  // Offset scroll for fixed nav height
  const navH = document.getElementById('main-nav').offsetHeight;
  const top = el.getBoundingClientRect().top + window.scrollY - navH - 8;
  window.scrollTo({ top, behavior:'smooth' });
}
 
/* ── ACTIVE NAV — handled by showPage() ── */
// Set Home as active on initial load
setTimeout(()=>{
  const h = document.getElementById('nav-home');
  if(h) h.classList.add('active-link');
}, 50);
 
window.addEventListener('DOMContentLoaded', function() {
 
  /* ── REVEAL ON SCROLL ── */
  const rev = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); rev.unobserve(e.target); } });
  },{ threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el=>rev.observe(el));
 
  /* ── NAV SHRINK ── */
  window.addEventListener('scroll',()=>{
    const top = document.querySelector('.nav-top');
    if(top) top.style.padding = window.scrollY > 60 ? '10px 52px' : '16px 52px';
  });
 
  /* ── TOPIC PILLS ── */
  document.querySelectorAll('.t-pill').forEach(p=>{
    p.addEventListener('click',()=>{
      document.querySelectorAll('.t-pill').forEach(x=>x.classList.remove('on'));
      p.classList.add('on');
    });
  });
 
});