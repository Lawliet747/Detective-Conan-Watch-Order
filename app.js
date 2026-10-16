/* Detective Conan Watch Order: checklist behavior.
   The list of entries lives in data.js. */
(function(){
  var DATA = window.CONAN_DATA || [];
  var N = DATA.length;
  var KEY = 'conan-watch-order-v1';
  var TYPES = [['all','All'],['ep','Episodes'],['movie','Movies'],['ova','OVAs'],['kaito','Magic Kaito'],['drama','Drama'],['other','Specials']];
  var LABEL = {ep:'Episodes',movie:'Movie',ova:'OVA',kaito:'Magic Kaito',drama:'Drama',other:'Special'};

  // Entries per page. 0 means show everything. To offer more choices, add numbers here, for example [10, 25, 50, 0].
  // The first number is the default.
  var PAGE_SIZES = [10, 0];
  var PS_KEY = 'conan-watch-order-pagesize';

  var EP_TOTAL = 0;
  DATA.forEach(function(e){ if(e.k==='ep' && e.b!=null) EP_TOTAL += e.b - e.a + 1; });

  var $ = function(id){ return document.getElementById(id); };
  var list=$('list'), empty=$('empty'), toastEl=$('toast'), toastMsg=$('toastmsg'), undoBtn=$('undo');
  var done=new Set(), filter='all', q='', hideDone=false;
  var rows=new Map(), chipEls={};
  var page=0, pages=1, pageSize=PAGE_SIZES[0], vis=[];
  var dbDoc=null, dirty=false, ver=0, wTimer=null, writing=Promise.resolve(), undoFn=null, toastTimer=null;

  function pad(n){ return String(n).padStart(3,'0'); }
  function h(tag,cls,text){ var n=document.createElement(tag); if(cls) n.className=cls; if(text!=null) n.textContent=text; return n; }

  function loadLocal(){
    try{
      var s=localStorage.getItem(KEY);
      if(s){ var a=JSON.parse(s); if(Array.isArray(a)) a.forEach(function(n){ if(Number.isInteger(n)&&n>=0&&n<N) done.add(n); }); }
    }catch(e){}
  }
  function saveLocal(){ try{ localStorage.setItem(KEY, JSON.stringify(Array.from(done))); }catch(e){} }

  function setSync(state){
    $('syncnote').textContent = state==='synced'
      ? 'Progress is saved to your account and on this device.'
      : 'Progress is saved on this device.';
  }

  function persist(){
    saveLocal();
    if(!dbDoc) return;
    dirty=true;
    var mine=++ver;
    clearTimeout(wTimer);
    wTimer=setTimeout(function(){
      var payload=Array.from(done).sort(function(a,b){return a-b;});
      writing=writing.then(function(){ return dbDoc.set({done:payload, updatedAt:Date.now()}); })
        .then(function(){ if(mine===ver){ dirty=false; } setSync('synced'); })
        .catch(function(){ if(mine===ver){ dirty=false; } setSync('device'); });
    },600);
  }

  function nextIndex(){ for(var i=0;i<N;i++){ if(!done.has(i)) return i; } return -1; }

  function matches(e,i){
    if(filter!=='all' && e.k!==filter) return false;
    if(hideDone && done.has(i)) return false;
    if(q){
      if(/^\d{1,4}$/.test(q)){
        var n=parseInt(q,10);
        return e.k==='ep' && n>=e.a && n<=(e.b==null?Infinity:e.b);
      }
      return (e.title+' '+e.meta).toLowerCase().indexOf(q)!==-1;
    }
    return true;
  }

  function buildRow(e,i){
    var li=h('li','row t-'+e.k); li.id='row-'+i;
    var line=h('div','line');
    var lab=h('label','main');
    var cb=document.createElement('input'); cb.type='checkbox'; cb.id='c'+i; cb.dataset.i=i;
    var txt=h('span','txt');
    txt.append(h('span','title',e.title));
    var meta=h('span','meta');
    meta.append(h('span','tag',LABEL[e.k]));
    meta.append(h('span','nb','Next'));
    if(e.meta) meta.append(h('span','',e.meta));
    if(e.mark) meta.append(h('span','',e.mark));
    txt.append(meta);
    lab.append(cb,txt);
    var idx=h('span','idx',pad(i+1)); idx.title='Position '+(i+1)+' of '+N;
    var more=h('button','more','⋯'); more.type='button';
    more.setAttribute('aria-label','More actions for '+e.title);
    more.setAttribute('aria-expanded','false'); more.dataset.more=i;
    line.append(lab,idx,more);
    li.append(line);
    return li;
  }

  function rowStates(){
    var n=nextIndex();
    rows.forEach(function(li,i){
      li.classList.toggle('done',done.has(i));
      li.classList.toggle('next',i===n);
      li.querySelector('input').checked=done.has(i);
    });
  }

  function visibleIndexes(){
    var out=[];
    DATA.forEach(function(e,i){ if(matches(e,i)) out.push(i); });
    return out;
  }

  function pageOf(pos){ return pageSize ? Math.floor(pos/pageSize) : 0; }

  function renderList(){
    vis=visibleIndexes();
    var total=vis.length;
    pages = pageSize ? Math.max(1, Math.ceil(total/pageSize)) : 1;
    if(page>pages-1) page=pages-1;
    if(page<0) page=0;
    var start = pageSize ? page*pageSize : 0;
    var end = pageSize ? Math.min(total, start+pageSize) : total;
    list.textContent=''; rows.clear();
    var frag=document.createDocumentFragment();
    for(var k=start;k<end;k++){
      var i=vis[k], li=buildRow(DATA[i],i); rows.set(i,li); frag.append(li);
    }
    list.append(frag);
    empty.hidden = total>0;
    renderPager(total,start,end);
    rowStates();
  }

  var pagerEl=$('pager'), pgnum=$('pgnum');
  function renderPager(total,start,end){
    $('range').textContent = total ? 'Showing '+(start+1)+'–'+end+' of '+total : '';
    var show = total>0 && pages>1;
    pagerEl.hidden = !show;
    if(!show) return;
    pgnum.value=page+1; pgnum.max=pages;
    $('pgtotal').textContent=pages;
    $('pfirst').disabled = page===0;
    $('pprev').disabled = page===0;
    $('pnext').disabled = page===pages-1;
    $('plast').disabled = page===pages-1;
  }

  function scrollToListTop(){
    var calm=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('listhead').scrollIntoView({behavior:calm?'auto':'smooth',block:'start'});
  }
  function goPage(p){
    p=Math.max(0,Math.min(pages-1,p));
    if(p!==page){ page=p; renderList(); }
    pgnum.value=page+1;
    scrollToListTop();
  }
  $('pfirst').addEventListener('click',function(){ goPage(0); });
  $('pprev').addEventListener('click',function(){ goPage(page-1); });
  $('pnext').addEventListener('click',function(){ goPage(page+1); });
  $('plast').addEventListener('click',function(){ goPage(pages-1); });
  pgnum.addEventListener('change',function(){
    var v=parseInt(pgnum.value,10);
    if(isNaN(v)){ pgnum.value=page+1; return; }
    goPage(v-1);
  });

  // page size choice, remembered on this device
  var sizeSel=$('pagesize');
  PAGE_SIZES.forEach(function(n){
    var o=document.createElement('option'); o.value=n; o.textContent = n ? String(n) : 'All'; sizeSel.append(o);
  });
  try{
    var savedSize=parseInt(localStorage.getItem(PS_KEY),10);
    if(PAGE_SIZES.indexOf(savedSize)!==-1) pageSize=savedSize;
  }catch(e){}
  sizeSel.value=pageSize;
  sizeSel.addEventListener('change',function(){
    var firstPos = pageSize ? page*pageSize : 0;
    pageSize=parseInt(sizeSel.value,10);
    page=pageOf(firstPos);
    try{ localStorage.setItem(PS_KEY, String(pageSize)); }catch(e){}
    renderList();
  });

  function updateAll(){
    var d=done.size, pct=N?Math.round(d/N*100):0, ew=0;
    DATA.forEach(function(e,i){ if(e.k==='ep' && e.b!=null && done.has(i)) ew += e.b-e.a+1; });
    $('pct').textContent=pct+'%';
    $('frac').textContent=d+' / '+N+' entries';
    $('fill').style.width=pct+'%';
    $('track').setAttribute('aria-valuenow',pct);
    $('eps').textContent=ew.toLocaleString()+' of '+EP_TOTAL.toLocaleString()+'+ episodes watched';
    var n=nextIndex();
    $('nextbtn').hidden = n<0;
    var nl=$('nextline');
    if(n<0){ nl.textContent='You are all caught up. New entries will land at the end of the list.'; }
    else{
      nl.textContent='';
      var b=h('b','', 'Next: '); nl.append(b, document.createTextNode(DATA[n].title+(DATA[n].meta?' · '+DATA[n].meta:'')));
    }
    TYPES.forEach(function(t){
      var tot=0, dn=0;
      DATA.forEach(function(e,i){ if(t[0]==='all'||e.k===t[0]){ tot++; if(done.has(i)) dn++; } });
      chipEls[t[0]].textContent=dn+'/'+tot;
    });
  }

  function changed(){ persist(); rowStates(); updateAll(); }

  function toast(msg,undo){
    toastMsg.textContent=msg; undoFn=undo||null; undoBtn.hidden=!undo; toastEl.hidden=false;
    clearTimeout(toastTimer); toastTimer=setTimeout(function(){ toastEl.hidden=true; },7000);
  }
  undoBtn.addEventListener('click',function(){ if(undoFn){ undoFn(); undoFn=null; } toastEl.hidden=true; });

  function bulk(fn,msg){
    var prev=new Set(done);
    fn(); persist(); renderList(); updateAll();
    toast(msg,function(){ done=prev; persist(); renderList(); updateAll(); });
  }

  // list events
  list.addEventListener('change',function(ev){
    var t=ev.target;
    if(t.matches && t.matches('input[type="checkbox"]')){
      var i=+t.dataset.i;
      if(t.checked) done.add(i); else done.delete(i);
      changed();
    }
  });
  list.addEventListener('click',function(ev){
    var b=ev.target.closest('button'); if(!b) return;
    if(b.dataset.more!==undefined){ toggleActions(+b.dataset.more,b); return; }
    var act=b.dataset.act, i=+b.dataset.i;
    if(act==='upto'){
      bulk(function(){ for(var k=0;k<=i;k++) done.add(k); }, 'Marked entries 1 to '+(i+1)+' as watched.');
    }else if(act==='from'){
      bulk(function(){ for(var k=i;k<N;k++) done.delete(k); }, 'Cleared entries '+(i+1)+' to '+N+'.');
    }
  });
  function toggleActions(i,btn){
    var li=rows.get(i); if(!li) return;
    var was=li.querySelector('.actions');
    list.querySelectorAll('.actions').forEach(function(a){ a.remove(); });
    list.querySelectorAll('.more').forEach(function(m){ m.setAttribute('aria-expanded','false'); });
    if(was) return;
    var box=h('div','actions');
    var a=h('button','', 'Watched up to here'); a.type='button'; a.dataset.act='upto'; a.dataset.i=i;
    var c=h('button','', 'Unwatched from here'); c.type='button'; c.dataset.act='from'; c.dataset.i=i;
    box.append(a,c); li.append(box);
    btn.setAttribute('aria-expanded','true');
  }

  // chips
  var chips=$('chips');
  TYPES.forEach(function(t){
    var b=h('button','chip'); b.type='button'; b.dataset.k=t[0];
    b.setAttribute('aria-pressed', t[0]==='all'?'true':'false');
    b.append(document.createTextNode(t[1]+' '));
    var cnt=h('b','','0/0'); b.append(cnt); chipEls[t[0]]=cnt;
    chips.append(b);
  });
  chips.addEventListener('click',function(ev){
    var b=ev.target.closest('.chip'); if(!b) return;
    filter=b.dataset.k; page=0; syncChips(); renderList();
  });
  function syncChips(){
    chips.querySelectorAll('.chip').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.k===filter?'true':'false'); });
  }

  $('search').addEventListener('input',function(ev){ q=ev.target.value.trim().toLowerCase(); page=0; renderList(); });
  $('hidedone').addEventListener('change',function(ev){ hideDone=ev.target.checked; page=0; renderList(); });
  function clearFilters(){
    filter='all'; q=''; hideDone=false; page=0; $('search').value=''; $('hidedone').checked=false; syncChips();
  }
  $('clearfilters').addEventListener('click',function(){ clearFilters(); renderList(); });

  $('nextbtn').addEventListener('click',function(){
    var n=nextIndex(); if(n<0) return;
    var pos=vis.indexOf(n);
    if(pos<0){ clearFilters(); pos=n; }
    page=pageOf(pos);
    renderList();
    var el=rows.get(n); if(!el) return;
    var calm=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({behavior:calm?'auto':'smooth',block:'center'});
  });

  // reset with in-page confirmation
  var resetBtn=$('reset'), resetTimer=null;
  resetBtn.addEventListener('click',function(){
    if(!resetBtn.classList.contains('armed')){
      resetBtn.classList.add('armed'); resetBtn.textContent='Tap again to clear all progress';
      resetTimer=setTimeout(disarm,4000); return;
    }
    disarm();
    if(!done.size) return;
    bulk(function(){ done.clear(); }, 'All progress cleared.');
  });
  function disarm(){ clearTimeout(resetTimer); resetBtn.classList.remove('armed'); resetBtn.textContent='Reset all progress'; }

  // boot
  $('eyebrow').textContent='Checklist · '+N+' entries · '+EP_TOTAL.toLocaleString()+'+ episodes';
  // open on the page that holds the next unwatched entry
  function jumpToNext(){ var n=nextIndex(); page = n>0 ? pageOf(n) : 0; }
  loadLocal(); jumpToNext(); renderList(); updateAll(); setSync('device');

  // optional account sync (private per viewer)
  (function(){
    if(!window.claude || !window.claude.use) return;
    Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function(r){
      var db=r[0], user=r[1]; if(!db||!user) return null;
      return user.id().then(function(uid){
        if(!uid) return null;
        dbDoc=db.doc('data/users/'+uid+'/watch-progress');
        var seeded=false, firstSnap=true;
        dbDoc.onSnapshot(function(snap){
          if(snap.exists){
            var d=snap.data()||{}, arr=Array.isArray(d.done)?d.done:[];
            var inc=new Set(arr.filter(function(n){ return Number.isInteger(n)&&n>=0&&n<N; }));
            var same=inc.size===done.size && Array.from(inc).every(function(n){ return done.has(n); });
            if(!dirty && !same){
              done=inc; saveLocal();
              if(firstSnap && filter==='all' && !q && !hideDone) jumpToNext();
              renderList(); updateAll();
            }
          }else if(done.size && !dirty && !seeded){
            seeded=true; persist();
          }
          firstSnap=false;
          setSync('synced');
        }, function(){ setSync('device'); });
      });
    }).catch(function(){});
  })();
})();
