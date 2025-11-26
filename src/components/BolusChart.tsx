// src/components/BolusChart.tsx
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getBolusEvents } from '../functions/tandem';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const height = 300;
  const margin = { top: 20, right: 50, bottom: 30, left: 50 };

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      setWidth(entry.contentRect.width);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Define X Scale (Time)
    // Range: mealTime - 4h to mealTime + 4h
    const minTime = new Date(mealTime.getTime() - 4 * 60 * 60 * 1000);
    const maxTime = new Date(mealTime.getTime() + 4 * 60 * 60 * 1000);

    const xScale = d3.scaleTime()
      .domain([minTime, maxTime])
      .range([0, innerWidth]);

    // Define Y Scale (Glucose)
    // Default to 0-400 if no data, otherwise fit data with some padding
    const maxGlucose = d3.max(cgmData, d => d.currentGlucoseDisplayValue) || 300;
    const yScaleGlucose = d3.scaleLinear()
      .domain([0, Math.max(maxGlucose, 250)]) // Ensure at least 250 for context
      .range([innerHeight, 0]);

    // Define Y Scale (Insulin) - mapped to right axis
    const maxInsulin = d3.max(bolusData, d => d.insulindelivered) || 5;
    const yScaleInsulin = d3.scaleLinear()
      .domain([0, Math.max(maxInsulin, 10)])
      .range([innerHeight, 0]);


    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // --- Grids and Axes ---

    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(d3.timeHour.every(1))
      .tickFormat(d => d3.timeFormat('%H:%M')(d as Date));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('color', '#9ca3af'); // tailwind gray-400

    // Y Axis Left (Glucose)
    g.append('g')
      .call(d3.axisLeft(yScaleGlucose).ticks(5))
      .attr('color', '#9ca3af')
      .call(g => g.select(".domain").remove()) // Clean look
      .call(g => g.append("text")
          .attr("x", -10)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("mg/dL"));

    // Y Axis Right (Insulin)
    g.append('g')
      .attr('transform', `translate(${innerWidth}, 0)`)
      .call(d3.axisRight(yScaleInsulin).ticks(5))
      .attr('color', '#3b82f6') // tailwind blue-500
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
          .attr("x", 10)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "end")
          .text("Units"));


    // Meal Time Indicator
    g.append('line')
      .attr('x1', xScale(mealTime))
      .attr('x2', xScale(mealTime))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#fbbf24') // amber-400
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.7);


    // --- Data Drawing ---

    // 1. CGM Line
    const lineGenerator = d3.line<LidCgmData>()
      .x(d => xScale(d.eventTimestamp))
      .y(d => yScaleGlucose(d.currentGlucoseDisplayValue))
      .curve(d3.curveMonotoneX); // Smooth curve

    // Draw path
    g.append('path')
      .datum(cgmData)
      .attr('fill', 'none')
      .attr('stroke', '#10b981') // emerald-500
      .attr('stroke-width', 2.5)
      .attr('d', lineGenerator);
      
    // Draw points for CGM (optional, good for hovering)
    // Skipping for performance/cleanliness unless data is sparse

    // 2. Bolus Events (Bars)
    g.selectAll('.bolus-bar')
      .data(bolusData)
      .enter()
      .append('rect')
      .attr('class', 'bolus-bar')
      .attr('x', d => xScale(d.eventTimestamp) - 3) // Center bar
      .attr('y', d => yScaleInsulin(d.insulindelivered))
      .attr('width', 6)
      .attr('height', d => innerHeight - yScaleInsulin(d.insulindelivered))
      .attr('fill', '#3b82f6') // blue-500
      .attr('opacity', 0.6)
      .append('title') // Simple tooltip
      .text(d => `Bolus: ${d.insulindelivered}u\nTime: ${d.eventTimestamp.toLocaleTimeString()}`);


    // Legend
    const legend = g.append('g').attr('transform', `translate(10, 0)`);
    
    // Glucose Legend
    legend.append('rect').attr('x', 0).attr('y', 0).attr('width', 10).attr('height', 10).attr('fill', '#10b981');
    legend.append('text').attr('x', 15).attr('y', 10).text('Glucose').attr('fill', '#10b981').style('font-size', '12px');

    // Insulin Legend
    legend.append('rect').attr('x', 70).attr('y', 0).attr('width', 10).attr('height', 10).attr('fill', '#3b82f6');
    legend.append('text').attr('x', 85).attr('y', 10).text('Bolus').attr('fill', '#3b82f6').style('font-size', '12px');
    
    // Meal Legend
    legend.append('line').attr('x1', 140).attr('y1', 5).attr('x2', 150).attr('y2', 5).attr('stroke', '#fbbf24').attr('stroke-width', 2).attr('stroke-dasharray', '4 4');
    legend.append('text').attr('x', 155).attr('y', 10).text('Meal').attr('fill', '#fbbf24').style('font-size', '12px');


  }, [cgmData, bolusData, mealTime, width]);

  return (
    <div ref={containerRef} className="w-full relative">
      <svg ref={svgRef} width={width} height={height} className="overflow-visible" />
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
        const result = await getBolusEvents({
          data: {
            email,
            password,
            mealTime: new Date(timestamp).toISOString(),
            region,
          }
        });

        const bolus: LidBolusCompleted[] = [];
        const cgm: LidCgmData[] = [];

        result.forEach((event: any) => {
            const typedEvent = {
                ...event,
                eventTimestamp: new Date(event.eventTimestamp)
            };

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
            <div className="w-full overflow-hidden">
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
