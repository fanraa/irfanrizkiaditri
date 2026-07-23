import { SEO } from "@/components/SEO";
import React, { useState } from 'react';
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/context/AuthContext";
import { Mail, MapPin, Globe, Languages, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
// @ts-ignore
import html2pdf from "html2pdf.js";

export function About() {
  const { userEmail, logout, isAdmin, loginWithGoogle } = useAuth();
  const [isIndo, setIsIndo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);


  const t = {
    title: isIndo ? "Tentang Saya" : "About Me",
    role: isIndo ? "Mahasiswa Fisika" : "Physics Student",
    profile: isIndo ? "Profil" : "Profile",
    profileDesc: isIndo 
      ? "Halo, saya Irfan Rizki Aditri, biasa dipanggil Fanra. Saya adalah mahasiswa Fisika di Institut Teknologi Sumatera (ITERA). Selain fisika, saya juga memiliki minat pada teknologi, web desain, desain grafis, dan pembuatan web. Saya adalah orang yang sangat suka mencoba hal-hal baru dan antusias untuk terus belajar. Perjalanan saya berawal dari rasa ingin tahu, yang mendorong saya untuk mengeksplorasi berbagai keahlian baru secara mandiri. Saya juga memanfaatkan AI sebagai alat bantu untuk belajar dan mempercepat proses kreatif dalam menciptakan solusi digital."
      : "Hello, I am Irfan Rizki Aditri, commonly known as Fanra. I am a Physics student at the Sumatera Institute of Technology (ITERA). Besides physics, I also have an interest in technology, web design, graphic design, and web development. I am someone who really loves trying new things and is enthusiastic about continuous learning. My journey began from curiosity, which encouraged me to explore various new skills independently. I also utilize AI as a tool to learn and accelerate the creative process in creating digital solutions.",
    profileCVDesc: isIndo
      ? "Mahasiswa Fisika di Institut Teknologi Sumatera (ITERA) dengan ketertarikan kuat pada teknologi, web development, dan desain grafis. Saya adalah pembelajar mandiri yang adaptif, antusias mengeksplorasi hal baru, dan selalu mencari cara inovatif dalam menciptakan solusi digital."
      : "A Physics student at the Sumatera Institute of Technology (ITERA) with a strong interest in technology, web development, and graphic design. I am an adaptive independent learner, enthusiastic about exploring new things, and always seeking innovative ways to create digital solutions.",
    education: isIndo ? "Pendidikan" : "Education",
    eduDegree: isIndo ? "S1 Fisika" : "Bachelor's Degree in Physics",
    eduDesc: isIndo ? "Sedang menempuh pendidikan S1 Fisika dan aktif mengeksplorasi hal-hal baru." : "Currently pursuing an undergraduate degree in physics and actively exploring new things.",
    experience: isIndo ? "Pengalaman & Organisasi" : "Experience & Organization",
    skills: isIndo ? "Keahlian & Kompetensi" : "Skills & Competencies",
    hardSkills: isIndo ? "Keahlian Teknis:" : "Hard Skills:",
    hardSkillsDesc: isIndo ? "React, TypeScript, Tailwind CSS, Node.js, Firebase, Web Development, UI/UX Design, Desain Grafis" : "React, TypeScript, Tailwind CSS, Node.js, Firebase, Web Development, UI/UX Design, Graphic Design",
    softSkills: isIndo ? "Keterampilan Interpersonal:" : "Soft Skills:",
    softSkillsDesc: isIndo ? "Pembelajaran Mandiri, Kemauan Mencoba Hal Baru, Pemecahan Masalah, Kemampuan Beradaptasi, Kreativitas" : "Independent Learning, Eagerness to Try New Things, Problem Solving, Adaptability, Creativity",
    languages: isIndo ? "Bahasa:" : "Languages:",
    languagesDesc: isIndo ? "Indonesia (Penutur Asli), Inggris (Menengah)" : "Indonesian (Native), English (Intermediate)",
    expList: [
      {
        title: isIndo ? "Pengembang Web Mandiri" : "Independent Web Developer",
        date: isIndo ? "2024 - Sekarang" : "2024 - Present",
        role: isIndo ? "Proyek Pribadi" : "Personal Projects",
        desc: isIndo 
          ? ["Belajar dan mengembangkan aplikasi web menggunakan React, Tailwind CSS, dan alat modern lainnya.", "Mengeksplorasi pembuatan antarmuka web (UI/UX) dan mencoba berbagai teknologi baru secara mandiri."]
          : ["Learned and developed web applications using React, Tailwind CSS, and other modern tools.", "Explored web interface creation (UI/UX) and tried various new technologies independently."]
      },
      {
        title: "Dies Natalis Fakultas Sains ITERA",
        date: "2026",
        role: isIndo ? "Staf Desain Grafis" : "Graphic Design Staff",
        desc: isIndo
          ? ["Membuat desain visual profesional seperti poster dan banner untuk mendukung keperluan acara."]
          : ["Created professional visual designs such as posters and banners to support the event's needs."]
      },
      {
        title: "PPLK ITERA (Program Pengenalan Lingkungan Kampus)",
        date: "2026",
        role: isIndo ? "Staf Mentor" : "Mentor Staff",
        desc: isIndo
          ? ["Mendampingi dan membimbing mahasiswa baru selama program pengenalan lingkungan kampus."]
          : ["Mentored and guided new students during the campus orientation program."]
      },
      {
        title: "Dies Natalis Prodi Fisika & HIMAFI",
        date: "2026",
        role: isIndo ? "Staf Dekorasi" : "Decoration Staff",
        desc: isIndo
          ? ["Berkolaborasi dalam menyiapkan dekorasi dan merencanakan konsep visual tempat acara."]
          : ["Collaborated in preparing decorations and planning the venue's visual concept."]
      },
      {
        title: "UROTERA (Unit Robotika ITERA)",
        date: "2026",
        role: isIndo ? "Anggota Magang" : "Intern",
        desc: isIndo
          ? ["Belajar mengenai dasar-dasar robotika dan mengikuti berbagai kegiatan organisasi unit."]
          : ["Learned the basics of robotics and participated in various club organizational activities."]
      },
      {
        title: "Panitia Qurban ITERA (Idul Adha 1447 H)",
        date: "2026",
        role: isIndo ? "Staf Persiapan dan Perlengkapan" : "Preparation and Equipment Staff",
        desc: isIndo
          ? ["Membantu kelancaran acara dengan mengelola logistik, peralatan, dan persiapan di lingkungan universitas."]
          : ["Assisted in the event's smooth execution by managing logistics, equipment, and preparation on campus."]
      },
      {
        title: "Himpunan Mahasiswa Fisika (HIMAFI) ITERA",
        date: isIndo ? "2026 - Sekarang" : "2026 - Present",
        role: isIndo ? "Anggota" : "Member",
        desc: isIndo
          ? ["Berpartisipasi aktif sebagai anggota dalam berbagai kegiatan yang diselenggarakan oleh himpunan fisika."]
          : ["Actively participated as a member in various activities organized by the physics association."]
      },
    ]
  };

  const handlePrint = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const element = document.getElementById('cv-container');
    if (!element) {
      setIsDownloading(false);
      return;
    }
    
    const originalClasses = element.className;
    element.className = "bg-[#ffffff] p-12 text-[#1e293b]";
    
    const originalWidth = element.style.width;
    element.style.width = "800px";

    const opt = {
      margin:       0,
      filename:     `CV_Irfan_Rizki_Aditri_${isIndo ? 'ID' : 'EN'}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, windowWidth: 1024 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().from(element).set(opt).save();
    } catch (error) {
      console.error("Error generating PDF", error);
    } finally {
      element.className = originalClasses;
      element.style.width = originalWidth;
      setIsDownloading(false);
    }
  };

  return (
    <>
      <SEO title="About" description="About Irfan Rizki Aditri - Physics Student and Web Developer." url={window.location.href} />
      
      {/* Hide navbar and footer during print by injecting a style tag just in case */}
            <style>{`
        @media print {
          nav, footer, .bottom-nav-mobile, header {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
          .page-transition-wrapper {
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
      
      <PageTransition>
                <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-8 print:py-0 print:px-0">
          
          <div className="mb-16 print:hidden text-center flex flex-col items-center">
            <h1 className="text-3xl font-bold text-[#0f172a] mb-4">{isIndo ? "Tentang Saya" : "About Me"}</h1>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-3xl text-center">
              {t.profileDesc}
            </p>
          </div>

          {/* CV Container */}
          <div id="cv-container" className="bg-[#ffffff] border border-[#e2e8f0] shadow-sm p-6 sm:p-12 text-[#1e293b] print:border-none print:shadow-none print:p-0">
            
            {/* Header */}
            <div className="flex flex-row items-start sm:items-center justify-between border-b-2 border-[#1e293b] pb-4 sm:pb-6 mb-4 sm:mb-8 gap-4 sm:gap-6 print:flex-row print:items-center">
              <div className="flex-1 order-1">
                <h1 className="text-2xl sm:text-4xl font-bold text-[#0f172a] uppercase tracking-wider mb-2 print:text-3xl">Irfan Rizki Aditri</h1>
                <h2 className="text-sm sm:text-xl text-[#475569] font-medium mb-4 print:text-lg">{t.role}</h2>
                
                <div className="flex flex-col sm:flex-row flex-wrap justify-start gap-x-4 gap-y-1.5 sm:gap-x-6 sm:gap-y-2 text-xs sm:text-sm text-[#475569] print:gap-4 print:text-xs">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 print:w-3 print:h-3" />
                    <a href="mailto:irfanrizkiaditri@gmail.com" className="hover:text-[#0f172a]">irfanrizkiaditri@gmail.com</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3 sm:w-4 sm:h-4 print:w-3 print:h-3" />
                    <a href="https://irfanrizkiaditri.site" target="_blank" rel="noreferrer" className="hover:text-[#0f172a]">irfanrizkiaditri.site</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src="https://cdn-icons-png.flaticon.com/128/3128/3128219.png" alt="LinkedIn" className="w-3.5 h-3.5 object-contain grayscale opacity-70 print:w-3 print:h-3" />
                    <a href="https://www.linkedin.com/in/irfan-rizki-aditri-b12162368" target="_blank" rel="noreferrer" className="hover:text-[#0f172a]">LinkedIn</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 print:w-3 print:h-3" />
                    <span>Sumatra, Indonesia</span>
                  </div>
                </div>
              </div>
              
              <div className="shrink-0 order-2 hidden sm:block print:block">
                <img 
                  src="https://res.cloudinary.com/dew39kqhy/image/upload/v1784826922/pasfoto_irfan_ra_rvh5v0.jpg" 
                  alt="Irfan Rizki Aditri" 
                  className="w-[84px] h-[112px] sm:w-[120px] sm:h-[160px] object-cover rounded-sm print:w-[96px] print:h-[128px]"
                />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-8 print:space-y-6">
              
              {/* Profile */}
              <section>
                <h3 className="text-sm sm:text-lg font-bold text-[#0f172a] uppercase tracking-widest border-b border-[#cbd5e1] pb-2 mb-4 print:text-base print:mb-2">{t.profile}</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-[#334155] text-justify print:text-xs">
                  {t.profileCVDesc}
                </p>
              </section>

              {/* Education */}
              <section>
                <h3 className="text-sm sm:text-lg font-bold text-[#0f172a] uppercase tracking-widest border-b border-[#cbd5e1] pb-2 mb-4 print:text-base print:mb-2">{t.education}</h3>
                <div className="mb-4 print:mb-2">
                  <div className="flex flex-row justify-between items-center mb-1 print:flex-row print:items-center">
                    <h4 className="font-bold text-[#1e293b] text-sm sm:text-base print:text-sm">Sumatera Institute of Technology (ITERA)</h4>
                    <span className="text-xs sm:text-sm font-medium text-[#475569] print:text-xs">2025 - {isIndo ? "Sekarang" : "Present"}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-[#475569] italic mb-2 print:text-xs print:mb-1">{t.eduDegree}</div>
                  <ul className="list-disc list-outside text-xs sm:text-sm text-[#334155] space-y-1 ml-5 print:text-xs">
                    <li>{t.eduDesc}</li>
                  </ul>
                </div>
              </section>

              {/* Experience */}
              <section>
                <h3 className="text-sm sm:text-lg font-bold text-[#0f172a] uppercase tracking-widest border-b border-[#cbd5e1] pb-2 mb-4 print:text-base print:mb-2">{t.experience}</h3>
                
                {t.expList.map((exp, index) => (
                  <div key={index} className="mb-6 last:mb-0 print:mb-4">
                    <div className="flex flex-row justify-between items-center mb-1 print:flex-row print:items-center">
                      <h4 className="font-bold text-[#1e293b] text-sm sm:text-base print:text-sm">{exp.title}</h4>
                      <span className="text-xs sm:text-sm font-medium text-[#475569] whitespace-nowrap ml-4 print:text-xs">{exp.date}</span>
                    </div>
                    <div className="text-xs sm:text-sm text-[#475569] italic mb-2 print:text-xs print:mb-1">{exp.role}</div>
                    <ul className="list-disc list-outside text-xs sm:text-sm text-[#334155] space-y-1 ml-5 print:text-xs">
                      {exp.desc.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>

              {/* Skills */}
              <section className="print:break-inside-avoid">
                <h3 className="text-sm sm:text-lg font-bold text-[#0f172a] uppercase tracking-widest border-b border-[#cbd5e1] pb-2 mb-4 print:text-base print:mb-2">{t.skills}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-[#334155] print:text-xs print:gap-2">
                  <div>
                    <span className="font-bold">{t.hardSkills}</span> 
                    <p className="mt-1">{t.hardSkillsDesc}</p>
                  </div>
                  <div>
                    <span className="font-bold">{t.softSkills}</span>
                    <p className="mt-1">{t.softSkillsDesc}</p>
                  </div>
                  <div className="sm:col-span-2 mt-2 print:mt-1">
                    <span className="font-bold">{t.languages}</span> {t.languagesDesc}
                  </div>
                </div>
              </section>

              {/* Signature */}
              <div className="flex justify-end mt-12 print:mt-8 print:break-inside-avoid">
                <div className="flex flex-col items-center">
                  <img 
                    src="https://res.cloudinary.com/dew39kqhy/image/upload/v1784825764/bb573778-768e-4cb7-8c07-83d9263b3365_mtv43f.png" 
                    alt="Signature" 
                    className="w-24 sm:w-32 h-auto mix-blend-multiply opacity-80 print:w-28"
                  />
                  <p className="text-xs sm:text-sm font-bold text-[#0f172a] mt-2 uppercase tracking-widest print:text-xs">Irfan Rizki Aditri</p>
                </div>
              </div>

            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-8 mt-6 print:hidden">
            <button
              onClick={handlePrint}
              disabled={isDownloading}
              className="flex items-center gap-1.5 text-[#64748b] hover:text-[#0f172a] transition-colors bg-transparent border-none outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={isIndo ? "Unduh CV" : "Download CV"}
            >
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {isDownloading ? (isIndo ? "Mengunduh..." : "Downloading...") : (isIndo ? "Unduh CV" : "Download CV")}
              </span>
            </button>
            <button
              onClick={() => setIsIndo(prev => !prev)}
              className="flex items-center gap-1.5 text-[#64748b] hover:text-[#0f172a] transition-colors bg-transparent border-none outline-none cursor-pointer"
              title={isIndo ? "Translate to English" : "Terjemahkan ke Bahasa Indonesia"}
            >
              <Languages className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{isIndo ? "ID" : "EN"}</span>
            </button>
          </div>

          {/* Community Section (Outside CV) */}
          <div className="flex flex-col items-center gap-6 mt-16 pt-8 border-t border-[#e2e8f0] print:hidden">
            <div className="w-full max-w-sm flex flex-col items-center text-center">
              <h3 className="text-base font-semibold text-[#0f172a] mb-3">{isIndo ? "Bergabung dengan Komunitas" : "Join Community"}</h3>
              <p className="text-xs text-[#64748b] mb-6">
                {isIndo 
                  ? "Bergabunglah dengan komunitas untuk mendapatkan info terbaru dan tidak ketinggalan berbagai eksperimen serta pembaruan. Segera hadir!" 
                  : "Join our community to stay updated and not miss out on upcoming experiments and updates. Coming soon!"}
              </p>
              
              {(!userEmail && !isAdmin) ? (
                <div className="w-full flex flex-col items-center gap-1.5 relative group">
                  <button 
                    onClick={() => loginWithGoogle()}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#ffffff] border border-[#e2e8f0] rounded-lg text-xs font-medium text-[#334155] hover:bg-slate-50 hover:border-[#cbd5e1] transition-colors shadow-sm"
                  >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-3.5 h-3.5" />
                    {isIndo ? "Masuk dengan Google" : "Sign in with Google"}
                  </button>
                  <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-[#cbd5e1]"> 
                      {isIndo ? "Selamat datang di komunitas!" : "Welcome to the community!"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-row items-center justify-between px-5 py-4 bg-green-50/50 border border-green-100 rounded-xl gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shadow-sm">
                      {userEmail ? userEmail.charAt(0).toUpperCase() : "A"}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-[#0f172a]">{isIndo ? "Berhasil masuk!" : "Signed in successfully!"}</p>
                      <p className="text-[10px] text-[#64748b] truncate max-w-[120px]">{userEmail || (isIndo ? "Akses Admin" : "Admin Access")}</p>
                    </div>
                  </div>
                  <button onClick={logout} className="text-[11px] font-medium text-[#64748b] hover:text-[#1e293b] bg-[#ffffff] px-3 py-1.5 rounded-md border border-[#e2e8f0] shadow-sm transition-colors">
                    {isIndo ? "Keluar" : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
