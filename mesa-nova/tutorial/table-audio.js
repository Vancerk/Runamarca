/* Effects use the documented Epidemic Sound catalog exclusively. */
(function(root){
 function play(context,kind,options={}){return root.RunaSfx?.play(context,kind,options)??false;}
 root.RunaTableAudio={hammer:(context,options)=>play(context,'hammer',options),turn:(context,options)=>play(context,'turn',options),effect:play};
})(globalThis);
