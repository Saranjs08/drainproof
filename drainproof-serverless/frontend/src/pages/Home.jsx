import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, CheckCircle2, ShieldAlert, Cpu, Layers, GitCompare } from 'lucide-react';

function Home() {
  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-xs font-semibold">
          <Cpu className="w-4 h-4 text-cyan-600" /> AWS Serverless Architecture
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          Smart Drainage Monitoring with <span className="text-blue-600">Proof of Resolution</span>
        </h1>
        <p className="text-lg text-slate-600">
          Report clogged drains, automatically prioritize flood hazards, eliminate duplicate tickets, and guarantee verification with mandatory before-and-after photographic evidence.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            to="/report"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20 transition"
          >
            Report Drainage Problem
          </Link>
          <Link
            to="/track"
            className="px-6 py-3 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-medium transition"
          >
            Track Existing Report
          </Link>
        </div>
      </section>

      {/* 3 Pillars of DrainProof */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Direct S3 Photo Upload</h3>
          <p className="text-sm text-slate-600">
            Citizens upload high-resolution before-photos directly to private S3 buckets via short-lived presigned URLs, keeping backend Lambdas fast and lightweight.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <GitCompare className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Automated Step Functions</h3>
          <p className="text-sm text-slate-600">
            Every submission triggers a state machine that calculates risk scores, identifies nearby duplicate claims, and updates DynamoDB in real-time.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Resolution Verification</h3>
          <p className="text-sm text-slate-600">
            A status is never marked 'RESOLVED' without uploading an after-cleanup photo and receiving formal human audit verification from an administrator.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Home;
