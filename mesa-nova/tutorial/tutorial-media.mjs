import fs from 'node:fs';

// Call only after the preview has resolved and validated the allowed file path.
// Native media seeks require byte ranges; replying 200 to every range request
// made Chromium restart an MP3 at zero whenever the player corrected its clock.
export function sendTutorialFile(req,res,file,contentType){
 const size=fs.statSync(file).size;
 const headers={'Content-Type':contentType,'Content-Length':size,'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 let start=0,end=size-1,status=200;
 if(req.method==='GET'&&req.headers.range&&!req.headers['if-range']){
  const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  let valid=Boolean(match&&(match[1]||match[2])&&size>0);
  if(valid){
   if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;}
   else{const suffix=Number(match[2]);valid=Number.isSafeInteger(suffix)&&suffix>0;start=Math.max(0,size-suffix);}
   valid=valid&&Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<size&&end>=start;
  }
  if(!valid){res.writeHead(416,{...headers,'Content-Range':`bytes */${size}`,'Content-Length':0});return res.end();}
  status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;headers['Content-Length']=end-start+1;
 }
 res.writeHead(status,headers);
 if(req.method==='HEAD'||!size)return res.end();
 const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.once('close',()=>stream.destroy());stream.pipe(res);
}
