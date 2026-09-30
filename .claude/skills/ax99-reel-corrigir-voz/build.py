import numpy as np, soundfile as sf
from scipy import signal
import bedsm as bs
x,sr=bs.x,bs.sr; out=x.copy()
SR=24000
slots={"R1":(7.02,9.25),"R2":(104.00,104.66),"R3":(133.35,134.92),"R4":(135.70,137.45)}
x24=signal.resample_poly(x.mean(1),1,2); sos=signal.butter(4,80,btype='high',fs=SR,output='sos'); x24=signal.sosfilt(sos,x24)
def ract(seg):
    return 20*np.log10(np.sqrt(np.mean(seg[np.abs(seg)>0.02]**2))+1e-9)
from scipy.ndimage import minimum_filter1d, uniform_filter1d
def comp(y,sr,thr_db=-22,ratio=4,att=0.003,rel=0.08):
    a=np.exp(-1/(att*sr)); r=np.exp(-1/(rel*sr)); env=np.zeros(len(y)); e=0
    ab=np.abs(y)
    for i in range(len(y)):
        c=a if ab[i]>e else r; e=c*e+(1-c)*ab[i]; env[i]=e
    d=20*np.log10(env+1e-9); red=np.where(d>thr_db,(thr_db-d)*(1-1/ratio),0)
    return y*10**(red/20)
def limit(y,sr,ceil=0.78,look=0.003):
    n=int(look*sr); g=np.minimum(1,ceil/(np.abs(y)+1e-9)); g=minimum_filter1d(g,2*n+1); g=uniform_filter1d(g,2*n+1); return y*g
FP=np.load('floor_p.npy'); FF2=np.load('floor_f2.npy'); rng=np.random.default_rng(7)
def hiss(n,c):
    w=rng.standard_normal(n+4096); W=np.fft.rfft(w); fr=np.fft.rfftfreq(len(w),1/sr)
    amp=np.sqrt(np.interp(fr,FF2,FP[c])); amp[fr<1500]=0
    z=np.fft.irfft(W*amp*np.sqrt(len(w)/(sr/len(w)))*0.1637*2.0,len(w))
    return z[2048:2048+n]
M=0.04; XF=int(0.015*sr)
rep={}
for k,(a,b) in slots.items():
    r=k.lower()
    y,s=sf.read(f'chunks/{r}.wav'); y=signal.sosfilt(sos,y)
    h=240; db=np.array([20*np.log10(np.sqrt(np.mean(y[i:i+h]**2))+1e-9) for i in range(0,len(y)-h,h)])
    on=np.where(db>db.max()-30)[0]; o=on[0]*.01; e=(on[-1]+1)*.01
    gv1=ract(x24[int(a*SR):int(b*SR)])
    yseg=y[int(o*SR):int(e*SR)]; g=10**((gv1-ract(yseg))/20)
    y48=signal.resample_poly(y,2,1); y48=comp(y48,sr)
    g=10**((gv1-ract(signal.resample_poly(y48,1,2)[int(o*SR):int(e*SR)]))/20); y48=limit(y48*g,sr)
    h0=a-M; h1=b+M
    i0=int(h0*sr); i1=int(h1*sr)
    # new voice placed so that speech onset at a; include 40ms pre and 120ms post of chunk
    pre=M; post=0.12
    seg=y48[int((o-pre)*sr):int((e+post)*sr)]
    v=np.zeros(i1-i0); st=int((a-pre)*sr)-i0
    L=min(len(seg),len(v)-st); v[st:st+L]=seg[:L]
    # fade-in/out of voice (20ms) to avoid clicks
    fi=int(0.02*sr); w=np.ones(len(seg)); w[:fi]=np.linspace(0,1,fi); w[-fi:]=np.linspace(1,0,fi)
    v[st:st+L]*=w[:L]
    # crossfade weight
    wt=np.ones(i1-i0); wt[:XF]=np.linspace(0,1,XF); wt[-XF:]=np.linspace(1,0,XF)
    for c in (0,1):
        ii0,C=bs.solve(c,h0-6,h1+6,hold=[(h0-0.025,h1+0.025)])
        bed=bs.synth(c,ii0,C,i0,i1)
        hz_=hiss(i1-i0,c); new=bed+v+hz_
        out[i0:i1,c]=x[i0:i1,c]*(1-wt)+new*wt
    print(k,'gain %.1f dB'%(20*np.log10(g)),'chunk speech %.2f-%.2f (%.2fs) slot %.2fs'%(o,e,e-o,b-a), 'v1 act %.1f'%gv1)
sf.write('v2_stereo.wav',out.astype(np.float32),sr,subtype='FLOAT')
print('max',np.abs(out).max(),'changed samples',int((np.abs(out-x).max(1)>0).sum()))
