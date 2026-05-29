'use client'

import { useState } from 'react'

export default function StatementGuide() {
  const [showGuide, setShowGuide] = useState(false)

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setShowGuide((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Where do I get my Mandiri statement?</p>
            <p className="text-xs text-gray-400 mt-0.5">Mandiri sends monthly e-statements to your email</p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${showGuide ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {showGuide && (
        <div className="border-t border-gray-100 px-5 py-5 space-y-4">
          <ol className="space-y-3">
            {[
              {
                step: '1',
                title: 'Check your email inbox',
                desc: 'Mandiri automatically sends a monthly e-statement to your registered email address, usually in the first few days of the next month.',
              },
              {
                step: '2',
                title: 'Search for the email',
                desc: 'Search your inbox for "Consolidated Statement Bank Mandiri". The subject line looks like: "[WARNING: MESSAGE ENCRYPTED] Consolidated Statement Bank Mandiri". Check your spam/junk folder if you don\'t see it.',
              },
              {
                step: '3',
                title: 'Download the PDF attachment',
                desc: 'The email has a PDF attachment named "ConsolidatedStatement_Apr_2026.pdf" (month and year will vary). Download it to your device.',
              },
              {
                step: '4',
                title: 'Upload it here',
                desc: 'Drag and drop (or click) the PDF into the upload area below.',
              },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="text-xs text-amber-800">
              <span className="font-semibold">PDF password tip:</span> Mandiri e-statement PDFs are usually password-protected with your <span className="font-semibold">date of birth in DDMMYYYY format</span> (e.g. if born 15 March 1995, try <code className="bg-amber-100 px-1 rounded">15031995</code>). Some accounts use the last 4 digits of your account number instead.
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Don&apos;t receive e-statements? Log in to <span className="font-medium">Livin&apos; by Mandiri</span> app → Account → Statement, or visit your nearest Mandiri branch to enable e-statement delivery.
          </p>
        </div>
      )}
    </div>
  )
}
