(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const BUNDLE_MAGIC = new Uint8Array([0x54,0x54,0x43,0x36,0x31,0x00]); // TTC61\0
  const PLAIN_MAGIC = new Uint8Array([0x54,0x54,0x43,0x50,0x31,0x00]);  // TTCP1\0
  const MIXED_MAGIC = new Uint8Array([0x54,0x54,0x43,0x4d,0x31,0x00]);  // TTCM1\0
  const TYPE_TEXT = 1;
  const TYPE_URL = 2;
  const TYPE_FILE = 3;
  const TYPE_MIXED = 4;
  const SIZE_OPTIONS = [512, 768, 1024, 1536, 2048, 3072, 4096, 6144, 7168, 8192, 9216, 10240, 12288];
  const CARRIER_REPS = 3;
  const PATCH_RADIUS = 3;
  const PATCH_AMP = 15;
  const READ_RADIUS = 3;

  let mode = 'text';
  let lang = localStorage.getItem('tc_lang') || 'ja';
  let currentBuild = null;
  let lastOptimizeInfo = null;
  let crcTable = null;
  const baseCache = new Map();
  const pointCache = new Map();

  const I18N = {
    ja: {
      appTitle: 'Turing Cypher', makeTitle: '有機PNGを作る', payloadType: 'データの種類', modeText: 'テキスト', modeUrl: 'URL', modeFile: 'ファイル / 画像 + 文字',
      textToEncrypt: '暗号化する文字', textPlaceholder: '短いメモ / テキスト', urlToEncrypt: '暗号化するURL', fileToEncrypt: '暗号化するファイル',
      fileNoteLabel: '一緒に入れる文字（任意）', fileNotePlaceholder: '画像やファイルと一緒に復号したい文字', imageOptimizeLabel: '画像最適化', imageOptimizeOriginal: '元ファイルのまま', imageOptimizeOnePage: '1ページ優先', imageOptimizeSmall: '小さく圧縮', imageOptimizeBalanced: 'バランス', imageOptimizeHigh: '高画質', imageOptimizeNote: '画像ファイルのみ。最適化時は、元画像・PNG・JPEG・WebPから小さいものを自動選択します。復元画像は選ばれた形式になります。', passphrase: '合い言葉',
      makePassPlaceholder: '復号にも同じ合い言葉を使います', readPassPlaceholder: '作成時と同じ合い言葉', pageSize: '有機ページサイズ', sizeAuto: '自動',
      makeButton: '有機PNGを作る', generatedTitle: '生成されたページ', saveAll: 'すべて保存（ZIP）', selfCheck: 'セルフチェック', clear: 'クリア',
      readTitle: 'PNGから読み出す', organicPages: '有機PNGページ', readButton: '読み出す',
      preparing: 'バイト列を準備しています...', encrypting: '暗号化しています...', reading: '有機PNGを読み出しています...', decrypting: '復号・検証しています...',
      textEmpty: '文字が空です。', urlInvalid: 'URLは http:// または https:// から始めてください。', chooseFile: 'ファイルを選んでください。', passEmpty: '合い言葉が空です。', choosePng: 'PNGページを選んでください。',
      pageSummary: '{pages}ページ / {size}×{size}', pageCard: '{used} byte chunk / visual-safe capacity {cap} byte', savePage: '{num}.pngを保存', rendering: '描画中...',
      makePassStatus: 'PASS: {bytes} bytes を {pages}ページの2ページ優先・超大サイズ高密度ラビリンスPNGに暗号化しました。{size}×{size}',
      readProgress: '{i} / {total} ページを読んでいます...', readPassStatus: 'PASS: verifier OK。{bytes} bytes を {pages}ページから復元しました。',
      recoveredText: '復元した文字', recoveredUrl: '復元したURL', recoveredFile: '復元したファイル', recoveredImageTextFile: '復元した文字とファイル',
      fileInfo: '{name} / {mime} / {bytes} bytes', fileInfoImage: '{name} / {mime} / {bytes} bytes / {w} × {h}',
      copyText: '文字をコピー', copied: 'コピーしました', copyFailed: 'コピー失敗', openUrl: '復元したURLを開く', saveRecoveredFile: '復元ファイルを保存',
      renderingAll: '{i} / {total} を描画中...', buildingZip: 'ZIPを作成中...', selfCheckPass: 'SELF CHECK PASS: saved-PNG style pixel decode OK。{bytes} bytes / {pages}ページ。'
    },
    en: {
      appTitle: 'Turing Cypher', makeTitle: 'Make organic PNG', payloadType: 'Payload type', modeText: 'Text', modeUrl: 'URL', modeFile: 'File / Image + Text',
      textToEncrypt: 'Text to encrypt', textPlaceholder: 'Short memo / text', urlToEncrypt: 'URL to encrypt', fileToEncrypt: 'File to encrypt',
      fileNoteLabel: 'Text to include together (optional)', fileNotePlaceholder: 'Text recovered together with the image or file', imageOptimizeLabel: 'Image optimization', imageOptimizeOriginal: 'Keep original file', imageOptimizeOnePage: 'Prefer 1 page', imageOptimizeSmall: 'Small', imageOptimizeBalanced: 'Balanced', imageOptimizeHigh: 'High quality', imageOptimizeNote: 'Images only. When optimized, the app automatically chooses original / PNG / JPEG / WebP. The recovered image uses the selected format.', passphrase: 'Passphrase',
      makePassPlaceholder: 'Use the same passphrase to read', readPassPlaceholder: 'Same passphrase used to make', pageSize: 'Organic page size', sizeAuto: 'Auto',
      makeButton: 'Make organic PNG', generatedTitle: 'Generated pages', saveAll: 'Save all pages (.zip)', selfCheck: 'Self check', clear: 'Clear',
      readTitle: 'Read from PNG', organicPages: 'Organic PNG page(s)', readButton: 'Read selected pages',
      preparing: 'Preparing bytes...', encrypting: 'Encrypting byte package...', reading: 'Reading organic pages...', decrypting: 'Decrypting and verifying payload...',
      textEmpty: 'Text is empty.', urlInvalid: 'URL must start with http:// or https://', chooseFile: 'Choose a file.', passEmpty: 'Passphrase is empty.', choosePng: 'Choose one or more PNG pages.',
      pageSummary: '{pages} page(s) / {size}×{size}', pageCard: '{used} byte chunk / visual-safe capacity {cap} byte', savePage: 'Save page {num}.png', rendering: 'Rendering...',
      makePassStatus: 'PASS: {bytes} bytes encrypted into {pages} 2-page-priority ultra-large dense-labyrinth page(s), {size}×{size}.',
      readProgress: 'Reading page image {i} / {total}...', readPassStatus: 'PASS: verifier OK. {bytes} byte payload recovered from {pages} page(s).',
      recoveredText: 'Recovered text', recoveredUrl: 'Recovered URL', recoveredFile: 'Recovered file', recoveredImageTextFile: 'Recovered text and file',
      fileInfo: '{name} / {mime} / {bytes} bytes', fileInfoImage: '{name} / {mime} / {bytes} bytes / {w} × {h}',
      copyText: 'Copy recovered text', copied: 'Copied', copyFailed: 'Copy failed', openUrl: 'Open recovered URL', saveRecoveredFile: 'Save recovered file',
      renderingAll: 'Rendering {i} / {total}...', buildingZip: 'Building ZIP...', selfCheckPass: 'SELF CHECK PASS: saved-PNG style pixel decode OK. {bytes} bytes / {pages} page(s).'
    }
  };

  const ui = {
    makeBtn: $('makeBtn'), readBtn: $('readBtn'), makeStatus: $('makeStatus'), readStatus: $('readStatus'), readResult: $('readResult'),
    outputPanel: $('outputPanel'), previewWrap: $('previewWrap'), pageList: $('pageList'), pageSummary: $('pageSummary'),
    downloadAllBtn: $('downloadAllBtn'), clearBtn: $('clearBtn'), selfCheckBtn: $('selfCheckBtn')
  };

  function t(key, vars = {}) {
    let text = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
    for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  }
  function applyLanguage() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $('langJa')?.classList.toggle('active', lang === 'ja');
    $('langEn')?.classList.toggle('active', lang === 'en');
  }
  function setStatus(el, text, kind = '') { el.textContent = text; el.className = `status ${kind}`.trim(); }
  function putU16(view, off, n) { view.setUint16(off, n, false); }
  function getU16(view, off) { return view.getUint16(off, false); }
  function putU32(view, off, n) { view.setUint32(off, n >>> 0, false); }
  function getU32(view, off) { return view.getUint32(off, false); }
  function bytesEqual(a, b) { if (!a || !b || a.length !== b.length) return false; for (let i=0;i<a.length;i++) if (a[i] !== b[i]) return false; return true; }
  function concatBytes(parts) { const total = parts.reduce((n,p)=>n+p.length,0); const out = new Uint8Array(total); let o=0; for (const p of parts) { out.set(p,o); o+=p.length; } return out; }
  function safeName(name) { return String(name || 'payload.bin').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120) || 'payload.bin'; }

  function fnv1a(str) { let h=0x811c9dc5; for (let i=0;i<str.length;i++){h^=str.charCodeAt(i); h=Math.imul(h,0x01000193);} return h>>>0; }
  function mulberry32(seed) { let a=seed>>>0; return function(){ a=(a+0x6d2b79f5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }

  function fillRandomBytes(bytes) {
    const MAX_RANDOM_CHUNK = 65536;
    for (let off = 0; off < bytes.length; off += MAX_RANDOM_CHUNK) {
      crypto.getRandomValues(bytes.subarray(off, Math.min(bytes.length, off + MAX_RANDOM_CHUNK)));
    }
    return bytes;
  }

  function mix32(x) { x >>>= 0; x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0; x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0; x ^= x >>> 16; return x >>> 0; }
  function pointHash(seed, x, y, i) { return mix32((seed>>>0) ^ Math.imul(x+0x9e3779b9,0x85ebca6b) ^ Math.imul(y+0xc2b2ae35,0x27d4eb2f) ^ Math.imul(i+1,0x165667b1)); }
  function byteHex(bytes) { return Array.from(bytes, b => b.toString(16).padStart(2,'0')).join(''); }
  async function sha256(bytes) { return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); }
  async function deriveKey(passphrase, salt) {
    const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' }, material, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
  }

  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1); crcTable[n]=c>>>0; }
    }
    let c=0xffffffff; for (let i=0;i<bytes.length;i++) c=crcTable[(c^bytes[i])&0xff]^(c>>>8); return (c^0xffffffff)>>>0;
  }

  async function makePlainPackage(type, name, mime, payloadBytes) {
    const nameBytes = enc.encode(name || '');
    const mimeBytes = enc.encode(mime || 'application/octet-stream');
    const hash = await sha256(payloadBytes);
    const headerLen = 6 + 1 + 1 + 4 + 2 + 2 + 32;
    const out = new Uint8Array(headerLen + nameBytes.length + mimeBytes.length + payloadBytes.length);
    out.set(PLAIN_MAGIC, 0); out[6] = 1; out[7] = type;
    const view = new DataView(out.buffer);
    putU32(view, 8, payloadBytes.length); putU16(view, 12, nameBytes.length); putU16(view, 14, mimeBytes.length);
    out.set(hash, 16); let off = headerLen; out.set(nameBytes, off); off += nameBytes.length; out.set(mimeBytes, off); off += mimeBytes.length; out.set(payloadBytes, off);
    return out;
  }
  async function makeMixedPackage(text, fileName, fileMime, fileBytes) {
    const textBytes = enc.encode(text || ''); const nameBytes = enc.encode(fileName || 'payload.bin'); const mimeBytes = enc.encode(fileMime || 'application/octet-stream'); const hash = await sha256(fileBytes);
    const headerLen = 6 + 1 + 4 + 4 + 2 + 2 + 32;
    const out = new Uint8Array(headerLen + textBytes.length + nameBytes.length + mimeBytes.length + fileBytes.length);
    out.set(MIXED_MAGIC, 0); out[6] = 1;
    const view = new DataView(out.buffer); putU32(view, 7, textBytes.length); putU32(view, 11, fileBytes.length); putU16(view, 15, nameBytes.length); putU16(view, 17, mimeBytes.length);
    out.set(hash, 19); let off = headerLen; out.set(textBytes, off); off += textBytes.length; out.set(nameBytes, off); off += nameBytes.length; out.set(mimeBytes, off); off += mimeBytes.length; out.set(fileBytes, off);
    return out;
  }
  async function parsePlainPackage(bytes) {
    if (bytes.length < 48) throw new Error('Recovered package is too short.');
    if (bytesEqual(bytes.slice(0,6), MIXED_MAGIC)) return parseMixedPackage(bytes);
    if (!bytesEqual(bytes.slice(0,6), PLAIN_MAGIC)) throw new Error('Plain package magic does not match.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const type = bytes[7]; const payloadLen = getU32(view, 8); const nameLen = getU16(view, 12); const mimeLen = getU16(view, 14); const hash = bytes.slice(16,48);
    let off = 48; const need = off + nameLen + mimeLen + payloadLen; if (need !== bytes.length) throw new Error('Plain package length does not match.');
    const name = dec.decode(bytes.slice(off, off+nameLen)); off += nameLen; const mime = dec.decode(bytes.slice(off, off+mimeLen)); off += mimeLen; const payload = bytes.slice(off, off+payloadLen);
    if (!bytesEqual(hash, await sha256(payload))) throw new Error('Payload SHA-256 verification failed.');
    return { kind: 'plain', type, name, mime, payload };
  }
  async function parseMixedPackage(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const textLen = getU32(view, 7); const fileLen = getU32(view, 11); const nameLen = getU16(view, 15); const mimeLen = getU16(view, 17); const hash = bytes.slice(19,51);
    let off = 51; const need = off + textLen + nameLen + mimeLen + fileLen; if (need !== bytes.length) throw new Error('Mixed package length does not match.');
    const text = dec.decode(bytes.slice(off, off+textLen)); off += textLen; const fileName = dec.decode(bytes.slice(off, off+nameLen)); off += nameLen; const fileMime = dec.decode(bytes.slice(off, off+mimeLen)); off += mimeLen; const fileBytes = bytes.slice(off, off+fileLen);
    if (!bytesEqual(hash, await sha256(fileBytes))) throw new Error('Mixed file SHA-256 verification failed.');
    return { kind: 'mixed', text, fileName, fileMime, fileBytes };
  }

  async function encryptFixedCapacity(plain, passphrase, totalCapacity) {
    const overhead = 6 + 16 + 12 + 16;
    const paddedPlainLen = totalCapacity - overhead;
    if (paddedPlainLen < plain.length + 8) throw new Error('Selected page plan is too small.');
    const padded = fillRandomBytes(new Uint8Array(paddedPlainLen));
    const view = new DataView(padded.buffer); putU32(view, 0, plain.length); putU32(view, 4, crc32(plain)); padded.set(plain, 8);
    const salt = fillRandomBytes(new Uint8Array(16)); const iv = fillRandomBytes(new Uint8Array(12)); const key = await deriveKey(passphrase, salt);
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, padded));
    const bundle = concatBytes([BUNDLE_MAGIC, salt, iv, cipher]);
    if (bundle.length !== totalCapacity) throw new Error('Internal fixed bundle size mismatch.');
    return bundle;
  }
  async function decryptFixedCapacity(bundle, passphrase) {
    if (bundle.length < 64) throw new Error('Encoded byte stream is too short.');
    if (!bytesEqual(bundle.slice(0,6), BUNDLE_MAGIC)) throw new Error('Bundle magic does not match. Wrong passphrase, wrong images, wrong order, or damaged PNG.');
    const salt = bundle.slice(6,22); const iv = bundle.slice(22,34); const cipher = bundle.slice(34); const key = await deriveKey(passphrase, salt);
    const padded = new Uint8Array(await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, cipher));
    const view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength); const len = getU32(view, 0); const expected = getU32(view, 4);
    if (len > padded.length - 8) throw new Error('Decoded inner length is invalid.');
    const plain = padded.slice(8, 8 + len); if (crc32(plain) !== expected) throw new Error('Inner CRC failed.'); return plain;
  }

  function capacityBytesForSize(size) {
    const table = { 512: 16, 768: 32, 1024: 64, 1536: 128, 2048: 256, 3072: 640, 4096: 1280, 6144: 4096, 7168: 5120, 8192: 6144, 9216: 8192, 10240: 10240, 12288: 14336 };
    return table[size] || 32;
  }
  function choosePlan(plainLen, selected) {
    const need = plainLen + 8 + 50;
    if (selected !== 'auto') { const size = Number(selected); const cap = capacityBytesForSize(size); return { size, pages: Math.max(1, Math.ceil(need / cap)), cap }; }
    const autoSizes = [1024, 1536, 2048, 3072, 4096, 6144, 7168, 8192, 9216, 10240, 12288];
    // Prefer the smallest size that fits within 2 pages.
    for (const size of autoSizes) {
      const cap = capacityBytesForSize(size); const pages = Math.max(1, Math.ceil(need / cap));
      if (pages <= 2) return { size, pages, cap };
    }
    // Otherwise minimize page count by using the largest supported page.
    const size = 12288, cap = capacityBytesForSize(size);
    return { size, pages: Math.max(1, Math.ceil(need / cap)), cap };
  }

  function fieldResolutionForSize(size) { if (size <= 512) return 128; if (size <= 1024) return 224; if (size <= 2048) return 320; if (size <= 4096) return 384; if (size <= 8192) return 448; if (size <= 10240) return 512; return 576; }
  function grayScottStepsForRes(res) { if (res <= 128) return 700; if (res <= 224) return 1200; if (res <= 320) return 1800; if (res <= 384) return 2100; if (res <= 448) return 2400; if (res <= 512) return 2700; return 3000; }
  function smoothStep(t){ t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); }
  function makeSeedField(res, key) {
    const rand = mulberry32(fnv1a(`AP61|seedfield|${key}|${res}`)); const params=[];
    for (let j=0;j<48;j++){ const a=rand()*Math.PI*2; const f=1.25+rand()*13; params.push({ax:Math.cos(a)*f, ay:Math.sin(a)*f, ph:rand()*Math.PI*2, amp:(rand()<0.5?-1:1)*(0.4+rand())}); }
    const out = new Float32Array(res*res); let sum=0;
    for (let y=0;y<res;y++){ const yy=-1+2*y/res; for(let x=0;x<res;x++){ const xx=-1+2*x/res; let v=0; for(const p of params) v += p.amp * Math.sin(Math.PI*2*(p.ax*xx+p.ay*yy)+p.ph); out[y*res+x]=v; sum+=v; } }
    const mean=sum/out.length; let vv=0; for(let i=0;i<out.length;i++){const d=out[i]-mean; vv+=d*d;} const sd=Math.sqrt(vv/out.length)||1; for(let i=0;i<out.length;i++) out[i]=(out[i]-mean)/sd; return out;
  }
  function makeGrayScottField(res, seed32) {
    const key = `ap61:field:${res}:${seed32>>>0}`; if (baseCache.has(key)) return baseCache.get(key);
    const seedField = makeSeedField(res, String(seed32>>>0));
    let U=new Float32Array(res*res), V=new Float32Array(res*res), nU=new Float32Array(res*res), nV=new Float32Array(res*res); U.fill(1);
    for(let i=0;i<seedField.length;i++){ if(seedField[i] > 0.75){ U[i]=0.50; V[i]=0.25; } }
    const F=0.0305, K=0.0575, Du=0.16, Dv=0.08, steps=grayScottStepsForRes(res);
    for(let it=0;it<steps;it++){
      for(let y=1;y<res-1;y++){ const row=y*res; for(let x=1;x<res-1;x++){ const idx=row+x, u=U[idx], v=V[idx]; const lu=U[idx-1]+U[idx+1]+U[idx-res]+U[idx+res]-4*u; const lv=V[idx-1]+V[idx+1]+V[idx-res]+V[idx+res]-4*v; const uvv=u*v*v; let uu=u+Du*lu-uvv+F*(1-u); let vv=v+Dv*lv+uvv-(F+K)*v; if((it&127)===0){ if(uu<0)uu=0; else if(uu>1)uu=1; if(vv<0)vv=0; else if(vv>1)vv=1; } nU[idx]=uu; nV[idx]=vv; } }
      for(let x=0;x<res;x++){ nU[x]=nU[res+x]; nV[x]=nV[res+x]; const b=(res-1)*res+x; nU[b]=nU[b-res]; nV[b]=nV[b-res]; }
      for(let y=0;y<res;y++){ const a=y*res; nU[a]=nU[a+1]; nV[a]=nV[a+1]; const b=y*res+res-1; nU[b]=nU[b-1]; nV[b]=nV[b-1]; }
      let tmp=U; U=nU; nU=tmp; tmp=V; V=nV; nV=tmp;
    }
    const sorted = Array.from(V).sort((a,b)=>a-b); const q=p=>sorted[Math.max(0,Math.min(sorted.length-1,Math.floor(p*(sorted.length-1))))]; const lo=q(0.02), hi=q(0.98);
    const norm=new Float32Array(V.length); for(let i=0;i<V.length;i++) norm[i]=Math.max(0,Math.min(1,(V[i]-lo)/Math.max(1e-6,hi-lo)));
    const sortedN=Array.from(norm).sort((a,b)=>a-b); const threshold=sortedN[Math.floor(0.52*(sortedN.length-1))];
    const out={res,field:norm,threshold,F,K,Du,Dv,steps}; baseCache.set(key,out); return out;
  }
  function sampleFieldValue(fieldObj, x, y, size) {
    const {res,field}=fieldObj; const fx=(x/Math.max(1,size-1))*(res-1), fy=(y/Math.max(1,size-1))*(res-1); const x0=Math.floor(fx), y0=Math.floor(fy), x1=Math.min(res-1,x0+1), y1=Math.min(res-1,y0+1); const tx=fx-x0, ty=fy-y0;
    const a=field[y0*res+x0]*(1-tx)+field[y0*res+x1]*tx; const b=field[y1*res+x0]*(1-tx)+field[y1*res+x1]*tx; return a*(1-ty)+b*ty;
  }
  function toneFromLabyrinth(fieldObj, v) { const z=1/(1+Math.exp(-(v-fieldObj.threshold)*18)); return Math.max(8,Math.min(246,Math.round(10+235*z))); }
  function pageSeed(passphrase, size, pageIndex) { return mix32(fnv1a(`AP61|${passphrase}|${size}|${pageIndex}`)); }
  function makeLabyrinthBytes(size, seed32) {
    const key=`ap61:bytes:${size}:${seed32>>>0}`; if(baseCache.has(key)) return new Uint8ClampedArray(baseCache.get(key));
    const fieldObj=makeGrayScottField(fieldResolutionForSize(size), seed32>>>0); const bytes=new Uint8ClampedArray(size*size);
    for(let y=0;y<size;y++){ const row=y*size; for(let x=0;x<size;x++) bytes[row+x]=toneFromLabyrinth(fieldObj, sampleFieldValue(fieldObj,x,y,size)); }
    bytes.audit={res:fieldObj.res,F:fieldObj.F,K:fieldObj.K,Du:fieldObj.Du,Dv:fieldObj.Dv,steps:fieldObj.steps,threshold:fieldObj.threshold}; baseCache.set(key, new Uint8ClampedArray(bytes)); return bytes;
  }
  function imageDataToGrayBytes(image) { const n=image.width*image.height; const out=new Uint8ClampedArray(n); for(let i=0,j=0;i<n;i++,j+=4) out[i]=Math.round(image.data[j]*.299+image.data[j+1]*.587+image.data[j+2]*.114); return out; }

  function bytesToBits(bytes) { const bits=new Uint8Array(bytes.length*8); let p=0; for(let i=0;i<bytes.length;i++){ const b=bytes[i]; for(let k=7;k>=0;k--) bits[p++]=(b>>>k)&1; } return bits; }
  function bitsToBytes(bits, byteLen) { const out=new Uint8Array(byteLen); let p=0; for(let i=0;i<byteLen;i++){ let b=0; for(let k=0;k<8;k++) b=(b<<1)|(bits[p++]&1); out[i]=b; } return out; }

  function makeCarrierPairs(size, seed32, bitCount) {
    const pairCount = bitCount * CARRIER_REPS; const cacheKey=`ap61:pairs:${size}:${seed32>>>0}:${bitCount}`; if(pointCache.has(cacheKey)) return pointCache.get(cacheKey);
    const base = makeLabyrinthBytes(size, seed32); const step = size >= 12288 ? 9 : size >= 9216 ? 10 : size >= 6144 ? 11 : size >= 2048 ? 10 : size >= 1024 ? 9 : 8; const margin=Math.max(12,Math.round(size*0.028));
    const white=[], black=[]; const seedHash=mix32((seed32>>>0)^fnv1a(`AP61|pairs|${size}`));
    for(let y=margin;y<size-margin;y+=step){ for(let x=margin;x<size-margin;x+=step){ const v=base[y*size+x]; const h=pointHash(seedHash,x,y,white.length+black.length)/4294967296; if(v>205) white.push({x,y,score:h}); else if(v<50) black.push({x,y,score:h}); } }
    white.sort((a,b)=>a.score-b.score); black.sort((a,b)=>a.score-b.score);
    if(white.length < pairCount || black.length < pairCount) throw new Error(`Not enough labyrinth carrier bands. Need ${pairCount}, got white ${white.length}, black ${black.length}. Use a larger page size.`);
    const pairs=[]; for(let i=0;i<pairCount;i++) pairs.push({ w:{x:white[i].x,y:white[i].y}, b:{x:black[i].x,y:black[i].y} });
    pairs.audit={pairCount,white:white.length,black:black.length,step,patchRadius:PATCH_RADIUS,reps:CARRIER_REPS}; pointCache.set(cacheKey,pairs); return pairs;
  }

  function applySoftPatch(bytes, size, x, y, delta) {
    const r=PATCH_RADIUS; const sigma=r/1.55;
    for(let dy=-r;dy<=r;dy++){ for(let dx=-r;dx<=r;dx++){ const xx=x+dx, yy=y+dy; if(xx<0||xx>=size||yy<0||yy>=size) continue; const d2=dx*dx+dy*dy; if(d2>r*r) continue; const w=Math.exp(-d2/(2*sigma*sigma)); const idx=yy*size+xx; bytes[idx]=Math.max(0,Math.min(255,Math.round(bytes[idx]+delta*w))); } }
  }
  function avgResidual(gray, base, size, x, y) {
    const r=READ_RADIUS; let s=0,c=0;
    for(let dy=-r;dy<=r;dy++){ for(let dx=-r;dx<=r;dx++){ const xx=x+dx, yy=y+dy; if(xx<0||xx>=size||yy<0||yy>=size) continue; const d2=dx*dx+dy*dy; if(d2>r*r) continue; const idx=yy*size+xx; s += gray[idx] - base[idx]; c++; } }
    return c ? s/c : 0;
  }
  function renderPageCanvas(chunk, size, passphrase, pageIndex) {
    const cap=capacityBytesForSize(size); if(chunk.length !== cap) throw new Error('Page chunk length must equal fixed capacity.');
    const seed32=pageSeed(passphrase, size, pageIndex); const bytes=makeLabyrinthBytes(size, seed32); const bits=bytesToBits(chunk); const pairs=makeCarrierPairs(size, seed32, bits.length);
    for(let i=0;i<bits.length;i++){
      let votes=[]; for(let r=0;r<CARRIER_REPS;r++) votes.push(pairs[i*CARRIER_REPS+r]);
      for(const p of votes){ const s=bits[i] ? 1 : -1; applySoftPatch(bytes,size,p.w.x,p.w.y, s*PATCH_AMP); applySoftPatch(bytes,size,p.b.x,p.b.y, -s*PATCH_AMP); }
    }
    const canvas=document.createElement('canvas'); canvas.width=size; canvas.height=size; const ctx=canvas.getContext('2d',{willReadFrequently:true}); const image=ctx.createImageData(size,size); const data=image.data;
    for(let i=0,j=0;i<bytes.length;i++,j+=4){ const v=bytes[i]; data[j]=data[j+1]=data[j+2]=v; data[j+3]=255; }
    ctx.putImageData(image,0,0);
    canvas.dataset.ap61Audit=JSON.stringify({carrier:'AP61.7 2-Page Priority Dense Labyrinth',dotCarrier:false,explicitBinaryDots:false,fixedQrGrid:false,postPixelSoftBandModulation:true,pureGenerationCondition:false,visualCore:'AP59.5-style labyrinth values F=0.0305 k=0.0575',capacityBytes:cap,carrierPairs:pairs.audit});
    return canvas;
  }
  function decodeChunkFromCanvas(canvas, passphrase, pageIndex) {
    const size=canvas.width; if(canvas.height !== size) throw new Error('Page must be square.'); const cap=capacityBytesForSize(size); const seed32=pageSeed(passphrase,size,pageIndex);
    const base=makeLabyrinthBytes(size,seed32); const bits=new Uint8Array(cap*8); const pairs=makeCarrierPairs(size,seed32,bits.length);
    const ctx=canvas.getContext('2d',{willReadFrequently:true}); const gray=imageDataToGrayBytes(ctx.getImageData(0,0,size,size));
    for(let i=0;i<bits.length;i++){ let score=0; for(let r=0;r<CARRIER_REPS;r++){ const p=pairs[i*CARRIER_REPS+r]; const rw=avgResidual(gray,base,size,p.w.x,p.w.y); const rb=avgResidual(gray,base,size,p.b.x,p.b.y); score += rw - rb; } bits[i] = score >= 0 ? 1 : 0; }
    return bitsToBytes(bits,cap);
  }

  function imageTargetBytesForOnePage(noteText) {
    const selected = $('pageSize') ? $('pageSize').value : 'auto';
    const size = selected === 'auto' ? 8192 : Number(selected);
    const cap = capacityBytesForSize(size || 8192);
    const noteBytes = enc.encode(noteText || '').length;
    return Math.max(900, cap - noteBytes - 760);
  }
  function fileNameWithSuffix(name, suffix, ext) {
    const safe = safeName(name || 'image');
    const base = safe.replace(/\.[^.\/\\]+$/, '') || 'image';
    return base + suffix + ext;
  }
  function imageCompressedName(name, mime) {
    if (mime === 'image/png') return fileNameWithSuffix(name, '-optimized', '.png');
    if (mime === 'image/webp') return fileNameWithSuffix(name, '-optimized', '.webp');
    return fileNameWithSuffix(name, '-optimized', '.jpg');
  }
  function bytesLabel(n) {
    if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
    if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
    return String(n) + ' B';
  }
  async function canvasToBytes(canvas, type, quality) {
    const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Image optimization failed.')), type, quality));
    return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: blob.type || type };
  }
  async function compressImageFileForCypher(file, preset, noteText) {
    if (!file || !(file.type || '').startsWith('image/') || preset === 'original') return null;
    const targetBytes = imageTargetBytesForOnePage(noteText);
    const originalBytes = new Uint8Array(await file.arrayBuffer());
    const bitmap = await createImageBitmap(file);
    const origW = bitmap.width, origH = bitmap.height;

    const candidates = [];
    candidates.push({
      bytes: originalBytes,
      fileName: safeName(file.name),
      fileMime: file.type || 'application/octet-stream',
      w: origW,
      h: origH,
      quality: null,
      codec: 'original',
      maxDim: Math.max(origW, origH)
    });

    const draw = async (maxDim, type, quality) => {
      const scale = Math.min(1, maxDim / Math.max(origW, origH));
      const w = Math.max(1, Math.round(origW * scale));
      const h = Math.max(1, Math.round(origH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);
      try {
        const out = await canvasToBytes(canvas, type, quality);
        return {
          bytes: out.bytes,
          fileName: imageCompressedName(file.name, out.mime),
          fileMime: out.mime,
          w, h, quality, maxDim,
          codec: out.mime.split('/')[1] || type
        };
      } catch (_) {
        return null;
      }
    };

    let dims = [];
    if (preset === 'small') dims = [[384,0.55],[320,0.50],[256,0.45]];
    else if (preset === 'balanced') dims = [[768,0.72],[640,0.68],[512,0.62]];
    else if (preset === 'high') dims = [[1280,0.82],[1024,0.78],[768,0.74]];
    else dims = [
      [1024,0.76],[896,0.72],[768,0.68],[640,0.62],[512,0.56],[448,0.52],[384,0.48],[320,0.44],[256,0.40],[224,0.36],[192,0.32],[160,0.28],[128,0.25],[96,0.22]
    ];

    for (const [dim, q] of dims) {
      const jpeg = await draw(dim, 'image/jpeg', q);
      if (jpeg) candidates.push(jpeg);
      // PNG is often much better than JPEG for line art / black-and-white images.
      const png = await draw(dim, 'image/png', undefined);
      if (png) candidates.push(png);
      // WebP is useful for photos when supported, but do not rely on it exclusively.
      const webp = await draw(dim, 'image/webp', Math.min(0.86, Math.max(0.20, q)));
      if (webp) candidates.push(webp);

      if (preset !== 'onepage') break;
      const fitting = candidates.filter(c => c.bytes.length <= targetBytes);
      if (fitting.length) break;
    }
    bitmap.close && bitmap.close();

    let fitting = candidates.filter(c => c.bytes.length <= targetBytes);
    let best = null;
    if (preset === 'onepage' && fitting.length) {
      // Prefer the highest pixel count that still fits; if tied, smaller bytes win.
      fitting.sort((a,b) => (b.w*b.h - a.w*a.h) || (a.bytes.length - b.bytes.length));
      best = fitting[0];
    } else {
      candidates.sort((a,b) => a.bytes.length - b.bytes.length);
      best = candidates[0];
    }

    if (!best) return null;
    return {
      fileName: best.fileName,
      fileMime: best.fileMime,
      fileBytes: best.bytes,
      info: {
        preset,
        originalName: safeName(file.name),
        originalBytes: file.size || originalBytes.length,
        compressedBytes: best.bytes.length,
        originalWidth: origW,
        originalHeight: origH,
        width: best.w,
        height: best.h,
        quality: best.quality,
        targetBytes,
        codec: best.codec,
        usedOriginal: best.codec === 'original'
      }
    };
  }
  function optimizeInfoText(info) {
    if (!info) return '';
    const jp = lang === 'ja';
    const fit = info.compressedBytes <= info.targetBytes;
    const qText = info.quality == null ? '' : ` / q${info.quality.toFixed(2)}`;
    const codecText = info.usedOriginal ? 'original' : (info.codec || 'optimized');
    if (jp) {
      return `画像最適化: ${bytesLabel(info.originalBytes)} → ${bytesLabel(info.compressedBytes)} / ${info.originalWidth}×${info.originalHeight} → ${info.width}×${info.height} / ${codecText}${qText}${fit ? ' / 1ページ目標内' : ' / 1ページ目標超過'}`;
    }
    return `Image optimization: ${bytesLabel(info.originalBytes)} → ${bytesLabel(info.compressedBytes)} / ${info.originalWidth}×${info.originalHeight} → ${info.width}×${info.height} / ${codecText}${qText}${fit ? ' / within 1-page target' : ' / above 1-page target'}`;
  }

  async function collectPayload() {
    if (mode === 'text') { const text=$('plainText').value; if(!text) throw new Error(t('textEmpty')); return { type:TYPE_TEXT, name:'text.txt', mime:'text/plain;charset=utf-8', bytes:enc.encode(text) }; }
    if (mode === 'url') { const url=$('urlText').value.trim(); if(!/^https?:\/\//i.test(url)) throw new Error(t('urlInvalid')); return { type:TYPE_URL, name:'url.txt', mime:'text/plain;charset=utf-8', bytes:enc.encode(url) }; }
    const file=$('filePayload').files && $('filePayload').files[0]; if(!file) throw new Error(t('chooseFile'));
    const note=$('fileNote').value || '';
    const preset=$('imageOptimize') ? $('imageOptimize').value : 'original';
    const optimized=await compressImageFileForCypher(file,preset,note);
    let fileBytes, fileName, fileMime;
    if(optimized){ fileBytes=optimized.fileBytes; fileName=optimized.fileName; fileMime=optimized.fileMime; lastOptimizeInfo=optimized.info; }
    else { fileBytes=new Uint8Array(await file.arrayBuffer()); fileName=safeName(file.name); fileMime=file.type || 'application/octet-stream'; lastOptimizeInfo=null; }
    if(note) return { mixed:true, text:note, fileName, fileMime, fileBytes };
    return { type:TYPE_FILE, name:fileName, mime:fileMime, bytes:fileBytes };
  }

  async function makeCypher() {
    try {
      const pass=$('makePass').value; if(!pass) throw new Error(t('passEmpty')); lastOptimizeInfo=null; setStatus(ui.makeStatus,t('preparing'));
      const payload=await collectPayload(); const plain=payload.mixed ? await makeMixedPackage(payload.text,payload.fileName,payload.fileMime,payload.fileBytes) : await makePlainPackage(payload.type,payload.name,payload.mime,payload.bytes);
      const plan=choosePlan(plain.length, $('pageSize').value); const totalCap=plan.cap*plan.pages; setStatus(ui.makeStatus,t('encrypting'));
      const bundle=await encryptFixedCapacity(plain,pass,totalCap); const pages=[]; for(let i=0;i<plan.pages;i++) pages.push(bundle.slice(i*plan.cap,(i+1)*plan.cap));
      currentBuild={pages,size:plan.size,cap:plan.cap,pass,plainBytes:plain.length}; renderOutputList(); setStatus(ui.makeStatus,t('makePassStatus',{bytes:plain.length,pages:pages.length,size:plan.size}) + (lastOptimizeInfo ? '\n' + optimizeInfoText(lastOptimizeInfo) : ''),'ok');
    } catch(e){ console.error(e); setStatus(ui.makeStatus,e.message || String(e),'err'); }
  }

  function renderOutputList() {
    if(!currentBuild) return; ui.outputPanel.classList.remove('hidden'); ui.pageSummary.textContent=t('pageSummary',{pages:currentBuild.pages.length,size:currentBuild.size}); ui.previewWrap.innerHTML='';
    const preview=renderPageCanvas(currentBuild.pages[0],currentBuild.size,currentBuild.pass,0); ui.previewWrap.appendChild(preview); ui.pageList.innerHTML='';
    currentBuild.pages.forEach((chunk,i)=>{ const card=document.createElement('div'); card.className='page-card'; card.innerHTML=`<strong>page ${i+1} / ${currentBuild.pages.length}</strong><span>${t('pageCard',{used:chunk.length,cap:currentBuild.cap})}</span>`; const btn=document.createElement('button'); btn.type='button'; btn.textContent=t('savePage',{num:i+1}); btn.addEventListener('click',async()=>{ const old=btn.textContent; btn.textContent=t('rendering'); btn.disabled=true; try{ const canvas=i===0?preview:renderPageCanvas(chunk,currentBuild.size,currentBuild.pass,i); const blob=await canvasToBlob(canvas); triggerDownload(blob,`turing-ap61-page-${String(i+1).padStart(3,'0')}-of-${String(currentBuild.pages.length).padStart(3,'0')}.png`); } finally { btn.disabled=false; btn.textContent=old; } }); card.appendChild(btn); ui.pageList.appendChild(card); });
  }
  async function canvasToBlob(canvas) { return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG export failed.')),'image/png')); }
  function triggerDownload(blob, filename) { const a=document.createElement('a'); const url=URL.createObjectURL(blob); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000); }
  async function blobToBytes(blob){ return new Uint8Array(await blob.arrayBuffer()); }

  async function readImageFileToCanvas(file) { const bitmap=await createImageBitmap(file); const canvas=document.createElement('canvas'); canvas.width=bitmap.width; canvas.height=bitmap.height; const ctx=canvas.getContext('2d',{willReadFrequently:true}); ctx.drawImage(bitmap,0,0); bitmap.close && bitmap.close(); return canvas; }
  async function readPages() {
    try { const pass=$('readPass').value; if(!pass) throw new Error(t('passEmpty')); const files=Array.from($('readFiles').files || []); if(!files.length) throw new Error(t('choosePng')); files.sort((a,b)=>a.name.localeCompare(b.name)); setStatus(ui.readStatus,t('reading')); const chunks=[]; let size=null;
      for(let i=0;i<files.length;i++){ setStatus(ui.readStatus,t('readProgress',{i:i+1,total:files.length})); const canvas=await readImageFileToCanvas(files[i]); if(size===null) size=canvas.width; if(canvas.width!==size||canvas.height!==size) throw new Error('All pages must have the same square size.'); chunks.push(decodeChunkFromCanvas(canvas,pass,i)); await new Promise(r=>setTimeout(r,10)); }
      setStatus(ui.readStatus,t('decrypting')); const bundle=concatBytes(chunks); const plain=await decryptFixedCapacity(bundle,pass); const parsed=await parsePlainPackage(plain); await renderReadResult(parsed); setStatus(ui.readStatus,t('readPassStatus',{bytes:plain.length,pages:files.length}),'ok');
    } catch(e){ console.error(e); setStatus(ui.readStatus,e.message || String(e),'err'); ui.readResult.classList.add('hidden'); }
  }

  async function renderReadResult(payload) {
    ui.readResult.innerHTML=''; ui.readResult.classList.remove('hidden');
    if(payload.kind==='mixed') { const h=document.createElement('h3'); h.textContent=t('recoveredImageTextFile'); ui.readResult.appendChild(h); if(payload.text){ const pre=document.createElement('div'); pre.className='decoded-text-box'; pre.textContent=payload.text; ui.readResult.appendChild(pre); } addFileDownload(payload.fileBytes,payload.fileName,payload.fileMime); return; }
    if(payload.type===TYPE_TEXT || payload.type===TYPE_URL){ const h=document.createElement('h3'); h.textContent=payload.type===TYPE_URL?t('recoveredUrl'):t('recoveredText'); ui.readResult.appendChild(h); const text=dec.decode(payload.payload); const pre=document.createElement('div'); pre.className='decoded-text-box'; pre.textContent=text; ui.readResult.appendChild(pre); const copy=document.createElement('button'); copy.type='button'; copy.className='copy-text-btn'; copy.textContent=t('copyText'); copy.addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText(text); copy.textContent=t('copied'); }catch{ copy.textContent=t('copyFailed'); } setTimeout(()=>copy.textContent=t('copyText'),1200); }); ui.readResult.appendChild(copy); if(payload.type===TYPE_URL){ const a=document.createElement('a'); a.className='download'; a.href=text; a.target='_blank'; a.rel='noopener'; a.textContent=t('openUrl'); ui.readResult.appendChild(document.createElement('br')); ui.readResult.appendChild(a); } return; }
    const h=document.createElement('h3'); h.textContent=t('recoveredFile'); ui.readResult.appendChild(h); addFileDownload(payload.payload,payload.name,payload.mime);
  }
  function addFileDownload(bytes,name,mime){ const p=document.createElement('p'); p.textContent=t('fileInfo',{name,mime,bytes:bytes.length}); ui.readResult.appendChild(p); const blob=new Blob([bytes],{type:mime||'application/octet-stream'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name||'payload.bin'; a.className='download'; a.textContent=t('saveRecoveredFile'); ui.readResult.appendChild(a); if((mime||'').startsWith('image/')){ const wrap=document.createElement('div'); wrap.className='recovered-preview'; const img=document.createElement('img'); img.src=a.href; wrap.appendChild(img); ui.readResult.appendChild(wrap); } }

  function zipDosTimeDate(date=new Date()){ let time=((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31); let d=Math.max(1980,date.getFullYear()); let z=(((d-1980)&127)<<9)|(((date.getMonth()+1)&15)<<5)|(date.getDate()&31); return {time,date:z}; }
  function putZipU16(a,o,n){ a[o]=n&255; a[o+1]=(n>>>8)&255; } function putZipU32(a,o,n){ a[o]=n&255; a[o+1]=(n>>>8)&255; a[o+2]=(n>>>16)&255; a[o+3]=(n>>>24)&255; }
  function makeStoredZip(entries){ const localParts=[],centralParts=[]; let offset=0; const now=zipDosTimeDate(); for(const entry of entries){ const nameBytes=enc.encode(entry.name); const data=entry.data; const crc=crc32(data); const local=new Uint8Array(30+nameBytes.length); putZipU32(local,0,0x04034b50); putZipU16(local,4,20); putZipU16(local,6,0); putZipU16(local,8,0); putZipU16(local,10,now.time); putZipU16(local,12,now.date); putZipU32(local,14,crc); putZipU32(local,18,data.length); putZipU32(local,22,data.length); putZipU16(local,26,nameBytes.length); putZipU16(local,28,0); local.set(nameBytes,30); localParts.push(local,data); const central=new Uint8Array(46+nameBytes.length); putZipU32(central,0,0x02014b50); putZipU16(central,4,20); putZipU16(central,6,20); putZipU16(central,8,0); putZipU16(central,10,0); putZipU16(central,12,now.time); putZipU16(central,14,now.date); putZipU32(central,16,crc); putZipU32(central,20,data.length); putZipU32(central,24,data.length); putZipU16(central,28,nameBytes.length); putZipU16(central,30,0); putZipU16(central,32,0); putZipU16(central,34,0); putZipU16(central,36,0); putZipU32(central,38,0); putZipU32(central,42,offset); central.set(nameBytes,46); centralParts.push(central); offset += local.length + data.length; } const centralSize=centralParts.reduce((n,p)=>n+p.length,0); const eocd=new Uint8Array(22); putZipU32(eocd,0,0x06054b50); putZipU16(eocd,4,0); putZipU16(eocd,6,0); putZipU16(eocd,8,entries.length); putZipU16(eocd,10,entries.length); putZipU32(eocd,12,centralSize); putZipU32(eocd,16,offset); putZipU16(eocd,20,0); return new Blob([...localParts,...centralParts,eocd],{type:'application/zip'}); }
  async function saveAllPages(){ if(!currentBuild) return; ui.downloadAllBtn.disabled=true; const old=ui.downloadAllBtn.textContent; try{ const entries=[]; for(let i=0;i<currentBuild.pages.length;i++){ ui.downloadAllBtn.textContent=t('renderingAll',{i:i+1,total:currentBuild.pages.length}); const canvas=renderPageCanvas(currentBuild.pages[i],currentBuild.size,currentBuild.pass,i); const blob=await canvasToBlob(canvas); entries.push({name:`turing-ap61-page-${String(i+1).padStart(3,'0')}-of-${String(currentBuild.pages.length).padStart(3,'0')}.png`,data:await blobToBytes(blob)}); await new Promise(r=>setTimeout(r,20)); } ui.downloadAllBtn.textContent=t('buildingZip'); triggerDownload(makeStoredZip(entries),`turing-ap61-${currentBuild.size}px-${currentBuild.pages.length}page.zip`); } finally { ui.downloadAllBtn.disabled=false; ui.downloadAllBtn.textContent=old; } }
  async function selfCheck(){
    if(!currentBuild) return;
    try{
      ui.selfCheckBtn.disabled=true;
      const canvases=[];
      for(let i=0;i<currentBuild.pages.length;i++){
        ui.selfCheckBtn.textContent=t('renderingAll',{i:i+1,total:currentBuild.pages.length});
        const rendered=renderPageCanvas(currentBuild.pages[i],currentBuild.size,currentBuild.pass,i);
        const blob=await canvasToBlob(rendered);
        canvases.push(await readImageFileToCanvas(blob));
      }
      const chunks=[];
      for(let i=0;i<canvases.length;i++) chunks.push(decodeChunkFromCanvas(canvases[i],currentBuild.pass,i));
      const plain=await decryptFixedCapacity(concatBytes(chunks),currentBuild.pass);
      await parsePlainPackage(plain);
      setStatus(ui.makeStatus,t('selfCheckPass',{bytes:plain.length,pages:currentBuild.pages.length}),'ok');
    } catch(e){
      console.error(e);
      setStatus(ui.makeStatus,'SELF CHECK FAIL: '+(e.message||String(e)),'err');
    } finally {
      ui.selfCheckBtn.disabled=false;
      ui.selfCheckBtn.textContent=t('selfCheck');
    }
  }

  function setMode(m){ mode=m; document.querySelectorAll('.seg').forEach(b=>b.classList.toggle('active',b.dataset.mode===m)); $('textBox').classList.toggle('hidden',m!=='text'); $('urlBox').classList.toggle('hidden',m!=='url'); $('fileBox').classList.toggle('hidden',m!=='file'); }
  document.querySelectorAll('.seg').forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.mode)));
  $('langJa')?.addEventListener('click',()=>{lang='ja';localStorage.setItem('tc_lang',lang);applyLanguage();}); $('langEn')?.addEventListener('click',()=>{lang='en';localStorage.setItem('tc_lang',lang);applyLanguage();});
  ui.makeBtn.addEventListener('click',makeCypher); ui.readBtn.addEventListener('click',readPages); ui.downloadAllBtn.addEventListener('click',saveAllPages); ui.selfCheckBtn.addEventListener('click',selfCheck); ui.clearBtn.addEventListener('click',()=>{currentBuild=null;ui.outputPanel.classList.add('hidden');ui.previewWrap.innerHTML='';ui.pageList.innerHTML='';setStatus(ui.makeStatus,'');});
  applyLanguage(); setMode('text');
})();
