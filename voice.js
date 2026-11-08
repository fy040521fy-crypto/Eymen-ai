(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const say = text => {
    const out = $("#voiceText");
    if (out) out.textContent = text;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "tr-TR";
      u.rate = 1;
      window.speechSynthesis.speak(u);
    }
  };

  const words = {
    "sıfır":0,"bir":1,"iki":2,"üç":3,"uc":3,"dört":4,"dort":4,
    "beş":5,"bes":5,"altı":6,"alti":6,"yedi":7,"sekiz":8,"dokuz":9,
    "on":10,"on bir":11,"on iki":12,"on üç":13,"on uc":13,"on dört":14,
    "on dort":14,"on beş":15,"on bes":15,"on altı":16,"on alti":16,
    "on yedi":17,"on sekiz":18,"on dokuz":19,"yirmi":20,"otuz":30,
    "kırk":40,"kirk":40,"elli":50,"altmış":60,"altmis":60
  };
  function numberFromSpeech(value) {
    const v = value.trim().toLocaleLowerCase("tr-TR");
    if (/^\d+(?:[.,]\d+)?$/.test(v)) return Number(v.replace(",", "."));
    if (Object.prototype.hasOwnProperty.call(words, v)) return words[v];
    const parts = v.split(/\s+/);
    if (parts.length === 2 && words[parts[0]] != null && words[parts[1]] != null) {
      const a = words[parts[0]], b = words[parts[1]];
      if (a >= 20 && b < 10) return a + b;
      if (a === 10 && b < 10) return 10 + b;
    }
    return NaN;
  }
  function durationFromSpeech(q) {
    const m = q.match(/(\d+(?:[.,]\d+)?|[a-zçğıöşü]+(?:\s+[a-zçğıöşü]+)?)\s*(saat|sa|dakika|dak|dk|saniye|san|sn)/i);
    if (!m) return null;
    const n = numberFromSpeech(m[1]);
    if (!Number.isFinite(n) || n <= 0) return null;
    const unit = m[2].toLocaleLowerCase("tr-TR");
    const seconds = unit.startsWith("sa") ? n * 3600 :
      (unit.startsWith("dak") || unit === "dk") ? n * 60 : n;
    return seconds <= 86400 ? seconds : null;
  }
  function clockFromSpeech(q) {
    const m = q.match(/(?:saat\s*)?(\d{1,2})(?:[:.](\d{2}))?/);
    if (!m) return null;
    let h = Number(m[1]), min = Number(m[2] || 0);
    if (h > 23 || min > 59) return null;
    if (!m[2] && h <= 12 && /\b(akşam|gece)\b/.test(q)) h = (h % 12) + 12;
    return String(h).padStart(2,"0") + ":" + String(min).padStart(2,"0");
  }

  function command(raw) {
    const q = raw.toLocaleLowerCase("tr-TR").replace(/[’']/g," ").replace(/\s+/g," ").trim();

    if (/\b(saat kaç|şu an saat|zaman kaç)\b/.test(q)) {
      say("Saat " + new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})); return;
    }
    if (/\b(tarih|bugün günlerden|bugünün tarihi)\b/.test(q)) {
      say("Bugün " + new Date().toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})); return;
    }

    if (q.includes("kronometre")) {
      if (q.includes("sıfırla") || q.includes("sifirla") || q.includes("reset")) {
        if (swRunning) $("#topSwBtn")?.click();
        $("#topStopwatch")?.click();
        say("Kronometre sıfırlandı."); return;
      }
      if (q.includes("durdur") || q.includes("duraklat") || q.includes("beklet")) {
        if (swRunning) $("#topSwBtn")?.click();
        say("Kronometre durduruldu."); return;
      }
      if (q.includes("devam")) {
        if (!swRunning) $("#topSwBtn")?.click();
        say("Kronometre devam ediyor."); return;
      }
      if (!swRunning) $("#topSwBtn")?.click();
      say("Kronometre başlatıldı."); return;
    }

    if (q.includes("geri sayım") || q.includes("zamanlayıcı") || q.includes("sayaç") || q.includes("hatırlat")) {
      if (q.includes("iptal") || q.includes("sıfırla") || q.includes("sifirla")) {
        $("#topCountdown")?.click();
        say("Geri sayım sıfırlandı."); return;
      }
      if (q.includes("durdur") || q.includes("duraklat")) {
        if (timerRunning) $("#topTimerBtn")?.click();
        say("Geri sayım durduruldu."); return;
      }
      if (q.includes("devam")) {
        if (!timerRunning) $("#topTimerBtn")?.click();
        say("Geri sayım devam ediyor."); return;
      }
      const seconds = durationFromSpeech(q);
      if (seconds) {
        timerRemaining = seconds;
        timerEnd = Date.now() + seconds * 1000;
        timerRunning = true;
        $("#topTimerBtn").textContent = "Durdur";
        paintCountdown();
        const durationText = seconds >= 3600 ? (seconds/3600) + " saatlik" :
          seconds >= 60 ? (seconds/60) + " dakikalık" : seconds + " saniyelik";
        say(durationText + " geri sayım başlatıldı.");
      } else {
        say("Süreyi söyle. Örneğin iki dakika, otuz saniye veya bir saat.");
      }
      return;
    }

    if (q.includes("alarm")) {
      if (q.includes("iptal") || q.includes("sil") || q.includes("kapat")) {
        alarmAt = "";
        safeStore.remove("eymen_alarm");
        showAlarm();
        say("Alarm iptal edildi."); return;
      }
      const time = clockFromSpeech(q);
      if (time) {
        $("#alarmInput").value = time;
        $("#addAlarm").click();
        say(time + " için alarm kuruldu. Sayfa açıkken çalışır.");
      } else {
        say(alarmAt ? "Kurulu alarm " + alarmAt + ". Yeni alarm için saat söyle." :
          "Alarm saati söyle. Örneğin saat yediye alarm kur.");
      }
      return;
    }

    if (q.includes("hesapla") || q.includes("kaç eder") || q.includes("kaç yapar")) {
      const m = q.match(/(-?\d+(?:[.,]\d+)?)\s*(artı|topla|eksi|çıkar|çarpı|kere|çarp|bölü|böl)\s*(-?\d+(?:[.,]\d+)?)/);
      if (m) {
        const a=Number(m[1].replace(",",".")), b=Number(m[3].replace(",","."));
        const op=m[2], result=["artı","topla"].includes(op)?a+b:
          ["eksi","çıkar"].includes(op)?a-b:["bölü","böl"].includes(op)?(b===0?NaN:a/b):a*b;
        if (Number.isFinite(result)) {
          $("#calcDisplay").value = String(Number(result.toFixed(8)));
          say("Sonuç " + result); return;
        }
        say("Sıfıra bölme yapılamaz."); return;
      }
      say("İşlemi örneğin on iki artı beş kaç eder şeklinde söyle."); return;
    }

    if (q.includes("fener") || q.includes("el feneri") || q.includes("wifi") || q.includes("wi fi") || q.includes("bluetooth")) {
      say("Bu web ana ekranı Android sistem ayarlarını doğrudan değiştiremez. Hızlı ayarlar panelini açabilirsin."); return;
    }
    if (q.includes("telefon") && (q.includes("ara") || q.includes("arama"))) {
      const n = q.match(/[+]?[\d\s]{7,}/);
      if (n) { window.location.href = "tel:" + n[0].replace(/\s/g,""); say("Arama ekranı açılıyor."); }
      else say("Aramak istediğin numarayı da söyle.");
      return;
    }
    if (q.includes("mesaj") || q.includes("sms")) {
      say("Mesaj göndermek için Android mesaj uygulamasını açmalısın. Güvenliğin için mesajı sen onaylamalısın."); return;
    }

    say("Bu komutu henüz yapamıyorum. Saat, tarih, kronometre, geri sayım, alarm veya hesaplama diyebilirsin.");
  }

  function listen() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { say("Ses tanıma bu tarayıcıda desteklenmiyor. Chrome ile dene."); return; }
    const rec = new Recognition();
    rec.lang = "tr-TR";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onstart = () => { $("#voiceText").textContent = "Seni dinliyorum…"; };
    rec.onresult = event => {
      const result = event.results[0][0];
      $("#voiceText").textContent = "Duydum: " + result.transcript;
      command(result.transcript);
    };
    rec.onerror = event => {
      const messages = {
        "not-allowed":"Mikrofon izni verilmedi. Chrome site ayarlarından mikrofonu aç.",
        "no-speech":"Ses duyamadım. Tekrar konuşabilirsin.",
        "network":"Ses tanıma için internet bağlantısı gerekli.",
        "audio-capture":"Mikrofon bulunamadı."
      };
      say(messages[event.error] || "Sesini anlayamadım. Bir kez daha deneyelim.");
    };
    try { rec.start(); } catch(e) { say("Mikrofon şu anda kullanılamıyor."); }
  }

  if ($("#mic")) $("#mic").onclick = listen;
  if ($("#speak")) $("#speak").onclick = listen;
  window.EYMEN_VOICE = {listen, command};
})();