/* config.js — ISI MANUAL: tujuan "Hubungi Kami".
   Bisa juga ditimpa dari luar sebelum script dimuat:  window.GameMenuContact = { whatsapp:'62...', email:'...' } */
window.GameMenuContact = Object.assign({
  appName: 'Monopoli Indonesia',
  whatsapp: '085643885757',            // ← ISI: nomor WhatsApp, format internasional tanpa "+" dan spasi, contoh '6281234567890'
  whatsappText: 'Halo, saya butuh bantuan untuk game Monopoli Indonesia.',
  email: 'hafizfm14@gmail.com',               // ← ISI: email tujuan, contoh 'support@gamekamu.com'
  emailSubject: 'Masukan Monopoli Indonesia',
  endpoint: ''             // ← (opsional) URL server untuk tombol KIRIM; dikirim POST JSON {email,message,app,time}.
                           //    Kosong = tombol KIRIM membuka aplikasi email ke alamat di atas.
}, window.GameMenuContact || {});
