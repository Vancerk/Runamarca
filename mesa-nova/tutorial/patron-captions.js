(function(root){
 const active=new Set();
 function create(getAnchor){
  let node=null,frame=0,lastText='';
  const close=()=>{cancelAnimationFrame(frame);node?.remove();node=null;lastText='';active.delete(close);};
  function position(){
   if(!node)return;const anchor=getAnchor();
   if(anchor?.isConnected){const r=anchor.getBoundingClientRect(),w=node.offsetWidth,h=node.offsetHeight,below=r.top<innerHeight/2;
    node.classList.toggle('below',below);
    node.style.left=Math.max(12,Math.min(innerWidth-w-12,r.left+r.width/2-w/2))+'px';
    node.style.top=Math.max(12,Math.min(innerHeight-h-12,below?r.bottom+15:r.top-h-15))+'px';
   }
   frame=requestAnimationFrame(position);
  }
  return text=>{
   if(!text){close();return;}if(text===lastText)return;lastText=text;
   if(!node){node=document.createElement('div');node.className='patron-power-caption';node.setAttribute('role','status');node.setAttribute('aria-live','polite');document.body.append(node);active.add(close);position();}
   node.textContent=text;node.animate([{opacity:0,translate:'0 5px'},{opacity:1,translate:'0 0'}],{duration:160,easing:'ease-out'});
  };
 }
 root.RunaPatronCaptions={create,clear(){for(const close of [...active])close();}};
 root.addEventListener('pagehide',()=>root.RunaPatronCaptions.clear());
})(globalThis);
