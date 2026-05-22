import React from 'react';
import { motion } from 'framer-motion';
import { 
  Code, Mail, Phone, Send, Info, ExternalLink, ShieldCheck, 
  Cpu, Award, GraduationCap, Heart, Terminal
} from 'lucide-react';

export default function DeveloperPortal() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.05 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto" id="developerPortalView">
      {/* Page Title & Overview */}
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3 border border-sky-100 dark:border-sky-900/60">
          <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
          Ramoda Technologies Suite
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
          Software Developer Profile
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm leading-relaxed">
          The CHERCHER SECONDARY SCHOOL Result Management and Verification System was designed and developed by **Ramoda Technologies** to automate transcripts, grade distribution ledgers, and institutional records management.
        </p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch"
      >
        {/* Left Column: Founder Cards & Agency Info */}
        <motion.div 
          variants={cardVariants}
          className="md:col-span-7 flex flex-col justify-between p-6 bg-white dark:bg-neutral-900 border border-neutral-250/60 dark:border-neutral-800 shadow-xl rounded-2xl relative overflow-hidden"
        >
          {/* Subtle decoration background grid lines */}
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-400 via-emerald-400 to-amber-500" />
          
          <div>
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest font-mono">
                  Software Agency
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                  Ramoda Technologies
                </h2>
                {/* Official Company Logo */}
                <div className="mt-3 mb-5 w-full max-w-[200px] sm:max-w-[280px] md:max-w-[350px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-neutral-800 shadow-xl relative group">
                  <div className="absolute inset-0 bg-linear-to-tr from-sky-500 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" />
                  <img 
                    src="https://i.postimg.cc/Bv0tdgJh/a-premium-corporate-logo-design-featurin-v-N8j-Lss-Wsycx-HTk-GT4as-Q-X7Hkqgyr-Sa6F8HUkp-R7H-Q-sd-(1).jpg" 
                    alt="Ramoda Technologies Official Logo" 
                    className="w-full h-auto object-cover transform duration-500 group-hover:scale-[1.03]"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 leading-normal">
                  Delivering cutting-edge, secure, and intuitive web solutions for educational institutions, businesses, and automated registers throughout Ethiopia.
                </p>
              </div>
              <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                <Terminal className="w-4 h-4 text-sky-500" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3 leading-tight">
                <div className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">Robust Academic Architecture</h4>
                  <p className="text-[11px] text-slate-450 dark:text-slate-405 leading-relaxed mt-0.5">
                    Utilizes offline-first local registers state syncing, automated rank weighting matrices, real-time average indicators, and instantaneous legal PDF transcripts.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 leading-tight">
                <div className="h-5 w-5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Award className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">Intuitive Triple-Portal Security</h4>
                  <p className="text-[11px] text-slate-450 dark:text-slate-405 leading-relaxed mt-0.5">
                    Separated student result view lookup, protected teacher terminal marks entry, and master administrative panel featuring full grade section rosters setups.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/20 -mx-6 -mb-6 p-6">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white mb-2">
              Interested in integrating this suite for your school?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed mb-4">
              If you require automated report cards, security keys, or digital registration setups for your school, contact us by email or Telegram.
            </p>
            
            {/* Direct Professional Contact Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a 
                href="mailto:ramodatechnologies@gmail.com"
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 dark:border-transparent text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Developer</span>
              </a>
              <a 
                href="https://t.me/Rtdart"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Telegram: @Rtdart</span>
              </a>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Founder Card with Image */}
        <motion.div 
          variants={cardVariants}
          className="md:col-span-5 flex flex-col justify-between p-6 bg-white dark:bg-neutral-900 border border-neutral-250/60 dark:border-neutral-800 shadow-xl rounded-2xl relative overflow-hidden"
        >
          <div className="absolute inset-y-0 right-0 w-1 bg-linear-to-b from-sky-400 via-emerald-400 to-amber-500" />
          
          <div className="text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest font-mono">
              Inspirational Founder
            </span>
            
            {/* Founder Image Display Frame with referrerPolicy as requested */}
            <div className="relative w-36 h-36 mx-auto mt-4 mb-3 group">
              <div className="absolute inset-0 bg-linear-to-tr from-sky-400 via-emerald-400 to-amber-500 rounded-2xl rotate-6 blur-md opacity-35 group-hover:opacity-60 transition-opacity" />
              <div className="relative w-full h-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden shadow-md">
                <img 
                  src="https://i.postimg.cc/Y0yKdbbg/IMG-20260517-213404-358.jpg" 
                  alt="Founder: Nahom Debebe"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover grayscale-10 hover:grayscale-0 transition-all duration-300"
                />
              </div>
            </div>

            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
              Nahom Debebe
            </h3>
            <span className="inline-block text-[10px] text-sky-500 dark:text-sky-400 font-bold tracking-wider uppercase bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-100 dark:border-[#38BDF8]/20 mt-1">
              Founder & Chief Engineer
            </span>

            <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed mt-4 px-1.5">
              "We leverage robust technical frameworks to implement highly secure, offline-persevering database structures for administrators, teachers, and student groups across administrative regions."
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-150/60 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
              <span className="font-mono">Office Mobile:</span>
              <a 
                href="tel:+251993253633" 
                className="font-bold text-slate-800 dark:text-white hover:text-sky-500 dark:hover:text-[#38BDF8] flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-3 h-3 text-sky-500" />
                <span>+251993253633</span>
              </a>
            </div>
            
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500 font-medium">
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span>Designed with academic pride in Addis Ababa, Ethiopia</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Highlights / Features Banner */}
      <div className="mt-8 p-6 bg-[#0F172A] dark:bg-slate-950 text-white border border-slate-850 shadow-lg rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Ambient subtle light blobs */}
        <div className="absolute right-0 top-0 w-36 h-36 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-10 -bottom-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-left md:max-w-lg z-10">
          <div className="flex items-center gap-1 text-[10px] text-[#38BDF8] font-mono tracking-widest uppercase mb-1">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Chercher System Integration</span>
          </div>
          <h3 className="text-sm font-bold leading-tight">
            Comprehensive Digital Registration & Performance System
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Designed for Chercher High School, providing automated transcript compilation, secure single-token passkey security for subjects, rank aggregation, and zero-compromise security protocols.
          </p>
        </div>

        <div className="flex gap-2 shrink-0 z-10 w-full sm:w-auto">
          <a 
            href="mailto:ramodatechnologies@gmail.com" 
            className="flex-1 sm:flex-initial text-center text-xs font-bold px-4 py-2.5 bg-[#38BDF8] text-[#0F172A] hover:bg-[#56c5f7] rounded-lg transition-colors cursor-pointer"
          >
            Direct Inquiries
          </a>
          <a 
            href="https://t.me/Rtdart" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex-1 sm:flex-initial text-center text-xs font-bold px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Ask on Telegram</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
