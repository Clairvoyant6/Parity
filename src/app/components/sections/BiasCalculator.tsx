import { useState, useRef, useEffect } from 'react';
import { SectionLabel } from '../ui/SectionLabel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, ResponsiveContainer } from 'recharts';

const MALE_HIRE_RATE = 0.72;

export function BiasCalculator() {
  const [womenInData, setWomenInData] = useState(30);
  const [threshold, setThreshold] = useState(0.8);

  const femaleHireRate = Math.max(0.05, (womenInData / 100) * MALE_HIRE_RATE * 1.3);
  const disparateImpact = femaleHireRate / MALE_HIRE_RATE;
  const isBiased = disparateImpact < threshold;

  const data = [
    { group: 'Male', rate: Math.round(MALE_HIRE_RATE * 100), color: '#3B82F6' },
    { group: 'Female', rate: Math.round(femaleHireRate * 100), color: isBiased ? '#EF4444' : '#10B981' },
  ];

  const thresholdLine = Math.round(MALE_HIRE_RATE * threshold * 100);

  function handleWomenSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    setWomenInData(val);
    e.target.style.setProperty('--progress', `${val}%`);
  }

  function handleThresholdSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    setThreshold(val / 100);
    const pct = ((val / 100 - 0.5) / 0.5) * 100;
    e.target.style.setProperty('--progress', `${pct}%`);
  }

  return (
    <section className="py-24" style={{ background: '#F9FAFB' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <SectionLabel text="Try It Live" className="justify-center mb-4" />
          <h2
            className="tracking-tight"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#111827' }}
          >
            See bias in a real hiring dataset.
          </h2>
          <p
            className="mt-3 max-w-xl mx-auto"
            style={{ fontFamily: 'Inter, sans-serif', color: '#6B7280', fontSize: '1rem' }}
          >
            Adjust the sliders to see how training data composition affects algorithmic bias.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          <div className="grid lg:grid-cols-2">
            {/* Left: Controls */}
            <div className="p-8 border-b lg:border-b-0 lg:border-r border-[#E5E7EB]">
              <h3
                className="mb-6"
                style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}
              >
                Model Parameters
              </h3>

              {/* Slider 1 */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <label
                    className="text-sm font-medium text-[#374151]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Women in Training Set
                  </label>
                  <span
                    className="text-sm font-bold text-[#2563EB]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {womenInData}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={womenInData}
                  onChange={handleWomenSlider}
                  className="parity-range w-full"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 ${womenInData}%, #E5E7EB ${womenInData}%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-[#9CA3AF] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Slider 2 */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <label
                    className="text-sm font-medium text-[#374151]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Fairness Threshold (80% Rule)
                  </label>
                  <span
                    className="text-sm font-bold text-[#2563EB]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {Math.round(threshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={Math.round(threshold * 100)}
                  onChange={handleThresholdSlider}
                  className="parity-range w-full"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 ${((threshold - 0.5) / 0.5) * 100}%, #E5E7EB ${((threshold - 0.5) / 0.5) * 100}%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-[#9CA3AF] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Result */}
              <div
                className="rounded-xl p-4 border"
                style={{
                  borderColor: isBiased ? '#FECACA' : '#A7F3D0',
                  backgroundColor: isBiased ? '#FEF2F2' : '#ECFDF5',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{isBiased ? '⚠️' : '✅'}</span>
                  <span
                    className="font-semibold"
                    style={{ color: isBiased ? '#EF4444' : '#10B981', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9375rem' }}
                  >
                    {isBiased ? 'Disparate Impact Violation' : 'Fairness Threshold Met'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>Disparate Impact Ratio</div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: isBiased ? '#EF4444' : '#10B981', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {disparateImpact.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>Legal Threshold</div>
                    <div
                      className="text-lg font-bold text-[#374151]"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {threshold.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: D3 Chart */}
            <div className="p-8">
              <h3
                className="mb-6"
                style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}
              >
                Predicted Hire Rate by Gender
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data} barSize={60}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="group" tick={{ fontFamily: 'Inter', fontSize: 13, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontFamily: 'JetBrains Mono', fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Hire Rate']}
                    contentStyle={{ fontFamily: 'Inter', fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                  />
                  <ReferenceLine
                    y={thresholdLine}
                    stroke="#EF4444"
                    strokeDasharray="6 3"
                    strokeWidth={2}
                    label={{ value: `80% rule: ${thresholdLine}%`, position: 'right', fontSize: 11, fontFamily: 'Inter', fill: '#EF4444' }}
                  />
                  <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                    {data.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p
                className="text-xs text-center mt-2"
                style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
              >
                Dashed line = {Math.round(threshold * 100)}% of majority group rate (legal threshold)
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
