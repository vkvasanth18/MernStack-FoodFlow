import React from 'react';
import { Construction } from 'lucide-react';

const ModulePlaceholder = ({ title, description }) => {
  return (
    <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-sm text-center flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
        <Construction className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">{title} Module</h2>
      <p className="text-xs text-slate-500 max-w-md mb-6">{description}</p>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
        Ready for next implementation step
      </div>
    </div>
  );
};

export default ModulePlaceholder;
