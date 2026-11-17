// Claude review round 3 (owner): no text selection and no native text/image dragging anywhere in the game. A fast card
// drag used to start a text selection (blue highlight) and drag the selected text along with the card. Card dragging uses
// pointer events (app.js), so the native drag of text and images is never needed. Editable fields keep working.
(function(){
 const editable=t=>Boolean(t&&t.closest&&t.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'));
 document.addEventListener('selectstart',e=>{if(!editable(e.target))e.preventDefault();},true);
 document.addEventListener('dragstart',e=>{if(!editable(e.target))e.preventDefault();},true);
 // A selection that somehow exists (e.g. triple click before this ran) is dropped as soon as a card/table press starts.
 document.addEventListener('pointerdown',e=>{if(editable(e.target))return;const s=getSelection?.();if(s&&s.rangeCount&&!editable(s.anchorNode?.parentElement))s.removeAllRanges();},true);
})();
