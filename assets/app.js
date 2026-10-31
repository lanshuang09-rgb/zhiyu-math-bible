/* ===========================================================
 * 知予数学宝典 · 富版前端引擎（零后端 / 静态可托管）
 * 趣味性：闪卡3D翻转 / 连击弹跳 / 段位晋升横幅 / 连续天数 / 新纪录 / 撒花 / AI智能刷题
 * 引流闭环：免费单元直玩 → 完整版=进群领卡密 → 全站进群入口
 * =========================================================== */
(function(){
  "use strict";
  var CONFIG = {
    brand:"知予",
    groupQR:"assets/group-qr.png",
    groupPassword:"知予数学宝典",
    demoCards:["ZHIYU-2026","SHUXUE-BIBLE","知予数学宝典"],
    masterCard:"ZHIYU-VIP"
  };
  var RANKS=["青铜","白银","黄金","铂金","钻石","星耀","王者"];
  var RANK_STAR=[0,3,7,13,21,31,46];

  var KEY="zhiyu_math_v2", state=load();
  function load(){ try{return JSON.parse(localStorage.getItem(KEY))||{units:{},cards:[],master:false,bestCombo:0};}catch(e){return{units:{},cards:[],master:false,bestCombo:0};} }
  function save(){ try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){} }
  function totalStars(){var s=0;for(var k in state.units)s+=state.units[k].stars||0;return s;}
  function rankOf(s){var r=0;for(var i=0;i<RANK_STAR.length;i++)if(s>=RANK_STAR[i])r=i;return r;}
  function isUnlocked(g,u){ if(state.master)return true; var g0=window.GRADE_DATA[g]; if(!g0)return false;
    var u0=g0.units.filter(function(x){return x.id===u;})[0]; if(u0&&u0.free)return true; return !!state.cards[g]; }

  var $=function(s){return document.querySelector(s);}, view=$("#view");
  function fmt(t){ if(!t)return""; return String(t).replace(/(\d+)\/(\d+)/g,function(_,a,b){return '<span class="frac"><sup>'+a+'</sup><sub>'+b+'</sub></span>';}); }

  function starHTML(n){var s="";for(var k=0;k<3;k++)s+=String.fromCharCode(k<n?9733:9734);return s;}

  /* 连续天数 */
  function bumpStreak(){
    var d=new Date(), today=d.getFullYear()+"/"+(d.getMonth()+1)+"/"+d.getDate();
    var y=new Date(d.getTime()-864e5), yday=y.getFullYear()+"/"+(y.getMonth()+1)+"/"+y.getDate();
    if(state.lastDay===today) return state.streak||1;
    if(state.lastDay===yday) state.streak=(state.streak||0)+1; else state.streak=1;
    state.lastDay=today; save(); return state.streak;
  }

  var route={name:"landing",grade:null,unit:null,tab:"mindmap",sem:"上"};
  function go(r){ Object.assign(route,r); render(); window.scrollTo(0,0); }
  function render(){
    if(route.name==="landing")return renderLanding();
    if(route.name==="grades")return renderGrades();
    if(route.name==="units")return renderUnits(route.grade);
    if(route.name==="detail")return renderDetail(route.grade,route.unit,route.tab);
  }

  function renderLanding(){
    var stars=totalStars(), rank=RANKS[rankOf(stars)], streak=bumpStreak();
    updateTop(stars,rank,streak);
    view.innerHTML=
      '<section class="hero">'+
        '<h1>'+CONFIG.brand+'数学宝典 · 小学版</h1>'+
        '<p>苏教版 1~6 年级 · 闯关式数学练习</p>'+
        '<div class="hero-stats"><div>⭐ <b>'+stars+'</b><br>收集星数</div><div>🏅 <b>'+rank+'</b><br>当前段位</div><div>🔥 <b>'+streak+'</b><br>连续天数</div></div>'+
        '<button class="hero-cta" id="startBtn">🎮 免费体验第一单元</button>'+
        '<span class="hero-free">无需注册 · 打开即玩 · 完整版进群领卡密</span>'+
      '</section>'+
      '<div class="value-grid">'+
        '<div class="value-card"><div class="vc-ico">🃏</div><div class="vc-t">闪卡翻转</div><div class="vc-d">点卡翻面看解析，记忆更牢</div></div>'+
        '<div class="value-card"><div class="vc-ico">⚔️</div><div class="vc-t">连击段位</div><div class="vc-d">COMBO 连对上瘾，晋级撒花</div></div>'+
        '<div class="value-card"><div class="vc-ico">🤖</div><div class="vc-t">AI 智能刷题</div><div class="vc-d">实时出题即时反馈，哪里弱练哪里</div></div>'+
        '<div class="value-card"><div class="vc-ico">🏠</div><div class="vc-t">生活+避坑</div><div class="vc-d">生活应用+易错点，家长也能讲</div></div>'+
      '</div>'+
      '<div class="sec-title">怎么用 <small>三步把数学学明白</small></div>'+
      '<div class="value-card" style="margin-bottom:10px"><div class="vc-d">① 免费玩第一单元感受闯关 → ② 想拿完整版进群领卡密 → ③ 群内蓝双老师每周错题答疑 & 升学信息差</div></div>'+
      '<button class="hero-cta" id="allGradesBtn" style="background:#fff;color:var(--brand-d);border:2px solid var(--brand)">查看全部年级 →</button>';
    $("#startBtn").onclick=function(){go({name:"units",grade:1});};
    $("#allGradesBtn").onclick=function(){go({name:"grades"});};
  }

  function renderGrades(){
    var avail=window.GRADE_DATA||{}, stars=totalStars();
    updateTop(stars,RANKS[rankOf(stars)],state.streak||1);
    var html='<button class="back-btn" id="bk">← 首页</button><div class="sec-title">选择年级 <small>苏教版</small></div><div class="grade-list">';
    for(var g=1;g<=6;g++){ var has=!!avail[g];
      html+='<div class="grade-card'+(has?"":" locked")+'" data-g="'+g+'"><div class="g-num">'+g+'</div><div class="g-name">年级</div>'+
            (has?'<div class="g-lock">已上线</div>':'<div class="g-lock">进群优先解锁</div>')+'</div>'; }
    html+='</div>';
    view.innerHTML=html;
    $("#bk").onclick=function(){go({name:"landing"});};
    Array.prototype.forEach.call(view.querySelectorAll(".grade-card"),function(c){
      c.onclick=function(){var g=+c.getAttribute("data-g"); if(avail[g])go({name:"units",grade:g}); else openJoin("该年级完整版在群内优先解锁，进群即可抢先体验");};
    });
  }

  function renderUnits(grade){
    var g=window.GRADE_DATA[grade]; if(!g)return renderGrades();
    var stars=totalStars(); updateTop(stars,RANKS[rankOf(stars)],state.streak||1);
    var sem=route.sem||"上";
    var units=g.units.filter(function(u){return u.sem===sem;});
    var html='<button class="back-btn" id="bk">← 年级</button>'+
      '<div class="sec-title">'+(g.title||(""+grade+"年级"))+'</div>'+
      '<div class="sem-tabs"><div class="sem-tab'+(sem==="上"?" on":"")+'" data-s="上">📗 上册</div><div class="sem-tab'+(sem==="下"?" on":"")+'" data-s="下">📘 下册</div></div>';
    units.forEach(function(u){
      var unlocked=isUnlocked(grade,u.id);
      var tag=u.free?'<span class="u-tag free">免费</span>':(unlocked?'<span class="u-tag">已解锁</span>':'<span class="u-tag lock">🔒 需卡密</span>');
      var meta=(state.units[u.id]&&state.units[u.id].stars)?'已得 '+state.units[u.id].stars+'⭐':'未挑战';
      var lockHint=(!u.free&&!unlocked)?'<div class="u-lock-hint">进群免费领卡密，解锁全部单元 →</div>':'';
      html+='<div class="unit-card" data-u="'+u.id+'"><div class="u-head"><span class="u-title">'+u.title+'</span>'+tag+'</div><div class="u-meta">'+meta+'</div>'+lockHint+'</div>';
    });
    html+='<div style="height:6px"></div>';
    view.innerHTML=html;
    $("#bk").onclick=function(){go({name:"grades"});};
    Array.prototype.forEach.call(view.querySelectorAll(".sem-tab"),function(t){t.onclick=function(){go({name:"units",grade:grade,sem:t.getAttribute("data-s")});};});
    Array.prototype.forEach.call(view.querySelectorAll(".unit-card"),function(c){
      c.onclick=function(){var u=c.getAttribute("data-u"); if(isUnlocked(grade,u))go({name:"detail",grade:grade,unit:u,tab:"mindmap"}); else openUnlock(grade);};
    });
  }

  function renderDetail(grade,unitId,tab){
    var g=window.GRADE_DATA[grade], u=g.units.filter(function(x){return x.id===unitId;})[0];
    if(!u||!isUnlocked(grade,unitId))return openUnlock(grade);
    var tabs=[["mindmap","导图"],["cards","闪卡"],["challenge","闯关"],["ai","AI刷题"],["life","生活"],["pits","避坑"],["test","测试卷"]];
    var th='<div class="tabs">'; tabs.forEach(function(t){th+='<div class="tab'+(t[0]===tab?" on":"")+'" data-t="'+t[0]+'">'+t[1]+'</div>';}); th+='</div>';
    view.innerHTML='<button class="back-btn" id="bk">← 单元</button>'+th+'<div id="panel"></div>';
    $("#bk").onclick=function(){go({name:"units",grade:grade});};
    Array.prototype.forEach.call(view.querySelectorAll(".tab"),function(c){c.onclick=function(){go({name:"detail",grade:grade,unit:unitId,tab:c.getAttribute("data-t")});};});
    renderPanel(tab,u,grade);
  }

  function renderPanel(tab,u,grade){
    var p=$("#panel");
    if(tab==="mindmap"){ p.innerHTML='<div class="panel mindmap">'+u.mindmap.split("\n").map(function(s){return s.trim()?'<p>'+fmt(s)+'</p>':'';}).join("")+'</div>'; }
    else if(tab==="cards"){
      var ci=state["_fc_"+u.id]||0, c=u.cards[ci]||{q:"（暂无闪卡）",a:""};
      p.innerHTML='<div class="flashcard" id="fc"><div class="fc-inner"><div class="fc-face fc-front"><div class="fc-q">'+fmt(c.q)+'</div><div class="fc-hint">点击卡片翻看解析</div></div>'+
        '<div class="fc-face fc-back"><div class="fc-a">'+fmt(c.a)+'</div><div class="fc-hint">再点收回</div></div></div></div>'+
        '<div class="fc-nav"><button id="fcP">← 上一张</button><span id="fcI">'+(ci+1)+'/'+u.cards.length+'</span><button id="fcN">下一张 →</button></div>';
      $("#fc").onclick=function(){this.classList.toggle("flipped");};
      $("#fcP").onclick=function(e){e.stopPropagation();ci=(ci-1+u.cards.length)%u.cards.length;state["_fc_"+u.id]=ci;save();renderPanel("cards",u,grade);};
      $("#fcN").onclick=function(e){e.stopPropagation();ci=(ci+1)%u.cards.length;state["_fc_"+u.id]=ci;save();renderPanel("cards",u,grade);};
    }
    else if(tab==="life"){ p.innerHTML='<div class="panel">'+(u.life&&u.life.length?u.life.map(function(s){return '<div class="life-item">🏠 '+fmt(s)+'</div>';}).join(""):'<p style="color:#888">暂无</p>')+'</div>'; }
    else if(tab==="pits"){
      p.innerHTML='<div class="panel">'+(u.pits&&u.pits.length?u.pits.map(function(s){return '<div class="pit-item">⚠️ '+fmt(s)+'</div>';}).join(""):'<p style="color:#888">暂无</p>')+
        (u.koujue?'<div class="koujue">🔑 口诀：'+fmt(u.koujue)+'</div>':'');
    }
    else if(tab==="challenge"){ startQuiz(p,u.challenge,"闯关",u,grade,false); }
    else if(tab==="ai"){ var pool=(u.challenge||[]).concat(u.test||[]); startQuiz(p,pool,"AI 智能刷题",u,grade,true); }
    else if(tab==="test"){ startQuiz(p,u.test,"测试卷",u,grade,false); }
  }

  /* 答题引擎 */
  function startQuiz(panel,items,label,u,grade,isAI){
    items=items||[];
    if(!items.length){ panel.innerHTML='<div class="panel">该模块题目整理中，进群抢先获取 👇</div>'; return; }
    if(isAI){ items=items.slice().sort(function(){return Math.random()-0.5;}); } // AI：实时打乱顺序
    var idx=0,correct=0,combo=0,maxCombo=0,answered=false;
    function render(){
      answered=false; var q=items[idx];
      var opts='';
      if(q.type==="choice"){ q.options.forEach(function(o){opts+='<button class="quiz-opt" data-o="'+o.replace(/"/g,'&quot;')+'">'+fmt(o)+'</button>';}); }
      else { opts='<input class="quiz-input" id="blankAns" placeholder="输入答案"><button class="quiz-submit" id="blankSub">提交</button>'; }
      panel.innerHTML='<div class="panel">'+
        '<div class="combo-bar"><span>'+label+' '+(idx+1)+'/'+items.length+(isAI?' <span class="ai-badge">🤖 实时</span>':'')+'</span><span>连击 <span class="combo-num" id="comboNum">'+combo+'</span></span></div>'+
        '<div class="quiz-q">'+fmt(q.q)+'</div>'+opts+'<div class="quiz-feedback" id="fb"></div></div>';
      if(q.type==="choice"){ Array.prototype.forEach.call(panel.querySelectorAll(".quiz-opt"),function(b){b.onclick=function(){if(answered)return;answered=true;judge(b.getAttribute("data-o")===q.key,b,q,panel);};}); }
      else { $("#blankSub").onclick=function(){if(answered)return;answered=true;judge(($("#blankAns").value||"").trim()===String(q.key).trim(),null,q,panel);}; }
    }
    function judge(right,btn,q,panel){
      var fb=panel.querySelector("#fb"),opts=panel.querySelectorAll(".quiz-opt");
      if(right){ correct++;combo++; if(combo>maxCombo)maxCombo=combo;
        if(btn)btn.classList.add("correct"); else{var i=panel.querySelector(".quiz-input");if(i)i.style.borderColor="var(--ok)";}
        fb.innerHTML=combo>=3?"🔥 连击 ×"+combo+"！手感来了":"✅ 答对啦"+(q.a?("<br>"+fmt(q.a)):"");
        if(maxCombo>state.bestCombo){ state.bestCombo=maxCombo; save(); showToast("🔥 新纪录！最长连击 "+maxCombo); }
        popCombo();
      } else { combo=0;
        if(btn){btn.classList.add("wrong");Array.prototype.forEach.call(opts,function(o){if(o.getAttribute("data-o")===q.key)o.classList.add("correct");});}
        else{var i=panel.querySelector(".quiz-input");if(i)i.style.borderColor="var(--bad)";}
        fb.innerHTML="❌ 正确答案："+fmt(q.key)+(q.a?("<br>"+fmt(q.a)):"");
      }
      fb.style.display="block"; $("#comboNum").textContent=combo; popCombo();
      setTimeout(function(){ idx++; if(idx<items.length)render(); else finish(); },1500);
    }
    function popCombo(){ var n=$("#comboNum"); if(n){n.classList.remove("pop");void n.offsetWidth;n.classList.add("pop");} }
    function finish(){
      var rate=Math.round(correct/items.length*100), stars=rate===100?3:rate>=60?2:rate>0?1:0;
      var rec=state.units[u.id]||{stars:0,best:0}, before=rankOf(totalStars()-stars), after=rankOf(totalStars());
      rec.stars=Math.max(rec.stars,stars); rec.best=Math.max(rec.best||0,rate); state.units[u.id]=rec;
      var rankUp=after>before||(rate===100); save();
      if(rankUp){ confetti(); showRank(after); }
      var tag=rate===100?"· 全对！太稳了":rate>=60?"· 不错，继续冲":"· 再练练就通";
      panel.innerHTML='<div class="panel result"><div class="r-rank">'+(isAI?"AI 刷题完成":"")+(label==="测试卷"?"测试完成":"闯关完成")+' · 当前段位 '+RANKS[after]+'</div>'+
        '<div class="r-rate">'+rate+'<small>%</small></div><div class="r-tag">'+(label==="测试卷"?"本次正确率":"本轮正确率")+' '+tag+'</div>'+
        '<div class="r-stars">'+starHTML(stars)+'</div>'+
        (rankUp?'<div class="r-tag" style="background:#FFF3D6;color:#B8860B">🎉 段位晋升！</div>':'')+
        '<button class="r-cta" id="rJoin">觉得有用？进群领完整版 + 名师答疑</button>'+
        '<button class="r-share" id="rRetry">🔄 再来一次</button></div>';
      $("#rJoin").onclick=function(){openJoin();};
      $("#rRetry").onclick=function(){ idx=0;correct=0;combo=0;maxCombo=0;render(); };
    }
    render();
  }

  /* 卡密 / 进群 */
  function openUnlock(grade){
    var m=$("#unlockModal"); m.hidden=false; $("#cardErr").hidden=true; $("#cardInput").value="";
    $("#cardSubmit").onclick=function(){ var v=($("#cardInput").value||"").trim().toUpperCase();
      if(v===CONFIG.masterCard.toUpperCase()){state.master=true;save();m.hidden=true;confetti();go({name:"units",grade:grade});return;}
      if(CONFIG.demoCards.map(function(x){return x.toUpperCase();}).indexOf(v)>=0){state.cards[grade]=true;save();m.hidden=true;confetti();go({name:"units",grade:grade});return;}
      $("#cardErr").hidden=false; };
    $("#cardToJoin").onclick=function(){m.hidden=true;openJoin();};
    $("#unlockClose").onclick=function(){m.hidden=true;};
  }
  function openJoin(tip){
    var m=$("#joinModal"); m.hidden=false; if(tip)m.querySelector(".modal-tip").innerHTML=tip;
    $("#qrImg").src=CONFIG.groupQR;
    $("#joinCopy").onclick=function(){ try{navigator.clipboard.writeText(CONFIG.groupPassword);m.querySelector(".modal-sub").innerHTML="✅ 已复制群口令：「"+CONFIG.groupPassword+"」，去微信粘贴找组织";}catch(e){m.querySelector(".modal-sub").innerHTML="群口令：「"+CONFIG.groupPassword+"」";} };
    $("#joinClose").onclick=function(){m.hidden=true;};
  }
  $("#btnJoinTop").onclick=function(){openJoin();};
  $("#btnJoinBar").onclick=function(){openJoin();};

  /* 顶栏 / 横幅 / toast */
  function updateTop(stars,rank,streak){ $("#streakNum").textContent=streak; $("#rankBadge").textContent=rank; }
  function showRank(r){ var b=$("#rankBanner"); $("#rbRank").textContent=RANKS[r]; b.hidden=false; setTimeout(function(){b.hidden=true;},2200); }
  function showToast(t){ var e=$("#toast"); e.textContent=t; e.hidden=false; clearTimeout(e._t); e._t=setTimeout(function(){e.hidden=true;},1800); }

  /* 撒花 */
  var canvas=$("#confetti"),ctx=canvas.getContext("2d"),parts=[],raf=null;
  function resize(){canvas.width=innerWidth;canvas.height=innerHeight;} resize(); addEventListener("resize",resize);
  function confetti(){ var c=["#FF7A45","#F5A623","#4A90D9","#2BB673","#E8554E","#9B59B6"];
    for(var i=0;i<130;i++)parts.push({x:Math.random()*canvas.width,y:-20-Math.random()*canvas.height*.3,r:4+Math.random()*5,c:c[i%c.length],vx:(Math.random()-.5)*4,vy:2+Math.random()*3,a:Math.random()*Math.PI,va:(Math.random()-.5)*.3});
    if(!raf)loop(); }
  function loop(){ ctx.clearRect(0,0,canvas.width,canvas.height);
    parts.forEach(function(p){p.x+=p.vx;p.y+=p.vy;p.a+=p.va;p.vy+=0.03;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.c;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*.6);ctx.restore();});
    parts=parts.filter(function(p){return p.y<canvas.height+30;});
    if(parts.length)raf=requestAnimationFrame(loop); else{ctx.clearRect(0,0,canvas.width,canvas.height);raf=null;} }

  render();
})();
