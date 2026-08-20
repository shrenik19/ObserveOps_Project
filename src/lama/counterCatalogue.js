// The catalogue of counters offered by the "Select Counter" picker, with the description each one
// shows in the picker's right-hand pane.
//
// obs-select renders that pane from the option's `description` key when `use-after-menu-description`
// is set — established by rendering, since the registry documents the prop only in a changelog line.
// The pane takes a single string, so each description is written to read as a short paragraph
// rather than the multi-section layout a richer panel could carry.
//
// This is seed data, like everything else in this app: there is no backend to ask for a real metric
// dictionary.

export const COUNTER_CATALOGUE = {
  // --- /metrics/application -------------------------------------------
  throughput:
    'Requests completed per second by the application. The primary measure of how much work the service is getting through.',
  latency:
    'Time taken to serve a request, end to end. Rising latency at steady throughput usually means contention downstream.',
  historicalThroughput:
    'Throughput retained over the reporting window, for comparison against the current rate.',
  historicalLatency:
    'Latency retained over the reporting window, for comparison against the current figure.',

  // --- /metrics/hardware ----------------------------------------------
  'system.cpu.percent':
    'Percentage of total CPU time in use across all cores, from 0% (idle) to 100% (fully utilised). Above 80% indicates saturation and likely performance impact; below 5% means the CPU is mostly idle.',
  'system.cpu.user.percent':
    'CPU time spent executing user-space code. High values point at the application itself rather than the kernel.',
  'system.cpu.kernel.percent':
    'CPU time spent in kernel space. Sustained high values often indicate heavy I/O or system-call pressure.',
  'system.cpu.idle.percent':
    'CPU time spent doing nothing. The inverse of utilisation, and the quickest headroom check.',
  'system.cpu.io.percent':
    'CPU time spent waiting on I/O. High values mean the processor is blocked on storage or network rather than busy.',
  'system.cpu.steal.percent':
    'CPU time taken by the hypervisor for other tenants. Non-zero values on a virtual machine indicate a noisy neighbour.',
  'system.cpu.nice.percent':
    'CPU time spent on processes running at a lowered priority.',
  'system.cpu.interrupt.percent':
    'CPU time spent servicing hardware interrupts. Spikes often accompany network or disk bursts.',
  'system.memory.used.percent':
    'Proportion of physical memory in use. Sustained high values risk swapping, which degrades latency sharply.',
  'system.disk.used.percent':
    'Proportion of disk capacity consumed. A capacity-planning measure rather than a performance one.',
  'system.uptime.percent':
    'Proportion of the window for which the host was reachable. The basic availability measure.',
  'system.process.cpu.percent':
    'CPU consumed by a single tracked process, rather than the host as a whole.',

  // --- /metrics/database ----------------------------------------------
  'replication.status':
    'Whether replication is currently healthy. Any state other than healthy risks divergence between primary and replica.',
  'replication.queue.size':
    'Number of changes waiting to be replicated. A growing queue means the replica is falling behind.',
  'replication.bandwidth':
    'Throughput consumed by replication traffic.',
  'replication.latency':
    'Delay between a write landing on the primary and appearing on the replica. The practical measure of replica staleness.',

  // --- /metrics/network -----------------------------------------------
  'network.bandwidth.utilization':
    'Proportion of available link capacity in use. Sustained high values cause queueing and packet loss.',
  'network.latency.ms':
    'Round-trip time across the link, in milliseconds.',
  'network.packet.error.count':
    'Packets discarded due to errors. Any sustained non-zero count points at a physical or driver fault.',

  // --- /metrics/cap-utilization ---------------------------------------
  benchmark:
    'Benchmark capacity for the member, as filed. The reference figure that peak order rate is measured against.',
  peakOrder:
    'Highest order rate observed in the window. Compared against benchmark capacity to show headroom.',
}

/** Every catalogue name, in catalogue order. */
export const catalogueNames = () => Object.keys(COUNTER_CATALOGUE)

export const describeCounter = (name) => COUNTER_CATALOGUE[name] ?? ''

/**
 * Options for the picker: the whole catalogue minus anything already on screen, in the DS's
 * { value, text, description } shape.
 */
export function catalogueOptions(exclude = []) {
  const taken = new Set(exclude)
  return catalogueNames()
    .filter((name) => !taken.has(name))
    .map((name) => ({ value: name, text: name, description: COUNTER_CATALOGUE[name] }))
}
