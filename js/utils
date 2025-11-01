// utils.js
// - Utility helpers used across the site.
// - Fungsi: humanTime untuk menampilkan waktu, localStorage helpers, dan validasi ukuran file.
// - Berpengaruh pada: uploader, UI yang menampilkan waktu, dan validasi saat memilih file.

const Utils = (function(){
  function humanTime(ts){ try { return new Date(ts).toLocaleString(); } catch(e){ return ''+ts; } }
  const LOCAL = {
    save(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
    load(key){ try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e){ return null; } },
    remove(key){ localStorage.removeItem(key); }
  };
  // Max file size default 5MB
  function fileSizeValid(file, maxMB = 5){
    if(!file) return false;
    return file.size <= (maxMB * 1024 * 1024);
  }
  return { humanTime, LOCAL, fileSizeValid };
})();
