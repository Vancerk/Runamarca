// Bounded short-lived reads; mutations bypass this cache. Concurrent reads share a query.
export function createReadCache({ttl=10000,max=1000,now=Date.now}={}){
 const entries=new Map();
 return {
  clear(){entries.clear();},delete(key){entries.delete(key);},
  async get(key,load){const old=entries.get(key);if(old&&old.until>now())return old.promise;if(entries.size>=max){for(const [k,v] of entries)if(v.until<=now())entries.delete(k);if(entries.size>=max)entries.delete(entries.keys().next().value);}
   const entry={until:now()+ttl};entry.promise=Promise.resolve().then(load);entries.set(key,entry);
   try{const result=await entry.promise;if(result?.session_expires_at)entry.until=Math.min(entry.until,new Date(result.session_expires_at).getTime());return result;}catch(error){if(entries.get(key)===entry)entries.delete(key);throw error;}
  }
 };
}
