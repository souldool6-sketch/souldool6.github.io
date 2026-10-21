/* =====================================================
   app.js — 시작 홈페이지 메인 스크립트
   기능: 날씨(Open-Meteo), 구글 검색, 명언, 배경 파티클
   ===================================================== */


/* ── 2. 배경 파티클 (구글 색상) ─────────────────── */
(function initParticles() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const COLORS = ['#4285F4','#EA4335','#FBBC05','#34A853'];
  const particles = [];
  const NUM = 28;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < NUM; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 5 + 3,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.12 + 0.04
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();

      p.x += p.dx;
      p.y += p.dy;
      if (p.x < -20) p.x = canvas.width + 20;
      if (p.x > canvas.width + 20) p.x = -20;
      if (p.y < -20) p.y = canvas.height + 20;
      if (p.y > canvas.height + 20) p.y = -20;
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
})();


/* ── 3. 날씨 (Open-Meteo API – 무료, 키 불필요) ─── */
(function initWeather() {
  const CITIES = [
    {
      id: 'weatherSeoul',
      name: '서울',
      lat: 37.5665,
      lon: 126.9780,
      colorClass: 'seoul'
    },
    {
      id: 'weatherJeju',
      name: '제주',
      lat: 33.4996,
      lon: 126.5312,
      colorClass: 'jeju'
    }
  ];

  // WMO 날씨 코드 → [이모지, 설명]
  const WMO = {
    0:  ['☀️', '맑음'],
    1:  ['🌤️', '대체로 맑음'],
    2:  ['⛅', '부분적 구름'],
    3:  ['☁️', '흐림'],
    45: ['🌫️', '안개'],
    48: ['🌫️', '착빙 안개'],
    51: ['🌦️', '가벼운 이슬비'],
    53: ['🌦️', '이슬비'],
    55: ['🌧️', '짙은 이슬비'],
    61: ['🌧️', '가벼운 비'],
    63: ['🌧️', '비'],
    65: ['🌧️', '강한 비'],
    71: ['🌨️', '가벼운 눈'],
    73: ['❄️', '눈'],
    75: ['❄️', '폭설'],
    77: ['🌨️', '눈 알갱이'],
    80: ['🌦️', '소나기'],
    81: ['🌧️', '강한 소나기'],
    82: ['⛈️', '폭우'],
    85: ['🌨️', '눈 소나기'],
    86: ['❄️', '강한 눈 소나기'],
    95: ['⛈️', '뇌우'],
    96: ['⛈️', '우박 뇌우'],
    99: ['⛈️', '강한 우박 뇌우'],
  };

  function getWeatherInfo(code) {
    return WMO[code] ?? ['🌡️', '알 수 없음'];
  }

  function windDirection(deg) {
    const dirs = ['북','북동','동','남동','남','남서','서','북서'];
    return dirs[Math.round(deg / 45) % 8];
  }

  async function fetchWeather(city) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}`
      + `&current=temperature_2m,relative_humidity_2m,weathercode,windspeed_10m,winddirection_10m`
      + `&timezone=Asia%2FSeoul&wind_speed_unit=ms`;

    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // 헤더 컴팩트 카드 렌더링
  function renderWeather(cityConf, data) {
    const card = document.getElementById(cityConf.id);
    const c = data.current;
    const temp  = Math.round(c.temperature_2m);
    const humid = c.relative_humidity_2m;
    const [emoji, desc] = getWeatherInfo(c.weathercode);

    card.innerHTML = `
      <span class="hw-emoji" role="img" aria-label="${desc}">${emoji}</span>
      <div>
        <div class="hw-city">📍 ${cityConf.name}</div>
        <div class="hw-temp">${temp}°C</div>
        <div class="hw-desc">${desc} · 💧${humid}%</div>
      </div>`;
  }

  function renderError(cityConf) {
    const card = document.getElementById(cityConf.id);
    card.innerHTML = `
      <span class="hw-emoji">🌡️</span>
      <div>
        <div class="hw-city">📍 ${cityConf.name}</div>
        <div class="weather-error">불러오기 실패</div>
      </div>`;
  }

  CITIES.forEach(async city => {
    try {
      const data = await fetchWeather(city);
      renderWeather(city, data);
    } catch (e) {
      console.warn(`날씨 오류(${city.name}):`, e);
      renderError(city);
    }
  });
})();


/* ── 4. 구글 검색 ────────────────────────────────── */
(function initSearch() {
  const input   = document.getElementById('searchInput');
  const form    = document.getElementById('searchForm');
  const micBtn  = document.getElementById('micBtn');
  const luckyBtn = document.getElementById('luckyBtn');
  const suggestBox = document.getElementById('searchSuggestions');

  // 빠른 제안어 (로컬 — CORS 우회용)
  const quickSuggestions = [
    '오늘 날씨', '뉴스', '유튜브', '네이버', '카카오',
    '번역', '환율', '주식', '코스피', '비트코인',
    '맛집 추천', '영화', '드라마', '쇼핑', '지도'
  ];

  function showSuggestions(query) {
    if (!query.trim()) { suggestBox.style.display = 'none'; return; }
    const filtered = quickSuggestions.filter(s =>
      s.includes(query) || query.includes(s.slice(0,2))
    ).slice(0, 5);

    if (!filtered.length) { suggestBox.style.display = 'none'; return; }

    suggestBox.innerHTML = filtered.map(s => `
      <div class="suggestion-item" tabindex="0" role="option" data-val="${s}">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M21 21L15.803 15.803M15.803 15.803A7.5 7.5 0 1 0 5.197 5.197a7.5 7.5 0 0 0 10.606 10.606Z"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        ${s}
      </div>`).join('');
    suggestBox.style.display = 'block';

    suggestBox.querySelectorAll('.suggestion-item').forEach(el => {
      el.addEventListener('click', () => {
        input.value = el.dataset.val;
        suggestBox.style.display = 'none';
        form.submit();
      });
    });
  }

  input.addEventListener('input', () => showSuggestions(input.value));
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-form')) suggestBox.style.display = 'none';
  });

  // Lucky 버튼
  luckyBtn.addEventListener('click', () => {
    const q = input.value.trim();
    if (q) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}&btnI=1`, '_blank');
    }
  });

  // 음성 검색 (Web Speech API)
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;

    micBtn.addEventListener('click', () => {
      micBtn.classList.add('listening');
      recognition.start();
    });

    recognition.onresult = e => {
      input.value = e.results[0][0].transcript;
      micBtn.classList.remove('listening');
      setTimeout(() => form.submit(), 300);
    };

    recognition.onerror = () => micBtn.classList.remove('listening');
    recognition.onend   = () => micBtn.classList.remove('listening');
  } else {
    micBtn.style.display = 'none';
  }
})();


/* ── 5. 오늘의 명언 ──────────────────────────────── */
(function initQuote() {
  const QUOTES = [
    { text: "천 리 길도 한 걸음부터.", author: "노자" },
    { text: "배움에는 끝이 없다.", author: "공자" },
    { text: "성공은 열정을 잃지 않고 실패에서 실패로 걸어가는 것이다.", author: "윈스턴 처칠" },
    { text: "당신이 할 수 있다고 생각하든, 할 수 없다고 생각하든, 당신이 옳다.", author: "헨리 포드" },
    { text: "인생은 자전거를 타는 것과 같다. 균형을 잡으려면 계속 움직여야 한다.", author: "알베르트 아인슈타인" },
    { text: "꿈을 꾸는 것을 멈추지 마라. 꿈이 없는 삶은 날개 없는 새와 같다.", author: "기타 마르코" },
    { text: "어제를 배우고, 오늘을 살며, 내일을 바라라.", author: "알베르트 아인슈타인" },
    { text: "시작이 반이다.", author: "아리스토텔레스" },
    { text: "가장 어두운 밤도 끝나고 태양은 다시 뜰 것이다.", author: "빅토르 위고" },
    { text: "행복은 우리가 얻는 것이 아니라 우리가 되는 것이다.", author: "마르쿠스 아우렐리우스" },
    { text: "나는 실패한 적이 없다. 단지 1만 가지 작동하지 않는 방법을 찾았을 뿐이다.", author: "토마스 에디슨" },
    { text: "창의성은 지식 없이는 제한되지만, 상상력은 온 세상을 아우른다.", author: "알베르트 아인슈타인" },
    { text: "오늘 할 수 있는 일을 내일로 미루지 마라.", author: "벤자민 프랭클린" },
    { text: "용기란 두려움이 없는 것이 아니라, 두려움보다 중요한 것이 있다고 판단하는 것이다.", author: "넬슨 만델라" },
    { text: "인생에서 가장 중요한 것은 우리에게 일어나는 일이 아니라, 우리가 그것에 어떻게 반응하느냐이다.", author: "에픽테토스" },
    { text: "지금 이 순간이 항상 있었던 것이다.", author: "에크하르트 톨레" },
    { text: "변화를 원한다면 먼저 자신이 변화해야 한다.", author: "마하트마 간디" },
    { text: "불가능이란 아무것도 하지 않는 사람들이 사용하는 단어다.", author: "나폴레옹 보나파르트" },
    { text: "무지한 자신감보다 지식 있는 의심이 낫다.", author: "찰스 다윈" },
    { text: "자기 자신을 정복하는 것이 가장 큰 승리다.", author: "플라톤" },
    { text: "작은 것들을 사랑하는 것이 삶을 풍요롭게 한다.", author: "로버트 브라우닝" },
    { text: "포기란 없다. 다시 시작하는 용기가 있을 뿐이다.", author: "메리 앤 래드마커" },
    { text: "지식은 힘이다.", author: "프란시스 베이컨" },
    { text: "행동 없는 비전은 그저 꿈에 불과하다. 비전 없는 행동은 시간 낭비다. 비전과 행동이 함께할 때 세상을 바꿀 수 있다.", author: "조엘 바커" },
    { text: "성공한 사람이 되려 하기보다 가치 있는 사람이 되려고 노력하라.", author: "알베르트 아인슈타인" },
    { text: "모든 위대한 꿈은 꿈꾸는 사람으로부터 시작된다.", author: "해리엇 터브먼" },
    { text: "삶이란 가까이서 보면 비극이지만, 멀리서 보면 희극이다.", author: "찰리 채플린" },
    { text: "미래는 오늘 우리가 무엇을 하느냐에 달려 있다.", author: "마하트마 간디" },
  ];

  // 새 HTML의 ID에 맞게 수정
  const textEl   = document.getElementById('quoteText');    // qb-text → quoteText (id 동일)
  const authorEl = document.getElementById('quoteAuthor');  // qb-author → quoteAuthor (id 동일)
  const refreshBtn = document.getElementById('quoteRefresh'); // qb-refresh → quoteRefresh (id 동일)

  // 오늘 날짜 기반 기본 인덱스 + 무작위 섞기
  function todayIndex() {
    const now = new Date();
    return (now.getFullYear() * 1000 + now.getMonth() * 31 + now.getDate()) % QUOTES.length;
  }

  let currentIdx = todayIndex();

  function showQuote(idx, animate = false) {
    const q = QUOTES[idx];
    if (animate) {
      textEl.style.opacity = '0';
      authorEl.style.opacity = '0';
      setTimeout(() => {
        textEl.textContent   = q.text;
        authorEl.textContent = `— ${q.author}`;
        textEl.style.opacity = '1';
        authorEl.style.opacity = '1';
      }, 280);
    } else {
      textEl.textContent   = q.text;
      authorEl.textContent = `— ${q.author}`;
    }
  }

  showQuote(currentIdx);

  refreshBtn.addEventListener('click', () => {
    currentIdx = (currentIdx + 1) % QUOTES.length;
    showQuote(currentIdx, true);
  });
})();
