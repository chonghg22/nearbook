"""Create Nearbook code-drawn social layouts and a captioned silent reel.
Optional local build tools: Pillow, imageio-ffmpeg. No product/runtime dependency.
Use only an approved public product screenshot; never a personal/account screen.
"""
from pathlib import Path
import argparse, json, subprocess
from PIL import Image, ImageDraw, ImageFont

PAPER = '#F6F7ED'
INK = '#182C26'
GREEN = '#246750'
MUTED = '#61756B'
LIGHT = '#E2EBD6'
FONT = '/System/Library/Fonts/AppleSDGothicNeo.ttc'

def font(size, bold=False):
    return ImageFont.truetype(FONT, size=size, index=6 if bold else 4)

def text(draw, xy, lines, size=62, color=INK, bold=True, gap=1.28):
    for i, line in enumerate(lines.split('\n')):
        draw.text((xy[0], xy[1] + i * size * gap), line, font=font(size, bold), fill=color)

def book_icon(draw, x, y, scale=1):
    for off, h, color in [(0, 155, GREEN), (76, 200, '#D9AF6D'), (152, 175, '#6C967D')]:
        draw.rounded_rectangle((x + off*scale, y + (200-h)*scale, x + (off+61)*scale, y + 200*scale), radius=7*scale, fill=color)
        draw.line((x+(off+9)*scale,y+(204-h)*scale,x+(off+9)*scale,y+195*scale), fill='#FFFFFF55',width=max(1,round(4*scale)))

def base(size, n, total, reel=False):
    im=Image.new('RGB',size,PAPER); d=ImageDraw.Draw(im)
    top=175 if reel else 85
    text(d,(76,top),'우리동네책',36,GREEN)
    text(d,(size[0]-170,top+8),f'{n:02d} / {total:02d}',22,MUTED,False)
    d.rectangle((0,size[1]-12,size[0],size[1]),fill=GREEN)
    return im,d

def search_box(d,y,width=928):
    d.rounded_rectangle((76,y,76+width,y+140),radius=38,fill='white',outline='#C9D8CB',width=3)
    text(d,(115,y+42),'읽고 싶은 책',38,MUTED,False)
    d.ellipse((875,y+30,957,y+112),fill=GREEN)
    d.ellipse((900,y+51,925,y+76),outline='white',width=4)
    d.line((922,y+75,935,y+88),fill='white',width=4)

def phone(im,screenshot,box):
    x,y,w,h=box
    ImageDraw.Draw(im).rounded_rectangle((x-12,y-12,x+w+12,y+h+12),radius=40,fill='#D3DED0')
    crop=screenshot.crop((0,0,screenshot.width,min(screenshot.height,700)))
    crop=crop.resize((w,round(crop.height*w/crop.width)),Image.Resampling.LANCZOS)
    crop=crop.crop((0,0,w,h))
    mask=Image.new('L',(w,h));ImageDraw.Draw(mask).rounded_rectangle((0,0,w,h),radius=30,fill=255)
    im.paste(crop,(x,y),mask)

def scene(n,screenshot,reel=False):
    size=(1080,1920) if reel else (1080,1350)
    im,d=base(size,n,5,reel); y=295 if reel else 250
    if n==1:
        text(d,(76,y),'읽고 싶은 그 책,\n동네 도서관에\n있을까?',76 if reel else 78)
        d.ellipse((650,y+385,1010,y+745),fill=LIGHT)
        book_icon(d,725,y+472,1.05)
        text(d,(76,y+760 if reel else 940),'책 검색부터 도서관 정보까지',33,MUTED,False)
    elif n==2:
        text(d,(76,y),'제목·저자·ISBN으로\n검색부터 간단하게.',68)
        search_box(d,y+260)
        text(d,(84,y+470),'01  읽고 싶은 책 검색\n02  책 상세에서 소장 정보 확인\n03  도서관 공식 사이트로 이동',36,INK,False,gap=1.9)
        text(d,(84,y+790),'이용 흐름 안내',24,MUTED,False)
    elif n==3:
        text(d,(76,y),'동네 도서관도\n한곳에서 찾아요.',70)
        phone(im,screenshot,(285,y+250,510,780 if reel else 675))
    elif n==4:
        text(d,(76,y),'대출·예약 전에는\n공식 사이트에서\n최종 확인해 주세요.',66)
        d.rounded_rectangle((76,y+365,1004,y+650),radius=34,fill=LIGHT)
        text(d,(112,y+409),'조회되지 않은 정보는\n‘확인 불가’로 안내해요.\n실시간 상태를 보장하지 않아요.',36,INK,False,gap=1.65)
    else:
        text(d,(76,y),'내가 읽고 싶은 책,\n지금 찾아보세요.',72)
        d.rounded_rectangle((76,y+300,1004,y+465),radius=40,fill=GREEN)
        text(d,(112,y+352),'프로필 링크 → 우리동네책',43,'white')
        text(d,(80,y+550),'@jack.made.tools',41,GREEN)
        text(d,(80,y+630),'www.near-book.com',31,MUTED,False)
        text(d,(80,y+730),'검색·도서관 정보 오류나\n헷갈리는 화면을 알려주세요.',34,INK,False,gap=1.6)
    if not reel:
        text(d,(76,1210),'@jack.made.tools  ·  직접 만들고 개선하는 서비스',23,MUTED,False)
    return im

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--screenshot',required=True);p.add_argument('--ffmpeg');args=p.parse_args()
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    screenshot=Image.open(args.screenshot).convert('RGB')
    for n in range(1,6): scene(n,screenshot).save(out/f'feed-{n:02}.png')
    reel_scenes=[scene(n,screenshot,True) for n in range(1,6)]
    reel_scenes[0].save(out/'reel-cover.png')
    # A contact sheet supports visual QA without reviewing hundreds of frames.
    sheet=Image.new('RGB',(1080,384),PAPER)
    for i,im in enumerate(reel_scenes):sheet.paste(im.resize((216,384)),(216*i,0))
    sheet.save(out/'reel-contact-sheet.png')
    if not args.ffmpeg:
        import imageio_ffmpeg
        args.ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    cmd=[args.ffmpeg,'-y','-f','rawvideo','-pix_fmt','rgb24','-s','1080x1920','-r','30','-i','pipe:0','-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-t','20','-movflags','+faststart',str(out/'nearbook-reel-20s.mp4')]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    # Gentle 1.5% motion within each four-second card, with short dissolves.
    try:
        for frame in range(600):
            i=min(frame//120,4);local=frame%120
            image=reel_scenes[i]
            zoom=1+0.015*local/119
            w,h=round(1080*zoom),round(1920*zoom)
            zoomed=image.resize((w,h),Image.Resampling.BICUBIC)
            image=zoomed.crop(((w-1080)//2,(h-1920)//2,(w+1080)//2,(h+1920)//2))
            if i>0 and local<10:image=Image.blend(reel_scenes[i-1],image,local/10)
            proc.stdin.write(image.tobytes())
    finally:proc.stdin.close()
    error=proc.stderr.read().decode();code=proc.wait()
    (out/'encode.log').write_text(error)
    if code:raise RuntimeError(f'ffmpeg exited {code}')
    # Keep the source screenshot traceable; it contains public product data only.
    metadata={'account':'jack.made.tools','video':{'width':1080,'height':1920,'fps':30,'seconds':20,'audio':'AAC silence; no licensed music'},'feed':{'count':5,'width':1080,'height':1350},'screenshot':'Nearbook public region page captured 2026-10-20; real UI, no logged-in data','publication':'not published','budget_krw':0}
    (out/'media-manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(metadata,ensure_ascii=False))
if __name__=='__main__':main()
