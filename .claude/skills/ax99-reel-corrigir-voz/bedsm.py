import numpy as np, soundfile as sf, json
import scipy.sparse as sp
from scipy.sparse.linalg import spsolve
from scipy import signal
x, sr = sf.read('v1_stereo.wav'); n=len(x)
F={int(k):v for k,v in json.load(open('bed_freqs.json')).items()}
B=int(0.05*sr)                                   # 50 ms blocks
hp=signal.butter(4,700,btype='high',fs=sr,output='sos')
H=[signal.sosfilt(hp,x[:,c]) for c in (0,1)]     # voice-band proxy
def basis(freqs,i0,i1):
    tt=np.arange(i0,i1)/sr; cols=[]
    for f in freqs: cols += [np.cos(2*np.pi*f*tt), np.sin(2*np.pi*f*tt)]
    return np.stack(cols,1)
def solve(c, a, b, q=4e-4, hold=None, s0=0.004, kappa=1.5):
    """smooth coefficients for channel c over [a,b) seconds. hold: list of (ha,hb) seconds with zero weight."""
    i0=int(a*sr)//B*B; i1=int(b*sr)//B*B; nb=(i1-i0)//B; k=2*len(F[c])
    diag=[]; rhs=np.zeros(nb*k); rows=[];cols=[];vals=[]
    Ab=[]
    for j in range(nb):
        s=i0+j*B; e=s+B
        A=basis(F[c],s,e); y=x[s:e,c]
        hb=H[c][s:e].std()
        sig=s0+kappa*hb; wgt=1.0/sig**2
        if hold is not None:
            tc=(s+B/2)/sr
            if any(h0<=tc<=h1 for h0,h1 in hold): wgt=0.0
        M=wgt*(A.T@A); r=wgt*(A.T@y)
        rhs[j*k:(j+1)*k]=r
        Ab.append(M)
    lam=1.0/q**2
    D=sp.block_diag(Ab,format='csr')
    Lp=sp.diags([np.r_[1,2*np.ones(nb-2),1],-np.ones(nb-1),-np.ones(nb-1)],[0,1,-1],shape=(nb,nb))
    L=sp.kron(Lp,sp.identity(k),format='csr')*lam
    reg=1e-3*sp.identity(nb*k)*lam*0.01
    C=spsolve((D+L+reg).tocsc(),rhs).reshape(nb,k)
    return i0,C
def synth(c,i0,C,s,e):
    """full-rate bed for samples [s,e) using linear interpolation of block coefficients (centers)"""
    nb=C.shape[0]; centers=i0+B*(np.arange(nb)+0.5)
    tt=np.arange(s,e)
    Ci=np.stack([np.interp(tt,centers,C[:,m]) for m in range(C.shape[1])],1)
    A=basis(F[c],s,e)
    return (A*Ci).sum(1)
if __name__=="__main__":
    wins={"6.2-6.9":(6.2,6.9),"139.95-140.55":(139.95,140.55),"106.2-106.6":(106.2,106.6),"9.42-9.52":(9.42,9.52)}
    for q in (2e-4,4e-4,8e-4,1.6e-3):
        out=[]
        for name,(a,b) in wins.items():
            for mode in ("in","out"):
                r=[]
                for c in (0,1):
                    hold=[(a-0.05,b+0.05)] if mode=="out" else None
                    if mode=="out" and name=="9.42-9.52": hold=[(a-0.02,b+0.02)]
                    i0,C=solve(c,a-6,b+6,q=q,hold=hold)
                    s,e=int(a*sr),int(b*sr)
                    est=synth(c,i0,C,s,e); act=x[s:e,c]
                    r.append(20*np.log10((act-est).std()/act.std()))
                out.append("%s %s %+.1f/%+.1f"%(name,mode,r[0],r[1]))
        print("q=%.1e | "%q+" | ".join(out))
