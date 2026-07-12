import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";

export function Lab() {
  return (
    <>
      <SEO title="Lab" description="A place for my experiments, tests, and small tools." url={window.location.href} />
      <PageTransition>
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center py-16 px-4 text-center">
        <img 
          src="https://cdn-icons-png.flaticon.com/128/883/883032.png" 
          alt="The Lab" 
          className="w-16 h-16 sm:w-20 sm:h-20 object-contain grayscale opacity-80 mx-auto mb-8 pointer-events-none" 
        />
        
        <h1 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight text-slate-900 mb-6">
          The Lab
        </h1>
        
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-lg mx-auto mb-10">
          This space is currently under construction. I'll be sharing my technical experiments, interactive simulations, and coding playgrounds here soon.
        </p>
        
        <div className="inline-flex items-center justify-center px-8 py-3 bg-slate-900 text-white text-sm sm:text-base font-medium rounded-xl shadow-sm hover:bg-slate-800 transition-colors cursor-not-allowed opacity-80">
          Coming Soon
        </div>
      </div>
    </PageTransition>
    </>
  );
}