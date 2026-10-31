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
    demoCards:["ZHIYU-2026","SHUXUE-BIBLE","知予数学宝典"],
    masterCard:"ZHIYU-VIP"
  };
  var RANKS=["青铜","白银","黄金","铂金","钻石","星耀","王者"];
  var RANK_STAR=[0,3,7,13,21,31,46];

  var GRADE_STYLE={
    1:{a:"#FF7A45",d:"#E85D2A",l:"#FFE9DD",m:"🐣"},
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
  function load(){ try{return JSON.parse(localStorage.getItem(KEY))||{units:{},cards:[],master:false,bestCombo:0};}catch(e){return{units:{},cards:[],master:false,bestCombo:0};} }
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
    var tabs=[["mindmap","导图"],["cards","闪卡"],["challenge","闯关"],["boss","Boss"],["rand","随机练"],["life","生活"],["pits","避坑"],["test","测试卷"]];
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
      p.innerHTML='<div class="flashcard" id="fc"><div class="fc-inner"><div class="fc-face fc-front"><div class="fc-emoji">'+(c.scene||u.icon||"✨")+'</div><div class="fc-q">'+fmt(c.q)+'</div><div class="fc-hint">👇 点击卡片翻看解析</div></div>'+
        '<div class="fc-face fc-back"><div class="fc-a">'+fmt(c.a)+'</div><div class="fc-hint">再点收回</div></div></div></div>'+
        '<div class="fc-nav"><button id="fcP">← 上一张</button><span id="fcI">'+(ci+1)+' / '+u.cards.length+'</span><button id="fcN">下一张 →</button></div>';
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
    else if(tab==="boss"){ if(u.boss&&u.boss.q){ startQuiz(p,[u.boss],"Boss挑战",u,grade,false,u.boss.reward); } else { p.innerHTML='<div class="panel">本单元暂未开放 Boss 挑战，先去闯关练手 👊</div>'; } }
    else if(tab==="rand"){ var pool=(u.challenge||[]).concat(u.test||[]); if(!pool.length){p.innerHTML='<div class="panel">题目整理中，进群抢先获取 👇</div>';return;} startQuiz(p,pool,"随机组卷",u,grade,true); }
    else if(tab==="test"){ startQuiz(p,u.test,"测试卷",u,grade,false); }
  }

  /* 答题引擎（支持 choice / judge / blank；填空容错；Boss徽章） */
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
      if(right){ correct++;combo++; if(combo>maxCombo)maxCombo=combo;
        if(btn)btn.classList.add("correct"); else{var i=panel.querySelector(".quiz-input");if(i)i.style.borderColor="var(--ok)";}
        fb.className="quiz-feedback good";
        fb.innerHTML=combo>=3?"🔥 连击 ×"+combo+"！手感来了":"🎉 答对啦！"+(q.a?("<br>"+fmt(q.a)):"");
        if(combo>=5)confetti();
        if(maxCombo>state.bestCombo){ state.bestCombo=maxCombo; save(); showToast("🔥 新纪录！最长连击 "+maxCombo); }
        popCombo();
      } else { combo=0;
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
      var rec=state.units[u.id]||{stars:0,best:0}, before=rankOf(totalStars()-stars), after=rankOf(totalStars());
      rec.stars=Math.max(rec.stars,stars); rec.best=Math.max(rec.best||0,rate); state.units[u.id]=rec;
      var rankUp=after>before||(rate===100); save();
      if(rankUp){ confetti(); showRank(after); }
      var tag=rate===100?"· 全对！太稳了":rate>=60?"· 不错，继续冲":"· 再练练就通";
      var rEmoji=rate===100?"🏆":rate>=60?"😎":"🌱";
      var extra="";
      if(badge){ extra = rate===100
        ? '<div class="r-boss">🏆 击败 Boss！<br>获得记忆徽章：'+fmt(badge)+'</div>'
        : '<div class="r-boss miss">还差一点，再战一次就能拿下徽章 👊</div>'; }
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
