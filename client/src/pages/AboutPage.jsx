import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, ShieldCheck, Award, ArrowLeft, ArrowRight, BookOpen, Users, Feather, Leaf, Phone, Mail, Clock, CheckCircle2, MapPin } from 'lucide-react';

export default function AboutPage({ initialTab = 'heritage', onNavigate }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const tabs = [
    { id: 'heritage', label: 'Handloom Heritage', icon: BookOpen },
    { id: 'artisans', label: 'Artisans & Weavers', icon: Users },
    { id: 'care', label: 'Saree Care Guide', icon: Feather },
    { id: 'sustainability', label: 'Sustainable Silk Pledge', icon: Leaf }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-8 sm:py-12">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5B1425] hover:text-[#7E1E34] transition mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#EAE2D7] pb-6">
          <div>
            <span className="text-xs font-semibold text-[#5B1425] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              The Art of PALLUVO
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#1F1A1C] mt-1">
              Heritage, Craft & Sustainability
            </h1>
          </div>
          <p className="text-xs text-[#6E6467] mt-2 sm:mt-0 max-w-xs">
            Every drape is a living archive of Indian handloom legacy, woven by master artisans with generational skill.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 sm:gap-3 no-scrollbar mt-6 border-b border-[#EAE2D7] pb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  window.history.pushState({}, '', `/about?tab=${tab.id}`);
                }}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#5B1425] text-[#FAF7F2] shadow-md'
                    : 'bg-white text-[#6E6467] hover:bg-[#F4EFEB] hover:text-[#1F1A1C] border border-[#EAE2D7]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#C5A059]' : 'text-[#6E6467]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Editorial Card */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-[#EAE2D7] p-6 sm:p-10 shadow-sm leading-relaxed text-sm text-[#3D3336] space-y-8">
            
            {/* 1. OUR HANDLOOM HERITAGE */}
            {activeTab === 'heritage' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-[#F4EFEB] pb-4">
                  <span className="text-[11px] font-bold text-[#C5A059] uppercase tracking-wider">Centuries of Weaving Mastery</span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C] mt-0.5">
                    Our Handloom Heritage
                  </h2>
                  <p className="text-xs text-[#6E6467] mt-1">
                    Preserving the soul of India's classical textile traditions across Varanasi, Kanchipuram, and Chanderi.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">The Philosophy of Slow Handcraft</h3>
                  <p>
                    At PALLUVO, we believe a saree is not just six yards of fabric; it is an heirloom woven with memory, devotion, and timeless grace. In an era dominated by high-speed mechanized looms, our master weavers work exclusively on traditional pit looms and wooden frame looms, dedicating between 15 to 45 painstaking days to create a single masterpiece.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE2D7] space-y-2">
                    <h4 className="font-serif font-bold text-sm text-[#5B1425]">Varanasi Katan & Kadwa Weaves</h4>
                    <p className="text-xs text-[#6E6467]">
                      Hand-twisted pure silk threads interlocked with antique gold and silver zari using the ancient Kadwa brocade technique, ensuring motifs never unravel or snag.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE2D7] space-y-2">
                    <h4 className="font-serif font-bold text-sm text-[#5B1425]">Kanchipuram Temple Korvai</h4>
                    <p className="text-xs text-[#6E6467]">
                      Interlocking body and border through the legendary Korvai technique, utilizing heavy 3-ply mulberry silk and tested electroplated silver zari borders.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">Certified Silk Mark Authenticity</h3>
                  <p>
                    All designated pure silk handloom drapes in the PALLUVO collection carry the authorized Silk Mark Organization of India certification tag. This ensures that verified pure silk drapes are woven from 100% natural mulberry silk, free from synthetic blends or powerloom counterfeits.
                  </p>
                </div>
              </div>
            )}

            {/* 2. ARTISANS & WEAVERS */}
            {activeTab === 'artisans' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-[#F4EFEB] pb-4">
                  <span className="text-[11px] font-bold text-[#C5A059] uppercase tracking-wider">The Hands Behind the Drapes</span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C] mt-0.5">
                    Artisans & Weavers Guild
                  </h2>
                  <p className="text-xs text-[#6E6467] mt-1">
                    Empowering over 400 generational weaving families with dignified livelihood, ethical wages, and craft preservation.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">Direct Fair-Trade Artisan Partnerships</h3>
                  <p>
                    We eliminate middlemen brokers and operate directly with registered weaving cooperatives in Varanasi, Kanchipuram, Uppada, and Chanderi. By doing so, our artisans receive direct, premium compensation that is 35% above regional minimum wage standards, enabling them to sustain their craft with pride.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE2D7] text-center space-y-1">
                    <div className="font-serif text-2xl font-bold text-[#5B1425]">400+</div>
                    <div className="text-xs font-semibold text-[#1F1A1C]">Master Weavers</div>
                    <div className="text-[11px] text-[#6E6467]">Directly Supported</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE2D7] text-center space-y-1">
                    <div className="font-serif text-2xl font-bold text-[#5B1425]">100%</div>
                    <div className="text-xs font-semibold text-[#1F1A1C]">Fair Living Wages</div>
                    <div className="text-[11px] text-[#6E6467]">Healthcare & Benefits</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE2D7] text-center space-y-1">
                    <div className="font-serif text-2xl font-bold text-[#5B1425]">12+</div>
                    <div className="text-xs font-semibold text-[#1F1A1C]">Weaving Clusters</div>
                    <div className="text-[11px] text-[#6E6467]">Across 5 Indian States</div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">Preserving Endangered Weaving Motifs</h3>
                  <p>
                    Through our Weaver Apprenticeship Fellowship, senior master craftspeople mentor younger generations in endangered motifs like the *Shikargah* jungle hunt, *Hans* swan border, *Asavali* flower vase, and *Mayil* peacock jaals.
                  </p>
                </div>
              </div>
            )}

            {/* 3. SAREE CARE & STORAGE GUIDE */}
            {activeTab === 'care' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-[#F4EFEB] pb-4">
                  <span className="text-[11px] font-bold text-[#C5A059] uppercase tracking-wider">Cherish Your Heirlooms</span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C] mt-0.5">
                    Saree Care & Storage Guide
                  </h2>
                  <p className="text-xs text-[#6E6467] mt-1">
                    Essential preservation tips to maintain the natural luster, softness, and zari brilliance for generations.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE2D7]">
                    <div className="w-8 h-8 rounded-full bg-[#5B1425] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#1F1A1C]">Storage in Breathable Muslin Bags</h4>
                      <p className="text-xs text-[#6E6467] mt-1">
                        Always store silk sarees in pure unbleached cotton or muslin fabric covers. Avoid plastic covers, which trap moisture and can cause zari oxidation or fabric discoloration over time.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE2D7]">
                    <div className="w-8 h-8 rounded-full bg-[#5B1425] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#1F1A1C]">Airing & Changing Fold Lines</h4>
                      <p className="text-xs text-[#6E6467] mt-1">
                        Unfold and air your sarees in gentle shade once every 3 to 4 months. Refold along new fold lines to relieve stress on the silk fibers and prevent sharp permanent creases.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE2D7]">
                    <div className="w-8 h-8 rounded-full bg-[#5B1425] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#1F1A1C]">Dry Clean Only</h4>
                      <p className="text-xs text-[#6E6467] mt-1">
                        Pure handloom silk and zari sarees should exclusively be dry cleaned by professional textile specialists. Never spray perfume, deodorant, or hairspray directly onto zari borders.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE2D7]">
                    <div className="w-8 h-8 rounded-full bg-[#5B1425] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#1F1A1C]">Ironing Precautions</h4>
                      <p className="text-xs text-[#6E6467] mt-1">
                        Iron on the reverse side using medium-low heat setting. Always place a clean white cotton cloth between the iron and the saree to protect the zari shine.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. SUSTAINABLE SILK PLEDGE */}
            {activeTab === 'sustainability' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-[#F4EFEB] pb-4">
                  <span className="text-[11px] font-bold text-[#C5A059] uppercase tracking-wider">Mindful Luxury</span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C] mt-0.5">
                    Sustainable Silk Pledge
                  </h2>
                  <p className="text-xs text-[#6E6467] mt-1">
                    Our environmental and social commitment to zero waste, non-toxic dyes, and conscious luxury.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">Eco-Conscious Handloom Practices</h3>
                  <p>
                    Handloom weaving is naturally one of the most environmentally sustainable textile crafts in the world. Requiring zero electrical power for the loom mechanism, each saree generates a near-zero carbon manufacturing footprint compared to automated mills.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#1F1A1C]">Azo-Free & Botanical Dyes:</strong> We prioritize plant-based and non-toxic certified organic dye pigments, safeguarding both river ecosystems and the sensitive skin of our patrons.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#1F1A1C]">Zero Microplastic Pollution:</strong> 100% natural Mulberry, Tussar, and Cotton fibers that are naturally biodegradable at the end of their multi-generational lifecycle.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#1F1A1C]">Reusable Keepsake Packaging:</strong> Every parcel is delivered in an archival rigid keepsake box with reusable muslin storage bags, eliminating single-use plastics from our shipping supply chain.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Concierge & Quick Links */}
          <div className="space-y-6">
            <div className="bg-[#3F0D19] text-[#FAF7F2] rounded-2xl p-6 shadow-md space-y-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C5A059]">
                PALLUVO Concierge
              </span>
              <h3 className="font-serif text-xl font-bold">
                Bespoke Saree Consultations
              </h3>
              <p className="text-xs text-[#FAF7F2]/80 leading-relaxed">
                Connect with our bridal saree curators for private drape previews, color matching, and custom fall & pico finishing.
              </p>

              <div className="space-y-3 pt-2 text-xs border-t border-white/10">
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <a href="tel:+918897776984" className="hover:text-[#C5A059] transition">+91 88977 76984 (Concierge)</a>
                    <a href="tel:+918498854323" className="hover:text-[#C5A059] transition">+91 84988 54323 (Customer Care)</a>
                    <a href="tel:+918106789789" className="hover:text-[#C5A059] transition">+91 81067 89789 (Support & Orders)</a>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <a href="mailto:info@palluvo.store" className="hover:text-[#C5A059] transition">info@palluvo.store</a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <span>10:00 AM – 8:00 PM IST (Mon–Sat)</span>
                </div>
                <div className="flex items-center gap-2.5 pt-1 border-t border-white/10">
                  <MapPin className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <a
                    href="https://maps.app.goo.gl/wkcLwsNgHp39z4pe7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#C5A059] hover:text-[#E0C07F] font-semibold underline underline-offset-2 flex items-center gap-1"
                  >
                    <span>Visit Flagship on Google Maps ↗</span>
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('shop')}
                  className="w-full py-2.5 bg-[#C5A059] text-[#1F1A1C] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#E0C07F] transition text-center cursor-pointer"
                >
                  Explore Saree Collection
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EAE2D7] p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#5B1425] font-serif font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
                <span>Certified Pure Silk Mark</span>
              </div>
              <p className="text-xs text-[#6E6467] leading-relaxed">
                All PALLUVO pure silk handloom drapes marked with Silk Mark certification are authenticated by the Silk Mark Organization of India, certifying authentic 100% natural silk threads.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
