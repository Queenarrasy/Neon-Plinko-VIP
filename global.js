/**
 * GLOBAL.JS — Neon Plinko VIP  v4.1  FIXED SESSION BUG
 *
 * ROOT CAUSE PENYEBAB REDIRECT LOOP:
 * [1] DOMContentLoaded di global.js bentrok dengan init() di tiap halaman
 * [2] saveSession() overwrite seluruh object — username bisa hilang
 * [3] requireLogin() setTimeout redirect — bisa double redirect
 * [4] apiGetSaldo() overwrite session — hapus field username
 * [5] apiGamePlay() showToast error padahal result SUCCESS
 */

const GAS_URL = "https://script.google.com/macros/s/AKfycbzYTC11njbEBtAsdpbaRLJRt13j7iEKCkANV1SgxxguV_zFUyZ6Z7FAj0SKuw4d5ThmKw/exec";

const TIER_CONFIG = {
  MEMBER:   { minDepo:0,         color:"#aaaaaa", icon:"👤" },
  SILVER:   { minDepo:500000,    color:"#c0c0c0", icon:"🥈" },
  GOLD:     { minDepo:1000000,   color:"#ffd700", icon:"🥇" },
  PLATINUM: { minDepo:3000000,   color:"#e5e4e2", icon:"💎" },
  DIAMOND:  { minDepo:10000000,  color:"#b9f2ff", icon:"💠" },
};
const DEPOSIT_CONFIG  = { MIN_QRIS: 20000 };
const WITHDRAW_CONFIG = { MIN_WD: 50000 };
const DAILY_BONUS = 1000;

// FIX [1+2]: Inisialisasi synchronous — tidak pakai DOMContentLoaded
let currentUser = (function() {
  try { const r = localStorage.getItem("plinko_session"); return r ? JSON.parse(r) : null; }
  catch(e) { return null; }
})();

// FIX [2]: Selalu MERGE — tidak replace
function saveSession(data) {
  const merged = Object.assign({}, currentUser || {}, data);
  currentUser  = merged;
  try { localStorage.setItem("plinko_session", JSON.stringify(merged)); } catch(e) {}
}

function loadSession() {
  try { const r = localStorage.getItem("plinko_session"); currentUser = r ? JSON.parse(r) : null; }
  catch(e) { currentUser = null; }
  return currentUser;
}

function clearSession() {
  currentUser = null;
  try { localStorage.removeItem("plinko_session"); } catch(e) {}
}

// FIX [3]: Redirect langsung pakai replace() + flag anti double-redirect
function requireLogin(redirectUrl = "index.html") {
  if (!currentUser) loadSession();
  if (!currentUser || !currentUser.username) {
    if (!window._isRedirecting) {
      window._isRedirecting = true;
      window.location.replace(redirectUrl);
    }
    return null;
  }
  return currentUser;
}

function formatRupiah(amount) { return "Rp " + Number(amount||0).toLocaleString("id-ID"); }
function fmtNow() {
  return new Date().toLocaleString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
function setLoading(show) { const el=document.getElementById("loading"); if(el) el.style.display=show?"flex":"none"; }

function showToast(message, type="info") {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div"); t.id="toast";
    t.style.cssText="position:fixed;bottom:30px;left:50%;transform:translateX(-50%);padding:12px 28px;border-radius:10px;font-weight:bold;color:#fff;z-index:99999;font-size:14px;transition:opacity 0.4s;pointer-events:none;text-align:center;max-width:90vw;box-shadow:0 4px 16px rgba(0,0,0,0.4)";
    document.body.appendChild(t);
  }
  const c={success:"#28a745",error:"#dc3545",info:"#0d6efd",warning:"#ffc107"};
  t.style.background=c[type]||c.info; t.style.opacity="1"; t.textContent=message;
  clearTimeout(t._t); t._t=setTimeout(()=>{t.style.opacity="0";},3500);
}

function renderTierBadge(tier) {
  const cfg=TIER_CONFIG[tier]||TIER_CONFIG.MEMBER;
  return `<span style="color:${cfg.color};font-weight:bold;">${cfg.icon} ${tier}</span>`;
}
function renderStatus(status) {
  const m={PROSES:["#f0ad4e","⏳ Proses"],BERHASIL:["#28a745","✅ Berhasil"],SUCCESS:["#28a745","✅ Berhasil"],REJECT:["#dc3545","❌ Ditolak"],FAILED:["#dc3545","❌ Gagal"]};
  const [c,l]=m[String(status).toUpperCase()]||["#aaa",status];
  return `<span style="color:${c};font-weight:bold;">${l}</span>`;
}
function renderHistoryTable(containerId, data, type="depo") {
  const el=document.getElementById(containerId); if(!el) return;
  if(!data||!data.length){el.innerHTML=`<p style="text-align:center;color:#888;padding:16px;">Belum ada riwayat.</p>`;return;}
  const isWd=type==="wd";
  const rows=data.map(r=>`<tr><td style="padding:8px">${r.tanggal}</td><td style="padding:8px">${isWd?formatRupiah(r.jumlah):(r.nominalIDR?formatRupiah(r.nominalIDR):r.nominalCrypto)}</td><td style="padding:8px">${isWd?(r.bank+" - "+r.rekening):(r.method||"QRIS")}</td><td style="padding:8px">${renderStatus(r.status)}</td></tr>`).join("");
  el.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#1a1a2e;color:#eee;"><th style="padding:8px">Tanggal</th><th style="padding:8px">Nominal</th><th style="padding:8px">${isWd?"Rekening":"Metode"}</th><th style="padding:8px">Status</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function postToGAS(payload) {
  setLoading(true);
  try { const r=await fetch(GAS_URL,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify(payload)}); return await r.json(); }
  catch(err) { showToast("Gagal terhubung ke server.","error"); return {result:"ERROR",message:err.toString()}; }
  finally { setLoading(false); }
}
async function getFromGAS(params) {
  setLoading(true);
  try { const enc=encodeURIComponent(JSON.stringify(params)); const r=await fetch(`${GAS_URL}?data=${enc}`); return await r.json(); }
  catch(err) { showToast("Gagal terhubung ke server.","error"); return {result:"ERROR",message:err.toString()}; }
  finally { setLoading(false); }
}

async function apiLogin(username, password) {
  const res = await postToGAS({action:"login",username,password});
  if(res.result==="SUCCESS") { saveSession({...res,username:username}); showToast("Selamat datang, "+res.fullname+"! 🎉","success"); }
  else showToast(res.message||"Login gagal.","error");
  return res;
}
async function apiRegister(p) {
  const res = await postToGAS({action:"register",...p});
  if(res.result==="SUCCESS") showToast("Registrasi berhasil! Kode referral: "+res.refCode,"success");
  else showToast(res.message||"Registrasi gagal.","error");
  return res;
}
function apiLogout(redirectUrl="index.html") {
  const u=currentUser?.username||"";
  clearSession();
  if(u) postToGAS({action:"set_status",username:u,status:"OFFLINE"}).catch(()=>{});
  showToast("Berhasil logout.","info");
  setTimeout(()=>{window.location.replace(redirectUrl);},700);
}

async function apiGetProfile(username) { return await getFromGAS({action:"get_profile",username}); }

// FIX [4]: Hanya update field tertentu, tidak overwrite seluruh session
async function apiGetSaldo(username) {
  const res = await getFromGAS({action:"get_saldo",username});
  if(res.result==="SUCCESS" && currentUser) {
    currentUser.saldo=res.saldo; currentUser.tier=res.tier; currentUser.winrate=res.winrate;
    try{localStorage.setItem("plinko_session",JSON.stringify(currentUser));}catch(e){}
    const el=document.getElementById("saldoDisplay"); if(el) el.textContent=formatRupiah(res.saldo);
  }
  return res;
}
async function apiSetStatus(username, status) { return await postToGAS({action:"set_status",username,status}); }
async function apiSetSessionStart(username)   { return await postToGAS({action:"set_session_start",username}); }
async function apiGetGameConfig(username)     { return await getFromGAS({action:"get_game_config",username}); }

// FIX [5]: Tidak showToast error — biarkan halaman yang handle
async function apiGamePlay(username, bet, saldoAwal) {
  const res = await postToGAS({action:"game_play",username,bet,saldoAwal});
  if(res.result==="SUCCESS" && currentUser) {
    currentUser.saldo=res.newSaldo;
    try{localStorage.setItem("plinko_session",JSON.stringify(currentUser));}catch(e){}
  }
  return res;
}

async function apiDepositQRIS(username, nominalIDR) {
  if(nominalIDR<DEPOSIT_CONFIG.MIN_QRIS){showToast(`Minimal deposit QRIS ${formatRupiah(DEPOSIT_CONFIG.MIN_QRIS)}`,"error");return{result:"ERROR"};}
  const res=await postToGAS({action:"deposit",username,nominalIDR,nominalCrypto:"",method:"QRIS",tanggal:fmtNow()});
  res.result==="SUCCESS"?showToast("Deposit QRIS berhasil diajukan!","success"):showToast(res.message||"Deposit gagal.","error");
  return res;
}
async function apiDepositCrypto(username, nominalCrypto) {
  const res=await postToGAS({action:"deposit",username,nominalIDR:0,nominalCrypto,method:"CRYPTO",tanggal:fmtNow()});
  res.result==="SUCCESS"?showToast("Deposit Crypto berhasil diajukan!","success"):showToast(res.message||"Deposit gagal.","error");
  return res;
}
async function apiGetDepoHistory(username) { return await getFromGAS({action:"get_deposit_history",username}); }

async function apiWithdraw(username, jumlah, namaLengkap, bank, rekening) {
  if(jumlah<WITHDRAW_CONFIG.MIN_WD){showToast(`Minimal withdraw ${formatRupiah(WITHDRAW_CONFIG.MIN_WD)}`,"error");return{result:"ERROR"};}
  const res=await postToGAS({action:"withdraw",username,jumlah,namaLengkap,bank,rekening,tanggal:fmtNow()});
  if(res.result==="SUCCESS"){showToast("Withdraw berhasil diajukan!","success");if(currentUser){currentUser.saldo=res.newSaldo;try{localStorage.setItem("plinko_session",JSON.stringify(currentUser));}catch(e){}}}
  else showToast(res.message||"Withdraw gagal.","error");
  return res;
}
async function apiGetWDHistory(username) { return await getFromGAS({action:"get_withdraw_history",username}); }

async function apiGetInbox(username) { return await getFromGAS({action:"get_inbox",username}); }
async function apiClaimInbox(username, id, saldo) {
  const res=await postToGAS({action:"claim_inbox",username,id,saldo});
  if(res.result==="SUCCESS"){showToast("Reward inbox diklaim! 🎁","success");if(currentUser){currentUser.saldo=res.newSaldo;try{localStorage.setItem("plinko_session",JSON.stringify(currentUser));}catch(e){}}}
  else showToast(res.message||"Gagal klaim inbox.","error");
  return res;
}

async function apiClaimDaily(username) {
  const res=await postToGAS({action:"claim_daily",username});
  if(res.result==="SUCCESS"){showToast(`Bonus harian ${formatRupiah(res.bonus)} diklaim! 🎉`,"success");if(currentUser){currentUser.saldo=res.newSaldo;try{localStorage.setItem("plinko_session",JSON.stringify(currentUser));}catch(e){}}}
  else showToast(res.message||"Gagal klaim bonus.","error");
  return res;
}

async function apiGetReferrals(username) { return await getFromGAS({action:"get_referrals",username}); }
async function apiClaimReferral(username) {
  const res=await postToGAS({action:"claim_referral",username});
  if(res.result==="SUCCESS"){showToast(`Bonus referral ${formatRupiah(res.bonus)} diklaim! 🎉`,"success");if(currentUser){currentUser.saldo=res.newSaldo;try{localStorage.setItem("plinko_session",JSON.stringify(currentUser));}catch(e){}}}
  else showToast(res.message||"Gagal klaim referral.","error");
  return res;
}

async function adminGetAllUsers()        { return await getFromGAS({action:"getAllUsers"}); }
async function adminGetPendingDeposits() { return await getFromGAS({action:"get_pending_deposits"}); }
async function adminApproveDeposit(row) {
  const res=await postToGAS({action:"approve_deposit",row});
  res.result==="SUCCESS"?showToast("Deposit di-approve! ✅","success"):showToast(res.message||"Gagal approve.","error");
  return res;
}
async function adminUpdateWinrate(targetUser, newRate) {
  const res=await postToGAS({action:"updateWinrate",targetUser,newRate});
  res.result==="SUCCESS"?showToast(`Winrate ${targetUser} → ${newRate}%`,"success"):showToast(res.message||"Gagal.","error");
  return res;
}
async function adminUpdateSaldo(targetUser, amount) {
  const res=await postToGAS({action:"adminUpdateSaldo",targetUser,amount});
  res.result==="SUCCESS"?showToast(`Saldo ${targetUser} → ${formatRupiah(res.newSaldo)}`,"success"):showToast(res.message||"Gagal.","error");
  return res;
}
async function adminSetMaxwinLimit(targetUser, maxwin) {
  const res=await postToGAS({action:"setMaxwinLimit",targetUser,maxwin});
  res.result==="SUCCESS"?showToast(`MaxWin ${targetUser} → ${formatRupiah(maxwin)}`,"success"):showToast(res.message||"Gagal.","error");
  return res;
}
async function adminSetGlobalPanic(minutes) {
  const res=await postToGAS({action:"set_global_panic",minutes});
  if(res.result==="SUCCESS") minutes>0?showToast(`⚠️ PANIC AKTIF ${minutes} menit!`,"warning"):showToast("✅ Panic dimatikan.","success");
  else showToast(res.message||"Gagal.","error");
  return res;
}
