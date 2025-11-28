// src/components/BolusChart.tsx
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { getSmartBolusData } from '../utils/tandemCache';

interface BaseEvent {
  id: number;
  name: string;
  seqNum: number;
  eventTimestamp: Date;
}

interface LidBolusCompleted extends BaseEvent {
  completionstatus: number;
  bolusid: number;
  insulindelivered: number; // units
  insulinrequested: number; // units
  IOB: number; // units
}

interface LidCgmData extends BaseEvent {
  currentGlucoseDisplayValue: number; // mg/dL
}

interface BolusChartProps {
  mealTime: Date;
}

const D3BolusChart: React.FC<{
  cgmData: LidCgmData[];
  bolusData: LidBolusCompleted[];
  mealTime: Date;
}> = ({ cgmData, bolusData, mealTime }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const leftAxisRef = useRef<SVGSVGElement>(null);
  const rightAxisRef = useRef<SVGSVGElement>(null);
  const legendRef = useRef<SVGSVGElement>(null); // New ref for sticky legend
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null); // New ref for scroll container
  const initialScrollPerformed = useRef<string | null>(null); // Track if initial scroll is done
  const [containerWidth, setContainerWidth] = useState(0);
  const height = 300;
  const margin = { top: 20, right: 50, bottom: 30, left: 50 };
  const PIXELS_PER_HOUR = 100;

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      setContainerWidth(entry.contentRect.width);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Determine the min and max timestamps from all available data
  const allTimestamps = [
    ...cgmData.map(d => d.eventTimestamp.getTime()),
    ...bolusData.map(d => d.eventTimestamp.getTime()),
  ];

  let minTime = new Date(mealTime.getTime() - 4 * 60 * 60 * 1000);
  let maxTime = new Date(mealTime.getTime() + 4 * 60 * 60 * 1000);

  if (allTimestamps.length > 0) {
    minTime = new Date(Math.min(...allTimestamps));
    maxTime = new Date(Math.max(...allTimestamps));
  }

  // Add some padding to the time domain, e.g., 1 hour before min and after max
  minTime = new Date(minTime.getTime() - 1 * 60 * 60 * 1000);
  maxTime = new Date(maxTime.getTime() + 1 * 60 * 60 * 1000);

  // Calculate svgWidth based on the time domain
  const timeSpanHours = (maxTime.getTime() - minTime.getTime()) / (1000 * 60 * 60);
  // Ensure a minimum width even if timeSpan is small
  const svgWidth = Math.max(containerWidth, timeSpanHours * PIXELS_PER_HOUR + margin.left + margin.right);

  // Initial Scroll to Meal Time
  useLayoutEffect(() => {
    if (scrollContainerRef.current && containerWidth > 0 && svgWidth > 0) {
      // Check if we have already scrolled for this specific mealTime
      if (initialScrollPerformed.current !== mealTime.toISOString()) {
        const innerWidth = svgWidth - margin.left - margin.right;
        const xScale = d3.scaleTime()
          .domain([minTime, maxTime])
          .range([0, innerWidth]);
        
        const mealX = xScale(mealTime) + margin.left;
        const targetScroll = mealX - containerWidth / 2;
        scrollContainerRef.current.scrollLeft = targetScroll;
        
        // Mark as scrolled for this mealTime
        initialScrollPerformed.current = mealTime.toISOString();
      }
    }
  }, [svgWidth, containerWidth, mealTime, minTime, maxTime, margin.left, margin.right]);


  useEffect(() => {
    if (!svgRef.current || !leftAxisRef.current || !rightAxisRef.current || !legendRef.current) return;

    const svg = d3.select(svgRef.current);
    const leftAxisSvg = d3.select(leftAxisRef.current);
    const rightAxisSvg = d3.select(rightAxisRef.current);
    const legendSvg = d3.select(legendRef.current);
    
    svg.selectAll('*').remove();
    leftAxisSvg.selectAll('*').remove();
    rightAxisSvg.selectAll('*').remove();
    legendSvg.selectAll('*').remove();

    const innerWidth = svgWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Define Scales
    const xScale = d3.scaleTime()
      .domain([minTime, maxTime])
      .range([0, innerWidth]);

    const maxGlucose = d3.max(cgmData, d => d.currentGlucoseDisplayValue) || 300;
    const yScaleGlucose = d3.scaleLinear()
      .domain([0, Math.max(maxGlucose, 250)])
      .range([innerHeight, 0]);

    const maxInsulin = d3.max(bolusData, d => d.insulindelivered) || 5;
    const yScaleInsulin = d3.scaleLinear()
      .domain([0, Math.max(maxInsulin, 10)])
      .range([innerHeight, 0]);

    // --- Draw Main Chart ---
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(d3.timeHour.every(1))
      .tickFormat(d => d3.timeFormat('%H:%M')(d as Date));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('color', '#9ca3af');

    // Meal Time Indicator
    g.append('line')
      .attr('x1', xScale(mealTime))
      .attr('x2', xScale(mealTime))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#fbbf24')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.7);

    // CGM Line
    const lineGenerator = d3.line<LidCgmData>()
      .x(d => xScale(d.eventTimestamp))
      .y(d => yScaleGlucose(d.currentGlucoseDisplayValue))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(cgmData)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2.5)
      .attr('d', lineGenerator);

    // Bolus Events
    g.selectAll('.bolus-bar')
      .data(bolusData)
      .enter()
      .append('rect')
      .attr('class', 'bolus-bar')
      .attr('x', d => xScale(d.eventTimestamp) - 3)
      .attr('y', d => yScaleInsulin(d.insulindelivered))
      .attr('width', 6)
      .attr('height', d => innerHeight - yScaleInsulin(d.insulindelivered))
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.6)
      .append('title')
      .text(d => `Bolus: ${d.insulindelivered}u\nTime: ${d.eventTimestamp.toLocaleTimeString()}`);

    // --- Draw Left Axis (Glucose) ---
    const gLeft = leftAxisSvg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    gLeft.call(d3.axisLeft(yScaleGlucose).ticks(5))
      .attr('color', '#9ca3af')
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
          .attr("x", -10)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("mg/dL"));

    // --- Draw Right Axis (Insulin) ---
    const gRight = rightAxisSvg.append('g')
        .attr('transform', `translate(0, ${margin.top})`); // Right axis starts at 0 of its container

    gRight.call(d3.axisRight(yScaleInsulin).ticks(5))
      .attr('color', '#3b82f6')
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
          .attr("x", 10)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "end")
          .text("Units"));

    // --- Draw Sticky Legend ---
    const legend = legendSvg.append('g').attr('transform', `translate(${margin.left + 10}, ${margin.top})`);
    legend.append('rect').attr('x', 0).attr('y', 0).attr('width', 10).attr('height', 10).attr('fill', '#10b981');
    legend.append('text').attr('x', 15).attr('y', 10).text('Glucose').attr('fill', '#10b981').style('font-size', '12px');
    legend.append('rect').attr('x', 70).attr('y', 0).attr('width', 10).attr('height', 10).attr('fill', '#3b82f6');
    legend.append('text').attr('x', 85).attr('y', 10).text('Bolus').attr('fill', '#3b82f6').style('font-size', '12px');
    legend.append('line').attr('x1', 140).attr('y1', 5).attr('x2', 150).attr('y2', 5).attr('stroke', '#fbbf24').attr('stroke-width', 2).attr('stroke-dasharray', '4 4');
    legend.append('text').attr('x', 155).attr('y', 10).text('Meal').attr('fill', '#fbbf24').style('font-size', '12px');

  }, [cgmData, bolusData, mealTime, containerWidth, svgWidth, minTime, maxTime]);

  return (
    <div ref={containerRef} className="w-full relative h-[300px]">
      {/* Sticky Left Axis */}
      <svg 
        ref={leftAxisRef} 
        width={margin.left} 
        height={height} 
        className="absolute left-0 top-0 z-10 bg-white/90 dark:bg-gray-900/90 pointer-events-none" 
      />
      
      {/* Scrollable Chart Area */}
      <div ref={scrollContainerRef} className="overflow-x-auto w-full h-full absolute top-0 left-0">
        <svg ref={svgRef} width={svgWidth} height={height} className="overflow-visible" />
      </div>

      {/* Sticky Right Axis */}
      <svg 
        ref={rightAxisRef} 
        width={margin.right} 
        height={height} 
        className="absolute right-0 top-0 z-10 bg-white/90 dark:bg-gray-900/90 pointer-events-none" 
      />

      {/* Sticky Legend */}
      <svg 
        ref={legendRef} 
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-20" 
      />
    </div>
  );
};

const BolusChart: React.FC<BolusChartProps> = ({ mealTime }) => {
  const [bolusEvents, setBolusEvents] = useState<LidBolusCompleted[]>([]);
  const [cgmEvents, setCgmEvents] = useState<LidCgmData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timestamp = mealTime ? mealTime.getTime() : null;

  useEffect(() => {
    let isMounted = true;

    const fetchBolusData = async () => {
      if (!timestamp) return;

      if (isMounted) {
        setIsLoading(true);
        setError(null);
      }

      const email = localStorage.getItem('tandem_email');
      const password = localStorage.getItem('tandem_password');
      const region = localStorage.getItem('tandem_region') || 'EU';

      if (!email || !password) {
        if (isMounted) {
            setError('Tandem credentials not found. Please set them in the settings.');
            setIsLoading(false);
        }
        return;
      }

      try {
        const mealDate = new Date(timestamp);
        const start = new Date(mealDate.getTime() - 4 * 60 * 60 * 1000);
        const end = new Date(mealDate.getTime() + 4 * 60 * 60 * 1000);

        const result = await getSmartBolusData(start, end, { email, password, region });

        const bolus: LidBolusCompleted[] = [];
        const cgm: LidCgmData[] = [];

        result.forEach((event: any) => {
            // getSmartBolusData handles Date conversion
            const typedEvent = event;

            if (event.name === 'LID_BOLUS_COMPLETED') {
                bolus.push(typedEvent as LidBolusCompleted);
            } else if (event.name && event.name.startsWith('LID_CGM_DATA')) {
                cgm.push(typedEvent as LidCgmData);
            }
        });
        
        // Sort events by time ascending
        bolus.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());
        cgm.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());

        if (isMounted) {
            setBolusEvents(bolus);
            setCgmEvents(cgm);
        }

      } catch (err: any) {
        console.error('Bolus data fetch error:', err);
        if (isMounted) {
            setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isMounted) {
            setIsLoading(false);
        }
      }
    };

    if (timestamp) {
      fetchBolusData();
    }

    return () => {
        isMounted = false;
    };
  }, [timestamp]);

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Tandem Pump Activity (-4h to +4h)
      </h2>

      {isLoading && (
         <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Fetching Pump Data...</p>
         </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4">
          <h3 className="font-bold">Error</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!isLoading && !error && bolusEvents.length === 0 && cgmEvents.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">No pump events found in this time window.</p>
        </div>
      )}

      {!isLoading && !error && (bolusEvents.length > 0 || cgmEvents.length > 0) && (
        <div className="space-y-6">
            {/* D3 Chart */}
            <div className="w-full overflow-x-auto">
                 <D3BolusChart 
                    cgmData={cgmEvents} 
                    bolusData={bolusEvents} 
                    mealTime={mealTime} 
                 />
            </div>

            {/* Details Summary */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                     <span className="block text-gray-500 dark:text-gray-400">Total Bolus Events</span>
                     <span className="font-medium text-gray-900 dark:text-gray-100">{bolusEvents.length}</span>
                 </div>
                 <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                     <span className="block text-gray-500 dark:text-gray-400">Total Insulin Delivered</span>
                     <span className="font-medium text-gray-900 dark:text-gray-100">
                        {bolusEvents.reduce((acc, curr) => acc + curr.insulindelivered, 0).toFixed(2)}u
                     </span>
                 </div>
            </div>

          {bolusEvents.length > 0 && (
            <details className="group">
              <summary className="flex items-center cursor-pointer list-none font-medium text-gray-700 dark:text-gray-300">
                <span className="mr-2 transition group-open:rotate-90">▶</span>
                View Bolus Data Table
              </summary>
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-4 py-3">Time</th>
                      <th scope="col" className="px-4 py-3">Delivered (u)</th>
                      <th scope="col" className="px-4 py-3">IOB (u)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bolusEvents.map((event) => (
                      <tr key={event.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                        <td className="px-4 py-3">{event.eventTimestamp.toLocaleTimeString()}</td>
                        <td className="px-4 py-3">{event.insulindelivered}</td>
                        <td className="px-4 py-3">{event.IOB}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default BolusChart;
