from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import json, math
root=Path('prototype-qa/hybrid-5');rows=[]
for model in ['creature','spell','equipment']:
    ref=Image.open(root/f'quality-{model}-2-native.png').convert('RGB').resize((108,152),Image.Resampling.LANCZOS).crop((9,8,99,140))
    for mode in ['native','sample1','sample2','sample4']:
        image=Image.open(root/f'quality-{model}-1-{mode}.png').convert('RGB').crop((9,8,99,140))
        stat=ImageStat.Stat(ImageChops.difference(image,ref));mse=sum(v*v for v in stat.rms)/3
        rows.append({'model':model,'mode':mode,'mse':mse,'psnr':10*math.log10(255*255/mse)})
means={mode:sum(r['mse'] for r in rows if r['mode']==mode)/3 for mode in ['native','sample1','sample2','sample4']}
result={'reference':'Native complete face at DPR 2, Lanczos downsample to 108x152; inner face ROI 9,8..99,140. Same original bitmap and layout. A controlled raster consistency proxy, not proof of more source detail or universal subjective sharpness.','rows':rows,'meanMse':means,'best':min(means,key=means.get)}
(root/'quality-metrics.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
