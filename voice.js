(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const say = text => {
    const out = $("#voiceText");
    if (out) out.textContent = text;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "tr-TR"; u.rate = 1; window.speechSynthesis.speak(u);
    }
  };
  const words = {"sıfır":0,"bir":1,"iki":2,"üç":3,"uc":3,"dört":4,"dort":4,"beş":5,"bes":5,"altı":6,"alti":6,"yedi":7,"sekiz":8,"dokuz":9,"on":10,"on bir":11,"on iki":12,"on üç":13,"on uc":13,"on dört":14,"on dort":14,"on beş":15,"on bes":15,"on altı":16,"on alti":16,"on yedi":17,"on sekiz":18,"on dokuz":19,"yirmi":20,"otuz":30,"kırk":40,"kirk":40,"elli":50,"altmış":60,"altmis":60};
  function numberFromSpeech(v) {
    v=v.trim().toLocaleLowerCase("tr-TR");
    if (/^\d+(?:[.,]\d+)?$/.test(v)) return Number(v.replace(",","."));
    if (Object.prototype.hasOwnProperty.call(words,v)) return words[v];
    const p=v.split(/\s+/);
    if(p.length===2 && words[p[0]]!=null && words[p[1]]!=null) {
      const a=words[p[0]],b=words[p[1]];
      if(a>=20&&b<10)return a+b;if(a===10&&b<10)return 10+b;
    }
    return NaN;
  }
  function durationFromSpeech(q) {
    const m=q.match(/(\d+(?:[.,]\d+)?|[a-zçğıöşü]+(?:\s+[a-zçğıöşü]+)?)\s*(saat|sa|dakika|dak|dk|saniye|san|sn)/i);
    if(!m)return null;const n=numberFromSpeech(m[1]);if(!Number.isFinite(n)||n<=0)return null;
    const u=m[2].toLocaleLowerCase("tr-TR");
    const seconds=u.startsWith("sa")?n*3600:(u.startsWith("dak")||u==="dk")?n*60:n;
    return seconds<=86400?seconds:null;
  }
  function clockFromSpeech(q) {
    const m=q.match(/(?:saat\s*)?(\d{1,2})(?:[:.](\d{2}))?/);if(!m)return null;
    let h=Number(m[1]),min=Number(m[2]||0);if(h>23||min>59)return null;
    if(!m[2]&&h<=12&&/\b(akşam|gece)\b/.test(q))h=(h%12)+12;
    return String(h).padStart(2,"0")+":"+String(min).padStart(2,"0");
  }

  // Android/Chrome destekliyorsa Note 9 kamera flaşını gerçek olarak kontrol eder.
  let torchStream=null,torchOn=false,torchBusy=false;
  async function setTorch(on) {
    if(torchBusy)return;torchBusy=true;
    try {
      if(on===torchOn){say(on?"Fener zaten açık.":"Fener zaten kapalı.");return;}
      if(on) {
        if(!navigator.mediaDevices?.getUserMedia){say("Bu tarayıcı fener kontrolünü desteklemiyor.");return;}
        torchStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"}}});
        const track=torchStream.getVideoTracks()[0],caps=track.getCapabilities?track.getCapabilities():{};
        if(!caps.torch){torchStream.getTracks().forEach(t=>t.stop());torchStream=null;say("Chrome bu telefonda flaş kontrolüne izin vermedi.");return;}
        await track.applyConstraints({advanced:[{torch:true}]});torchOn=true;say("Fener açıldı.");
      } else {
        if(torchStream){const track=torchStream.getVideoTracks()[0];try{await track.applyConstraints({advanced:[{torch:false}]});}catch(_){}torchStream.getTracks().forEach(t=>t.stop());torchStream=null;}
        torchOn=false;say("Fener kapatıldı.");
      }
    } catch(e) {
      if(torchStream)torchStream.getTracks().forEach(t=>t.stop());torchStream=null;torchOn=false;
      say(e?.name==="NotAllowedError"?"Kamera izni verilmedi. Site ayarlarından kameraya izin ver.":"Fener açılamadı. Kamera başka uygulamada kullanılıyor olabilir.");
    } finally {torchBusy=false;}
  }
  const flashButton=document.querySelector('[data-app="flash"]');
  if(flashButton)flashButton.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();setTorch(!torchOn);},true);

  function command(raw) {
    const q=raw.toLocaleLowerCase("tr-TR").replace(/[’']/g," ").replace(/\s+/g," ").trim();
    if(/\b(saat kaç|şu an saat|zaman kaç)\b/.test(q)){say("Saat "+new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}));return;}
    if(/\b(tarih|bugün günlerden|bugünün tarihi)\b/.test(q)){say("Bugün "+new Date().toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}));return;}
    if(q.includes("kronometre")){
      if(q.includes("sıfırla")||q.includes("sifirla")||q.includes("reset")){if(swRunning)$("#topSwBtn")?.click();$("#topStopwatch")?.click();say("Kronometre sıfırlandı.");return;}
      if(q.includes("durdur")||q.includes("duraklat")||q.includes("beklet")){if(swRunning)$("#topSwBtn")?.click();say("Kronometre durduruldu.");return;}
      if(q.includes("devam")){if(!swRunning)$("#topSwBtn")?.click();say("Kronometre devam ediyor.");return;}
      if(!swRunning)$("#topSwBtn")?.click();say("Kronometre başlatıldı.");return;
    }
    if(q.includes("geri sayım")||q.includes("zamanlayıcı")||q.includes("sayaç")||q.includes("hatırlat")){
      if(q.includes("iptal")||q.includes("sıfırla")||q.includes("sifirla")){$("#topCountdown")?.click();say("Geri sayım sıfırlandı.");return;}
      if(q.includes("durdur")||q.includes("duraklat")){if(timerRunning)$("#topTimerBtn")?.click();say("Geri sayım durduruldu.");return;}
      if(q.includes("devam")){if(!timerRunning)$("#topTimerBtn")?.click();say("Geri sayım devam ediyor.");return;}
      const seconds=durationFromSpeech(q);
      if(seconds){timerRemaining=seconds;timerEnd=Date.now()+seconds*1000;timerRunning=true;$("#topTimerBtn").textContent="Durdur";paintCountdown();const d=seconds>=3600?(seconds/3600)+" saatlik":seconds>=60?(seconds/60)+" dakikalık":seconds+" saniyelik";say(d+" geri sayım başlatıldı.");}
      else say("Süreyi söyle. Örneğin iki dakika veya otuz saniye.");return;
    }
    if(q.includes("alarm")){
      if(q.includes("iptal")||q.includes("sil")||q.includes("kapat")){alarmAt="";safeStore.remove("eymen_alarm");showAlarm();say("Alarm iptal edildi.");return;}
      const time=clockFromSpeech(q);if(time){$("#alarmInput").value=time;$("#addAlarm").click();say(time+" için alarm kuruldu. Sayfa açıkken çalışır.");}
      else say(alarmAt?"Kurulu alarm "+alarmAt+".":"Alarm saati söyle. Örneğin saat yediye alarm kur.");return;
    }
    if(q.includes("hesapla")||q.includes("kaç eder")||q.includes("kaç yapar")){
      const m=q.match(/(-?\d+(?:[.,]\d+)?)\s*(artı|topla|eksi|çıkar|çarpı|kere|çarp|bölü|böl)\s*(-?\d+(?:[.,]\d+)?)/);
      if(m){const a=Number(m[1].replace(",",".")),b=Number(m[3].replace(",",".")),op=m[2],r=["artı","topla"].includes(op)?a+b:["eksi","çıkar"].includes(op)?a-b:["bölü","böl"].includes(op)?(b===0?NaN:a/b):a*b;
        if(Number.isFinite(r)){$("#calcDisplay").value=String(Number(r.toFixed(8)));say("Sonuç "+r);}else say("Sıfıra bölme yapılamaz.");return;}
      say("İşlemi örneğin on iki artı beş kaç eder şeklinde söyle.");return;
    }
    if(q.includes("fener")||q.includes("el feneri")||q.includes("flash")||q.includes("flaş")){
      if(q.includes("kapat")||q.includes("söndür"))setTorch(false);else if(q.includes("aç")||q.includes("yak"))setTorch(true);else say(torchOn?"Fener açık.":"Fener kapalı.");return;
    }
    if(q.includes("wifi")||q.includes("wi fi")||q.includes("bluetooth")){say("Bu ayarı Android hızlı ayarlar panelinden değiştirebilirsin.");return;}
    if(q.includes("merhaba")||q.includes("selam")||q.includes("günaydın")){say("Aleyküm selam! Ben Eymen. Seni dinliyorum.");return;}
    if(q.includes("nasılsın")){say("İyiyim, teşekkür ederim. Senin için hazırım.");return;}
    if(q.includes("adın ne")||q.includes("kimsin")){say("Ben Eymen, kişisel asistanınım.");return;}
    if(q.includes("teşekkür")){say("Her zaman, yardımcı olmak benim görevim.");return;}
    if(q.includes("telefon")&&(q.includes("ara")||q.includes("arama"))){const n=q.match(/[+]?[0-9\s]{7,}/);if(n){say("Arama ekranı açılıyor.");window.location.href="tel:"+n[0].replace(/\s/g,"");}else say("Aramak istediğin numarayı da söyle.");return;}
    if(q.includes("mesaj")||q.includes("sms")){say("Mesaj uygulamasını açmak için ana ekrandaki Mesaj kısayolunu kullan. Göndermeden önce onayla.");return;}
    say("Bu komutu henüz yapamıyorum. Saat, tarih, kronometre, geri sayım, alarm, hesaplama veya fener diyebilirsin.");
  }

  function listen() {
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){say("Ses tanıma bu tarayıcıda desteklenmiyor. Chrome ile dene.");return;}
    const rec=new Recognition();rec.lang="tr-TR";rec.interimResults=false;rec.maxAlternatives=3;
    rec.onstart=()=>{$("#voiceText").textContent="Seni dinliyorum…";};
    rec.onresult=e=>{const result=e.results[0][0];$("#voiceText").textContent="Duydum: "+result.transcript;command(result.transcript);};
    rec.onerror=e=>{const messages={"not-allowed":"Mikrofon izni verilmedi. Chrome site ayarlarından mikrofonu aç.","no-speech":"Ses duyamadım. Tekrar konuşabilirsin.","network":"Ses tanıma için internet bağlantısı gerekli.","audio-capture":"Mikrofon bulunamadı."};say(messages[e.error]||"Sesini anlayamadım. Bir kez daha deneyelim.");};
    try{rec.start();}catch(e){say("Mikrofon şu anda kullanılamıyor.");}
  }
  if($("#mic"))$("#mic").onclick=listen;
  if($("#speak"))$("#speak").onclick=listen;
  window.EYMEN_VOICE={listen,command,setTorch};
})();