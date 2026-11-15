import React, { useEffect, useState } from 'react';
import '../../styles/how-to-play.css';

const HOW_TO_PLAY_TABS = [
  {
    tab: 'Dasar Game',
    title: 'DASAR PERMAINAN',
    items: [
      {
        h: '1. Melangkah',
        img: 'how_01',
        t: 'Setiap giliran, lempar dadu dan jalankan pionmu mengelilingi papan sesuai total angka yang didapat.',
      },
      {
        h: '2. Dadu Kembar',
        img: 'how_02',
        t: 'Kalau angkanya kembar (misal dadu 3 dan 3), kamu dapat bonus untuk lempar dadu dan jalan satu kali lagi! Tapi awas, kalau kembar 3 kali berturut-turut, kamu langsung masuk Penjara.',
      },
      {
        h: '3. Gaji Keliling',
        img: 'how_03',
        t: 'Setiap kali pionmu berjalan satu putaran penuh dan melewati petak START, kamu akan menerima uang Gaji dari Bank.',
      },
      {
        h: '4. Berhenti di Petak',
        img: 'how_04',
        t: 'Aksimu ditentukan oleh petak tempatmu mendarat. Kamu bisa mendapat kesempatan membeli tanah kosong, atau sebaliknya... uangmu akan berkurang untuk membayar sewa jika mendarat di tanah milik lawan!',
      },
    ],
  },
  {
    tab: 'Beli & Bangun',
    title: 'BELI & BANGUN',
    items: [
      {
        h: '1. Membeli Tanah',
        img: 'how_05',
        t: 'Jika kamu mendarat di petak negara yang belum dimiliki siapa pun, kamu berhak membelinya dari Bank. Setelah dibeli, kamu resmi memegang Bukti Hak Miliknya!',
      },
      {
        h: '2. Menagih Sewa',
        img: 'how_06',
        t: 'Setiap kali lawan mendarat di tanah milikmu, mereka wajib membayar uang sewa kepadamu.',
      },
      {
        h: '3. Kuasai Satu Kompleks (Warna)',
        img: 'how_07',
        t: 'Incar dan belilah semua tanah dengan warna blok yang sama. Jika satu warna sudah berhasil kamu kumpulkan semua, harga sewa tanah tersebut otomatis naik 2x lipat!',
      },
      {
        h: '4. Bangun Rumah & Hotel',
        img: 'how_09',
        t: 'Hanya setelah menguasai satu warna penuh, kamu diizinkan membeli Rumah untuk dibangun di atas tanahmu. Setelah memiliki 4 Rumah di satu petak, kamu bisa menukarnya menjadi 1 Hotel. Semakin mewah bangunanmu, harga sewanya akan semakin gila-gilaan!',
      },
    ],
  },
  {
    tab: 'Kartu Spesial',
    title: 'KARTU SPESIAL',
    items: [
      {
        h: '1. Dana Umum & Kesempatan',
        img: 'how_08',
        t: 'Jika pionmu mendarat di petak bersimbol peti harta karun atau tanda tanya, kamu wajib mengambil kartu tumpukan teratas! Isinya adalah misteri—kamu bisa tiba-tiba untung besar, atau malah harus bayar denda dadakan dan juga berisi masing-masing 4 kartu power up yang bisa kamu gunakan dalam game.',
      },
      {
        h: '2. Petak Pajak',
        img: 'how_12',
        t: 'Hati-hati saat mendarat di petak Pajak Jalan atau Pajak Istimewa. Kamu harus merelakan sebagian uangmu disita oleh Bank tanpa mendapat aset apa-apa.',
      },
      {
        h: '3. Bebas Parkir & Penjara',
        img: 'how_10',
        t: 'Mendarat di "Bebas Parkir" berarti kamu sekadar istirahat tanpa ada denda. Namun, jika kamu masuk Penjara, kamu harus membayar uang tebusan ke Bank, menggunakan kartu "Bebas Penjara", atau mengocok dadu kembar untuk bisa keluar!',
      },
    ],
  },
  {
    tab: 'Menang Game',
    title: 'MENANG GAME',
    items: [
      {
        h: '1. Tujuan Akhir',
        img: 'how_11',
        t: 'Pemenang dari game ini adalah satu-satunya pemain yang berhasil bertahan hingga akhir, sementara semua lawannya jatuh miskin dan bangkrut.',
      },
      {
        h: '2. Krisis Keuangan (Hipotik/Gadai)',
        img: 'how_13',
        t: 'Jika uang tunaimu habis untuk membayar sewa atau denda, jangan menyerah dulu! Kamu bisa menggadaikan tanahmu ke Bank atau menjual kembali Rumah/Hotelmu untuk mendapat dana darurat.',
      },
      {
        h: '3. Penyitaan Aset',
        img: 'how_15',
        t: 'Saat seorang pemain bangkrut, seluruh sisa tanah dan harta terakhirnya otomatis jatuh ke tangan pemain yang mengutanginya.',
      },
      {
        h: '4. Bangkrut',
        img: 'how_14',
        t: 'Jika kamu ditagih biaya sewa yang jauh lebih besar dari semua sisa aset yang kamu miliki dan kamu sudah tidak bisa membayar lagi, kamu dinyatakan Bangkrut dan langsung tereliminasi!',
      },
    ],
  },
];

const HOW_TO_PLAY_TABS_POSITION = [
  { left: 59, top: 222, width: 323, height: 136 },
  { left: 59, top: 376, width: 323, height: 134 },
  { left: 59, top: 526, width: 323, height: 129 },
  { left: 59, top: 668, width: 323, height: 127 },
];

const getStageScale = () => Math.min(window.innerWidth / 1600, window.innerHeight / 900);

export default function HowToPlayOverlay({ onClose, sound }) {
  const [activeTab, setActiveTab] = useState(0);
  const [stageScale, setStageScale] = useState(getStageScale);
  const section = HOW_TO_PLAY_TABS[activeTab];

  useEffect(() => {
    const resize = () => setStageScale(getStageScale());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const close = () => {
    sound?.play('click');
    onClose();
  };

  return (
    <div className="how-to-play-overlay">
      <div
        className="how-to-play-stage"
        style={{ '--how-to-play-scale': stageScale }}
      >
        <section
          className="how-to-play-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Cara bermain"
        >
          <img
            className="how-to-play-art"
            src="/monopoli-menu/assets/h_dlg.webp"
            alt=""
            draggable="false"
          />
          <div className="how-to-play-tabs" role="tablist" aria-label="Topik cara bermain">
            {HOW_TO_PLAY_TABS.map((tab, index) => {
              const position = HOW_TO_PLAY_TABS_POSITION[index];
              return (
                <button
                  key={tab.tab}
                  id={`how-to-play-tab-${index}`}
                  className={`how-to-play-tab${activeTab === index ? ' is-active' : ''}`}
                  style={position}
                  type="button"
                  role="tab"
                  aria-controls="how-to-play-panel"
                  aria-selected={activeTab === index}
                  tabIndex={activeTab === index ? 0 : -1}
                  onKeyDown={(event) => {
                    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
                    event.preventDefault();
                    const direction = event.key === 'ArrowRight' ? 1 : -1;
                    const nextTab = (activeTab + direction + HOW_TO_PLAY_TABS.length) %
                      HOW_TO_PLAY_TABS.length;
                    setActiveTab(nextTab);
                    document.getElementById(`how-to-play-tab-${nextTab}`)?.focus();
                  }}
                  onClick={() => setActiveTab(index)}
                >
                  {tab.tab}
                </button>
              );
            })}
          </div>
          <h2 className="how-to-play-title">{section.title}</h2>
          <div
            id="how-to-play-panel"
            className="how-to-play-body"
            role="tabpanel"
            aria-labelledby={`how-to-play-tab-${activeTab}`}
          >
            {section.items.map((item) => (
              <article className="how-to-play-item" key={item.h}>
                <h3>{item.h}</h3>
                <img
                  src={`/monopoli-menu/assets/${item.img}.webp`}
                  alt={item.h}
                  loading="lazy"
                  draggable="false"
                />
                <p>{item.t}</p>
              </article>
            ))}
          </div>
          <button
            className="how-to-play-hit how-to-play-close"
            style={{ left: 1435, top: 68, width: 148, height: 147 }}
            type="button"
            aria-label="Tutup cara bermain"
            onClick={close}
          />
          <button
            className="how-to-play-hit how-to-play-confirm"
            style={{ left: 527, top: 790, width: 525, height: 142 }}
            type="button"
            onClick={close}
          >
            <span className="sr-only">Paham</span>
          </button>
        </section>
      </div>
    </div>
  );
}
