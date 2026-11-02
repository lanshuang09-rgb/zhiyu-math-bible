/* ===========================================================
 * 知予数学宝典 · 富版引擎 v3（零后端 / 静态可托管）
 * 趣味性：闪卡3D翻转 / 连击弹跳 / 段位晋升 / 连续天数 / 新纪录 / 撒花 / Boss挑战
 * 引流闭环：免费单元直玩 → 完整版=进群领卡密 → 全站进群入口
 * 本次升级：judge判断题型 / 填空容错(去单位+中文数字) / Boss挑战徽章 / 随机组卷(原AI改名避免误导) / 单元记忆徽章badge+分班考钩子hook
 * =========================================================== */
(function(){
  "use strict";
  var CONFIG = {
    brand:"知予",
    groupQR:"assets/group-qr.png",
    groupPassword:"知予数学宝典",
    // 卡密后端校验地址（腾讯云开发 CloudBase，国内直连）。
    // 解锁走后端：POST {apiBase}/api/card/verify  {card,grade} → {valid,master}
    apiBase:"https://eldest-guineafowl-d5d6epdd103a07-1523303696.ap-shanghai.app.tcloudbase.com",
    // 本地混淆卡密（离线兜底 / demo 用）。正式生产以后端为准，可清空这两项。
    _cardsB64:"WyJaSElZVS0yMDI2IiwgIlNIVVhVRS1CSUJMRSIsICLnn6XkuojmlbDlrablrp3lhbgiXQ==",
    _masterB64:"WkhJWVUtVklQ"
  };
  var VALID_CARDS=(function(){try{return JSON.parse(atob(CONFIG._cardsB64));}catch(e){return [];}})();
  var MASTER_CARD=(function(){try{return atob(CONFIG._masterB64);}catch(e){return "";}})();
  var RANKS=["青铜","白银","黄金","铂金","钻石","星耀","王者"];
  var RANK_STAR=[0,3,7,13,21,31,46];

  var GRADE_STYLE={
    1:{a:"#58A6F5",d:"#2E7FD0",l:"#E8F3FE",m:"🐣"},
    2:{a:"#18B58B",d:"#0E8C6B",l:"#DDF6EF",m:"🐰"},
    3:{a:"#4A90E2",d:"#2F6FC0",l:"#E3F0FC",m:"🐬"},
    4:{a:"#8E5BE0",d:"#6E3FC0",l:"#EFE6FB",m:"🦄"},
    5:{a:"#F2557C",d:"#D33B63",l:"#FDE4EC",m:"🐯"},
    6:{a:"#00A6B6",d:"#007E8B",l:"#DDF2F5",m:"🦉"}
  };
  var DEF_STYLE={a:"#FF7A45",d:"#E85D2A",l:"#FFE9DD"};
  function applyAccent(g){
    var s=(g&&GRADE_STYLE[g])||DEF_STYLE, r=document.documentElement.style;
    r.setProperty("--a",s.a); r.setProperty("--ad",s.d); r.setProperty("--al",s.l);
  }
  function sceneHTML(sc){
    if(!sc)return"";
    var parts=String(sc).match(/(\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F\uDE80-\uDEFF]|[\u2600-\u27BF]|.)/g)||[];
    return parts.map(function(p){return p.trim()?'<span class="sc-part">'+p+'</span>':'';}).join("");
  }

  var KEY="zhiyu_math_v2", state=load();
  function load(){ try{var s=JSON.parse(localStorage.getItem(KEY)); if(s&&typeof s==="object")return s;}catch(e){} return {units:{},cards:[],master:false,bestCombo:0,wrong:[],events:[]}; }
  function save(){ try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){} }
  function totalStars(){var s=0;for(var k in state.units)s+=state.units[k].stars||0;return s;}
  function rankOf(s){var r=0;for(var i=0;i<RANK_STAR.length;i++)if(s>=RANK_STAR[i])r=i;return r;}
  function isUnlocked(g,u){ if(state.master)return true; var g0=window.GRADE_DATA[g]; if(!g0)return false;
    var u0=g0.units.filter(function(x){return x.id===u;})[0]; if(u0&&u0.free)return true; return !!state.cards[g]; }

  var $=function(s){return document.querySelector(s);}, view=$("#view");
  function fmt(t){ if(!t)return""; return String(t).replace(/(\d+)\/(\d+)/g,function(_,a,b){return '<span class="frac"><sup>'+a+'</sup><sub>'+b+'</sub></span>';}); }

  function starHTML(n){var s="";for(var k=0;k<3;k++)s+=String.fromCharCode(k<n?9733:9734);return s;}

  /* 填空题容错：去单位/量词，支持中文数字，数值比对 */
  function cn2num(s){
    var d={"零":0,"一":1,"二":2,"两":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9};
    if(/[零一二两三四五六七八九十]/.test(s)){
      if(s.indexOf("十")>=0){var p=s.split("十");var t=p[0]?(d[p[0]]||1):1;var o=p[1]?(d[p[1]]||0):0;return t*10+o;}
      return d[s]!==undefined?d[s]:NaN;
    }
    return NaN;
  }
  function normCompare(a,b){
    a=(a||"").trim(); b=(b||"").trim();
    if(a===b)return true;
    var strip=function(s){return s.replace(/[\s，。、（）()]/g,"").replace(/(个|只|朵|条|本|棵|颗|支|块|头|匹|尾|片|张|把|辆|架|艘|位|名|人|元|角|分|厘米|分米|米|毫米|cm|dm|m|千克|公斤|克|kg|吨|t|cm³|dm³|m³|平方|立方|倍|层|岁|年|月|日|天|时|分|秒|℃|度|左右|大约|约)/gi,"").toLowerCase();};
    if(strip(a)===strip(b))return true;
    var na=parseFloat((""+a).replace(/[^\d.\-]/g,"")), nb=parseFloat((""+b).replace(/[^\d.\-]/g,""));
    if(!isNaN(na)&&!isNaN(nb)&&na===nb)return true;
    var ca=cn2num(a), cb=cn2num(b);
    if(!isNaN(ca)&&!isNaN(cb)&&ca===cb)return true;
    return false;
  }

  function bumpStreak(){
    var d=new Date(), today=d.getFullYear()+"/"+(d.getMonth()+1)+"/"+d.getDate();
    var y=new Date(d.getTime()-864e5), yday=y.getFullYear()+"/"+(y.getMonth()+1)+"/"+y.getDate();
    if(state.lastDay===today) return state.streak||1;
    if(state.lastDay===yday) state.streak=(state.streak||0)+1; else state.streak=1;
    state.lastDay=today; save(); return state.streak;
  }

  /* 埋点 + 错题本（localStorage，零后端） */
  function track(type,p){ try{var e=Object.assign({t:Date.now(),type:type},p||{}); state.events.push(e); if(state.events.length>300)state.events=state.events.slice(-300); save();}catch(e){} }
  function recordWrong(q,ans,u,grade){
    var entry={g:grade,u:u.id,type:q.type,options:q.options,q:q.q,key:q.key,ans:ans,a:q.a||"",scene:q.scene,t:Date.now()};
    state.wrong=state.wrong.filter(function(w){return w.q!==q.q;});
    state.wrong.push(entry);
    if(state.wrong.length>200)state.wrong=state.wrong.slice(-200);
    save();
  }
  function clearWrong(){ state.wrong=[]; save(); }

  var route={name:"landing",grade:null,unit:null,tab:"mindmap",sem:"上"};
  function go(r){ Object.assign(route,r); render(); window.scrollTo(0,0); }
  function render(){
    if(route.name==="landing")return renderLanding();
    if(route.name==="grades")return renderGrades();
    if(route.name==="units")return renderUnits(route.grade);
    if(route.name==="detail")return renderDetail(route.grade,route.unit,route.tab);
  }

  function renderLanding(){
    applyAccent(0);
    var stars=totalStars(), rank=RANKS[rankOf(stars)], streak=bumpStreak();
    updateTop(stars,rank,streak);
    view.innerHTML=
      '<section class="hero">'+
        '<span class="hero-mascot">🐑</span>'+
        '<h1>'+CONFIG.brand+'数学宝典 · 小学版</h1>'+
        '<p>苏教版 1~6 年级 · 闯关式数学练习</p>'+
        '<div class="hero-stats"><div>⭐ <b>'+stars+'</b><br>收集星数</div><div>🏅 <b>'+rank+'</b><br>当前段位</div><div>🔥 <b>'+streak+'</b><br>连续天数</div></div>'+
        '<button class="hero-cta" id="startBtn">🎮 免费体验第一单元</button>'+
        '<span class="hero-free">无需注册 · 打开即玩 · 完整版进群领卡密</span>'+
      '</section>'+
      '<div class="value-grid">'+
        '<div class="value-card"><div class="vc-ico">🃏</div><div class="vc-t">闪卡翻转</div><div class="vc-d">点卡翻面看解析，记忆更牢</div></div>'+
        '<div class="value-card"><div class="vc-ico">⚔️</div><div class="vc-t">连击段位</div><div class="vc-d">COMBO 连对上瘾，晋级撒花</div></div>'+
        '<div class="value-card"><div class="vc-ico">🔀</div><div class="vc-t">随机组卷</div><div class="vc-d">实时打乱题库，哪里弱练哪里</div></div>'+
        '<div class="value-card"><div class="vc-ico">🏠</div><div class="vc-t">生活+避坑</div><div class="vc-d">生活应用+易错点，家长也能讲</div></div>'+
      '</div>'+
      '<div class="sec-title">怎么用 <small>三步把数学学明白</small></div>'+
      '<div class="value-card" style="margin-bottom:10px"><div class="vc-d">① 免费玩第一单元感受闯关 → ② 想拿完整版进群领卡密 → ③ 群内蓝双老师每周错题答疑 & 升学信息差</div></div>'+
      '<button class="hero-cta" id="allGradesBtn" style="background:#fff;color:var(--brand-d);border:2px solid var(--brand)">查看全部年级 →</button>';
    $("#startBtn").onclick=function(){go({name:"units",grade:1});};
    $("#allGradesBtn").onclick=function(){go({name:"grades"});};
  }

  function renderGrades(){
    applyAccent(0);
    var avail=window.GRADE_DATA||{}, stars=totalStars();
    updateTop(stars,RANKS[rankOf(stars)],state.streak||1);
    var html='<button class="back-btn" id="bk">← 首页</button><div class="sec-title">选择年级 <small>苏教版 · 每个年级都有自己的专属色</small></div><div class="grade-list">';
    for(var g=1;g<=6;g++){ var has=!!avail[g], s=GRADE_STYLE[g]||DEF_STYLE;
      html+='<div class="grade-card'+(has?"":" locked")+'" data-g="'+g+'" style="--gc:'+s.a+';--gc-bg:'+s.l+';--gc-line:'+s.a+'33;--gc-shadow:'+s.a+'26">'+
            '<span class="g-mascot">'+s.m+'</span><div class="g-num">'+g+'年级</div>'+
            (has?'<div class="g-lock on">▶ 已上线</div>':'<div class="g-lock">进群优先解锁</div>')+'</div>'; }
    html+='</div>';
    view.innerHTML=html;
    $("#bk").onclick=function(){go({name:"landing"});};
    Array.prototype.forEach.call(view.querySelectorAll(".grade-card"),function(c){
      c.onclick=function(){var g=+c.getAttribute("data-g"); if(avail[g])go({name:"units",grade:g}); else openJoin("该年级完整版在群内优先解锁，进群即可抢先体验");};
    });
  }

  /* 单元列表（含记忆徽章 + 分班考钩子 + Boss标记） */
  function renderUnits(grade){
    applyAccent(grade);
    var g=window.GRADE_DATA[grade]; if(!g)return renderGrades();
    var stars=totalStars(); updateTop(stars,RANKS[rankOf(stars)],state.streak||1);
    var sem=route.sem||"上";
    var units=g.units.filter(function(u){return u.sem===sem;});
    var html='<button class="back-btn" id="bk">← 年级</button>'+
      '<div class="sec-title">'+(GRADE_STYLE[grade]?GRADE_STYLE[grade].m+" ":"")+(g.title||(""+grade+"年级"))+'</div>'+
      '<div class="sem-tabs"><div class="sem-tab'+(sem==="上"?" on":"")+'" data-s="上">📗 上册</div><div class="sem-tab'+(sem==="下"?" on":"")+'" data-s="下">📘 下册</div></div>';
    units.forEach(function(u){
      var unlocked=isUnlocked(grade,u.id);
      var tag=u.free?'<span class="u-tag free">✨ 免费</span>':(unlocked?'<span class="u-tag">已解锁</span>':'<span class="u-tag lock">🔒 需卡密</span>');
      var meta=(state.units[u.id]&&state.units[u.id].stars)?'已得 '+state.units[u.id].stars+' ★':'未挑战 · 来闯一关';
      var lockHint=(!u.free&&!unlocked)?'<div class="u-lock-hint">进群免费领卡密，解锁全部单元 →</div>':'';
      var badge=u.badge?'<div class="u-badge">🏅 '+fmt(u.badge)+'</div>':'';
      var hook=u.hook?'<div class="u-hook">💡 '+fmt(u.hook)+'</div>':'';
      var boss=u.boss&&u.boss.q?'<div class="u-boss">👑 含 Boss 挑战</div>':'';
      html+='<div class="unit-card" data-u="'+u.id+'"><div class="u-head"><span class="u-title"><span class="u-ico">'+(u.icon||"📘")+'</span>'+u.title+'</span>'+tag+'</div><div class="u-meta">'+meta+'</div>'+badge+hook+boss+lockHint+'</div>';
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
    applyAccent(grade);
    var g=window.GRADE_DATA[grade], u=g.units.filter(function(x){return x.id===unitId;})[0];
    if(!u||!isUnlocked(grade,unitId))return openUnlock(grade);
    var tabs=[["mindmap","导图"],["cards","闪卡"],["challenge","闯关"],["boss","Boss"],["rand","随机练"],["life","🏠生活"],["pits","⚠️避坑"],["test","📝苏州卷"]];
    var th='<div class="tabs">'; tabs.forEach(function(t){th+='<div class="tab'+(t[0]===tab?" on":"")+'" data-t="'+t[0]+'">'+t[1]+'</div>';}); th+='</div>';
    view.innerHTML='<button class="back-btn" id="bk">← 单元</button>'+th+'<div id="panel"></div>';
    $("#bk").onclick=function(){go({name:"units",grade:grade});};
    Array.prototype.forEach.call(view.querySelectorAll(".tab"),function(c){c.onclick=function(){go({name:"detail",grade:grade,unit:unitId,tab:c.getAttribute("data-t")});};});
    renderPanel(tab,u,grade);
  }

  // 思维导图分支色板（活泼、区分度高，不依赖年级主色）
  var MM_COLORS=["#FF8A5B","#26B587","#4A90E2","#9B5DE5","#F4B400","#FF6F91"];
  function renderMindmap(u){
    var m=u.mindmap;
    if(!m) return '<div class="panel"><p style="color:#888">本单元暂未配置导图</p></div>';
    if(typeof m==="string"){ return '<div class="panel mindmap">'+m.split("\n").map(function(s){return s.trim()?'<p>'+fmt(s)+'</p>':'';}).join("")+'</div>'; }
    var cols=(m.b||[]).map(function(br,bi){
      var c=MM_COLORS[bi%MM_COLORS.length];
      var col='<div class="mm-branch" style="animation-delay:'+(bi*0.08)+'s">'
        +'<div class="mm-spine" style="background:'+c+'"></div>'
        +'<div class="mm-btitle" style="background:'+c+'">'+fmt(br.t)+'</div>'
        +'<div class="mm-leaves">';
      (br.k||[]).forEach(function(k){
        col+='<div class="mm-leaf"><span class="mm-dot" style="background:'+c+'"></span>'+fmt(k)+'</div>';
      });
      return col+'</div></div>';
    }).join("");
    return '<div class="mm-wrap"><div class="mm">'
      +'<div class="mm-center">'+fmt(m.c)+'</div>'
      +'<div class="mm-drop"></div>'
      +'<div class="mm-tree">'+cols+'</div>'
      +'</div><div class="mm-hint">🧠 导图中心是单元主题，向下列是核心知识点与要点</div></div>';
  }
  function renderPanel(tab,u,grade){
    var p=$("#panel");
    if(tab==="mindmap"){ p.innerHTML='<div class="panel mindmap">'+renderMindmap(u)+'</div>'; }
    if(tab==="cards"){
      // 闪卡多彩版：每张卡轮换专属渐变配色 + 记忆戳章玩法
      var FC_THEMES=[
        {bg:"linear-gradient(160deg,#FFF9E8 0%,#FFE3A3 100%)",badge:"#F5A623",ink:"#8A5A00",deco:"☀️"},
        {bg:"linear-gradient(160deg,#E9FBEF 0%,#A8EFC5 100%)",badge:"#26B587",ink:"#0B6E45",deco:"🌿"},
        {bg:"linear-gradient(160deg,#E8F3FE 0%,#A5D3FA 100%)",badge:"#4A90E2",ink:"#1B5FA8",deco:"💧"},
        {bg:"linear-gradient(160deg,#F3EAFB 0%,#D3B8F5 100%)",badge:"#9B5DE5",ink:"#5B2BA6",deco:"🔮"},
        {bg:"linear-gradient(160deg,#FDE8EF 0%,#F9B8CE 100%)",badge:"#FF6F91",ink:"#A8304F",deco:"🌸"},
        {bg:"linear-gradient(160deg,#FFF0E5 0%,#FFC9A3 100%)",badge:"#FF8A5B",ink:"#A84E1B",deco:"🍊"}
      ];
      var ci=state["_fc_"+u.id]||0, c=u.cards[ci]||{q:"（暂无闪卡）",a:""};
      var th=FC_THEMES[ci%FC_THEMES.length];
      var mem=state["_fcm_"+u.id]||[];                 // 记住的卡索引
      var memCount=mem.filter(function(x){return x<u.cards.length;}).length;
      var isMem=mem.indexOf(ci)>=0;
      var dots="";for(var d=0;d<u.cards.length;d++)dots+='<i class="'+(d===ci?"on":"")+(mem.indexOf(d)>=0?" mem":"")+'"></i>';
      p.innerHTML='<div class="fc-progress"><span>'+memCount+' / '+u.cards.length+' 已记住</span><span class="fc-dots">'+dots+'</span></div>'+
        '<div class="flashcard" id="fc" style="--fcbg:'+th.bg+';--fcb:'+th.badge+';--fci:'+th.ink+'"><div class="fc-inner">'+
        '<div class="fc-face fc-front"><span class="fc-deco">'+th.deco+'</span><div class="fc-emoji">'+(c.scene||u.icon||"✨")+'</div><div class="fc-q">'+fmt(c.q)+'</div>'+
        (isMem?'<span class="fc-stamp">✅ 记牢</span>':'')+'<div class="fc-hint">👇 点卡片翻看解析</div></div>'+
        '<div class="fc-face fc-back"><div class="fc-a">'+fmt(c.a)+'</div>'+
        '<button class="fc-mem-btn" id="fcMem">'+(isMem?'💪 已记住，点取消':'✅ 我记住了！')+'</button>'+
        '<div class="fc-hint">再点收回</div></div></div></div>'+
        '<div class="fc-nav"><button id="fcP">← 上一张</button><span id="fcI">'+(ci+1)+' / '+u.cards.length+'</span><button id="fcN">下一张 →</button></div>';
      $("#fc").onclick=function(){this.classList.toggle("flipped");track("flip_card",{g:grade,u:u.id});};
      $("#fcP").onclick=function(e){e.stopPropagation();ci=(ci-1+u.cards.length)%u.cards.length;state["_fc_"+u.id]=ci;save();renderPanel("cards",u,grade);};
      $("#fcN").onclick=function(e){e.stopPropagation();ci=(ci+1)%u.cards.length;state["_fc_"+u.id]=ci;save();renderPanel("cards",u,grade);};
      $("#fcMem").onclick=function(e){
        e.stopPropagation();
        mem=state["_fcm_"+u.id]||[];
        var i=mem.indexOf(ci);
        if(i>=0)mem.splice(i,1);
        else{
          mem.push(ci); track("mem_card",{g:grade,u:u.id});
          if(mem.length>=u.cards.length){confetti();showToast("🎉 闪卡全部记牢，太厉害啦！");}
          else showToast("✅ 已记住 "+mem.length+" / "+u.cards.length);
        }
        state["_fcm_"+u.id]=mem; save();
        $("#fc").classList.remove("flipped");
        renderPanel("cards",u,grade);
      };
    }
    else if(tab==="life"){
      var lifeEmo=["🏠","🛒","🍎","⏰","📏","🧁","🚗","🍬"];
      p.innerHTML='<div class="lp-head">🏠 生活中的数学 · 把课本搬进日子</div><div class="lp-list">'+
        (u.life&&u.life.length?u.life.map(function(s,i){return '<div class="lp-card life-card" style="animation-delay:'+(i*0.07)+'s"><span class="lp-emoji">'+lifeEmo[i%lifeEmo.length]+'</span><div class="lp-text">'+fmt(s)+'</div></div>';}).join(""):'<p style="color:#888">暂无</p>')+
        '</div>';
    }
    else if(tab==="pits"){
      var pitEmo=["⚠️","🚫","🔍","💡","❓","🪤","🌀","📛"];
      p.innerHTML='<div class="lp-head">⚠️ 易错避坑 · 这些地方最易丢分</div><div class="lp-list">'+
        (u.pits&&u.pits.length?u.pits.map(function(s,i){return '<div class="lp-card pit-card" style="animation-delay:'+(i*0.07)+'s"><span class="lp-emoji">'+pitEmo[i%pitEmo.length]+'</span><div class="lp-text">'+fmt(s)+'</div></div>';}).join(""):'<p style="color:#888">暂无</p>')+
        '</div>'+(u.koujue?'<div class="koujue">🔑 口诀：'+fmt(u.koujue)+'</div>':'');
    }
    else if(tab==="challenge"){ startQuiz(p,u.challenge,"闯关",u,grade,false); }
    else if(tab==="boss"){ if(u.boss&&u.boss.q){ startQuiz(p,[u.boss],"Boss挑战",u,grade,false,u.boss.reward); } else { p.innerHTML='<div class="panel">本单元暂未开放 Boss 挑战，先去闯关练手 👊</div>'; } }
    else if(tab==="rand"){ var pool=(u.challenge||[]).concat(u.test||[]); if(!pool.length){p.innerHTML='<div class="panel">题目整理中，进群抢先获取 👇</div>';return;} startQuiz(p,pool,"随机组卷",u,grade,true); }
    else if(tab==="test"){ startPaper(p,u,grade); }
  }

  /* 答题引擎（支持 choice / judge / blank；填空容错；Boss徽章） */
  /* ============ 苏州考情·单元测试卷引擎 ============
   * 数据约定：题目可带 sec:"fill|choice|judge|solve"；无 sec 时按 type 推断。
   * 体验：卷头封面 → 按大题分节作答 → 结算页按大题给分明细（贴苏州卷惯例）。
   */
  var PAPER_SECS=[
    {k:"fill",  name:"一、填一填",   emo:"✏️"},
    {k:"choice",name:"二、选一选",   emo:"🔤"},
    {k:"judge", name:"三、辨一辨",   emo:"⚖️"},
    {k:"solve", name:"四、解决问题", emo:"🧩"}
  ];
  function secOf(q){
    if(q.sec) return q.sec;
    return q.type==="choice"?"choice":(q.type==="judge"?"judge":"fill");
  }
  function startPaper(panel,u,grade){
    var items=(u.test||[]).slice();
    if(!items.length){ panel.innerHTML='<div class="panel">试卷编制中，进群抢先获取 👇</div>'; return; }
    // 按大题顺序重排，同节保持原顺序
    var ordered=[];
    PAPER_SECS.forEach(function(s){ items.forEach(function(q){ if(secOf(q)===s.k)ordered.push(q); }); });
    items.forEach(function(q){ if(secOf(q)==="solve"&&ordered.indexOf(q)<0)ordered.push(q); });
    items=ordered;
    var secCount={};
    items.forEach(function(q){ secCount[secOf(q)]=(secCount[secOf(q)]||0)+1; });
    var secs=PAPER_SECS.filter(function(s){ return secCount[s.k]; });

    // —— 卷头封面 ——
    var secList=secs.map(function(s){ return '<div class="pp-sec-line"><span>'+s.emo+' '+s.name+'</span><b>'+secCount[s.k]+' 题</b></div>'; }).join("");
    panel.innerHTML='<div class="panel pp-cover">'+
      '<div class="pp-flag">苏州名校 · 单元真题风格</div>'+
      '<h2 class="pp-title">'+u.title.replace(/^第.+单元 · /,"")+'<small>单元测试卷</small></h2>'+
      '<div class="pp-sub">苏教版 · 贴合苏州考情</div>'+
      '<div class="pp-meta"><span>📝 共 '+items.length+' 题</span><span>⏱ 建议 '+Math.max(20,items.length*2)+' 分钟</span><span>💯 满分 100</span></div>'+
      '<div class="pp-score-tip">评分：每题 '+(100/items.length).toFixed(1).replace(/\.0$/,'')+' 分 · 做错自动进错题本</div>'+
      '<div class="pp-sec-box">'+secList+'</div>'+
      '<button class="pp-start" id="ppStart">🔔 开考！</button>'+
      '<div class="pp-tip">做完自动按大题给分，家长后台也能看到这份成绩</div>'+
      '</div>';
    $("#ppStart").onclick=function(){ runQ(0,{}); };

    function runQ(idx,secRight){
      if(idx>=items.length) return paperDone(secRight);
      var q=items[idx], sec=secOf(q), sdef=PAPER_SECS.filter(function(s){return s.k===sec;})[0]||PAPER_SECS[0];
      var secIdx=items.slice(0,idx+1).filter(function(x){return secOf(x)===sec;}).length;
      var secHead=(secIdx===1)?'<div class="pp-sec-head">'+sdef.emo+' '+sdef.name+'<small>'+secCount[sec]+' 题</small></div>':"";
      var LETTERS=["A","B","C","D"], li=0, opts="";
      if(q.type==="judge"){
        opts='<button class="quiz-opt" data-o="对"><span class="opt-key">✅</span><span>对</span></button>'+
             '<button class="quiz-opt" data-o="错"><span class="opt-key">❌</span><span>错</span></button>';
      } else if(q.type==="choice"){
        (q.options||[]).forEach(function(o){var L=LETTERS[li++];opts+='<button class="quiz-opt" data-o="'+o.replace(/"/g,'&quot;')+'"><span class="opt-key">'+L+'</span><span>'+fmt(o)+'</span></button>';});
      } else {
        opts='<input class="quiz-input" id="blankAns" placeholder="💡 写下答案（带单位也行）"><button class="quiz-submit" id="blankSub">提交</button>';
      }
      panel.innerHTML='<div class="panel pp-paper">'+
        '<div class="pp-progress"><i style="width:'+Math.round(idx/items.length*100)+'%"></i></div>'+
        '<div class="pp-bar"><span>'+sdef.name.split("、")[0]+' · 第'+(idx+1)+'题 / 共'+items.length+'题</span><span>苏州卷</span></div>'+
        secHead+
        '<div class="quiz-scene">'+sceneHTML(q.scene||sdef.emo)+'</div>'+
        '<div class="quiz-q">'+fmt(q.q)+'</div>'+opts+'<div class="quiz-feedback" id="fb"></div></div>';
      var answered=false;
      function judge(right,btn){
        if(answered)return; answered=true;
        var userAns=q.type==="blank"?($("#blankAns")?$("#blankAns").value:""):(btn?btn.getAttribute("data-o"):"");
        var fb=panel.querySelector("#fb");
        if(right){ secRight[sec]=(secRight[sec]||0)+1;
          if(btn)btn.classList.add("correct"); else{var i2=panel.querySelector(".quiz-input");if(i2)i2.style.borderColor="var(--ok)";}
          fb.className="quiz-feedback good"; fb.innerHTML="🎉 答对啦！"+(q.a?("<br>"+fmt(q.a)):"");
        } else {
          recordWrong(q,userAns,u,grade); track("wrong",{g:grade,u:u.id,label:"测试卷"});
          if(btn){btn.classList.add("wrong");Array.prototype.forEach.call(panel.querySelectorAll(".quiz-opt"),function(o){if(o.getAttribute("data-o")===q.key)o.classList.add("correct");});}
          else{var i3=panel.querySelector(".quiz-input");if(i3)i3.style.borderColor="var(--bad)";}
          fb.className="quiz-feedback badd"; fb.innerHTML="💪 正确答案："+fmt(q.key)+(q.a?("<br>"+fmt(q.a)):"");
        }
        fb.style.display="block";
        setTimeout(function(){ runQ(idx+1,secRight); },1400);
      }
      if(q.type==="blank"){
        $("#blankSub").onclick=function(){ judge(normCompare($("#blankAns").value,q.key),null); };
        var inp=$("#blankAns"); if(inp){inp.onkeydown=function(e){if(e.key==="Enter")$("#blankSub").click();};setTimeout(function(){try{inp.focus();}catch(e){}},50);}
      } else {
        Array.prototype.forEach.call(panel.querySelectorAll(".quiz-opt"),function(b){b.onclick=function(){judge(b.getAttribute("data-o")===q.key,b);};});
      }
    }

    function paperDone(secRight){
      var rightN=0; secs.forEach(function(s){ rightN+=secRight[s.k]||0; });
      var score=Math.round(rightN/items.length*100);
      var stars=score===100?3:score>=60?2:score>0?1:0;
      track("paper_finish",{g:grade,u:u.id,score:score});
      var rec=state.units[u.id]||{stars:0,best:0};
      rec.stars=Math.max(rec.stars,stars); rec.best=Math.max(rec.best||0,score); state.units[u.id]=rec; save(); syncLearning();
      var detail=secs.map(function(s){
        var got=secRight[s.k]||0, tot=secCount[s.k];
        var pct=tot?Math.round(got/tot*100):0;
        var col=pct>=80?"#2BB673":pct>=60?"#F5A623":"#E8554E";
        return '<div class="rp-bar"><span class="rp-bar-name">'+s.emo+' '+s.name+'</span><span class="rp-bar-track"><i style="width:'+pct+'%;background:'+col+'"></i></span><span class="rp-bar-val">'+got+'/'+tot+'</span></div>';
      }).join("");
      var comment=score>=90?"🏆 苏州卷水准！这单元稳了，可以提前攻下一单元"
        :score>=75?"😎 扎实！把错题本里这单元的题重做一遍就满分"
        :score>=60?"🌱 过关，但丢分不少——重点刷「闯关」和「Boss」补弱"
        :"💪 别灰心，先回「导图」捋一遍知识点，再来二刷这份卷子";
      panel.innerHTML='<div class="panel result pp-result">'+
        '<div class="pp-flag">苏州名校 · 单元真题风格</div>'+
        '<div class="r-rank">'+u.title.replace(/^第.+单元 · /,"")+'· 测试完成</div>'+
        '<div class="r-rate">'+score+'<small>分</small></div>'+
        '<div class="r-stars">'+starHTML(stars)+'</div>'+
        '<div class="pp-detail-title">📋 各大题得分</div>'+detail+
        '<div class="pp-comment">'+comment+'</div>'+
        '<button class="r-cta" id="ppRetry">🔄 二刷这份卷子</button>'+
        '<button class="r-share" id="ppBack">← 回到单元</button></div>';
      if(score>=90)confetti();
      $("#ppRetry").onclick=function(){ runQ(0,{}); };
      $("#ppBack").onclick=function(){ go({name:"units",grade:grade}); };
    }
  }

  function startQuiz(panel,items,label,u,grade,isAI,badge){
    items=items||[];
    if(!items.length){ panel.innerHTML='<div class="panel">该模块题目整理中，进群抢先获取 👇</div>'; return; }
    if(isAI){ items=items.slice().sort(function(){return Math.random()-0.5;}); }
    var idx=0,correct=0,combo=0,maxCombo=0,answered=false;
    var LETTERS=["A","B","C","D"];
    function render(){
      answered=false; var q=items[idx];
      var scene='<div class="quiz-scene">'+sceneHTML(q.scene||u.icon||"✏️")+'</div>';
      var opts=''; var li=0;
      if(q.type==="choice"||q.type==="judge"){
        if(q.type==="judge"){
          opts='<button class="quiz-opt" data-o="对"><span class="opt-key">✅</span><span>对</span></button>'+
               '<button class="quiz-opt" data-o="错"><span class="opt-key">❌</span><span>错</span></button>';
        } else {
          q.options.forEach(function(o){var L=LETTERS[li++]||"•";
            opts+='<button class="quiz-opt" data-o="'+o.replace(/"/g,'&quot;')+'"><span class="opt-key">'+L+'</span><span>'+fmt(o)+'</span></button>';});
        }
      }
      else { opts='<input class="quiz-input" id="blankAns" placeholder="💡 输入答案（带单位也行）"><button class="quiz-submit" id="blankSub">提交答案</button>'; }
      panel.innerHTML='<div class="panel">'+
        '<div class="qprog"><i style="width:'+Math.round(idx/items.length*100)+'%"></i></div>'+
        '<div class="combo-bar"><span>'+label+' '+(idx+1)+' / '+items.length+(isAI?' <span class="ai-badge">🔀 随机出题</span>':'')+'</span><span>连击 <span class="combo-num" id="comboNum">'+combo+'</span></span></div>'+
        scene+'<div class="quiz-q">'+fmt(q.q)+'</div>'+opts+'<div class="quiz-feedback" id="fb"></div></div>';
      if(q.type!=="blank"){
        Array.prototype.forEach.call(panel.querySelectorAll(".quiz-opt"),function(b){b.onclick=function(){if(answered)return;answered=true;judge(b.getAttribute("data-o")===q.key,b,q,panel);};});
      } else {
        $("#blankSub").onclick=function(){if(answered)return;answered=true;judge(normCompare(($("#blankAns").value||""),q.key),null,q,panel);};
        var inp=$("#blankAns"); if(inp){inp.onkeydown=function(e){if(e.key==="Enter"){$("#blankSub").click();};};
          setTimeout(function(){try{inp.focus();}catch(e){}},50);}
      }
    }
    function judge(right,btn,q,panel){
      var fb=panel.querySelector("#fb"),opts=panel.querySelectorAll(".quiz-opt");
      var userAns = q.type==="blank" ? (panel.querySelector("#blankAns")?panel.querySelector("#blankAns").value:"") : (btn?btn.getAttribute("data-o"):"");
      if(right){ correct++;combo++; if(combo>maxCombo)maxCombo=combo;
        if(btn)btn.classList.add("correct"); else{var i=panel.querySelector(".quiz-input");if(i)i.style.borderColor="var(--ok)";}
        fb.className="quiz-feedback good";
        fb.innerHTML=combo>=3?"🔥 连击 ×"+combo+"！手感来了":"🎉 答对啦！"+(q.a?("<br>"+fmt(q.a)):"");
        if(combo>=5)confetti();
        if(maxCombo>state.bestCombo){ state.bestCombo=maxCombo; save(); showToast("🔥 新纪录！最长连击 "+maxCombo); }
        popCombo();
      } else { combo=0;
        recordWrong(q,userAns,u,grade); track("wrong",{g:grade,u:u.id,label:label});
        if(btn){btn.classList.add("wrong");Array.prototype.forEach.call(opts,function(o){if(o.getAttribute("data-o")===q.key)o.classList.add("correct");});}
        else{var i=panel.querySelector(".quiz-input");if(i)i.style.borderColor="var(--bad)";}
        fb.className="quiz-feedback badd";
        fb.innerHTML="💪 别急，正确答案："+fmt(q.key)+(q.a?("<br>"+fmt(q.a)):"");
      }
      fb.style.display="block"; $("#comboNum").textContent=combo; popCombo();
      setTimeout(function(){ idx++; if(idx<items.length)render(); else finish(); },1500);
    }
    function popCombo(){ var n=$("#comboNum"); if(n){n.classList.remove("pop");void n.offsetWidth;n.classList.add("pop");} }
    function finish(){
      var rate=Math.round(correct/items.length*100), stars=rate===100?3:rate>=60?2:rate>0?1:0;
      track("quiz_finish",{g:grade,u:u.id,label:label,rate:rate,stars:stars});
      var rec=state.units[u.id]||{stars:0,best:0}, before=rankOf(totalStars()-stars), after=rankOf(totalStars());
      rec.stars=Math.max(rec.stars,stars); rec.best=Math.max(rec.best||0,rate); state.units[u.id]=rec;
      var rankUp=after>before||(rate===100); save(); syncLearning();
      if(rankUp){ confetti(); showRank(after); }
      var tag=rate===100?"· 全对！太稳了":rate>=60?"· 不错，继续冲":"· 再练练就通";
      var rEmoji=rate===100?"🏆":rate>=60?"😎":"🌱";
      var extra="";
      if(badge){ extra = rate===100
        ? '<div class="r-boss">🏆 击败 Boss！<br>获得记忆徽章：'+fmt(badge)+'</div>'
        : '<div class="r-boss miss">还差一点，再战一次就能拿下徽章 👊</div>';
        if(rate===100) track("badge",{g:grade,u:u.id,badge:badge}); }
      panel.innerHTML='<div class="panel result"><span class="result-emoji">'+rEmoji+'</span><div class="r-rank">'+(isAI?"随机组卷完成 · ":"")+(label==="测试卷"?"测试完成":(label==="Boss挑战"?"Boss挑战完成":"闯关完成"))+' · 当前段位 '+RANKS[after]+'</div>'+
        '<div class="r-rate">'+rate+'<small>%</small></div><div class="r-tag">'+(label==="测试卷"?"本次正确率":(label==="Boss挑战"?"Boss挑战正确率":"本轮正确率"))+' '+tag+'</div>'+
        '<div class="r-stars">'+starHTML(stars)+'</div>'+
        (rankUp?'<div class="r-tag" style="background:#FFF3D6;color:#B8860B">🎉 段位晋升！</div>':'')+
        extra+
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
    $("#cardSubmit").onclick=function(){
      var v=($("#cardInput").value||"").trim(); if(!v)return;
      var btn=$("#cardSubmit"); btn.disabled=true; btn.textContent="校验中…";
      verifyCard(v,grade).then(function(res){
        btn.disabled=false; btn.textContent="解锁";
        if(res&&res.valid){
          if(res.master){state.master=true;state.activeCard="@master";track("card_unlock",{g:grade,master:true});}
          else{state.cards[grade]=true;state.activeCard=v;track("card_unlock",{g:grade});}
          save(); syncLearning(); m.hidden=true; confetti(); go({name:"units",grade:grade}); return;
        }
        $("#cardErr").hidden=false;
      }).catch(function(){ btn.disabled=false; btn.textContent="解锁"; $("#cardErr").hidden=false; });
    };
    $("#cardToJoin").onclick=function(){m.hidden=true;openJoin();};
    $("#unlockClose").onclick=function(){m.hidden=true;};
  }
  /* 卡密校验：优先后端，网络异常回退本地（离线兜底） */
  function verifyCard(card,grade){
    if(CONFIG.apiBase){
      return fetch(CONFIG.apiBase.replace(/\/$/,"")+"/api/card/verify",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({card:card,grade:grade})
      }).then(function(r){return r.json();}).then(function(d){
        if(d&&typeof d.valid==="boolean")return d; throw new Error("bad resp");
      }).catch(function(){ return verifyLocal(card,grade); });
    }
    return Promise.resolve(verifyLocal(card,grade));
  }
  function verifyLocal(card,grade){
    var v=card.trim().toUpperCase();
    if(v===MASTER_CARD.toUpperCase())return {valid:true,master:true};
    if(VALID_CARDS.map(function(x){return x.toUpperCase();}).indexOf(v)>=0)return {valid:true,master:false};
    return {valid:false};
  }
  function openJoin(tip){
    track("join_open",{});
    var m=$("#joinModal"); m.hidden=false; if(tip)m.querySelector(".modal-tip").innerHTML=tip;
    $("#qrImg").src=CONFIG.groupQR;
    $("#joinCopy").onclick=function(){ try{navigator.clipboard.writeText(CONFIG.groupPassword);m.querySelector(".modal-sub").innerHTML="✅ 已复制群口令：「"+CONFIG.groupPassword+"」，去微信粘贴找组织";}catch(e){m.querySelector(".modal-sub").innerHTML="群口令：「"+CONFIG.groupPassword+"」";} };
    $("#joinClose").onclick=function(){m.hidden=true;};
  }
  /* 错题本 / 学习报告（localStorage，零后端） */
  function openWrongbook(){
    var m=$("#infoModal"); m.hidden=false; $("#infoTitle").textContent="📕 我的错题本";
    var body=$("#infoBody");
    if(!state.wrong.length){ body.innerHTML='<p class="info-empty">还没有错题，去闯关练练手吧 💪</p>'; return; }
    var groups={};
    state.wrong.forEach(function(w){ var k=w.g+"年级·"+w.u; (groups[k]=groups[k]||[]).push(w); });
    var html='<p class="info-tip">共 <b>'+state.wrong.length+'</b> 道错题（已去重），点「重做错题」逐个击破 👇</p>';
    for(var k in groups){
      html+='<div class="wb-group"><div class="wb-gtitle">'+k+'</div>';
      groups[k].forEach(function(w){
        html+='<div class="wb-item"><div class="wb-q">❓ '+fmt(w.q)+'</div>'+
              '<div class="wb-ans">✅ 正确答案：'+fmt(w.key)+(w.a?'<br><span class="wb-a">'+fmt(w.a)+'</span>':'')+'</div>'+
              (w.ans!==undefined&&w.ans!==""?'<div class="wb-my">✏️ 你的答案：'+fmt(w.ans)+'</div>':'')+'</div>';
      });
      html+='</div>';
    }
    html+='<div class="info-actions"><button class="modal-submit" id="wbRedo">🔄 重做错题</button><button class="modal-ghost" id="wbClear">🗑 清空错题本</button></div>';
    body.innerHTML=html;
    $("#wbRedo").onclick=function(){
      var g=state.wrong[0].g;
      view.innerHTML='<button class="back-btn" id="wbBk">← 返回首页</button><div id="wbPanel"></div>';
      $("#wbBk").onclick=function(){go({name:"landing"});};
      var items=state.wrong.map(function(w){return {type:w.type,scene:w.scene,q:w.q,key:w.key,options:w.options,a:w.a};});
      startQuiz($("#wbPanel"), items, "错题重做", {id:"__wrong__"}, g, false);
    };
    $("#wbClear").onclick=function(){ clearWrong(); openWrongbook(); };
  }
  /* 家长后台（localStorage 本地 + 可接后端同步/查看） */
  function openReport(){
    var m=$("#infoModal"); m.hidden=false; $("#infoTitle").textContent="👨‍👩‍👧 家长后台";
    var body=$("#infoBody");
    var s=computeStats();
    var html=
      '<div class="rp-sync">'+
        (CONFIG.apiBase
          ? '<input id="rpCard" class="rp-card-input" placeholder="输入孩子卡密查看云端报告">'+
            '<button class="rp-btn" id="rpSync">☁️ 同步学习数据到后端</button><button class="rp-btn ghost" id="rpCloud">📥 从云端查看</button>'
          : '<div class="rp-note">未配置后端地址（CONFIG.apiBase 为空），当前展示本机数据。配置后学习数据会自动同步到您刚搭的后端，家长可跨设备查看。</div>')+
      '</div>'+
      '<div class="rp-grid">'+rp("⭐ 收集星数",s.stars)+rp("🏅 当前段位",s.rank)+rp("🔥 连续天数",s.streak)+
        rp("📚 已挑战单元",s.unitCount)+rp("✅ 平均正确率",s.avg+"%")+rp("📕 错题总数",s.wrongCount)+'</div>'+
      '<div class="rp-sec"><div class="rp-h">📈 各单元正确率（最佳）</div>'+s.unitBars+'</div>'+
      (s.badges.length?'<div class="rp-sec"><div class="rp-h">🏆 已得徽章</div><div class="rp-badges">'+s.badges.map(function(b){return '<span class="rp-badge">'+fmt(b)+'</span>';}).join("")+'</div></div>':'')+
      (s.weak.length?'<div class="rp-sec"><div class="rp-h">⚠️ 薄弱单元（最佳＜60%）</div><div class="rp-weak">'+s.weak.join("、")+'</div></div>':'<div class="rp-sec"><div class="rp-h">✨ 暂无明显薄弱点，保持！</div></div>')+
      (s.lastT?'<div class="rp-foot">最近练习：'+new Date(s.lastT).toLocaleString("zh-CN")+'</div>':'<div class="rp-foot">还没有练习记录，去闯关试试～</div>');
    body.innerHTML=html;
    if(CONFIG.apiBase){
      $("#rpSync").onclick=function(){ syncLearning(); var b=$("#rpSync"); b.textContent="✅ 已同步"; setTimeout(function(){b.textContent="☁️ 同步学习数据到后端";},1500); };
      $("#rpCloud").onclick=function(){ loadCloudReport(body); };
    }
  }
  function computeStats(){
    var stars=totalStars(), rank=RANKS[rankOf(stars)], streak=state.streak||1;
    var unitCount=Object.keys(state.units).length;
    var finishes=state.events.filter(function(e){return e.type==="quiz_finish";});
    var avg = finishes.length? Math.round(finishes.reduce(function(s,e){return s+(e.rate||0);},0)/finishes.length):0;
    var wrongCount=state.wrong.length;
    var badges=state.events.filter(function(e){return e.type==="badge";}).map(function(e){return e.badge;});
    var lastT=state.events.length? state.events[state.events.length-1].t : null;
    var weak=[], unitBars="";
    for(var k in state.units){ var best=state.units[k].best||0;
      if(best<60) weak.push(k+"（最佳"+best+"%）");
      var col=best>=80?"#2BB673":best>=60?"#F5A623":"#E8554E";
      unitBars+='<div class="rp-bar"><span class="rp-bar-name">'+k+'</span><span class="rp-bar-track"><i style="width:'+best+'%;background:'+col+'"></i></span><span class="rp-bar-val">'+best+'%</span></div>';
    }
    if(!unitBars) unitBars='<p style="color:#888;font-size:12px">暂无单元数据，去闯关后会自动记录 📊</p>';
    return {stars:stars,rank:rank,streak:streak,unitCount:unitCount,avg:avg,wrongCount:wrongCount,badges:badges,weak:weak,lastT:lastT,unitBars:unitBars};
  }
  function syncLearning(){
    if(!CONFIG.apiBase)return;
    try{
      if(!state.dev){ state.dev="D"+Math.random().toString(36).slice(2,12); save(); }
      var payload={
        card:(state.activeCard&&state.activeCard!=="@master")?state.activeCard:null,
        dev:state.dev,
        stars:totalStars(), avg:computeStats().avg, wrong:state.wrong.length,
        units:Object.keys(state.units).map(function(k){return {name:k,best:state.units[k].best||0};}),
        at:Date.now()
      };
      fetch(CONFIG.apiBase.replace(/\/$/,"")+"/api/learning/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}).catch(function(){});
    }catch(e){}
  }
  function loadCloudReport(body){
    if(!CONFIG.apiBase)return;
    var card=($("#rpCard")?($("#rpCard").value||"").trim():"");
    if(!card){ body.innerHTML='<p class="info-tip">请先在上方输入框填入孩子的卡密，再点「从云端查看」。</p>'; return; }
    body.innerHTML='<p class="info-tip">正在从云端拉取家长视图…</p>';
    fetch(CONFIG.apiBase.replace(/\/$/,"")+"/api/learning/report?card="+encodeURIComponent(card.toUpperCase())).then(function(r){return r.json();}).then(function(d){
      var html='<div class="rp-cloud"><div class="rp-h">☁️ 云端学习概况</div><div class="rp-grid">';
      if(d&&typeof d==="object"){
        if(d.stars!=null)html+=rp("⭐ 星数",d.stars);
        if(d.avg!=null)html+=rp("✅ 平均正确率",d.avg+"%");
        if(d.wrong!=null)html+=rp("📕 错题",d.wrong);
        html+='</div>';
        if(Array.isArray(d.units)&&d.units.length){ html+='<div class="rp-sec"><div class="rp-h">📈 各单元正确率</div>';
          html+=d.units.map(function(u){var b=u.best||0;var col=b>=80?"#2BB673":b>=60?"#F5A623":"#E8554E";return '<div class="rp-bar"><span class="rp-bar-name">'+(u.name||u.id)+'</span><span class="rp-bar-track"><i style="width:'+b+'%;background:'+col+'"></i></span><span class="rp-bar-val">'+b+'%</span></div>';}).join("")+'</div>'; }
      } else { html+='</div><p class="info-tip">云端暂无可读数据。</p>'; }
      html+='</div>'; body.innerHTML=html;
    }).catch(function(){ body.innerHTML='<p class="info-tip">拉取失败，请确认后端地址与 /learning/report 接口可用。</p>'; });
  }
  function rp(k,v){return '<div class="rp-card"><div class="rp-v">'+v+'</div><div class="rp-k">'+k+'</div></div>'; }

  $("#btnJoinTop").onclick=function(){openJoin();};
  $("#btnJoinBar").onclick=function(){openJoin();};
  $("#btnWrong").onclick=function(){openWrongbook();};
  $("#btnReport").onclick=function(){openReport();};
  $("#infoClose").onclick=function(){$("#infoModal").hidden=true;};

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
