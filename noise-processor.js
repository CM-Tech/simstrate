class WhiteNoiseProcessor extends AudioWorkletProcessor {
    t=0;
    f=[[0,0]];
    f0=[[0,0]];
    g=[[1,1]];
    gO=[[1,1]];
    d=0;
    constructor(){
        super()
        this.port.onmessage=(m)=>{
            if(m.data.p.length>1){
                this.f0=this.f.slice();
            this.f=m.data.p;
            this.d=m.data.d;

            // let gs=this.f.map((x,i)=>{
            //     const old=this.f0[i]??x;
            //     const dot=x;
            //     const len=Math.pow(dot[0]**2+dot[1]**2,0.5);
            //     const lenO=Math.pow(old[0]**2+old[1]**2,0.5);
            //     const a=Math.acos((dot[1]*old[1]+dot[0]*old[0])/len/lenO);
            //     // let dis=Math.pow(2,(len*1)/12);
            //     const freq=a/Math.PI/2/(this.d/1000);
            //     // const l=Math.max(0,Math.min(1,freq))
            //     // let ff=l*(4186-130)+130;
            //     return [Math.log(freq+0.0000001),Math.max(0,dot[0])*0+1]
            //     // [Math.pow(2,Math.floor(Math.log(Math.pow(a/Math.PI/2/(this.d/1000),1))/Math.log(2)*6+32)/12),0.5];//>0?dis:0;
            // })

            // let mx=gs.map(x=>x[0]).reduce((a,b)=>Math.max(a,b),0);
            // let men=gs.map(x=>x[0]).reduce((a,b)=>b+a,0)/gs.length;
            // gs.sort((a,b)=>a[0]-b[0]);
            // const l=Math.min(gs.length,32);
            
            this.g=m.data.p.map((x,i)=>{
                const o=x[0]
                return [Math.pow(2,(Math.log2(x[1])*12)/12),1]
            });
            
            }
        }
    }
    process (inputs, outputs, parameters) {
      const output = outputs[0]
      output.forEach(channel => {
          const sn=(x)=>Math.sin(x)//Math.pow(Math.abs(x%1-0.5),1)//Math.sin(x)
        for (let i = 0; i < channel.length; i++) {
            this.t+=1;
            let tot=0;
            for (let j = 0; j < this.g.length; j++) {
                if(j < this.g.length){
                let dis=this.g[j][0]
                let disO=this.gO[j]?.[0]??this.g[j][0];
                let rO=this.gO[j]?.[1]??this.g[j][1];
                const l=i/channel.length;
                tot+= Math.pow(sn(Math.PI*2*(dis)*this.t/44100),1)/Math.pow(this.g.length,0.75)*(this.g[j][1])*l+(1-l)*Math.pow(sn(Math.PI*2*(disO)*this.t/44100),1)/Math.pow(this.g.length,0.75)*(rO);
                }
            }
            channel[i] =tot;
        }
      })
      this.gO=this.g.slice()
      return true
    }
  }
  
  registerProcessor('white-noise-processor', WhiteNoiseProcessor)