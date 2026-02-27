import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function TrustGraph({ history, players }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!history || history.length === 0) return;

    const width = 600;
    const height = 300;
    // Increased right margin slightly to ensure long names fit
    const margin = { top: 20, right: 120, bottom: 30, left: 40 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); 

    const xScale = d3.scaleLinear()
      .domain([1, history.length])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, 100]) 
      .range([height - margin.bottom, margin.top]);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(history.length).tickFormat(d3.format('d')))
      .attr('color', '#94a3b8');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .attr('color', '#94a3b8');

    const colorScale = d3.scaleOrdinal(d3.schemeSet2);

    players.forEach((player, i) => {
      const line = d3.line()
        .x(d => xScale(d.round))
        .y(d => yScale(d.metrics[player.id]))
        .curve(d3.curveMonotoneX); 

      svg.append('path')
        .datum(history)
        .attr('fill', 'none')
        .attr('stroke', colorScale(i))
        .attr('stroke-width', 3)
        .attr('d', line);

      // The Jitter Fix: Separates the text labels vertically based on player index
      svg.append('text')
        .attr('x', width - margin.right + 10)
        .attr('y', yScale(history[history.length - 1].metrics[player.id]) + (i * 14 - 20)) 
        .attr('fill', colorScale(i))
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('alignment-baseline', 'middle')
        .text(player.username);
    });

  }, [history, players]);

  return (
    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-lg">
      <h3 className="text-center text-slate-300 mb-4 tracking-widest uppercase text-sm font-bold">Evolutionary Trust Graph</h3>
      
      {/* The D3 Graph */}
      <svg ref={svgRef} width="100%" height="300" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet"></svg>

      {/* NEW: The Graph Behavior Explanation for the Users */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
        
        <div className="bg-slate-800/50 p-4 rounded border border-slate-700/50 hover:border-green-500/30 transition-colors">
          <strong className="text-green-400 block mb-2 text-sm">↑ Upward Trajectory</strong>
          <p>Represents successful market cooperation. Receivers who trusted High-Quality assets, and Senders who signaled honestly, successfully build societal trust.</p>
        </div>

        <div className="bg-slate-800/50 p-4 rounded border border-slate-700/50 hover:border-red-500/30 transition-colors">
          <strong className="text-red-400 block mb-2 text-sm">↓ Downward Plunge</strong>
          <p>Indicates deception and market failure. Receivers scammed by Low-Quality assets lose trust, and Senders caught bluffing suffer severe reputation penalties.</p>
        </div>

        <div className="bg-slate-800/50 p-4 rounded border border-slate-700/50 hover:border-slate-500/30 transition-colors">
          <strong className="text-slate-300 block mb-2 text-sm">→ Stagnation (Flatline)</strong>
          <p>Denotes extreme skepticism. Players who continuously vote to DISTRUST protect themselves from scams, but fail to build mutual trust or score multipliers.</p>
        </div>

      </div>
    </div>
  );
}