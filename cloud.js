/* 모아 플래너: Supabase를 이용한 개인 클라우드 동기화 */
(() => {
'use strict';
const KEY='moa-cloud-connection-v1', DATA='moa-planner-state-v1';
const URL='https://oqcqezzsxfkldxybiuzp.supabase.co';
let config={};try{config=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
let sb, user=null, poll=null, pushTimer=null, initJob=null, updated='', dirty=false, busy=false, paused=false;
function msg(s){const e=document.querySelector('#cloudStatus');if(e)e.textContent=s}
const oauthError=(()=>{
 const q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.replace(/^#/,''));
 const e=q.get('error_description')||h.get('error_description')||q.get('error')||h.get('error');
 return e?String(e).slice(0,220):'';
})();
function alertBar(s){const e=document.querySelector('#toast');if(!e)return alert(s);e.textContent=s;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3500)}
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getLocal(){try{return JSON.parse(localStorage.getItem(DATA)||'null')}catch{return null}}
function hasData(d){return !!(d&&(d.goals?.length||d.tasks?.length||d.events?.length||Object.keys(d.weights||{}).length||Object.keys(d.weeklyWeights||{}).length||Object.keys(d.memo||{}).length))}
function apply(d){if(!d||!Array.isArray(d.categories)||!Array.isArray(d.goals)||!Array.isArray(d.tasks)||!Array.isArray(d.events))throw Error('플래너 데이터 형식 오류');if(!window.MoaApplyCloud)throw Error('플래너 화면이 준비되지 않았어요');window.MoaApplyCloud(d)}
async function read(){const {data,error}=await sb.from('planner_states').select('state,updated_at').eq('user_id',user.id).maybeSingle();if(error)throw error;return data}
async function push(){
 if(!sb||!user||paused)return;
 if(busy||!navigator.onLine){dirty=true;return}
 busy=true;dirty=false;msg('☁ 저장 중...');
 try{const state=getLocal();if(!state)throw Error('기기 데이터가 없어요');const {data,error}=await sb.from('planner_states').upsert({user_id:user.id,state},{onConflict:'user_id'}).select('updated_at').single();if(error)throw error;updated=data.updated_at;msg('☁ 동기화됨')}
 catch(e){dirty=true;msg('⚠ 클라우드 저장 실패 · 기기에는 저장됨');console.warn(e)}
 finally{busy=false;if(dirty&&navigator.onLine){clearTimeout(pushTimer);pushTimer=setTimeout(push,5000)}}
}
function changed(){if(!user||paused)return;dirty=true;clearTimeout(pushTimer);pushTimer=setTimeout(push,1200);msg('☁ 저장 대기 중')}
async function pull(){
 if(!user||!sb||paused||dirty||busy||document.hidden)return;
 try{const r=await read();if(dirty||busy||paused||!user)return;if(r&&r.updated_at!==updated){apply(r.state);updated=r.updated_at;msg('☁ 다른 기기 변경 반영')}}
 catch(e){msg('⚠ 동기화 확인 실패');console.warn(e)}
}
function stop(){clearInterval(poll);clearTimeout(pushTimer);poll=null;document.removeEventListener('visibilitychange',onVisible)}
function onVisible(){if(!document.hidden)pull()}
async function init(){
 if(!user)return;
 stop();paused=false;const id=user.id;msg('☁ 기록 확인 중...');
 try{
   const r=await read();if(!user||id!==user.id)return;
   const local=getLocal();
   if(r){
     updated=r.updated_at;
     if(JSON.stringify(r.state)!==JSON.stringify(local)){
       if(hasData(local)){
         const choice=prompt('기기 기록과 클라우드 기록이 다릅니다.\n\n1: 클라우드 → 이 기기로 가져오기\n2: 이 기기 → 클라우드에 올리기\n취소: 보류 (아무 기록도 변경하지 않음)\n\n먼저 JSON 백업을 권장해요.','1');
         if(choice==='1')apply(r.state);
         else if(choice==='2')await push();
         else{paused=true;msg('⚠ 동기화 보류 · 기록 유지');return}
       }else apply(r.state);
     }
   }else if(hasData(local)){
     if(confirm('클라우드는 비어 있어요. 이 기기의 기록을 업로드할까요?\n\n업로드 전 JSON 백업을 권장합니다.'))await push();
     else{paused=true;msg('⚠ 동기화 보류 · 기록 유지');return}
   }
   if(!dirty)msg('☁ 동기화됨');
   poll=setInterval(pull,15000);document.addEventListener('visibilitychange',onVisible);
 }catch(e){paused=true;msg('⚠ 동기화 시작 실패');alertBar(e.message)}
}
function start(){if(initJob)return;initJob=Promise.resolve().then(init).finally(()=>{initJob=null})}
async function connect(){
 if(!config.key){msg('연결 설정 필요');return}
 try{
   msg('클라우드 연결 중...');
   const mod=await import('https://esm.sh/@supabase/supabase-js@2.49.10');
   sb=mod.createClient(URL,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   sb.auth.onAuthStateChange((_event,session)=>{
     const next=session?.user||null;
     if(next?.id===user?.id)return;
     stop();user=next;updated='';dirty=false;paused=false;
     if(user){msg('☁ 로그인 확인 · 기록 불러오는 중...');start()}
     else msg(oauthError?'⚠ 로그인 오류: '+oauthError:'로그인 필요');
   });
   const {data,error}=await sb.auth.getSession();if(error)throw error;
   if(data.session?.user){
     if(!user){user=data.session.user;start()}
   }else if(!user)msg(oauthError?'⚠ 로그인 오류: '+oauthError:'로그인 필요');
 }catch(e){msg('⚠ 연결 오류');alertBar('Supabase 연결 실패: '+e.message)}
}
async function login(){
 if(!sb)return alertBar('연결 설정에서 Publishable 키를 먼저 저장하세요');
 msg('구글 로그인 페이지로 이동 중...');
 try{
   const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});
   if(error){msg('⚠ 로그인 요청 실패');alertBar(error.message)}
 }catch(e){msg('⚠ 로그인 요청 실패');alertBar(e.message)}
}
async function logout(){stop();if(sb)await sb.auth.signOut();user=null;msg('로그인 필요');alertBar('로그아웃했어요. 이 기기의 기록은 남아요')}
function setup(){
 const side=document.querySelector('.side');if(!side)return;
 const box=document.createElement('section');box.id='moaCloud';box.style.cssText='background:#1e2d47;color:white;border-radius:11px;padding:12px;font-size:12px;margin-bottom:10px';
 box.innerHTML='<b>☁ 클라우드 동기화</b><div id="cloudStatus" role="status" style="margin:8px 0;color:#b4cadf">확인 중...</div>'+
 '<details><summary style="cursor:pointer">연결 설정</summary><div style="margin-top:7px;overflow-wrap:anywhere;color:#b4cadf">'+esc(URL)+'</div>'+
 '<label style="display:block;margin-top:8px">Supabase Publishable / anon 키<input id="cloudKey" type="text" autocomplete="off" placeholder="sb_publishable_..." value="'+esc(config.key)+'" style="display:block;width:100%;border:0;border-radius:7px;padding:8px;margin-top:4px"></label>'+
 '<button id="cloudSave">연결 저장</button></details><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">'+
 '<button id="cloudLogin">구글 로그인</button><button id="cloudRefresh">동기화 확인</button><button id="cloudLogout">로그아웃</button></div>'+
 '<p style="color:#a2b6d0;font-size:11px;margin:9px 0 0">처음 연결할 땐 기록을 백업하세요. 기기마다 키 입력은 한 번 필요해요.</p>';
 side.appendChild(box);
 box.querySelectorAll('button').forEach(x=>x.style.cssText='border:1px solid #c5d4e7;border-radius:7px;padding:7px;background:#edf4fa;color:#1f3552;font-size:12px;cursor:pointer');
 box.querySelector('#cloudSave').onclick=()=>{const key=box.querySelector('#cloudKey').value.trim();if(!/^(sb_publishable_|eyJ)/.test(key))return alertBar('Supabase 공개 키를 입력해 주세요');localStorage.setItem(KEY,JSON.stringify({url:URL,key}));location.reload()};
 box.querySelector('#cloudLogin').onclick=login;
 box.querySelector('#cloudLogout').onclick=logout;
 box.querySelector('#cloudRefresh').onclick=()=>paused?start():pull();
}
window.MoaCloud={changed};
window.addEventListener('DOMContentLoaded',()=>{setup();connect()});
window.addEventListener('online',()=>{if(dirty)push();else pull()});
})();