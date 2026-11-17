// Only the tutorial page is a supported return target; never echo an arbitrary URL.
export function tutorialAccessReturn(value,base=''){
 if(typeof value!=='string'||value.length>2048||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return null;
 let target;try{target=new URL(value,'https://runamarca.invalid');}catch{return null;}
 const prefix=base+'/tutorial/';
 if(target.origin!=='https://runamarca.invalid'||![prefix,prefix.slice(0,-1),prefix+'index.html'].includes(target.pathname))return null;
 const room=target.searchParams.get('room');
 return prefix+(/^[a-z0-9]{6}$/i.test(room||'')?'?room='+room.toUpperCase():'');
}
