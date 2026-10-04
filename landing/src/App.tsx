import { productHref } from './navigation';
import React, { useState } from 'react';
import { Shield, Lock, CheckCircle2, Server, FileJson, Link as LinkIcon, RotateCcw, ArrowRight, Play, CheckCircle, Database, Hexagon, Clock, Unlock, Menu, X } from 'lucide-react';

const OasysLogo = () => (
  <span className="text-xl font-medium tracking-tight">Oasys</span>
);

export default function App() {
  const containerClass = "max-w-[1600px] mx-auto w-full";
  const paddingClass = "px-4 md:px-6";
  const sectionClass = "py-12 md:py-16";
  const roundedClass = "rounded-xl"; // User requested "reduce the roundess to 4", rounded-xl is 12px, rounded-lg is 8px. Let's use rounded-xl.

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[#1a1a2e] font-sans selection:bg-[#3b3486] selection:text-white">
      
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md`}>
        <div className={`${containerClass} ${paddingClass} h-[72px] flex items-center justify-between`}>
          <a href="#" className="text-[#1a1a2e]">
            <OasysLogo />
          </a>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-normal text-gray-600">
            <a href="#platform" className="hover:text-black">Platform</a>
            <a href="#how-it-works" className="hover:text-black">How it works</a>
            <a href="#security" className="hover:text-black">Security</a>
            <a href="#research" className="hover:text-black">Research</a>
            <a href={productHref("/docs")} className="hover:text-black">Docs</a>
          </div>

          <div className="hidden md:block">
            <a href={productHref("/console#evaluations")} className="px-6 py-2.5 bg-[#1a1a2e] text-white text-sm font-medium rounded-full hover:bg-black transition-colors">
              Launch Oasys
            </a>
          </div>
          
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 hover:text-black">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-[72px] left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 py-6 flex flex-col gap-4 z-50">
            <a href="#platform" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 hover:text-black font-medium text-lg">Platform</a>
            <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 hover:text-black font-medium text-lg">How it works</a>
            <a href="#security" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 hover:text-black font-medium text-lg">Security</a>
            <a href="#research" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 hover:text-black font-medium text-lg">Research</a>
            <a href={productHref("/docs")} onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 hover:text-black font-medium text-lg">Docs</a>
            <div className="pt-4 mt-2 border-t border-gray-100">
              <a href={productHref("/console#evaluations")} className="inline-block w-full text-center px-6 py-3 bg-[#1a1a2e] text-white font-medium rounded-full hover:bg-black transition-colors">
                Launch Oasys
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className={`pt-[88px] ${paddingClass} pb-6 md:pb-10`}>
        <div className={`relative w-full min-h-[500px] h-[75vh] lg:h-[85vh] max-h-[900px] ${roundedClass} overflow-hidden bg-[#EAE8F2]`}>
          {/* Image fills the taller container */}
          <img src="/assets/heroimage.webp" alt="Oasys Hero" className="absolute inset-0 w-full h-full object-cover object-[center_top] md:object-center" />
          
          {/* Text absolutely positioned at the very top */}
          <div className="absolute top-0 left-0 right-0 w-full pt-12 sm:pt-20 md:pt-24 flex flex-col items-center justify-start text-center px-4 max-w-[1000px] mx-auto z-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[56px] w-full font-normal leading-[1.15] text-[#1a1a2e] mb-4 sm:mb-6 tracking-tight drop-shadow-sm">
              Where adversarial AI testing<br className="hidden sm:block"/> becomes trustworthy.
            </h1>
            <p className="text-sm md:text-[16px] text-[#1a1a2e]/90 mb-8 sm:mb-10 max-w-2xl mx-auto font-light leading-relaxed whitespace-normal drop-shadow-sm">
              Oasys isolates red teams, blue teams and model execution in a sealed environment, so every finding is trustworthy, repeatable and protected from interference.
            </p>
            <div className="flex flex-col w-full sm:w-auto sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
              <a href={productHref("/console#evaluations")} className="w-full sm:w-auto px-8 py-3.5 bg-[#1a1a2e] text-white text-sm font-medium rounded-full hover:bg-black transition-colors flex items-center justify-center">
                Launch Oasys
              </a>
              <a href={productHref("/console#overview")} className="w-full sm:w-auto px-8 py-3.5 bg-white/30 backdrop-blur-md text-[#1a1a2e] border border-white/40 hover:bg-white/50 text-sm font-medium rounded-full transition-colors flex items-center justify-center gap-2">
                Explore platform <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Test the model section */}
      <section id="platform" className={`pt-4 md:pt-8 pb-16 md:pb-24 bg-white`}>
        <div className={`${containerClass} ${paddingClass}`}>
          <div className="grid lg:grid-cols-12 gap-12 items-end mb-16">
            <div className="lg:col-span-5">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-normal leading-[1.15] text-[#1a1a2e] mb-6 tracking-tight">
                Test the model.<br/>Protect the test.
              </h2>
              <p className="text-xs sm:text-sm md:text-[16px] text-gray-600 font-light mb-8 leading-relaxed">
                Oasys provides a secure infrastructure for adversarial AI testing, designed to keep red teams, blue teams and the model completely isolated while enabling credible, reproducible results.
              </p>
              <a href="#how-it-works" className="inline-flex px-6 py-2 bg-[#1a1a2e] text-white text-sm font-normal rounded-full hover:bg-black transition-colors">
                Learn more
              </a>
            </div>
            <div className="lg:col-span-4 lg:col-start-9 lg:pb-8 text-left lg:text-right">
              <p className="text-xs sm:text-sm md:text-[16px] text-gray-600 font-light leading-relaxed">
                Reliable AI safety evaluation requires more than just testing models - it requires a trusted testing environment. Oasys fixes the test setup.
              </p>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className={`md:col-span-2 ${roundedClass} overflow-hidden relative p-8 lg:p-12 flex flex-col justify-end sm:justify-center min-h-[400px] md:min-h-[300px]`}>
              <img src="/assets/isolationthatholds.webp" alt="Isolation" className="absolute inset-0 w-full h-full object-cover object-center md:object-[85%_60%] md:scale-[1.6]" />
              <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/40 to-transparent md:hidden"></div>
              <div className="relative z-10 sm:w-[60%]">
                <h3 className="text-2xl font-normal text-[#1a1a2e] mb-3 md:mb-4 drop-shadow-sm md:drop-shadow-none">Isolation that holds.</h3>
                <p className="text-gray-800 font-light leading-relaxed">
                  Fully isolated workbenches for red teams, blue teams and model execution with no direct access, shared state or hidden channels.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className={`md:col-span-1 bg-[#1E1C3A] text-white ${roundedClass} p-8 lg:p-12 flex flex-col justify-center`}>
              <h3 className="text-2xl font-medium mb-4">Fresh state,<br/>every run.</h3>
              <p className="text-gray-300">
                A clean, ephemeral model worker for each test, preventing cache leakage and cross-run interference.
              </p>
            </div>

            {/* Card 3 */}
            <div className={`md:col-span-1 bg-[#1E1C3A] text-white ${roundedClass} p-8 lg:p-12 flex flex-col justify-center`}>
              <h3 className="text-2xl font-medium mb-4">Proof, not<br/>promises.</h3>
              <p className="text-gray-300">
                Hash-chained logs and cryptographic evidence for every run, so findings can be verified and replayed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Logos Strip */}
      <section className="py-8 md:py-6 border-y border-gray-200 bg-white">
        <div className={`${containerClass} px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-6`}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-widest max-w-[250px] leading-relaxed text-center md:text-left">
            Built with open standards and battle-tested technology.
          </p>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center md:justify-end items-center gap-y-6 gap-x-4 sm:gap-8 md:gap-12 w-full md:w-auto">
            <span className="flex items-center justify-center md:justify-start gap-2 text-sm font-medium text-gray-600"><Hexagon size={18}/> Rootless Containers</span>
            <span className="flex items-center justify-center md:justify-start gap-2 text-sm font-medium text-gray-600"><Server size={18}/> Linux</span>
            <span className="flex items-center justify-center md:justify-start gap-2 text-sm font-medium text-gray-600"><Shield size={18}/> seccomp</span>
            <span className="flex items-center justify-center md:justify-start gap-2 text-sm font-medium text-gray-600"><Lock size={18}/> SHA-256</span>
            <span className="flex items-center justify-center md:justify-start gap-2 text-sm font-medium text-gray-600"><LinkIcon size={18}/> Ed25519</span>
            <span className="flex items-center justify-center md:justify-start gap-2 text-sm font-medium text-gray-600"><Database size={18}/> Qemu</span>
          </div>
        </div>
      </section>

      {/* How Oasys works */}
      <section id="how-it-works" className={`${sectionClass} bg-white`}>
        <div className={`${containerClass} ${paddingClass}`}>
          <div className="grid lg:grid-cols-12 gap-12 items-stretch">
            <div className="lg:col-span-4 flex flex-col justify-center">
      
              <h2 className="text-3xl md:text-4xl font-normal text-[#1a1a2e] mb-6 tracking-tight">How Oasys works</h2>
              <p className="text-sm md:text-[16px] font-light text-gray-600 mb-8">
                Oasys orchestrates a fully isolated evaluation pipeline. Each run is executed in a fresh, sealed environment and recorded with cryptographic proofs, enabling trustworthy and reproducible results.
              </p>
              <a href={productHref("/docs")} className="inline-flex w-max px-6 py-2.5 bg-[#1a1a2e] text-white text-sm font-normal rounded-full hover:bg-black transition-colors">
                View technical docs
              </a>
            </div>
            
            <div className="lg:col-span-8 bg-[#F4F5F7] p-6 sm:p-8 md:p-12 rounded-[24px]">
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8 sm:gap-4">
                {[
                  { num: 1, title: 'Commit', desc: 'Red and blue submit their test artifacts.', icon: FileJson },
                  { num: 2, title: 'Isolate', desc: 'Sealed, separate environments.', icon: Shield },
                  { num: 3, title: 'Run', desc: 'Fresh model worker for each test.', icon: Play },
                  { num: 4, title: 'Seal', desc: 'Results logged with cryptographic proofs.', icon: Lock },
                  { num: 5, title: 'Verify', desc: 'Findings can be replayed and independently verified.', icon: CheckCircle },
                ].map((step, idx) => (
                  <React.Fragment key={step.num}>
                    <div className="flex flex-col items-center sm:items-center text-center w-full max-w-[160px] sm:max-w-[140px]">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white text-[#1a1a2e] flex items-center justify-center shadow-sm mb-3 sm:mb-4">
                        <step.icon size={20} className="sm:hidden" />
                        <step.icon size={24} className="hidden sm:block" />
                      </div>
                      <h4 className="text-sm font-medium text-[#1a1a2e] mb-1 sm:mb-2">{step.num}. {step.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                    </div>
                    {idx < 4 && (
                      <div className="hidden sm:block text-gray-300 mt-4">
                        <ArrowRight size={20} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="security" className={`${sectionClass} bg-white`}>
        <div className={`${containerClass} ${paddingClass}`}>
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-4 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-widest uppercase text-gray-500 mb-4">ARCHITECTURE</p>
              <h2 className="text-3xl md:text-4xl font-normal text-[#1a1a2e] mb-6 tracking-tight">Isolation reaches the inference layer.</h2>
              <p className="text-sm md:text-[16px] font-light text-gray-600 mb-8">
                Red teams, blue teams and the model run in separate, locked-down environments with no direct access to each other. A minimal broker mediates all interactions, ensuring control, observability and verifiable execution.
              </p>
            </div>
            <div className="lg:col-span-8">
              <img src="/assets/architecture.webp" alt="Architecture" className={`w-full h-auto object-cover ${roundedClass}`} />
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="research" className={`${sectionClass} bg-white`}>
        <div className={`${containerClass} ${paddingClass}`}>
          <p className="text-xs font-medium tracking-widest uppercase text-gray-500 mb-4">USE CASES</p>
          <h2 className="text-3xl md:text-4xl font-normal text-[#1a1a2e] tracking-tight mb-16">Built for everyone working on safer AI.</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { img: 'redteam.webp', title: 'Red teams', href: '/console#evaluations', desc: 'Run adversarial tests without exposing your strategies. Validate jailbreaks, prompt injections and extraction attempts in a truly isolated environment.' },
              { img: 'blueteam.webp', title: 'Blue teams', href: '/console#evaluations', desc: 'Test and improve defenses with confidence. Validate system prompts, guard models and monitoring strategies against real attacks.' },
              { img: 'auditandresearch.webp', title: 'Auditors & researchers', href: '/console#evidence', desc: 'Access credible, reproducible findings. Every run is verifiable, with cryptographic evidence and a complete audit trail.' },
            ].map((useCase) => (
              <div key={useCase.title} className={`relative overflow-hidden ${roundedClass} h-[250px] group`}>
                <img src={`/assets/${useCase.img}`} alt={useCase.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                {/* Overlay with stronger gradient and hover blur */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/90 via-[#1a1a2e]/60 to-[#1a1a2e]/20 transition-all duration-500 group-hover:backdrop-blur-md group-hover:from-[#1a1a2e]/95 group-hover:to-[#1a1a2e]/40"></div>
                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col items-start h-full justify-end relative z-10">
                  <h3 className="text-xl font-normal text-white mb-2 drop-shadow-sm">{useCase.title}</h3>
                  <p className="text-sm font-light text-gray-100 mb-4 drop-shadow-sm">{useCase.desc}</p>
                  <a href={productHref(useCase.href)} aria-label={`Open ${useCase.title} workspace`} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer mt-auto">
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted Results */}
      <section className={`${sectionClass} bg-white`}>
        <div className={`${containerClass} ${paddingClass}`}>
          <div className={`relative ${roundedClass} min-h-[400px] flex items-center overflow-hidden`}>
            {/* Background Image full occupied */}
            <img src="/assets/trustedresult.webp" alt="Trusted Results" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40"></div>
            
            <div className="relative z-10 p-8 sm:p-12 lg:p-16 w-full lg:w-1/2">
              <p className="text-xs font-medium tracking-widest uppercase text-white/80 mb-4">TRUSTED RESULTS</p>
              <h2 className="text-3xl md:text-4xl font-normal text-white mb-4 sm:mb-6 tracking-tight">Every run leaves a proof.</h2>
              <p className="text-sm md:text-[16px] font-light text-gray-100 mb-8 sm:mb-10 max-w-lg">
                All results are recorded in a tamper-evident, hash-chained log. Findings can be independently verified and replayed, giving you evidence you can trust.
              </p>
              <a href={productHref("/docs/logging")} className="inline-flex w-full sm:w-max justify-center px-6 py-3 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-medium rounded-full transition-colors">
                Learn about our logging system
              </a>
            </div>
            
            <div className="absolute top-4 right-4 sm:top-8 sm:right-8 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 z-20 text-white">
              <CheckCircle2 size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-xs sm:text-sm font-medium">Verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section className={`${sectionClass} bg-white`}>
        <div className={`${containerClass} ${paddingClass}`}>
          <p className="text-xs font-medium tracking-widest uppercase text-gray-500 mb-4">KEY CAPABILITIES</p>
          <h2 className="text-3xl md:text-4xl font-normal text-[#1a1a2e] tracking-tight mb-16">Built for real evaluation.</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Server, title: 'Per-run workers', desc: 'A fresh, ephemeral model worker for every test run.' },
              { icon: FileJson, title: 'Append-only audit', desc: 'Hash-chained logs with cryptographic proofs.' },
              { icon: LinkIcon, title: 'No direct cross-team route', desc: 'Red and blue environments cannot access each other.' },
              { icon: RotateCcw, title: 'Replayable findings', desc: 'Every result can be reproduced and independently verified.' },
            ].map((cap) => (
              <div key={cap.title} className="flex flex-col pt-6 h-full">
                <div className="text-[#1a1a2e] mb-4">
                  <cap.icon size={28} strokeWidth={1.5} />
                </div>
                <h4 className="text-sm md:text-[16px] font-light font-medium text-[#1a1a2e] mb-2">{cap.title}</h4>
                <p className="text-gray-600">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Oasys does not hide */}
      <section className={`${sectionClass} bg-[#F4F5F7]`}>
        <div className={`${containerClass} ${paddingClass}`}>
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium tracking-widest uppercase text-gray-500 mb-4">TRANSPARENT BY DESIGN</p>
              <h2 className="text-3xl md:text-4xl font-normal text-[#1a1a2e] mb-6 tracking-tight">What Oasys does not hide.</h2>
              <p className="text-sm md:text-[16px] font-light text-gray-600 mb-8 max-w-md">
                Oasys is designed for honest and credible evaluation. While it significantly reduces many risks, some limitations remain and should be considered when interpreting results.
              </p>
            </div>
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-8">
              {[
                { icon: Clock, title: 'Timing channels', desc: 'Subtle timing-based inference is still possible.' },
                { icon: Database, title: 'Shared host kernel', desc: 'Runs on a shared kernel, which may expose low-level side channels.' },
                { icon: Shield, title: 'Broker compromise', desc: 'A compromised broker could interfere with the evaluation.' },
                { icon: Unlock, title: 'Behavioral leakage', desc: 'Model outputs may still leak information through behavior.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 items-start">
                  <div className="text-gray-400 mt-1">
                    <item.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-medium text-[#1a1a2e] mb-1">{item.title}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-8 bg-white`}>
        <div className={`${containerClass} ${paddingClass}`}>
          <div className={`relative ${roundedClass} overflow-hidden py-24 px-6 flex flex-col items-center justify-center text-center text-[#1a1a2e]`}>
            <img src="/assets/footer.webp" alt="Footer Background" className="absolute inset-0 w-full h-full object-cover" />
            
            <div className="relative z-10 max-w-2xl px-4">
              <p className="text-xs font-medium tracking-widest uppercase text-[#1a1a2e]/80 mb-4">SECURE AI TESTING INFRASTRUCTURE</p>
              <h2 className="text-3xl md:text-4xl font-normal mb-6 tracking-tight text-[#1a1a2e]">Build trust into the test.</h2>
              <p className="text-sm md:text-[16px] font-light text-[#1a1a2e]/80 mb-10 max-w-lg mx-auto">Run adversarial evaluations with isolation, evidence and replayability.</p>
              <a href={productHref("/console#evaluations")} className="inline-block px-8 py-3 bg-[#1a1a2e] text-white text-sm font-normal rounded-full hover:bg-black transition-colors">
                Launch Oasys
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8">
        <div className={`${containerClass} ${paddingClass} flex flex-col md:flex-row items-center justify-between gap-6`}>
          <a href="#" className="text-[#1a1a2e]">
            <OasysLogo />
          </a>
          <div className="flex flex-wrap justify-center gap-8 text-sm font-normal text-gray-600">
            <a href="#platform" className="hover:text-black">Platform</a>
            <a href="#how-it-works" className="hover:text-black">How it works</a>
            <a href="#security" className="hover:text-black">Security</a>
            <a href="#research" className="hover:text-black">Research</a>
            <a href={productHref("/docs")} className="hover:text-black">Docs</a>
          </div>
          <p className="text-xs font-normal text-gray-400">
            © 2026 Oasys. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
