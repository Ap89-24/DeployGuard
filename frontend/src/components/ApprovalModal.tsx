import React, { useState } from 'react';
import { UserCheck, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  decisionId: string;
  action: string;
  serviceName: string;
  rationale: string;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  decisionId,
  action,
  serviceName,
  rationale,
}) => {
  const [comment, setComment] = useState('Approved rollback to v2.4.1 after SRE log review.');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleApprove = () => {
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="stitch-card w-full max-w-lg p-6 border-cyan-500/40 shadow-2xl shadow-cyan-500/20 bg-slate-950/95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-white font-bold text-base font-geist">
            <UserCheck className="h-5 w-5 text-cyan-400" />
            Human-in-the-Loop SRE Approval Audit Workflow
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">&times;</button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="stitch-card p-3.5 bg-slate-900/80 border-slate-800">
            <p className="text-xs text-slate-400 font-mono-code">Decision ID: <span className="text-white font-bold">{decisionId}</span></p>
            <p className="text-xs text-slate-400 font-mono-code mt-1">Target Workload: <span className="text-cyan-400 font-bold">{serviceName}</span></p>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="label-caps bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded">
                RECOMMENDED ACTION: {action}
              </span>
            </div>
          </div>

          <div>
            <label className="label-caps text-slate-300 block mb-1.5">AI Safety Rationale & Safety Checks</label>
            <p className="text-xs text-slate-300 bg-slate-900/90 p-3 rounded-lg border border-slate-800 leading-relaxed font-mono-code">
              {rationale}
            </p>
          </div>

          <div>
            <label className="label-caps text-slate-300 block mb-1.5">SRE Lead Approver Audit Signature Log</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-slate-900/90 p-3 text-xs text-white border border-slate-800 focus:border-cyan-400 focus:outline-none font-mono-code"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-slate-800"
          >
            Reject Decision
          </button>
          <button
            onClick={handleApprove}
            disabled={isSubmitted}
            className="btn-cyan-glow flex items-center gap-2 rounded-lg px-5 py-2 text-xs uppercase tracking-wider font-bold"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitted ? 'APPROVED & EXECUTING...' : 'APPROVE RECOVERY ACTION'}
          </button>
        </div>
      </div>
    </div>
  );
};
