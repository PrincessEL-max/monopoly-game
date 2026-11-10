# Monopoly International

Game Monopoly berbasis React/Vite dengan mode lokal dan multiplayer online. Mode online memakai Supabase Edge Functions sebagai server game, Supabase Realtime untuk sinkronisasi, dan PostgreSQL untuk menyimpan room serta state permainan.

## Menjalankan aplikasi lokal

1. Buat project di [Supabase](https://supabase.com/).
2. Salin `.env.example` menjadi `.env.local`, lalu isi URL project dan anon key Supabase.
3. Jalankan `npm install`.
4. Deploy database dan Edge Function:

   ```sh
   npx supabase login
   npx supabase link --project-ref PROJECT_REF
   npx supabase db push
   npx supabase functions deploy monopoly-game
   ```

5. Jalankan frontend dengan `npm run dev`.

Di Supabase Project Settings → API, salin Project URL dan anon/public key ke `.env.local`. **Jangan pernah menaruh service-role key di frontend**; Supabase Edge Functions memakai secret server-side `SUPABASE_SERVICE_ROLE_KEY` secara internal.

## Bermain dan penyimpanan

Pilih **Main online** untuk membuat room atau bergabung dengan kode. Perubahan permainan disimpan otomatis ke database Supabase. Jika halaman ditutup atau serverless function berhenti, buka kembali game di browser yang sama untuk melanjutkan sesi yang tersimpan.

Kode room bukan pengganti akun. Token sesi disimpan lokal di browser; menghapus data browser berarti sesi itu tidak bisa dipulihkan hanya dengan kode room. Database project Supabase menyimpan room sampai dihapus secara manual.

## Deployment frontend

Deploy frontend Vite ke layanan hosting statis mana pun. Set environment variable build:

- `VITE_SUPABASE_URL`: URL project Supabase.
- `VITE_SUPABASE_ANON_KEY`: anon/public key project.

Supabase Edge Function dan PostgreSQL menangani backend; tidak perlu server Node/Render terpisah.
