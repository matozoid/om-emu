// The second timer unit (board timer2), on which the E118 family's software-timer driver counts (docs/model-survey.md
// finding 155: every software timer of the family, the GUI's 10 ms Genifa tick among them, stood still without it).
// Read on E113 (D, disassembly addresses): the driver's two tables name the registers. The channel table 0x7d998830
// (15 records of 12 bytes: the channel's register pointer, its IRQ, its handler) gives channel n the words
// base + 12 n: ctl +0, reload +4, +8 (written 0 by the init 0x50005ab9, not read by the driver); the mask table
// 0x7da64808 (15 records: status pointer, IE pointer, bit) gives channels 0..9 bits 0..9 of status 0x9b8000c4 / IE
// 0x9b8000dc on one IRQ and channels 10..14 bit 0 of their own status / IE words (0x9b8000c8.. / 0x9b8000e0..) on the
// next five IRQs. The start (0x50051072) writes the bit to the status, ORs it into the IE and writes ctl 1; the stop
// (0x500510a1) clears the IE bit, writes ctl 0 and the bit to the status; the ISR (0x500511d4) reads status & bit,
// stops the channel, writes the bit to the status and, for a timer with counts left or a periodic one (kind 128),
// writes the reload and starts it again. So (A-TMR2-1, I): ctl bit 0 runs the channel, the status bit is set at each
// expiry and cleared by writing 1, and a line is high while status & IE of its group is not 0.
// A-TMR2-2 (I): a running channel expires every `reload` counts of the unit's clock, 16384 Hz: the driver's 2 ms
// service loads 0x21 = 33 counts (2000 us at 16384 Hz is 32.8; the count conversion 0x5005b37c takes its rate from
// 0x5005affb, whose sources are 32768 Hz and 24 MHz), and its reload is at most 1023 (0x5005104b), a 10-bit counter.
// The period is not measured on a camera. Any other width, and a debugger write, are UNKNOWN; a read of +8 answers
// the counts left. Built by the machine on a board that gives timer2 (src/machine.mjs), before the stub, whose page
// 0x9b800000 holds the block's neighbours.
import { BUS, K_MMIO, addRegion, ctx } from '../core/mem.mjs';
import { CLOCK_NONE } from './timer.mjs';

const hex8 = (v) => '0x' + (v >>> 0).toString(16).padStart(8, '0');

export class Timer2 {
  // cfg: the board's timer2 {base (channel 0's ctl), channels, stride, status, ie (the first word of each),
  // groups ([first channel, last channel, irq] per status / IE word), hz}
  constructor(machine, clock, intc, cfg) {
    this.m = machine; this.clock = clock; this.intc = intc; this.cfg = cfg;
    this.lo = Math.min(cfg.base, cfg.status, cfg.ie);
    this.hi = Math.max(cfg.base + cfg.stride * cfg.channels, cfg.status + 4 * cfg.groups.length, cfg.ie + 4 * cfg.groups.length);
    this.ch = [];
    for (let n = 0; n < cfg.channels; n++) {
      const g = cfg.groups.findIndex(([a, b]) => n >= a && n <= b);
      this.ch.push({ ctl: 0, reload: 0, word8: 0, running: false, t0: 0, period: 0, next: 0, expiries: 0, group: g, bit: (1 << (n - cfg.groups[g][0])) >>> 0 });
    }
    this.status = new Uint32Array(cfg.groups.length); this.ie = new Uint32Array(cfg.groups.length);
    for (const g of cfg.groups) intc.drive(g[2]);
    addRegion({ base: this.lo, size: this.hi - this.lo, kind: K_MMIO, name: 'om1.timer2',
      dev: { read: (a, w, dbg) => this.read(a >>> 0, w, dbg), write: (a, v, w, dbg) => this.write(a >>> 0, v, w, dbg) } });
    clock.add({ next: () => this.clockNext(), fire: (at) => this.clockFire(at) });
  }
  unknown(kind, addr, size, value, dbg) {
    if (!dbg) this.m.stderr(`om-emu: om1.timer2 UNKNOWN ${kind} ${hex8(addr)} size ${size} value ${hex8(value)} pc ${hex8(ctx.pc())}`);
    throw BUS;
  }
  updateLines() {
    this.cfg.groups.forEach((g, i) => this.intc.setLine(g[2], (this.status[i] & this.ie[i]) !== 0));
  }
  clockNext() {
    let at = CLOCK_NONE;
    for (const c of this.ch) if (c.running && c.next < at) at = c.next;
    return at;
  }
  clockFire(at) {
    for (const c of this.ch) {
      if (c.running && c.next === at) { this.status[c.group] |= c.bit; c.expiries += 1; c.next += c.period; }
    }
    this.updateLines();
  }
  start(c) {
    c.period = Math.round(c.reload * 1e9 / this.cfg.hz);
    c.running = c.period > 0;
    c.t0 = this.clock.t; c.next = c.t0 + c.period;
  }
  // which word an address is: ['ch', n, field offset], ['status', group], ['ie', group] or null
  decode(addr) {
    const { base, stride, channels, status, ie, groups } = this.cfg;
    if (addr >= base && addr < base + stride * channels) return ['ch', Math.floor((addr - base) / stride), (addr - base) % stride];
    if (addr >= status && addr < status + 4 * groups.length) return ['status', (addr - status) >> 2];
    if (addr >= ie && addr < ie + 4 * groups.length) return ['ie', (addr - ie) >> 2];
    return null;
  }
  read(addr, size, dbg) {
    const w = size === 4 && !(addr & 3) ? this.decode(addr) : null;
    if (!w) return this.unknown('read', addr, size, 0, dbg);
    if (w[0] === 'status') return this.status[w[1]];
    if (w[0] === 'ie') return this.ie[w[1]];
    const c = this.ch[w[1]];
    if (w[2] === 0) return c.ctl;
    if (w[2] === 4) return c.reload;
    return c.running ? Math.ceil((c.next - this.clock.t) * this.cfg.hz / 1e9) >>> 0 : c.word8;
  }
  write(addr, value, size, dbg) {
    const w = !dbg && size === 4 && !(addr & 3) ? this.decode(addr) : null;
    if (!w) return this.unknown('write', addr, size, value, dbg);
    value >>>= 0;
    if (w[0] === 'status') { this.status[w[1]] &= ~value; this.updateLines(); return; }
    if (w[0] === 'ie') { this.ie[w[1]] = value; this.updateLines(); return; }
    const c = this.ch[w[1]];
    if (w[2] === 4) { c.reload = value; return; }
    if (w[2] === 8) { c.word8 = value; return; }
    if (value > 1) return this.unknown('write (ctl value)', addr, size, value, dbg);
    const was = c.ctl & 1;
    c.ctl = value;
    if (value && !was) this.start(c); else if (!value) c.running = false;
  }
}
