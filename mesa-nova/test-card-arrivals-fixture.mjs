import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./card-arrivals.js',import.meta.url),'utf8');
export function installArrivals(context){
 vm.runInContext(source,context);
 for(const uid of context.pendingArrival||[])context.RunaCardArrivals.reserve(uid);
 delete context.pendingArrival;
 return context.RunaCardArrivals;
}
