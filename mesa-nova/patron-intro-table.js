/* Queue the introduction before opening-card animations, once per match in this tab. */
let patronIntroActive=false,patronIntroKey=null,patronIntroController=null;
function cancelPatronIntro(){patronIntroController?.abort();patronIntroController=null;patronIntroActive=false;patronIntroKey=null;globalThis.RunaContractOpening?.cancel();RunaPatronIntro.cancel();document.body.classList.remove('patron-intro-active');}
function schedulePatronIntro(){
 if(patronIntroActive&&state?.phase!=='mulligan'){cancelPatronIntro();return;}
 if(state?.phase!=='mulligan'||!state.matchId||state.players.length!==2)return;
 const key=[state.code,state.matchId].join(':'),storageKey='runamarca-intro:'+key;
 if(patronIntroKey===key)return;try{if(sessionStorage.getItem(storageKey))return;}catch{}
 patronIntroKey=key;patronIntroActive=true;patronIntroController=new AbortController();const controller=patronIntroController,generation=visualGeneration;
 try{sessionStorage.setItem(storageKey,'seen');}catch{}
 document.body.classList.add('patron-intro-active');
 const players=state.players.map(p=>({id:p.id,name:p.name,patron:{...p.patron}})),firstId=state.first,selfId=seat()?.id,capture=globalThis.RunaDeckCarousel?.takeCapture();
 visualQueue=visualQueue.catch(()=>{}).then(async()=>{
  if(generation!==visualGeneration||controller.signal.aborted)return;
  try{
   const options={players,firstId,selfId,matchKey:key,base:gameBase,getAudioContext:()=>audioContext,signal:controller.signal,getHome:id=>$(id===seat()?.id?'self-head':'opponent-head')?.querySelector('.patron-card')};
   let dialogue=null;const beginDialogue=()=>{if(!controller.signal.aborted)dialogue??=RunaPatronIntro.play(options);};
   await globalThis.RunaContractOpening?.play({...options,capture,onReveal:beginDialogue});
   beginDialogue();await dialogue;
  }
  catch(error){console.error('Apresentação dos Patronos:',error);}
  finally{if(patronIntroController===controller){patronIntroController=null;patronIntroActive=false;document.body.classList.remove('patron-intro-active');if(generation===visualGeneration)render();}}
 });
}
