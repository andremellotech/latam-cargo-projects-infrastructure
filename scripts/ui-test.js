const fs=require('fs'),vm=require('vm'),path=require('path');process.chdir(path.join(__dirname,'..'));
const html=fs.readFileSync('index.html','utf8');
const ids=[...html.matchAll(/id="([\w-]+)"/g)].map(m=>m[1]);
function el(id){return{id,innerHTML:'',textContent:'',value:'',dataset:{},_l:{},classList:{toggle(){},add(){},remove(){},contains(){return false}},setAttribute(){},removeAttribute(){},addEventListener(t,f){(this._l[t]=this._l[t]||[]).push(f)},focus(){},matches(){return false},closest(){return null}}}
const els={};ids.forEach(i=>els[i]=el(i));
const navs=[...html.matchAll(/data-view="(\w+)"/g)].map(m=>{const e=el('nav');e.dataset={view:m[1]};return e});
let readyCb;const body=el('body');body.classList={_s:new Set(),toggle(c,f){f?this._s.add(c):this._s.delete(c)},contains(c){return this._s.has(c)}};
const doc={getElementById:i=>els[i]||null,querySelectorAll:s=>s==='.nav-item'?navs:[],querySelector:()=>null,body,addEventListener:(t,f)=>{if(t==='DOMContentLoaded')readyCb=f},title:''};
const ctx={document:doc,window:null,history:{replaceState(){}},location:{hash:''},localStorage:{getItem:()=>null,setItem(){}},matchMedia:()=>({matches:false}),
 fetch:async p=>{try{const t=fs.readFileSync(p,'utf8');return{ok:true,json:async()=>JSON.parse(t)}}catch(e){return{ok:false,status:404,json:async()=>null}}},console,Intl,Set,Promise,Object,Number,Math,Array,String,JSON};
ctx.window=ctx;ctx.window.addEventListener=()=>{};ctx.window.scrollTo=()=>{};vm.createContext(ctx);
for(const f of['js/core.js','js/views.js','js/app.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
(async()=>{
 await readyCb(); await new Promise(r=>setTimeout(r,50));
 const c=els.appContent; let fails=0; const chk=(c_,m)=>{if(!c_){fails++;console.error('FALHA:',m)}};
 chk(c.innerHTML.includes('Ranking'),'overview nao renderizou'); const cfgDate=JSON.parse(fs.readFileSync('data/config.json','utf8')).dataUpdated.split('-').reverse().join('/'); chk(els.dataUpdated.textContent===cfgDate,'data de atualizacao: '+els.dataUpdated.textContent);
 chk(els.countryFilter.innerHTML.includes('Chile'),'filtro de pais');
 // navegar
 navs.find(n=>n.dataset.view==='network')._l.click[0](); chk(c.innerHTML.includes('<svg'),'mapa nao renderizou'); chk(els.pageTitle.textContent==='Mapa de atuação','titulo');
 const click=c._l.click[0];
 const mk=(attr,val,extra={})=>({target:{closest:s=>s===`[${attr}]`?{dataset:{[attr.replace('data-','').replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]:val,...extra}}:null}});
 click(mk('data-layer','fresh')); chk(c.innerHTML.includes('aria-pressed="true"'),'camada nao ativada'); chk(!/data-loc="GRU" tabindex/.test(c.innerHTML)||/pin dim/.test(c.innerHTML),'filtro de camada');
 click(mk('data-loc','SCL')); chk(c.innerHTML.includes('SCL · Santiago'),'selecao de localidade');
 click({target:{closest:s=>s==='[data-reset-layers]'?{dataset:{}}:null}}); chk(!c.innerHTML.includes('aria-pressed="true"'),'reset de camadas');
 // slider
 c._l.input[0]({target:{dataset:{minscore:'1'},value:'90'}}); c._l.change[0]({target:{dataset:{minscore:'1'}}}); chk(/Ranking e camadas \(\d+ de 7\)/.test(c.innerHTML),'score minimo'); const m=c.innerHTML.match(/Ranking e camadas \((\d+) de/); chk(Number(m[1])===3,'score>=90 deve ter 3 localidades (MIA,GRU,SCL): '+m[1]);
 // calculadora
 navs.find(n=>n.dataset.view==='business')._l.click[0](); chk(c.innerHTML.includes('calc-results'),'calculadora');
 els['calc-results']=el('calc-results'); c._l.input[0]({target:{dataset:{calc:'capex'},value:'20000000'}}); chk(els['calc-results'].innerHTML.includes('VPL'),'recalculo');
 c._l.input[0]({target:{dataset:{calc:'years'},value:'abc'}}); chk(!/NaN|undefined/.test(els['calc-results'].innerHTML),'entrada invalida gera NaN');
 for(const n of navs){n._l.click[0](); chk(c.innerHTML.length>200,'tela vazia '+n.dataset.view)}
 // tema / tv
 els.themeToggle._l.click[0](); els.tvMode._l.click[0](); chk(els.tvMode.textContent==='Sair do modo TV','modo TV');
 console.log(fails?fails+' falha(s)':'OK: integração app.js (navegação, camadas, seleção, slider, calculadora, tema, TV)');process.exit(fails?1:0)})().catch(e=>{console.error('ERRO',e);process.exit(1)});
