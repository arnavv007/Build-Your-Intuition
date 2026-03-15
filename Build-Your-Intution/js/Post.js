/* ================================================================
   post.js — Post editor, block system, preview, publish
================================================================ */
 
/* ═══════════════════════════════════════════════════════
   POST EDITOR SYSTEM — Block-based
═══════════════════════════════════════════════════════ */
let pe_postType = null;
let pe_category = null;
let pe_topic    = null;
let pe_step     = 1;
let pe_prevMode = false;
let pe_blocks   = [];   // [{id, type, data}]
let pe_pendingImageBlockId = null;
 
const CHART_COLORS = ['#00e5c8','#f0b429','#ff6b4a','#a78bfa','#34d399','#60a5fa','#f87171','#fbbf24'];
const TOPICS_EXP = ['Physics','Mathematics','Chemistry','Biology','Astronomy','Thermodynamics','Electromagnetism','Quantum','Fluid Dynamics','Neuroscience','Other'];
const TOPICS_INS = ['Physics','Astronomy','Biology','Cosmology','Technology','Society','Philosophy','Other'];
 
/* ── OPEN / CLOSE ── */
window.openPostEditor = function(e) {
  if(e) e.preventDefault();
  if(!currentUser){ openLogin(); return; }
  document.getElementById('post-editor-overlay').classList.add('open');
  resetEditor();
};
function closeEditorSilent() {
  // Close without any confirmation — used after successful publish
  pe_blocks = [];
  document.getElementById('post-editor-overlay').classList.remove('open');
}
window.closePostEditor = function() {
  if(hasContent() && !confirm('Discard your post? All content will be lost.')) return;
  document.getElementById('post-editor-overlay').classList.remove('open');
};
window.editorGoHome = function() {
  if(hasContent() && !confirm('Go to Home? Your post will be discarded.')) return;
  document.getElementById('post-editor-overlay').classList.remove('open');
  showPage('home', null);
};
function hasContent(){
  const title = document.getElementById('pe-title-input');
  if(title && title.value.trim()) return true;
  return pe_blocks.some(b=>{
    if(b.type==='text') return (b.data.text||'').trim().length>0;
    if(b.type==='image') return !!b.data.url;
    if(b.type==='chart') return !!(b.data.labels||b.data.values);
    if(b.type==='video') return !!(b.data.url||b.data.embedUrl);
    return false;
  });
}
function resetEditor(){
  pe_postType=null; pe_category=null; pe_topic=null;
  pe_step=1; pe_prevMode=false; pe_blocks=[];
  const t=document.getElementById('pe-title-input');
  if(t) t.value='';
  const pb=document.getElementById('pe-blocks');
  if(pb) pb.innerHTML='';
  const btn=document.getElementById('btn-preview');
  if(btn) btn.classList.remove('active');
  const wm=document.getElementById('pe-write-mode');
  if(wm) wm.style.display='block';
  const pm=document.getElementById('pe-preview-mode');
  if(pm) pm.style.display='none';
  goToStep(1);
}
 
/* ── STEP NAV ── */
window.goToStep = function(n) {
  pe_step=n;
  [1,2,3].forEach(i=>{
    const s=document.getElementById('pe-screen-'+i);
    if(s) s.style.display = i===n?'flex':'none';
    if(s && i===n) s.style.flexDirection='column';
    const ind=document.getElementById('step-ind-'+i);
    if(ind){ ind.classList.remove('active','done'); if(i===n) ind.classList.add('active'); if(i<n) ind.classList.add('done'); }
  });
  updateSidebarMeta();
  if(n===3){ updateEditorBadges(); if(!pe_blocks.length) addBlock('text'); }
};
function updateSidebarMeta(){
  const el=document.getElementById('pe-sidebar-meta');
  if(!el) return;
  let h='';
  if(pe_postType) h+=`<div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,.4);font-size:11px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.06em;">Type</span><br><span style="color:var(--cyan);font-size:13px;font-weight:600;">${pe_postType==='question'?'Question':'Answer + Question'}</span></div>`;
  if(pe_category) h+=`<div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,.4);font-size:11px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.06em;">Category</span><br><span style="color:var(--white);font-size:13px;font-weight:600;">${pe_category==='explanation'?'Intuitive Explanation':'Insight'}</span></div>`;
  if(pe_topic) h+=`<div><span style="color:rgba(255,255,255,.4);font-size:11px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.06em;">Topic</span><br><span style="color:var(--gold);font-size:13px;font-weight:600;">${pe_topic}</span></div>`;
  el.innerHTML=h||'<span style="color:rgba(255,255,255,.2);font-size:12px;">Your choices will appear here.</span>';
}
 
/* ── STEPS 1 & 2 ── */
window.selectPostType = function(type){
  pe_postType=type;
  document.querySelectorAll('.pe-type-card').forEach(c=>c.classList.remove('selected'));
  const el=document.getElementById('type-'+type);
  if(el) el.classList.add('selected');
  setTimeout(()=>goToStep(2),300);
};
window.selectCategory = function(cat){
  pe_category=cat; pe_topic=null;
  document.querySelectorAll('.pe-cat-card').forEach(c=>c.classList.remove('selected'));
  const el=document.getElementById('cat-'+cat);
  if(el) el.classList.add('selected');
  const topics=cat==='explanation'?TOPICS_EXP:TOPICS_INS;
  const wrap=document.getElementById('topic-pills-wrap');
  if(wrap) wrap.innerHTML=topics.map(t=>`<button class="pe-tp" onclick="selectTopic('${t}')">${t}</button>`).join('');
  document.getElementById('topic-row').style.display='block';
  const nb=document.getElementById('cat-next-btn');
  if(nb){ nb.style.opacity='.3'; nb.style.pointerEvents='none'; }
};
window.selectTopic = function(topic){
  pe_topic=topic;
  document.querySelectorAll('.pe-tp').forEach(p=>p.classList.remove('active'));
  event.target.classList.add('active');
  const nb=document.getElementById('cat-next-btn');
  if(nb){ nb.style.opacity='1'; nb.style.pointerEvents='all'; }
};
function updateEditorBadges(){
  const catClass=pe_category==='explanation'?'pe-meta-exp':'pe-meta-ins';
  const catName=pe_category==='explanation'?'⬡ Intuitive Explanation':'💡 Insight';
  const typeLabel=pe_postType==='question'?'? Question':'✦ Answer + Question';
  const tp=document.getElementById('pe-post-type-pill');
  if(tp) tp.innerHTML=`<span class="pe-meta-badge" style="color:var(--white-3);border:1px solid var(--rim);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 12px;border-radius:100px;">${typeLabel}</span>`;
  const cp=document.getElementById('pe-cat-pill');
  if(cp) cp.innerHTML=`<span class="pe-meta-badge ${catClass}" style="font-size:11px;padding:5px 12px;border-radius:100px;">${catName}</span>`;
  const mr=document.getElementById('pe-editor-meta-row');
  if(mr) mr.innerHTML=`<span class="pe-meta-badge ${catClass}">${catName}</span>`+(pe_topic?`<span class="pe-meta-badge pe-meta-topic">${pe_topic}</span>`:'');
  setTimeout(()=>{ const t=document.getElementById('pe-title-input'); if(t) t.focus(); },100);
}
 
/* ════════════════════════════════════════════════
   BLOCK SYSTEM
════════════════════════════════════════════════ */
function genId(){ return 'b'+Date.now()+Math.random().toString(36).slice(2,6); }
 
window.addBlock = function(type, afterId){
  const id=genId();
  const block={ id, type, data:{} };
  if(type==='text')  block.data={ text:'' };
  if(type==='image') block.data={ url:null, caption:'' };
  if(type==='chart') block.data={ title:'', labels:'', values:'' };
  if(type==='video') block.data={ source:'upload', url:null, embedUrl:'', caption:'' };
 
  if(afterId){
    const idx=pe_blocks.findIndex(b=>b.id===afterId);
    pe_blocks.splice(idx+1,0,block);
  } else {
    pe_blocks.push(block);
  }
  renderBlocks();
  updateWordCount();
  // Auto-focus
  setTimeout(()=>{
    if(type==='text'){
      const ta=document.querySelector(`[data-block-id="${id}"] .pb-textarea`);
      if(ta) ta.focus();
    }
  },50);
};
 
window.deleteBlock = function(id){
  pe_blocks=pe_blocks.filter(b=>b.id!==id);
  renderBlocks();
  updateWordCount();
};
 
window.moveBlock = function(id, dir){
  const idx=pe_blocks.findIndex(b=>b.id===id);
  if(dir==='up' && idx>0){ [pe_blocks[idx],pe_blocks[idx-1]]=[pe_blocks[idx-1],pe_blocks[idx]]; }
  if(dir==='down' && idx<pe_blocks.length-1){ [pe_blocks[idx],pe_blocks[idx+1]]=[pe_blocks[idx+1],pe_blocks[idx]]; }
  renderBlocks();
};
 
function renderBlocks(){
  const container=document.getElementById('pe-blocks');
  if(!container) return;
  container.innerHTML='';
  pe_blocks.forEach(block=>{
    const el=createBlockEl(block);
    container.appendChild(el);
  });
}
 
function createBlockEl(block){
  const wrap=document.createElement('div');
  wrap.className='pe-block';
  wrap.setAttribute('data-block-id',block.id);
 
  // Controls
  const ctrl=document.createElement('div');
  ctrl.className='pe-block-controls';
  ctrl.innerHTML=`
    <button class="pe-bc-btn" onclick="moveBlock('${block.id}','up')" title="Move up">↑</button>
    <button class="pe-bc-btn" onclick="moveBlock('${block.id}','down')" title="Move down">↓</button>
    <button class="pe-bc-btn del" onclick="deleteBlock('${block.id}')" title="Delete block">✕</button>`;
  wrap.appendChild(ctrl);
 
  // Content
  const inner=document.createElement('div');
  if(block.type==='text')  inner.innerHTML=buildTextBlock(block);
  if(block.type==='image') inner.innerHTML=buildImageBlock(block);
  if(block.type==='chart') inner.innerHTML=buildChartBlock(block);
  if(block.type==='video') inner.innerHTML=buildVideoBlock(block);
  wrap.appendChild(inner);
 
  return wrap;
}
 
/* ── TEXT BLOCK ── */
function buildTextBlock(block){
  return `<div class="pb-text-wrap">
    <div class="pb-fmt-bar">
      <button onclick="fmtBlock('${block.id}','# ')">H1</button>
      <button onclick="fmtBlock('${block.id}','## ')">H2</button>
      <button onclick="fmtBlock('${block.id}','### ')">H3</button>
      <button onclick="fmtBlock('${block.id}','**','**')"><b>B</b></button>
      <button onclick="fmtBlock('${block.id}','*','*')"><i>I</i></button>
      <button onclick="fmtBlock('${block.id}','\n- ')">≡</button>
      <button onclick="fmtBlock('${block.id}','\n> ')">❝</button>
      <button onclick="fmtBlock('${block.id}','\n---\n')">—</button>
    </div>
    <textarea class="pb-textarea" data-block-id="${block.id}"
      placeholder="Write here... Use # for headings, **bold**, *italic*, > for quotes"
      oninput="onTextBlockInput('${block.id}',this)"
      onkeydown="onTextBlockKey('${block.id}',event)"
    >${escTa(block.data.text)}</textarea>
  </div>`;
}
window.onTextBlockInput=function(id,ta){
  const b=pe_blocks.find(b=>b.id===id);
  if(b) b.data.text=ta.value;
  ta.style.height='auto';
  ta.style.height=ta.scrollHeight+'px';
  updateWordCount();
  if(pe_prevMode) renderPreview();
};
window.onTextBlockKey=function(id,e){
  // Enter at end of empty line → new text block below
  if(e.key==='Enter' && e.shiftKey){
    e.preventDefault();
    addBlock('text',id);
  }
};
window.fmtBlock=function(id,before,after=''){
  const ta=document.querySelector(`[data-block-id="${id}"] .pb-textarea`);
  if(!ta) return;
  const s=ta.selectionStart, en=ta.selectionEnd;
  const sel=ta.value.slice(s,en);
  ta.value=ta.value.slice(0,s)+before+sel+after+ta.value.slice(en);
  ta.focus();
  ta.setSelectionRange(s+before.length+sel.length+after.length, s+before.length+sel.length+after.length);
  onTextBlockInput(id,ta);
};
 
/* ── IMAGE BLOCK ── */
function buildImageBlock(block){
  if(block.data.url){
    return `<div class="pb-image-wrap">
      <div class="pb-image-loaded">
        <img src="${block.data.url}" alt="Image"/>
        <div class="pb-image-toolbar">
          <span style="font-size:12px;color:rgba(255,255,255,.3);font-family:'DM Mono',monospace;">Image</span>
          <div style="display:flex;gap:8px;">
            <button class="replace-btn" onclick="replaceBlockImage('${block.id}')">Replace</button>
          </div>
        </div>
        <textarea class="pb-caption" rows="1"
          placeholder="Add a caption (optional)..."
          oninput="onCaptionInput('${block.id}',this)"
        >${escTa(block.data.caption)}</textarea>
      </div>
    </div>`;
  }
  return `<div class="pb-image-wrap">
    <div class="pb-image-upload-area" id="drop-${block.id}"
      onclick="pickImageForBlock('${block.id}')"
      ondragover="blockDragOver(event,'${block.id}')"
      ondragleave="blockDragLeave('${block.id}')"
      ondrop="blockDrop(event,'${block.id}')">
      <div class="pb-upload-icon">🖼</div>
      <div class="pb-upload-text">Click to upload or drag & drop an image</div>
      <div class="pb-upload-sub">PNG, JPG, GIF, WEBP</div>
      <div class="pb-upload-btn">Browse files</div>
    </div>
  </div>`;
}
window.pickImageForBlock=function(id){
  pe_pendingImageBlockId=id;
  document.getElementById('pe-file-input').click();
};
window.replaceBlockImage=function(id){
  pe_pendingImageBlockId=id;
  document.getElementById('pe-file-input').click();
};
window.handleBlockImageFile=function(input){
  const file=input.files[0];
  if(!file || !pe_pendingImageBlockId) return;
  const targetId=pe_pendingImageBlockId;
  pe_pendingImageBlockId=null;
  input.value='';
  const reader=new FileReader();
  reader.onload=function(e){
    const b=pe_blocks.find(b=>b.id===targetId);
    if(b){ b.data.url=e.target.result; }
    renderBlocks();
    if(pe_prevMode) renderPreview();
  };
  reader.readAsDataURL(file);
};
window.onCaptionInput=function(id,ta){
  const b=pe_blocks.find(b=>b.id===id);
  if(b) b.data.caption=ta.value;
  ta.style.height='auto';
  ta.style.height=ta.scrollHeight+'px';
  if(pe_prevMode) renderPreview();
};
// Drag & drop per block
window.blockDragOver=function(e,id){
  if([...e.dataTransfer.items].some(i=>i.type.startsWith('image/'))){
    e.preventDefault();
    const el=document.getElementById('drop-'+id);
    if(el) el.classList.add('drag-over');
  }
};
window.blockDragLeave=function(id){
  const el=document.getElementById('drop-'+id);
  if(el) el.classList.remove('drag-over');
};
window.blockDrop=function(e,id){
  e.preventDefault();
  const el=document.getElementById('drop-'+id);
  if(el) el.classList.remove('drag-over');
  const file=[...e.dataTransfer.files].find(f=>f.type.startsWith('image/'));
  if(!file) return;
  const reader=new FileReader();
  reader.onload=function(ev){
    const b=pe_blocks.find(b=>b.id===id);
    if(b){ b.data.url=ev.target.result; }
    renderBlocks();
    if(pe_prevMode) renderPreview();
  };
  reader.readAsDataURL(file);
};
 
/* ── CHART BLOCK ── */
function buildChartBlock(block){
  const d=block.data;
  const barsHtml=buildChartBars(d.labels,d.values,100);
  return `<div class="pb-chart-wrap">
    <div class="pb-chart-editor">
      <label>Chart Title</label>
      <input class="pb-chart-input" type="text" placeholder="e.g. Gravity on different planets"
        value="${escAttr(d.title)}"
        oninput="onChartInput('${block.id}','title',this.value)"/>
      <label>Labels (comma separated)</label>
      <input class="pb-chart-input" type="text" placeholder="Mercury, Venus, Earth, Mars"
        value="${escAttr(d.labels)}"
        oninput="onChartInput('${block.id}','labels',this.value)"/>
      <label>Values (comma separated)</label>
      <input class="pb-chart-input" type="text" placeholder="3.7, 8.87, 9.8, 3.71"
        value="${escAttr(d.values)}"
        oninput="onChartInput('${block.id}','values',this.value)"/>
    </div>
    <div class="pb-chart-render" id="chart-render-${block.id}">
      ${barsHtml||'<p class="pb-chart-placeholder">Enter labels and values to see the chart</p>'}
    </div>
  </div>`;
}
function buildChartBars(labelsStr,valuesStr,maxPx){
  if(!labelsStr||!valuesStr) return '';
  const labels=labelsStr.split(',').map(s=>s.trim()).filter(Boolean);
  const values=valuesStr.split(',').map(s=>parseFloat(s)).filter(n=>!isNaN(n));
  if(!labels.length||!values.length) return '';
  const max=Math.max(...values)||1;
  return labels.slice(0,values.length).map((lbl,i)=>`
    <div class="pb-chart-bar-wrap">
      <div class="pb-chart-bar-val">${values[i]}</div>
      <div class="pb-chart-bar-fill" style="height:${Math.max(6,((values[i]||0)/max)*maxPx)}px;background:${CHART_COLORS[i%CHART_COLORS.length]};"></div>
      <div class="pb-chart-bar-lbl">${lbl}</div>
    </div>`).join('');
}
window.onChartInput=function(id,field,val){
  const b=pe_blocks.find(b=>b.id===id);
  if(!b) return;
  b.data[field]=val;
  const render=document.getElementById('chart-render-'+id);
  if(render){
    const html=buildChartBars(b.data.labels,b.data.values,100);
    render.innerHTML=html||'<p class="pb-chart-placeholder">Enter labels and values to see the chart</p>';
  }
  if(pe_prevMode) renderPreview();
};
 
/* ── VIDEO BLOCK ── */
function buildVideoBlock(block){
  const d=block.data;
  // Tab state: upload or embed
  const isUpload = d.source !== 'embed';
 
  const tabUploadStyle = isUpload
    ? 'color:var(--cyan);border-color:var(--cyan-mid);background:var(--cyan-dim);'
    : 'color:var(--white-3);border:1px solid var(--rim);background:none;';
  const tabEmbedStyle = !isUpload
    ? 'color:var(--cyan);border-color:var(--cyan-mid);background:var(--cyan-dim);'
    : 'color:var(--white-3);border:1px solid var(--rim);background:none;';
 
  let contentHtml = '';
 
  if(isUpload){
    if(d.url){
      contentHtml = `
        <div class="pv-video-wrap" style="border-radius:12px;overflow:hidden;">
          <video controls style="width:100%;display:block;max-height:400px;background:#000;">
            <source src="${d.url}"/>Your browser does not support video.
          </video>
        </div>
        <div class="pb-video-toolbar">
          <span style="font-size:12px;color:rgba(255,255,255,.35);font-family:'DM Mono',monospace;">Uploaded video</span>
          <button class="replace-btn" onclick="replaceBlockVideo('${block.id}')">Replace</button>
        </div>
        <textarea class="pb-caption" rows="1"
          placeholder="Add a caption (optional)..."
          oninput="onVideoCaptionInput('${block.id}',this)"
        >${escTa(d.caption)}</textarea>`;
    } else {
      contentHtml = `
        <div class="pb-video-upload-area" id="vdrop-${block.id}"
          onclick="pickVideoForBlock('${block.id}')"
          ondragover="videoDragOver(event,'${block.id}')"
          ondragleave="videoDragLeave('${block.id}')"
          ondrop="videoDrop(event,'${block.id}')">
          <div class="pb-upload-icon">🎬</div>
          <div class="pb-upload-text">Click to upload or drag & drop a video</div>
          <div class="pb-upload-sub">MP4, WEBM, MOV, OGG</div>
          <div class="pb-upload-btn">Browse files</div>
        </div>`;
    }
  } else {
    // Embed tab
    const embedPreview = d.embedUrl ? (() => {
      const url = getEmbedUrl(d.embedUrl);
      return url
        ? `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:10px;overflow:hidden;margin-top:12px;">
            <iframe src="${url}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe>
           </div>`
        : `<p style="font-size:12px;color:#ff7799;margin-top:8px;">Could not parse URL. Try a YouTube or Vimeo link.</p>`;
    })() : '';
 
    contentHtml = `
      <div style="padding:4px 0;">
        <input class="pb-chart-input" type="text" placeholder="Paste a YouTube or Vimeo URL..."
          value="${escAttr(d.embedUrl)}"
          oninput="onVideoEmbedInput('${block.id}',this.value)"
          style="margin-bottom:0;"
        />
        ${embedPreview}
        <textarea class="pb-caption" rows="1" style="margin-top:10px;border:1px solid var(--rim);border-radius:8px;"
          placeholder="Add a caption (optional)..."
          oninput="onVideoCaptionInput('${block.id}',this)"
        >${escTa(d.caption)}</textarea>
      </div>`;
  }
 
  return `<div class="pb-video-wrap">
    <div class="pb-video-tabs">
      <button style="${tabUploadStyle};font-family:'Syne',sans-serif;font-size:12px;font-weight:600;padding:6px 16px;border-radius:8px;cursor:pointer;transition:all .2s;"
        onclick="setVideoTab('${block.id}','upload')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;margin-right:5px;vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Upload
      </button>
      <button style="${tabEmbedStyle};font-family:'Syne',sans-serif;font-size:12px;font-weight:600;padding:6px 16px;border-radius:8px;cursor:pointer;transition:all .2s;"
        onclick="setVideoTab('${block.id}','embed')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;margin-right:5px;vertical-align:middle;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        Embed (YouTube / Vimeo)
      </button>
    </div>
    <div class="pb-video-content">${contentHtml}</div>
  </div>`;
}
 
/* Video block input handlers */
window.setVideoTab = function(id, source){
  const b = pe_blocks.find(b=>b.id===id);
  if(!b) return;
  b.data.source = source;
  renderBlocks();
};
window.pickVideoForBlock = function(id){
  pe_pendingVideoBlockId = id;
  document.getElementById('pe-video-input').click();
};
window.replaceBlockVideo = function(id){
  pe_pendingVideoBlockId = id;
  document.getElementById('pe-video-input').click();
};
window.handleBlockVideoFile = function(input){
  const file = input.files[0];
  if(!file || !pe_pendingVideoBlockId) return;
  const targetId = pe_pendingVideoBlockId;
  pe_pendingVideoBlockId = null;
  input.value = '';
  const reader = new FileReader();
  reader.onload = function(e){
    const b = pe_blocks.find(b=>b.id===targetId);
    if(b){ b.data.url = e.target.result; }
    renderBlocks();
    if(pe_prevMode) renderPreview();
  };
  reader.readAsDataURL(file);
};
window.onVideoEmbedInput = function(id, val){
  const b = pe_blocks.find(b=>b.id===id);
  if(!b) return;
  b.data.embedUrl = val;
  // Debounce re-render so iframe doesn't flicker on every keystroke
  clearTimeout(b._embedTimer);
  b._embedTimer = setTimeout(()=>{
    renderBlocks();
    if(pe_prevMode) renderPreview();
  }, 600);
};
window.onVideoCaptionInput = function(id, ta){
  const b = pe_blocks.find(b=>b.id===id);
  if(b) b.data.caption = ta.value;
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
};
window.videoDragOver = function(e, id){
  if([...e.dataTransfer.items].some(i=>i.type.startsWith('video/'))){
    e.preventDefault();
    const el = document.getElementById('vdrop-'+id);
    if(el) el.classList.add('drag-over');
  }
};
window.videoDragLeave = function(id){
  const el = document.getElementById('vdrop-'+id);
  if(el) el.classList.remove('drag-over');
};
window.videoDrop = function(e, id){
  e.preventDefault();
  const el = document.getElementById('vdrop-'+id);
  if(el) el.classList.remove('drag-over');
  const file = [...e.dataTransfer.files].find(f=>f.type.startsWith('video/'));
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    const b = pe_blocks.find(b=>b.id===id);
    if(b){ b.data.url = ev.target.result; }
    renderBlocks();
    if(pe_prevMode) renderPreview();
  };
  reader.readAsDataURL(file);
};
 
/* Extract embeddable iframe URL from YouTube / Vimeo */
function getEmbedUrl(raw){
  if(!raw) return null;
  const s = raw.trim();
  // YouTube: watch?v=, youtu.be/, shorts/
  let m = s.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if(m) return `https://www.youtube.com/embed/${m[1]}`;
  // Vimeo
  m = s.match(/vimeo\.com\/(\d+)/);
  if(m) return `https://player.vimeo.com/video/${m[1]}`;
  // Already an embed URL
  if(s.includes('youtube.com/embed') || s.includes('player.vimeo')) return s;
  return null;
}
 
let pe_pendingVideoBlockId = null;
 
 
/* ── PREVIEW ── */
window.togglePreview=function(){
  pe_prevMode=!pe_prevMode;
  document.getElementById('pe-write-mode').style.display=pe_prevMode?'none':'block';
  document.getElementById('pe-preview-mode').style.display=pe_prevMode?'block':'none';
  const btn=document.getElementById('btn-preview');
  if(btn) btn.classList.toggle('active',pe_prevMode);
  if(pe_prevMode) renderPreview();
};
 
function renderPreview(){
  const title=document.getElementById('pe-title-input').value.trim();
  const catClass=pe_category==='explanation'?'pe-meta-exp':'pe-meta-ins';
  const catName=pe_category==='explanation'?'⬡ Intuitive Explanation':'💡 Insight';
  let html='';
  // Badges
  html+=`<div style="display:flex;gap:8px;margin-bottom:28px;flex-wrap:wrap;"><span class="pe-meta-badge ${catClass}">${catName}</span>${pe_topic?`<span class="pe-meta-badge pe-meta-topic">${pe_topic}</span>`:''}</div>`;
  // Title
  if(title) html+=`<div class="pv-h1">${escH(title)}</div>`;
  // Blocks
  pe_blocks.forEach(block=>{
    if(block.type==='text' && block.data.text){
      html+=renderMarkdown(block.data.text);
    } else if(block.type==='image' && block.data.url){
      html+=`<img class="pv-img" src="${block.data.url}" alt="Image"/>`;
      if(block.data.caption) html+=`<p class="pv-caption">${escH(block.data.caption)}</p>`;
    } else if(block.type==='chart' && block.data.labels){
      const bars=buildChartBars(block.data.labels,block.data.values,100);
      html+=`<div class="pv-chart-wrap">${block.data.title?`<div class="pv-chart-title">${escH(block.data.title)}</div>`:''}<div class="pv-chart-bars">${bars}</div></div>`;
    } else if(block.type==='video'){
      if(block.data.url){
        html+=`<div class="pv-video-wrap"><video controls style="width:100%;border-radius:12px;background:#000;"><source src="${block.data.url}"/>Your browser does not support video.</video>${block.data.caption?`<p class="pv-caption">${escH(block.data.caption)}</p>`:''}</div>`;
      } else if(block.data.embedUrl){
        const embed=getEmbedUrl(block.data.embedUrl);
        if(embed) html+=`<div class="pv-video-wrap"><div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden;"><iframe src="${embed}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>${block.data.caption?`<p class="pv-caption">${escH(block.data.caption)}</p>`:''}</div>`;
      }
    }
  });
  if(!title && !pe_blocks.some(b=>b.data.text||b.data.url||b.data.labels)){
    html='<p style="color:rgba(255,255,255,0.3);font-size:15px;text-align:center;padding:60px 0;">Start writing to see your preview here.</p>';
  }
  document.getElementById('pe-preview-content').innerHTML=html;
}
 
function renderMarkdown(text){
  let html=''; const lines=text.split('\n'); let inList=false;
  lines.forEach(raw=>{
    if(raw.startsWith('##### ')){ if(inList){html+='</div>';inList=false;} html+=`<div class="pv-h5">${escH(raw.slice(6))}</div>`; }
    else if(raw.startsWith('#### ')){ if(inList){html+='</div>';inList=false;} html+=`<div class="pv-h4">${escH(raw.slice(5))}</div>`; }
    else if(raw.startsWith('### ')){ if(inList){html+='</div>';inList=false;} html+=`<div class="pv-h3">${escH(raw.slice(4))}</div>`; }
    else if(raw.startsWith('## ')){ if(inList){html+='</div>';inList=false;} html+=`<div class="pv-h2">${escH(raw.slice(3))}</div>`; }
    else if(raw.startsWith('# ')){ if(inList){html+='</div>';inList=false;} html+=`<div class="pv-h2" style="font-size:34px;">${escH(raw.slice(2))}</div>`; }
    else if(raw.startsWith('> ')){ if(inList){html+='</div>';inList=false;} html+=`<div class="pv-blockquote">${inlineFmt(raw.slice(2))}</div>`; }
    else if(raw.startsWith('---')){ if(inList){html+='</div>';inList=false;} html+=`<hr class="pv-hr"/>`; }
    else if(raw.match(/^[-*] /)){ if(!inList){html+='<div style="margin:12px 0;">';inList=true;} html+=`<div class="pv-li">${inlineFmt(raw.slice(2))}</div>`; }
    else if(raw.trim()===''){if(inList){html+='</div>';inList=false;} html+=`<div style="height:12px;"></div>`;}
    else{ if(inList){html+='</div>';inList=false;} html+=`<div class="pv-p">${inlineFmt(raw)}</div>`; }
  });
  if(inList) html+='</div>';
  return html;
}
 
function inlineFmt(t){
  let s=escH(t);
  s=s.replace(/\*\*(.+?)\*\*/g,'<span class="pv-bold">$1</span>');
  s=s.replace(/\*(.+?)\*/g,'<span class="pv-italic">$1</span>');
  return s;
}
 
/* ── WORD COUNT ── */
function updateWordCount(){
  let text=(document.getElementById('pe-title-input')||{}).value||'';
  pe_blocks.forEach(b=>{ if(b.type==='text') text+=' '+(b.data.text||''); });
  const words=text.trim()?text.trim().split(/\s+/).length:0;
  const chars=text.length;
  const readTime=Math.max(1,Math.round(words/200));
  const wc=document.getElementById('pe-word-count');
  const cc=document.getElementById('pe-char-count');
  const rt=document.getElementById('pe-read-time');
  if(wc) wc.textContent=words+' word'+(words!==1?'s':'');
  if(cc) cc.textContent=chars+' characters';
  if(rt) rt.textContent='~'+readTime+' min read';
}
 
/* ── PUBLISH ── */
window.publishPost = async function() {
  if(!currentUser){ openLogin(); return; }
  const title = (document.getElementById('pe-title-input')||{}).value||'';
  if(!title.trim()){ showToast('Please add a title first.'); return; }
  const hasBody = pe_blocks.some(b =>
    (b.type==='text'  && (b.data.text||'').trim().length > 10) ||
    (b.type==='image' && b.data.url) ||
    (b.type==='chart' && b.data.labels) ||
    (b.type==='video' && (b.data.url||b.data.embedUrl))
  );
  if(!hasBody){ showToast('Add some content before publishing.'); return; }
 
  const pubBtn = document.getElementById('pe-publish-btn');
  if(pubBtn){ pubBtn.textContent='Publishing...'; pubBtn.disabled=true; }
 
  // Upload images to Supabase Storage
  const processedBlocks = await Promise.all(pe_blocks.map(async block => {
    if(block.type==='image' && block.data.file){
      const file     = block.data.file;
      const filePath = `${currentUser.id}/${Date.now()}-${file.name}`;
      const { error } = await window._sb.storage.from('post-images').upload(filePath, file);
      if(!error){
        const { data: urlData } = window._sb.storage.from('post-images').getPublicUrl(filePath);
        return { ...block, data: { ...block.data, url: urlData.publicUrl, file: null } };
      }
    }
    if(block.type==='video' && block.data.file && block.data.source !== 'embed'){
      const file     = block.data.file;
      const filePath = `videos/${currentUser.id}/${Date.now()}-${file.name}`;
      const { error } = await window._sb.storage.from('post-images').upload(filePath, file);
      if(!error){
        const { data: urlData } = window._sb.storage.from('post-images').getPublicUrl(filePath);
        return { ...block, data: { ...block.data, url: urlData.publicUrl, file: null } };
      }
    }
    const cleanData = { ...block.data };
    delete cleanData.file;
    return { ...block, data: cleanData };
  }));
 
  // Get category ID
  let categoryId = null;
  if(pe_topic){
    const { data: cat } = await window._sb.from('categories').select('id').eq('name', pe_topic).maybeSingle();
    if(cat) categoryId = cat.id;
  }
 
  // Insert post
  const bodyText = pe_blocks.filter(b=>b.type==='text').map(b=>b.data.text).join('\n\n');
  const { error } = await window._sb.from('posts').insert({
    author_id:   currentUser.id,
    title:       title.trim(),
    body:        bodyText,
    blocks:      processedBlocks,
    type:        pe_category==='insight' ? 'insight' : 'explanation',
    post_format: pe_postType,
    category_id: categoryId,
  });
 
  if(error){
    console.error('Publish error:', error);
    showToast('Could not publish. Please try again.');
    if(pubBtn){ pubBtn.textContent='Publish ✦'; pubBtn.disabled=false; }
    return;
  }
 
  closeEditorSilent();
  showPage('home', null);
  setTimeout(()=>showPage(pe_category==='insight'?'insights':'explanations', null), 400);
  showToast('Post published! ✨');
};
 
/* ── HELPERS ── */
function escH(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escTa(s){ return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s){ return String(s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
 
/* ── ESC to close ── */
window.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && document.getElementById('post-editor-overlay').classList.contains('open')) closePostEditor();
  });
});