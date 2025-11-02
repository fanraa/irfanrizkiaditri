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

  // download a JSON object as a file
  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return { humanTime, LOCAL, fileSizeValid, downloadJson };
})();