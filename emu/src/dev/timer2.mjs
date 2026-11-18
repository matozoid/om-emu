// The second timer unit (board timer2), on which the E118 family's software-timer driver counts (docs/model-survey.md
// finding 155: every software timer of the family, the GUI's 10 ms Genifa tick among them, stood still without it).
// The registers, the driver's routines that name them and the count rate are read on E113; the evidence and the
// firmware addresses are with the board fact (src/fw/models.mjs E113 board.timer2: this file is scanned by
// bin/port.mjs for E143 addresses, so it names none of another body's). The model (A-TMR2-1, I): channel n has ctl
// (+0), reload (+4) and a third word (+8) at base + stride n; ctl bit 0 runs the channel, its status bit is set at
// each expiry and cleared by writing 1, and a group's line is high while its status & IE is not 0. A-TMR2-2 (I): a
// running channel expires every `reload` counts of the unit's clock (cfg.hz; not measured on a camera). Any other
// width, a ctl value above 1 and a debugger write are UNKNOWN; a read of +8 answers the counts left. Built by the
// machine on a board that gives timer2 (src/machine.mjs), before the stub, whose page holds the block's neighbours.
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
