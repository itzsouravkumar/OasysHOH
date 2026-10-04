import React, { useState, useEffect } from 'react';
import { Home, Play, FileJson, Shield, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const OasysLogo = () => (
  <span className="text-xl font-medium tracking-tight text-[#1a1a2e]">Oasys</span>
);

export default function Console() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('evaluations');

  // We need to inject the scripts that the vanilla console used so they can run their logic
  useEffect(() => {
    // Add the scripts required for live execution and app logic
    const script1 = document.createElement('script');
    script1.type = 'module';
    script1.src = '/static/live.js'; // Assuming we'll copy these to public/static/
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = '/static/app.js';
    document.body.appendChild(script2);

    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
    }
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'evaluations', label: 'Evaluations', icon: Play },
    { id: 'evidence', label: 'Evidence vault', icon: FileJson },
    { id: 'security', label: 'Isolation & proof', icon: Shield },
  ];

  return (
    <div className="flex h-screen bg-[#f9fafb] text-[#1a1a2e] font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-[72px] flex items-center justify-between px-6 border-b border-gray-100">
          {isSidebarOpen ? (
            <Link to="/"><OasysLogo /></Link>
          ) : (
            <Link to="/" className="mx-auto text-xl font-medium text-[#1a1a2e]">O</Link>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              data-view={item.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors w-full ${
                activeTab === item.id 
                  ? 'bg-[#1a1a2e] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-gray-500'} />
              {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center justify-center w-full p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Topbar */}
        <header className="h-[72px] bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-medium text-gray-500 hover:text-black">← Website</Link>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Local workspace
            </div>
            <div className="w-8 h-8 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center font-medium text-sm">
              O
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-[1200px] mx-auto w-full">
            <div id="global-message" className="hidden mb-6 p-4 rounded-xl bg-blue-50 text-blue-700 border border-blue-100" role="alert"></div>

            {/* Overview Tab */}
            <div id="view-overview" className={`space-y-8 ${activeTab !== 'overview' ? 'hidden' : ''}`}>
              <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-12 items-center">
                <div className="flex-1">
                  <div className="text-xs font-medium tracking-widest text-gray-500 mb-4">OASYS / EVALUATION CONTROL</div>
                  <h2 className="text-4xl font-normal text-[#1a1a2e] mb-6 tracking-tight">Adversarial testing.<br/><span className="text-gray-400">Without shared state.</span></h2>
                  <p className="text-gray-600 mb-8 max-w-md">Run isolated model evaluations. Inspect every step, from commitment to signed evidence.</p>
                  <button onClick={() => setActiveTab('evaluations')} className="px-6 py-3 bg-[#1a1a2e] text-white rounded-full font-medium text-sm hover:bg-black transition-colors">
                    New evaluation
                  </button>
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl p-6 border border-gray-100">
                  {/* Topology visualization placeholder */}
                  <div className="text-xs font-medium text-gray-500 mb-4 flex items-center justify-between">
                    LIVE EXECUTION BOUNDARY <span id="diagram-status" className="text-blue-600">CHECKING</span>
                  </div>
                  <div className="aspect-video bg-white rounded-lg border border-gray-200 flex items-center justify-center text-gray-400">
                    [Topology Diagram]
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Total evaluations', id: 'stat-total', val: '0', sub: 'Recorded on this device' },
                  { label: 'Sealed & verified', id: 'stat-sealed', val: '0', sub: 'Independent Ed25519 verification' },
                  { label: 'Latest execution', id: 'stat-latency', val: '—', sub: 'End to end, including cold start' },
                  { label: 'Execution engine', id: 'stat-engine', val: 'Qwen 2.5 1.5B', sub: 'Checking local runtime...', subId: 'engine-state' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <span className="text-sm font-medium text-gray-500 mb-2">{stat.label}</span>
                    <strong id={stat.id} className="text-3xl font-light text-[#1a1a2e] mb-4">{stat.val}</strong>
                    <small id={stat.subId} className="text-xs text-gray-400">{stat.sub}</small>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-medium text-[#1a1a2e] mb-2">Recent evaluations</h3>
                    <p className="text-sm text-gray-500">A complete record from commitment to evidence.</p>
                  </div>
                  <button onClick={() => setActiveTab('evaluations')} className="text-sm font-medium text-blue-600 hover:text-blue-800">View all evaluations ↗</button>
                </div>
                <div id="recent-runs" className="min-h-[200px] border border-gray-100 rounded-xl bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                  Loading...
                </div>
              </div>
            </div>

            {/* Evaluations Tab */}
            <div id="view-evaluations" className={`space-y-8 ${activeTab !== 'evaluations' ? 'hidden' : ''}`}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-xs font-medium tracking-widest text-gray-500 mb-2">EVALUATION WORKSPACE</div>
                  <h2 className="text-3xl font-normal text-[#1a1a2e] tracking-tight mb-2">Configure & run.</h2>
                  <p className="text-gray-600 text-sm">Configure an evaluation, then follow its actual lifecycle.</p>
                </div>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium">Local operator rehearsal</span>
              </div>

              <div className="bg-[#1a1a2e] text-white rounded-2xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-1">INSIDE OASYS</div>
                    <h3 className="text-xl font-medium">See your evaluation happen.</h3>
                  </div>
                  <div className="flex gap-4">
                    <select id="live-select" className="bg-white/10 border border-white/20 text-white text-sm rounded-full px-4 py-2 outline-none appearance-none cursor-pointer">
                      <option value="live">Follow live execution</option>
                    </select>
                    <button id="live-start" disabled className="bg-white text-[#1a1a2e] px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-100 disabled:opacity-50">
                      Connecting...
                    </button>
                  </div>
                </div>
                <div className="h-[400px] bg-black/20 relative" id="live-canvas">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                    Three.js / WebGL Canvas goes here
                  </div>
                </div>
                <div className="p-4 bg-white/5 border-t border-white/10 flex justify-between text-xs text-gray-400">
                  <span id="live-worker">No model worker · fresh state every run</span>
                  <span id="live-seal">No run selected</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form */}
                <form id="run-form" className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-[#1a1a2e] mb-1">01. Configure evaluation</h3>
                    <p className="text-sm text-gray-500">Set the parameters for red and blue teams.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Starting scenario</label>
                      <select id="scenario" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                        <option>Loading scenarios...</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation name</label>
                      <input id="run-label" required maxLength={100} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Red team payload</label>
                      <textarea id="payload" required rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Blue team instructions</label>
                      <textarea id="system-prompt" required rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"></textarea>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <select id="quantum" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm">
                      <option value="0">No padding</option>
                      <option value="5">5 seconds</option>
                    </select>
                    <button id="run-button" type="submit" className="px-6 py-2.5 bg-[#1a1a2e] text-white rounded-full font-medium text-sm hover:bg-black transition-colors">
                      Run evaluation
                    </button>
                  </div>
                </form>

                {/* Timeline */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-medium text-[#1a1a2e] mb-1">02. Live execution</h3>
                      <p className="text-sm text-gray-500">Real-time event log.</p>
                    </div>
                    <span id="run-state" className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Ready</span>
                  </div>

                  <div id="run-empty" className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 py-12">
                    <Activity size={32} className="mb-4 text-gray-300" />
                    <h4 className="text-gray-600 font-medium mb-1">Awaiting evaluation.</h4>
                    <p className="text-sm">Launch an evaluation to see real events.</p>
                  </div>

                  <div id="run-content" className="hidden flex-1 flex flex-col">
                    <ol id="timeline" className="space-y-4 mb-8 text-sm flex-1 overflow-y-auto"></ol>
                    <div id="model-result" className="hidden mt-auto pt-6 border-t border-gray-100">
                      <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Model Response</h4>
                      <pre id="output" className="bg-gray-50 p-4 rounded-xl text-sm mb-4 border border-gray-100 overflow-x-auto whitespace-pre-wrap"></pre>
                      <div className="flex items-center gap-4">
                        <button id="verify-active" className="px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-medium hover:bg-gray-200">Verify evidence</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence & Security tabs... (keeping simplified versions to ensure they exist) */}
            <div id="view-evidence" className={`space-y-8 ${activeTab !== 'evidence' ? 'hidden' : ''}`}>
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-medium text-[#1a1a2e] mb-2">Evidence vault</h2>
                <p className="text-gray-600 text-sm mb-6">Verify cryptographically signed evaluation logs.</p>
                <div className="max-w-md space-y-4">
                  <select id="evidence-run" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm">
                    <option value="">No sealed evaluations yet</option>
                  </select>
                  <div className="flex gap-3">
                    <button id="verify-bundle" className="px-4 py-2 bg-[#1a1a2e] text-white rounded-full text-sm font-medium">Verify & replay</button>
                  </div>
                </div>
                <div id="verdict" className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-100 hidden text-sm"></div>
              </div>
            </div>

            <div id="view-security" className={`space-y-8 ${activeTab !== 'security' ? 'hidden' : ''}`}>
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-medium text-[#1a1a2e] mb-2">Isolation & proof</h2>
                <p className="text-gray-600 text-sm mb-6">Run automated suite to prove environment isolation.</p>
                <button id="run-proof" className="px-6 py-2.5 bg-[#1a1a2e] text-white rounded-full font-medium text-sm">Run proof suite</button>
                <div id="proof-list" className="mt-8 space-y-2"></div>
              </div>
            </div>

          </div>
        </main>
      </div>

      <div id="toast" role="status" className="hidden fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg font-medium text-sm z-50"></div>
    </div>
  );
}
