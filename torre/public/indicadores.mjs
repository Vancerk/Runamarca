export const readStamp=r=>`${r.version||1}:${r.adminEditedAt||r.decisionAt||r.createdAt||''}`;
export function zoneIndicators(hex,reports,read={}){
 const current=[...new Map(reports.filter(r=>r.hex===hex&&!r.archived).map(r=>[r.id,r])).values()];
 const approved=current.filter(r=>r.status==='approved');
 return {total:approved.length,unread:approved.filter(r=>read[r.id]!==readStamp(r)).length,pending:current.filter(r=>['pending','sending'].includes(r.status)).length};
}
