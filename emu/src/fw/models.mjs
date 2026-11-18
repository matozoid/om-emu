// The camera models the lab knows: each one's firmware release (the .BIN the vendor's updater API serves for its code),
// the two blocks the lab reads (main code, resources) and their digests (BLOBS.sha256 and the resource prefix). E143 is
// the build every address in src/lab is written against; another model translates those addresses through A()
// (src/fw/model.mjs, backed by src/fw/ports.mjs from bin/port.mjs and the cross-build map src/fw/xmap.mjs). `overrides`
// places an E143 address the map cannot (hex E143 address -> {to: hex address or null, why}). `panels`: the TFT and EVF
// sizes the VSC model composes at (the firmware programs the channel; these are the panels the vendor's specifications give).
// `image_base`: the run-time address of the main block's byte 0 (src/fw/model.mjs IMAGE_BASE), which import-time
// constants need before any image is read; src/fw/facts.mjs imageBase reads it from the reset head, and
// test/test_facts.mjs checks every entry whose block is unpacked against that rule.
// `res`: the size limits of the font and string slots the resource loader copies a language's records to (the `cmp
// imm32` after each slot's mov in the loader that follows the index read; E143's are 0xC7C00 at 0x501a8f35 and 0x5FC00
// at 0x501a9197, D), read through src/fw/model.mjs fact(). bin/port.mjs reads them on every model it ports
// (src/fw/facts.mjs resLoader, into src/fw/ports.mjs FACTS), so an entry gives them only until its port does.
// `port_via`: a model ported before whose hand overrides this one takes over through the map between the two builds
// (bin/port.mjs, src/fw/place.mjs carryOverrides), where they pair better than either does with E143 (the evidence at
// the entry); the model's own overrides come first. `carry`: the reference's knobs that hold addresses (src/fw/knobs.mjs)
// this model takes through the same map, each checked by its kind (src/fw/ports.mjs KNOBS, read through knob() in
// src/fw/model.mjs); a knob is either carried or given here.
// `board`: the board family (src/fw/board.mjs FAMILIES) and the facts this model gives by hand where its firmware's
// differ from the family's or no rule of src/fw/facts.mjs reads them yet, each with its evidence; a fact the port
// reads (FACTS[code].board) is not given here too. `checked`: in bin/modelcheck.mjs's default set, which it passes.
import { OVERRIDES_E144 } from './overrides-E144.mjs';
import { OVERRIDES_E122 } from './overrides-E122.mjs';

// The VSC register blocks the kind-1 compositor composes without (board vsc.unapplied; src/dev/vsccompose.mjs A21):
// the highlight block (HIAREA1..3, HIBC, HILIGHT1..4: 0x48c..0x494, 0x4cc, 0x5d0..0x5dc), which E147's playback detail
// turns on for its highlight and shadow warning, and the NV block (NVEN, NV11SET1..NV23SET6: 0x9a0..0xc54), which E147
// sets for its EVF (X). Open: what either does to the panel's picture; the composite shows the planes without them
const VSC_UNAPPLIED = [[0x48C, 0x494], [0x4CC, 0x4CC], [0x5D0, 0x5DC], [0x9A0, 0xC54]];

// H-G4SET not applied (src/lab/play.mjs g4set): UI_IN's group 4 is pushed like the other groups. A stand-in on the
// bodies that give it, while their group-4 producer (the port places E143's) is not checked: start and S1 run so (X)
const G4SET_UNCHECKED = false;

// S-NOPOWEROFF, retired 2026-10-23: the lab stepped over the power-off post in the PC sub-app state's USB-disconnect
// handler (fact power_off.usb_disconnect, src/fw/facts.mjs usbPowerOff) on eight E144-family bodies. The start had
// reached it because the idle image left the USB connection 0x0400 at "cable in" (and E144's and E137's power lever
// off): the application went to its PC state, ending the shooting service. With the power lever on and no cable
// (src/lab/play.mjs IDLE_SWITCH_STATES) no body's start reaches the post (X: E144, E139, E137, E142, E140, E125, E145,
// E130), so the call runs as the firmware's

// The movie time query's log on the shooting screen (E143's card_fs below, where it is read; E146's and E147's): its
// time code conversion finds the movie info's frame rate 0, which the movie module's set-up fills only at a movie take
// (docs/model-survey.md finding 60), so the camera logs it too before its first one (I)
const MOVIE_TIME_ERRLOG = [0x39000903, 'the movie time query\'s frame rate is 0: the movie module\'s info is set up at a movie take, none yet (the time left is the card\'s)'];

// `scpu_port`: UI_IN's group 0 through the SCPU interface's port and event words (src/lab/play.mjs H-SCPUIRQ,
// H-UIINPORT, H-SCPUPORT; docs/hle-gaps.md 4.7.2), in the model's disassembly notation: irq [handler, level], the IRQ
// 320 handler the SCPU init attaches; register, the IRQ 320 callback registration; callback, UI_IN's callback, which
// its port init registers; old_state, the init of UI_IN's group-0 old state from the port byte, which UI_IN's start
// stage calls first. A body without it pushes group 0 as the other groups (S-KEYBITS)
//
// `hdmi`: the HDMI port (src/dev/hdmi.mjs with the board's hdmi; src/lab/display.mjs H-GIOSLOTS, src/lab/play.mjs the
// hdmi input; docs/hle-gaps.md 4.9), in the model's disassembly notation: gio_slots, the reset of the GIO interrupt
// slots the GIO init ends with (the init does not run in the lab; without the reset the display init's registration
// of the hot-plug pin finds no free slot and does nothing); state [address, bytes], the driver's EDID state, which its
// getter reads (0xf0 the EDID read and parsed, 0xff failed, 0 not read). A body without it has no HDMI port
//
// `acc`: the accelerometer, stood in at its sample cache (src/lab/acc.mjs H-ACCINIT, S-ACCREG, S-ACCSAMPLE,
// H-SLOPEINIT; docs/hle-gaps.md 4.7.3), in the model's disassembly notation (data at run-time addresses): init, the ACC
// module init, run natively with its device part, the call at device (the data-ready pin's set-up and the register
// API's kernel objects), stepped over; ptrs [counter slot, copy slot], the two pointers the init stores (the sample
// counter's address and the cache copy's run-time address); main, ACC_MAIN's entry (task 121, which the init starts);
// probed, the halfword ACC_MAIN sets to 1 after a successful probe; reg {open, read, write, close}, the sensor's
// register API, and dev [channel, device], what the probe opens; who_am_i [register, value], the probe's read and the
// value it wants; setup, the probe's register writes [register, value]; copy and correct, the cache copy and the
// correction ACC_MAIN calls each cycle; words [accelerometer x/y/z, temperature], the halfwords the sample read's
// completion packs, and counter, the sample counter it increments; refs, the six pose references the init computes
// (pose 0 is the level camera); axes, the axis order and polarity the remap reads; slope {init, main, get}, PER_SLOPE's
// init, its task entry (task 78) and the gauge's getter; rotate {init, main, get, pose, index, publish, event},
// PER_ROTATE for --rotate on (H-ROTINIT): its init (the boot calls it after PER_SLOPE's), its task entry (task 59), the
// orientation getter (the EXIF code of the reported index), the orientation word its readers take (0..5) and the
// reported index (0..4), the event publish it calls on a change and that event. A body without it keeps the
// accelerometer and PER_SLOPE off
// (the gauge reads the BSS)
//
// `sio_devices`: the devices on PER_SIO's channels the lab has, [{channel, device}] (src/lab/sio.mjs S-SIOIIC and
// H-SIOMAP; a device name of its DEVICES, 'charger': src/lab/charger.mjs S-CHARGER). A body without it runs PER_SIO's
// channels natively against lab-stub pages, its channel map unset
//
// `modack_queues`: the module queues of the body's API target table that E143's has no counterpart of, [queue id,
// its name in the object-name table], which S-MODACK answers too (src/lab/camapp.mjs module_queues)
//
// `heap_pool`: the firmware heap's block get and release of its pool 2 (get, put, the pool's block bytes), which Level
// Adjust's sampling loop calls instead of malloc and free; S-HEAP (src/lab/play.mjs), whose memory is that pool's,
// serves them too. A body without it runs them natively
//
// `card_fs`: whether the card's file system runs natively (src/lab/storage.mjs; docs/hle-gaps.md 4.8.4): native, at
// the seams src/fw/facts.mjs fileSystem reads (fact storage); errlog, the error logs its card's queries make in the lab
// (src/lab/display.mjs EXPECTED_ERRLOG); hls, the HLS media side's addresses (src/lab/media.mjs: Card Formatting from
// the menu, the card out and in; E143, E146, E147 and E148, whose HLS function component formats the card), or 'rule'
// where src/fw/facts.mjs mediaHls reads them (fact 'media': the E118 family and the E144 family but E148, whose
// application formats it itself). Every body gives it, one that does not run it with its reason (why);
// such a body keeps S-CARD's card without a file system (src/lab/camapp.mjs); second_slot, the lab models the body's
// second card slot (src/lab/storage.mjs S-SDCARD: two slots, the second empty unless the host gives its card, each
// slot's card-detect pin; docs/hle-gaps.md 4.8.12) at what src/fw/facts.mjs cardSlots reads (fact 'card.slots'):
// given for a body whose two slots are known to run so (X); a body that gives it and whose forms the rule does not
// read throws at its first session
//
// `audio`: the audio hardware a session runs with --audio auto (the default) or on (src/lab/audiohw.mjs,
// src/dev/audio.mjs; E143): AUD_MAIN's entry and id word, the id words of the CPU 0 tasks it starts and of its CPU 2
// tasks [word, name] (the first, its wake-up, posts the reply), OlyTaStCpu and the wake-up's reply. A body without it
// runs --audio auto as off and refuses --audio on
//
// `ui_out`: UI_OUT, the module of the camera's lamps (and on E143 its operation sounds), where the lab runs it
// (src/lab/play.mjs H-UIOUTSTART: E134, whose file layer asks it for the card's access lamp; E143, whose AF beep is a
// request to it): init, its init's entry, and task, its static task's entry. A body without it does not run UI_OUT
// `lens_native`: the lens on the mount runs natively, the default (src/lab/lens.mjs with S-LENSMCU; OM_EMU_LENS=stand-in
// takes S-LENS; docs/hle-gaps.md 4.4.2), on a body whose card's file system runs too; the driver's addresses are read
// by src/fw/facts.mjs lensDriver (fact lens_driver). A body without it has S-LENS (src/lab/camapp.mjs)
// `res_nand`: the resource tables are loaded natively from the NAND at the play bring-up where the host gives the
// NAND (env.nand; src/lab/resnand.mjs H-RESINIT, S-RESNAND): loader, USTART_L's resource loader; size and read,
// res_size and res_read; slot, where USTART_L loads sound 0; erase, the NAND access's erase operation; sound {load,
// guard, end}, the sound area's address, the flash access guard's window for its writes, and the most of it a host's
// image may cover; extract_sha256, the digest of the NAND extract the hosts keep (src/fw/labfw.mjs labNand; on node
// unpacked/<code>/<bin>.nand.bin, nandPath). A body without it (or a host without env.nand) keeps the tables at 0
// `power_native`: the power manager starts at the play bring-up and the power lever's off runs the firmware's own
// power-off to its last write (src/lab/power.mjs H-PWRSTART, S-IOEXP, S-SHUTDOWN, H-POWER; docs/hle-gaps.md 4.7.4), at
// the addresses src/fw/facts.mjs powerOff reads (fact 'power.off'); given for a body whose power-off is known to run so
// (X). A body without it closes the session at the lever's off at once
//
// `rec_native`: REC_FILE's own task records S2's picture from the packet REC_IMAGE's own task posts it, with the
// file's header built by REC_IMAGE's header maker natively (src/lab/rec.mjs H-EXIFINIT, H-RECINIT, H-RECSHARED,
// H-RECIMGPRO, H-RECFILE, H-RECIMAGE, S-EXIFPRM, S-RECREQ, S-JPEGENC with the encode alone; docs/hle-gaps.md 4.8.10,
// 4.3.3, 4.3.5), at the addresses and layouts src/fw/facts.mjs recFile and recImage read (facts 'rec_file' and
// 'rec_image'; recImage throws where REC_IMAGE's forms differ, so a body with recFile's parts read has both); on the
// E144 family's REC version (REC_FILE waiting on its queue alone, no header fill) at the addresses src/fw/facts.mjs
// recFileQueue reads, with no 'rec_image': REC_IMAGE's part in the lab's call (H-EXIFINIT, H-RECINIT, H-RECFILE,
// S-EXIFPRM, S-RECIMAGE, S-JPEGENC); on the REC version before the family's (E130, E133, E129: a 284-byte packet,
// REC_FILE's loop inlining its start and finish, rec_make_file's file context on its stack) at the addresses
// src/fw/facts.mjs recFileInline reads, with the same stand-ins; on the E118 family's older REC version (REC_FILE's
// packet on its stack, the file context in rec_file_record's frame, the reservation its own call of the file system)
// the same stand-ins at the addresses src/fw/facts.mjs recFileFrame reads (docs/model-survey.md findings 143 to 146);
// given for a body whose S2 is known to record so (X). A body without it keeps S-RECFILE (src/lab/storage.mjs)
//
// `scpu_lle`: the sub-CPU's own firmware, which the lab can run on the STM32L4 machine in S-SCPUDEV's place (opt-in,
// src/lab/scpum4.mjs; docs/om1-scpu-spec.md section 8 step 6), given only for a body whose image that machine is
// known to boot: block, the SCPU block's file name in unpacked/<code> beside the main block's (scpuPath; a full unpack
// of the .BIN makes it, BLOBS.md), and sha256, its digest; pins, the image's link pins (the MN's request line in, the
// ready and message lines out, scpu spec 3.1); gate, the SRAM byte of its command manager's power-on flag (in the
// image's address notation). A body without it keeps S-SCPUDEV
export const MODELS = {
  E143: {
    name: 'OM-1', bin: 'OLY_E_143_1900_0000_0000.BIN', version: '1.9', res_block: 'blk02000000.OE.0101.bin',
    rom_len: 33554368, rom_sha256: '7f791611580925f3550d394baa9e8cca4e8f4c38e427ccd498170e8d1feb67e9',
    // the reset head's jump into the run-time copy at 0x50000082: mov 0x600210c5,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 10031072, res_sha256: '03a18d68e950ab0f55df3f1379d26ace4ee654a6e4a276bc8872daa1e9ebfa6c',
    panels: { tft: [900, 600], evf: [1600, 1200] },
    board: { family: 'E143' },
    // the SCPU's block at file offset 0x0e560000 (docs/om1-scpu-spec.md section 2; X: it boots on the STM32L4 machine,
    // section 8 step 5); pins (D, section 3.1): PB12 the request's EXTI input, PC3 pin 102, PC2 the message line;
    // gate: the literal pool word 0x80135c4 the power-on gate 0x8012d72 and the release 0x801305d reach their flag
    // object through holds 0x20008390, whose byte +0 is the flag (D)
    scpu_lle: {
      block: 'blk0e560000.OE.0107.bin', sha256: '2d930ac588014c250391d6af3a49fe7372852fc5eafbac5d2ac73df04be94807',
      pins: { request: 'PB12', ready: 'PC3', message: 'PC2' }, gate: 0x20008390,
    },
    // the SCPU init 0x5004dc55 attaches 0x5004e1fd at level 5 (0x5004de8e..99); 0x5004ded1 adds a callback to its
    // table of 4; UI_IN's port init 0x5014e3ab registers 0x5014e534 (0x5014e50e..14); UI_IN's start stage 0x5014bfc6
    // calls 0x5014e51e (D)
    scpu_port: { irq: [0x5004E1FD, 5], register: 0x5004DED1, callback: 0x5014E534, old_state: 0x5014E51E },
    // the GIO init 0x50002a20 ends with 0x50002b5d (0x50002a2d), which marks the 325 slots at 0xa32c1f74 free (255);
    // the EDID state byte 0x62a3c8ec, read by 0x501d30f6 (D)
    hdmi: { gio_slots: 0x50002B5D, state: [0x62A3C8EC, 1] },
    // the audio hardware (--audio on; src/lab/audiohw.mjs H-AUDSTART, S-AUDCPU2): AUD_MAIN's entry 0x50a62a05 and its
    // id word 0x60042dca (USTART3's OlyTaSt at 0x501e950b); the id words of the CPU 0 tasks it starts, AUD_COPY_DATA
    // 0x60042dc8 (0x50a62a72) and AUD_WATCH_DOG 0x60042d34 (0x50a62aa0), and of its CPU 2 tasks, AUD_WAKEUP
    // 0x60043614 (0x50a62a14) and AUD_LEVEL_MONITOR 0x60043602 (0x50a62a90); OlyTaStCpu 0x5002d325, which OlyTaSt
    // calls for another core's id (0x5002c552); AUD_WAKEUP's reply 0x50a62d75 (the run-time 0x60a83d95 it posts at
    // 0x50a62d6b); the image stage AUD_MAIN waits for, 6 (0x50024de8(6) at 0x50a62a48); the id word of its queue
    // AUD_EXEC, 0x600431d4 (its receive at 0x50a62aca; UI_OUT's sends at 0x5014f900), D
    audio: { main: 0x50A62A05, main_id: 0x60042DCA, starts: [0x60042DC8, 0x60042D34], cpu2: [[0x60043614, 'AUD_WAKEUP'], [0x60043602, 'AUD_LEVEL_MONITOR']],
      task_start_cpu: 0x5002D325, reply: 0x50A62D75, stage: 6, exec_queue: 0x600431D4 },
    // the module init 0x50048cad calls the device part 0x500493ac at 0x50048cb4, stores 0x6034d9d4 and the run-time
    // 0x6006a221 (= 0x50049201) at 0x50048cbf / 0x50048ccb, starts ACC_MAIN through OlyTaSt (0x50048ce2); the probe
    // 0x50048fd1 opens (6, 107), reads register 0x0f, wants 0x6a and writes 0x10 = 0x10, 0x0d = 1, and 0x50048ead then
    // sets 0x62963fb8 to 1; the completion 0x5004910a packs
    // 0x62963fd6..da and 0x62963fde and increments 0x6034d9d4; 0x50048d14 writes the references at 0x6034d9b0; the remap
    // 0x5005ff7d reads 0x6034e170; PER_SLOPE's init 0x5005fb31 starts task 78 (0x5005fb9c); the gauge's getter
    // 0x5005f982; ACC_MAIN's cycle calls the copy through 0x62963f5c and then the correction 0x500493dc; the boot
    // calls PER_ROTATE's init 0x5005a08c at 0x501e9c2b, after PER_SLOPE's at 0x501e9c17; it starts task 59 (entry
    // 0x5005a17e, the task table's run-time word at 0x50018724) and sets its state 0x62965124 to 1; the task keeps the
    // orientation in 0xa32c64f8 and the reported index in 0xa32c64f4, which the getter 0x5005a155 maps through the
    // halfwords 0x6034e164 {11, 1, 6, 3, 8}, and on a change calls the publish 0x50025088 with event 0x4020310 (D)
    acc: {
      init: 0x50048CAD, device: 0x50048CB4, ptrs: [0x62963F58, 0x62963F5C], main: 0x50048EC2, probed: 0x62963FB8,
      reg: { open: 0x5004C971, read: 0x5004CB57, write: 0x5004CB6D, close: 0x5004CB4C },
      dev: [6, 107], who_am_i: [0x0F, 0x6A], setup: [[0x10, 0x10], [0x0D, 0x01]],
      copy: 0x50049201, correct: 0x500493DC, words: [0x62963FD6, 0x62963FDE], counter: 0x6034D9D4,
      refs: 0x6034D9B0, axes: 0x6034E170,
      slope: { init: 0x5005FB31, main: 0x5005FB9C, get: 0x5005F982 },
      rotate: { init: 0x5005A08C, main: 0x5005A17E, get: 0x5005A155, pose: 0xA32C64F8, index: 0xA32C64F4, publish: 0x50025088, event: 0x04020310 },
    },
    // the lens on the mount natively, the default (src/lab/lens.mjs, src/lab/lensmcu.mjs; docs/hle-gaps.md 4.4.2): the
    // driver's entry points, LENS_EXEC's queue, the lens-0 flags and the lens caches' NAND are read by src/fw/facts.mjs
    // lensDriver (E143's LENS_DRIVER_E143 there, with their evidence)
    lens_native: true,
    // The resource tables natively (src/lab/resnand.mjs H-RESINIT, S-RESNAND; docs/hle-gaps.md 4.5): USTART_L's loader
    // 0x501a8ca0 (its call 0x500241d8), res_size 0x501a976d and res_read 0x501a921f (USTART_L's sound 0 at
    // 0x5002433b / 0x50024353, into the slot 0xa4000000), the NAND erase operation 0x10300 (the type-2 write path's,
    // 0x501a9a76); the sound area: load, the loader's first read (0x501a8cc0); guard, the flash access guard's window
    // for it (0x50000735: writes and erases in 0x4e420000..0x4e460000) (D); end: the guard's next window, the RAM log
    // at 0x4e820000 (D), taken as the most a host's image may cover (I: the area's real extent is not known);
    // extract_sha256: the digest of the NAND extract the hosts keep (src/fw/labfw.mjs labNand, src/fw/nand.mjs
    // nandExtract over this .BIN: 556 spans, 3,462,854 bytes, X)
    res_nand: {
      loader: 0x501A8CA0, size: 0x501A976D, read: 0x501A921F, slot: 0xA4000000, erase: 0x10300,
      sound: { load: 0x4E420000, guard: [0x4E420000, 0x4E460000], end: 0x4E820000 },
      extract_sha256: '7fd5aabf24eccbae6aa7df9ae969e1beea46b821612ce23a04b08032cd4cb5e8',
    },
    // 0x5000314c / 0x50003156 run the heap's get 0x5000319c / release 0x50003466 with pool 2, whose block size is 16512
    // (the table 0x60029908) and whose memory is 0x62424700.. (0x50003211), S-HEAP's (D)
    heap_pool: { get: 0x5000314C, put: 0x50003156, bytes: 16512 },
    // the power manager started and the power-off run natively (src/lab/power.mjs; docs/hle-gaps.md 4.7.4), at the
    // addresses src/fw/facts.mjs powerOff reads (POWER_OFF_E143 there, with their evidence)
    power_native: true,
    // REC_FILE and REC_IMAGE natively (src/lab/rec.mjs), at the addresses src/fw/facts.mjs recFile and recImage read
    // (REC_FILE_E143 and REC_IMAGE_E143 there)
    rec_native: true,
    // UI_OUT, the module of the camera's lamps and its operation sounds (src/lab/play.mjs H-UIOUTSTART; D unless
    // tagged): the boot calls its init 0x5014f4e9 after its checkpoint "2_9" (0x501e8f24..0x501e8f31), then starts the
    // task whose id is the halfword 0x60042d72 (38; entry 0x5014f56c) and names it "UI_OUT" (0x501e8f38..0x501e8f46).
    // The init clears the sound player's state (0x5014f77d) and links its two queues to the task's flag 0x57 (the
    // halfword 0x6004301e): UI_OUT (the halfword 0x600432a4, 0x70) on bit 2, UI_OUT_EXEC (0x600432a6, 0x71) on bit 4
    // (0x5014f4f3..0x5014f566). The task drains the first without replies and answers each request of the second
    // with {u16 status, word 1, word 3} to the queue in its word 0 (0x5014f6aa..0x5014f736), S-MODACK's layout; a
    // message of kind 2 is a sound request (0x5014f7e0). The sound API 0x5041ee45 the AF beep reaches sends to the
    // first (docs/hle-gaps.md 4.5)
    ui_out: { init: 0x5014F4E9, task: 0x5014F56C },
    // The card's file system runs natively (src/lab/storage.mjs; docs/hle-gaps.md 4.8.2): its seams are read by
    // src/fw/facts.mjs fileSystem (fact storage; E143's values STORAGE_E143 there, with their evidence), the SD host's
    // pages are the board's (src/fw/board.mjs sd). errlog: the logs its card's queries make in the lab. The movie
    // time query (0x5042da58) takes the time left from the movie module's copy, which the DCF remain count fills from
    // the card (0x5045c4ac, called from 0x50448d83, X), and converts the movie info's frame rate (+720 of the static
    // info 0xa32ed128, which the movie module's set-up 0x5045c3fd copies in from TAKE_MOV's take job, D; the image
    // loads the address there and in one copy-out only, X: so 0 before a movie take; docs/model-survey.md finding 60)
    // for the recording's time code: 0x5044949b takes 23, 24, 25, 30, 50 or 60 and logs this code for any other (D);
    // the time left is computed before it (0x5045ada2)
    card_fs: {
      native: true,
      errlog: [MOVIE_TIME_ERRLOG],
      // the second card slot (X: test_storage's --slot2 sessions, docs/hle-gaps.md 4.8.12)
      second_slot: true,
      // The HLS side of the card (src/lab/media.mjs; docs/hle-gaps.md 4.8.3). D unless tagged.
      // reception: OlyHfwReception's singleton getter (0x6035f0fc, made by 0x50af8959) and its vtable slot 2
      // (0x50af8c96: the receive body 0x50af89f9 with d0 = 1), which hands an event to every receptor of its list
      // (+20: u16 count at +2, items at +8; 0x50af8156, 0x50af818b) whose isInterested (vt[3]) takes it, through the
      // receptor's synchronous slot (vt[2], 0x50ac8f27: the reactive's handleEvent, OMReactive vt[6] 0x50d9bd10).
      // Slot 1 (0x50af89e5, d0 = 0) is the asynchronous one: the receptor's vt[1] (0x50ac8eed) gens the event to the
      // reactive's OXF thread (+100), the OXF main thread HIGHLEVEL_MAIN, which runs only with the HLS components.
      // OlyHfwOpeMdaCtrl's receptor (vtable 0x60de6808) takes the events of class 696 (its filter, +8), and its
      // reactive (vtable 0x60de8ffc) handles them in its state 6 (0x50acb4b9 -> 0x50acb53e) by posting the
      // application's callbacks (0x50ab8390) and events (0x50b7a392). `new`: operator new (size d0, line d1, file
      // a0), as every sender allocates its events
      hls: {
        reception: 0x50ABC5A3, sync_slot: 2, new: 0x50D9BA46,
        // the event classes (each derived from 696, ctor 0x50ac89d0): 1513 / 1514 (0x50ac8d0d: id d0, +28 the CBC
        // id d1, +32 a1, +36 / +40 the two stack words; 44 bytes, 0x50cec2bb), 697 (0x50ac89f8: +28 d0, +32 u16 d1;
        // 36 bytes, 0x50cec316), 711 (0x50ac8c70: +28 the media kind, +32 d1, +36 a1; 40 bytes, 0x50bb8a00)
        events: { result: [0x50AC8D0D, 44], media: [0x50AC89F8, 36], mount: [0x50AC8C70, 40] },
        ids: { progress: 1513, result: 1514 },
        // The media control request the menu's Card Formatting sends (TRA 1511, OlyHfwOpeMdaCtrl 0x50ac937f; its
        // class's ctor 0x50ac052e: +32 u8 the command, +34 u16 the media, +36 u16 the option; X: Format Card's Yes
        // sends command 1, media 0). The HLS function component CmpCst_Function (CmpCst_Function.cpp), which takes it
        // (rcvReqFncMediaCtrlStart 0x50ceb3be), does not run in camapp 1. Its parts the lab calls: getMediaCtrlCBC
        // 0x50cebeea (command -> the callback id: 1 -> 16), the start table 0x60364a44 (24 bytes a command, filled
        // at boot; X: command 1's entries are executeMediaFormatStart 0x50ceb9b0, getMediaProgress 0x50ceb96c and
        // executeMediaFormatEnd 0x50ceba28), getMediaProgress (entered by calls; api_media 0x503f093a's percent of
        // the file layer's progress words 0x62ae4cd4 / 0x62ae4cd8). executeMediaFormatStart calls api_media's
        // format 0x503f0820 (API 0xe0005) with the media: for media 0 or 1 it posts FILECLBK {reply queue (the API's,
        // the halfword 0x600431d0; X: 6), token, 0x34, block} (0x503f08fb) and returns the token (X: 0xf00a0000); the
        // file module's progress events 0x04020011 (0x508902cd) and its reply {u16 status, token, block} to the API
        // queue (0x508a4bd5, X) follow. At the end (rcvReqFncMediaCtrlStartComplete 0x50cec0ff, status 0): for each
        // slot whose media status (api 0x503f0bd7) has bit 0 clear and whose mount state (0x50aca51d) is mounted it
        // sets 15261 + slot to 1 (0x50ab4f75; 0x50cec212..0x50cec25e), sends 1513 {CBC, 3, 100, 0} (0x50cec2e3) and
        // 697 {1, media} (0x50cec334), stores kind 72 and result 0, and for the format starts a request whose
        // completion (cbMediaCtrlResult 0x50ceb6c1) sends 1514 {CBC, 72, 0, 0} (0x50ceb71e); each progress event
        // sends 1513 {CBC, 3, percent, 0} (0x50cebeb4). An error status ends in kinds 70 / 71 / 118 (0x50cec268..)
        ctrl: { request: 1511, cmd: 32, media: 34, option: 36, format: 1, cbc: 0x50CEBEEA, progress: 0x50CEB96C,
          api: 0x503F0820, reply_queue: 0x600431D0, progress_event: 0x04020011, kinds: { progress: 3, done: 72 },
          status: 0x503F0BD7, flag: [0x50AB4F75, 15261] },
        // The HLS mount state words, by media kind (getter 0x50aca51d, setter 0x50aca6b1(kind d0, a0 -> value)):
        // CapMed_MediaManager's unmountPreprocess (0x50bb8292) sets 0 (0x50bb8288), S-CARD's start value is 8.
        // CapMed's notifications to the application's media control (event 711 through the reception's slot 2):
        // {kind, flag, 0} at a card's change (0x50bb8a1b), {kind, 1, 2} at the REC mount's end (notifyRecMountEnd,
        // 0x50bb8de9), {kind, 1, 4} (0x50bb8d55), {kind, 1, 8} at mountProcEnd (0x50bb8c6c). The reactive's 711
        // handler (0x50acaeb5) posts the application's 29 (with the card switch's EV, 0x50424f9a) for a change with
        // the flag 1, 30 for one with 0, 193 / 194 / 195 for the states 2 / 4 / 8 (X: 29, 193, 30)
        mount: { get: 0x50ACA51D, set: 0x50ACA6B1, unmounted: 0, mounted: 8, rec_end: 2, end: 8 },
        // The card slots: the media kind, and the card switch UI_IN decodes (port 1 byte 1 bits 0 and 1; the level
        // getter 0x5014c015). The file layer registers its callback for both codes with UI_IN at its init
        // (0x50877e75..0x50877e92, 0x5014c420(code, 3, fn); the callback 0x5087ace0 / 0x5087acec -> 0x5087bb09 marks
        // the slot's card as changed, X: it runs at each toggle) and logsec waits 740 ms before a mount's sdmem
        // command 2 when UI_IN's last code is the slot's (0x508ac202). Level 0 is a card in the slot (I: the start
        // the lab's card mounts at, round 1, has 0; 0x501ea9f1 clears a bit when the level is not 0)
        // UI_IN publishes a switch's change as the module event 0x02020000 | code (X: 0x02021506 at each toggle,
        // from 0x5014c417) through the module event post 0x50025095, which the file layer's progress uses too
        slots: [{ kind: 4, switch: 0x1506 }, { kind: 8, switch: 0x1518 }],
        switch_level: 0x5014C015, switch_event: 0x02020000, publish: 0x50025095,
      },
    },
    // Subject detection's frames on the display (src/lab/subject.mjs S-SUBJECT; docs/om1-subject-spec.md 4.3 and 5.1).
    // D unless tagged. setting: the subject-detection setting, the data object 0x1e71 (settings id 1682, six values,
    // default 0), which TAKE reads through the property read 0x500417da(0x1e71, 0, 0) (0x5039ac95..9b, 0x5039bb03..08,
    // 0x506d8011..17) into its context +206 and hands to take_mov (0x503a4882 -> 0x62a411a3 -> mdet_dl_change_mode
    // 0x5080a79a, 0x503a48ac..ce); its value is MDET's kind, whose names are at 0x50338100 (0 OFF, 1 MOTOR_SPORTS,
    // 2 AIRPLANE, 3 TRAIN, 4 BIRD, 5 ANIMAL; 0x50812dc9 maps 1..5 to the learning items). table: MDET's frame table, as
    // its writer 0x5082ac64..0x5082af98 fills it and its getter 0x5083a299 (trace id 227) copies it: main {flag, the
    // record}, subject 0's box (0xa33790b2..b8, or the centre and size at 0xa3379060..66), written only while the byte
    // 0xa337f082 is 1 (0x5082acb3, 0x5082ad02..0x5082ae76; LAF's frame trace sets it, spec 5.6 U9); part {flag,
    // record}, a box at 0xa33790f2..f8 taken in the same state when 0xa337811b is 1 (0x5082ae7d..0x5082af1a); count
    // and list, the
    // subjects' boxes (0xa33790b2 + 8 n, valid at 0xa337d53c + n; n from 0, or from 1 in that state, up to 8 records,
    // 0x5082af23..0x5082af98). The writer that runs in the lab is another, mdet.table_writer, which writes the main and
    // part flags 0 and the list alone. A record is four corners (x, y) as halfwords, top left, top right, bottom left,
    // bottom right (the writer's order; FACE's 0x50523fe3 takes x0, y0, x1 and the third corner's y for the centre,
    // width and height). active: the byte 0x50839ed0 returns, which the getter requires
    // (else no frames) and the writer requires before it posts UP_FACE (0x5082af9a..0x5082afee). aspect: the pair of
    // bytes the getter maps to the frame's aspect code (0x5083a368..0x5083a3f8; all zero: no frames): code -> pair
    // below. up_face: the frame plane's UP_FACE (flag 1 to DISP_FRAME when the frame mode has bit 1, 0x50025747).
    // DISP_FRAME's side (S-DISPFRAME runs it): draw_face 0x5100d751 asks FACE's 0x5052202c for an 88-byte record, which
    // takes MDET's table through the getter unless FACE's own mode byte 0xa32f3e06 is 1, and draws only when its
    // aspect code equals the one DISP_FRAME computes for the frame (0x5100d469: the still aspect, object 0x3081 /
    // settings id 269, or the movie's; aspect_code); 0x5100dfef turns the list into frames of kind 1 colour 3, the
    // main record into kind 7 colour 4 and the part into kind 8 colour 4 when the mode has bit 0x10. The frames' plane
    // coordinates come from a 24-byte transform {width, height, x num, x den, y num, y den, x offset, y offset, clip x0,
    // y0, x1, y1} (0x500259bd), picked from the table 0x60365754 (a pointer per output, 0x500258e8(state, object 0x8971,
    // 0x500258d4()) the index; 0x5100d77d..0x5100d7a5) and the aspect (0x50025931(code) the row)
    subject: {
      setting: 0x1E71, prop_read: 0x500417DA,
      table: { main: [0xA337EFA1, 0xA337EFA2], part: [0xA337EFB2, 0xA337EFB4], count: 0xA337EFC4, list: 0xA337EFC6, max: 8 },
      active: 0xA337F084, aspect: [0xA3378119, 0xA337811A],
      aspect_pairs: { 1: [4, 3], 2: [3, 2], 3: [16, 9], 4: [6, 6], 9: [3, 4], 10: [17, 9] },
      up_face: 0x50025747,
      face_mode: 0xA32F3E06,
      aspect_code: 0x5100D469, state: 0x5100DFBC,
      transform: { table: 0x60365754, index: 0x500258E8, object: [0x8971, 0x62F4FE68], device: 0x500258D4, row: 0x50025931 },
    },
    // CPU 3's MDET_DL run on the lab CPU with the DML engine's model (src/lab/mdet.mjs S-MDETDL, S-TAKEMDET,
    // S-LEARNDATA; src/dev/dml.mjs S-DML; docs/om1-subject-spec.md 2.1, 4.1, 5.2, 5.3). D unless tagged.
    // api: the CPU 0 calls TAKE and take_mov make (trace ids 588, 589, 590, 592): mdet_dl_start(kind) and
    // mdet_dl_change_mode(kind) accept 1..5 (0x5080a62f, 0x5080a7e6); start waits for the CPU 0 flag (0x60043184)
    // bit 8 without timeout (0x5080a658..0x5080a66a), end for (0x60043186) bit 16; offer(record) posts the record
    // whose +4 is the YC buffer's id (locked first through yc.lock, 0x5080a9cb), +6 / +8 the YC frame's width and
    // height, +13 the movie flag, +32 the digital zoom in percent (calc_disp_area_lv 0x508130d0 hands it to
    // 0x50813294, which returns at once for 100 and divides by it otherwise), +34 the aspect code (take_mov's packer
    // 0x503a4e2d..0x503a4ee5: +32 is its buffer descriptor's halfword +14; the posted copy starts 12 bytes on, so
    // these are the spec's +16, +18, +20, +25, +44, +46). post: the poster 0x5080ad65 they all call
    // copies the request into MDET's slot (0xa3375b98, its kind byte the slot's busy mark) and posts fn with the slot
    // to CPU 3 (sys_callrequest 0x50035afd(3, ...) at 0x5080aed5, ring [3][0]); done, its return path after it
    // restores the interrupt mask (0x5080aede); busy, the branch it takes when the slot is still busy, which arms a
    // 50 ms software timer to post later (0x5080ade0..0x5080adfa, 0x5080af28, 0x5080b017). fn (0x5080b987, run by
    // CPU 3's IRQ 324 drainer) runs MDET's lazy init 0x5080b1c6 (dl_init_boot: the DML driver's init 0x507f906b,
    // which attaches IRQ 285, the request image at 0xa3375c78, dl_prm_init; once, by the magic 0x20202022 at
    // 0xa3376c68), queues the slot (0x50817244), sets REQ's flag bit 1 and clears the slot's mark.
    // tasks: CPU 3's MDET_DL_REQ (0x3004; entry 0x5080bae8: its flag (0x600436d0) bit 1, then each queued request
    // by kind: 1 START 0x5080bc34, 2 END 0x5080bd49, 3 CHANGE_MODE 0x5080be27, 4 NOTIFY_START_STILL, 5 OFFER_YC_DATA
    // 0x5080c033, 6 NOTIFY_1ST_AFL) and MDET_DL_LDL (0x3005; entry 0x5080c8a1: its flag (0x600436d2) bit 2, then the
    // learning data of the kind START or CHANGE_MODE stored at 0xa3375c74 when it is not the one loaded at
    // 0xa3375c75, through learning_data_load 0x5080c9b4; it waits for (0x600436d4) bit 4 first while the DML runs).
    // dml_done: the flag word (0x600436d6) and bit 4 that dml_start_callback 0x50812052 sets (0x508120c5), on which
    // the offer's handler waits without timeout after dml_start (0x5080c20d..0x5080c224). The four flag words hold
    // 0x3003..0x3006, CPU 3 objects (the id's bits 12..13, which the kernel's object calls compare with the calling
    // task's, 0x5002cfb0). deferred: the deferred-call IRQ through whose ring dml_start reaches the driver's start
    // (0x507f9099 -> 0x500503d4, IRQ 53's post, src/dev/dpc.mjs; the run 0x507f90c1 -> 0x507f69cb). dml: the IRQ 285
    // handler the driver's init attaches (0x507f68a8) and the completion callback it calls (the request image's +36,
    // 0x60833072 in the ROM copy at 0x609e9bf8), observed by the lab
    // learning: learning_data_load's read of item kind - 1 of group 0x800f to 0x9511ca00 through the resource reader
    // 0x501a921f(group d0, item d1, destination a0, a1 0, size 0 on the stack: the item's length), which returns in a0
    // the record {address, size} learning_data_load checks for 0 (0x5080ca1c..0x5080ca62); size: each item's length
    // (spec 3.2, X: the 0106 block's directory). yc: the YC buffer manager's lock (from the CPU 0 offer), address (d0,
    // read twice by dml_set_control_reg for the Y and C planes, 0x5080cd6d, 0x5080cd81) and release (from the offer's
    // handler, which wants 0) of a buffer id (0x50534d3f, 0x50534dd1, 0x50534bbd). result: set_subject_detect_result's
    // word and 8 records of 32 bytes (0x50816d37: +0 sbj_kind, +2 the body {cx, cy, w, h, rel, dtct}, +12 part 1,
    // +22 part 2), which offer_yc_data hands to LAF (0x50839ede) at the end of each offer. LAF's start and end, which
    // START, CHANGE_MODE and END call (0x50839498 -> 0x508395ce, 0x50839533 -> 0x508397d2), write subject.active (1 at
    // 0x50839766, 0 at 0x508398c8), and LAF's setter refuses an offer's result while it is 0 (0x50839f29..0x50839f5b).
    // LAF's setter also writes the getter's aspect pair (subject.aspect) from its copy of the offer
    // (0x5083998d..0x508399a0 copies 0xa337b4e4.. to 0xa337b5f4..): the byte 0xa337b702 (X: the offer record's aspect
    // code) mapped 1 -> (4, 3), 2 -> (3, 2), 3 -> (16, 9), 4 -> (6, 6), 9 -> (3, 4), 10 -> (17, 9), anything else
    // logged and (4, 3) (0x50839cb8..0x50839d34), then, unless the bytes 0xa337f087 and 0xa337d948 pick the other
    // branch (0x50839d79..0x50839da4, which calls 0x506e6ac8 instead; not met in the lab), runs table_writer, a frame
    // table writer of its own (0x5083a761, entered by call at 0x5083a766 from 0x50839db5: mdet_laf_calc_not_tr_dl
    // 0x50837b05, then the main and part flags 0, the count 0 and a list record per valid box, 0xa33790b2 + 8 n while
    // 0xa337d53c + n is 1, 0x5083a843..0x5083a90c), and posts UP_FACE (0x50839dba). The other writer,
    // 0x5082ac64..0x5082af98 (spec 5.1), did not run in the lab's sessions (X: its count stores 0x5082af2a and
    // 0x5082af55 never executed while the table held the rider)
    // MDET's event tasks and LAF's main subject (docs/om1-subject-spec.md 5.7; D unless tagged). tasks 3 and 4:
    // MDET_E_SEND_CPU3 (0x3007's task, entry 0x50800fe2) waits on its flag (0x600436d8) = 0x3007 for 0xfe77003e (OR,
    // no timeout) and turns each bit into an event it sends with mdet_laf_q_send 0x5080362d (or mdet_iauto_q_send) to
    // MDET_CALC_MAIN_CPU3's queue (0x600436f8) = 0x3005, a 16-byte message {.., .., event, argument} (0x50801384:
    // OlyQeWr, timeout -1); MDET_CALC_MAIN_CPU3 (entry 0x50800b03) reads it (OlyQeRd, timeout -1) and dispatches the
    // event less 0x10000000 through its table 0x609d9b54 (event & 31 the slot): e.g. 0x30000008, the end frame, to
    // mdet_laf_end_frame_calc_cpu_func 0x50825b54 (trace id 242), which runs mdet_laf_exec_trace 0x50825ceb (96),
    // which with a candidate runs mdet_laf_dl_internal_start (0x50835002, sets 0xa337f082 = 1) and then
    // mdet_laf_calc_offer_data 0x50829b5e (laf.observe). events: LAF's event setters, which mdet_set_event_* posts to
    // CPU 3 through 0x508017b4(3, setter, argument) (always sys_callrequest) and which name the flag's bits: the eleven
    // functions 0x508017b4's name table lists (0x50801800..0x508018b9), and mdet_laf_ems2_img_info_clear_delayint
    // 0x508251d2, which its wrapper calls directly when (0x8050) is 3 and posts otherwise (0x50825324..0x5082538f).
    // laf: the AF area {x0, y0, x1, y1} LAF's candidate test uses (copied from the record CPU 3's FCS call 0x508c00a3
    // fills, spec 5.6 U9), the candidate bytes of LAF's eight subjects, the tracking status (written by
    // mdet_laf_dl_set_tracking_status_force 0x506e6bc6), its copy the status callback keeps, and the main-record state.
    // status_cb: TAKE's start registers TAKE's callback take through mdet_laf_dl_set_status_change_callback set
    // (trace id 21; 0x506d8103..0x506d8109), which fills the record 0xa33458cc {0,
    // mdet_laf_dl_status_change_callback_exec 0x50802700, 0, (0x8050)} and 0xa33458dc; the status callback posts that
    // record (0x508026a1 -> 0x50801a5b: a deferred call of +4 on the record's core, else a post to it), and take
    // (0x506d98ed) posts TAKE's message 81 to its queue 0x5e once until TAKE's handler clears 0xa32df204
    // (0x506d98f0..0x506d9934). take (docs/om1-subject-spec.md 5.9): that message {0, 0, 81, handler} (posted, the
    // guard byte; queue, the word holding TAKE's queue id), whose handler 0x506d993e clears posted (0x506d9966) and
    // rebuilds TAKE's live-view mode (0x5039c864 -> 0x5039bb7e -> 0x5039c2bc), handing take_mov the bits of mask 0x7f8
    // through its mode setter mode_set (0x503a47ae: new = (old & ~mask) | (value & mask), then 0x503a43c9). Of those,
    // the tracking sources' bits come from the answer of 0x506da448 (the AF library's tracking 1, 2, 3 through
    // 0x506eab07, else FACE's 0x505221aa, else mdet_laf_dl_tracking_status 0x506e698e, i.e. 0xa337f085): sources[0]
    // 0x506d9101(ctx) maps 1, 2, 4, 5 to 0x10, 0x100, 0x200, 0x400 (0 while ctx bit 0x40000) and sources[1] 0x506d913b
    // maps 3 to 0x40; mask is theirs. 0x506d9c04 turns TAKE's 0x10 / 0x100 / 0x200 / 0x400 into take_mov's LAF mode
    // bits 0x2 / 0x4 / 0x8 / 0x10 (laf_mode, 0x62a41180), whose rise makes TAKE_MOV's start 0x506da276 call
    // mdet_laf_start and whose fall makes 0x503a42e5 call mdet_laf_end. lv_kind: the getter (0x62a3f228) the mode
    // setter's other argument comes from at TAKE's live-view start (0x506d895a; I for the rebuild's). laf_wait: the CPU
    // 0 flag word mdet_laf_end 0x50802347 clears, posts LAF's end request against and waits on for bit 4 (OR, 50 ms; a
    // timeout logs 0x310b000a), which LAF's end on CPU 3 sets. fcs: the AF library's init
    // 0x508bede6 (from the boot chain at 0x501e9533) steps H-FCSAF runs: 0x509748d7 sets the rebuild flag 0xa33d8bea,
    // 0x508c70c0 copies the AF target record target (0xa33b015c, through 0x508c33c0 -> 0x508c51fa), which 0x5097500a
    // builds from the objects 0x88b2 (point, row * 39 + column; 526 the centre), 0x84d1 (mode), 0x9a41, 0x1dd1 (height,
    // width), 0x1df1, 0x1e01; 0x5099cbd9 points 0xa33d9518 / 0xa33d951c at 0xa33d8c5c and 0xa33d9520 at 0xa33d8c80
    // and resets them. 0x5099d7d5 then makes the AF area from the target: grid columns c - w / 2 - 1 .. c + w / 2 + 2,
    // rows r - h / 2 - 1 .. r + h / 2 + 2, through the tables 0x60a63a48 (x) and 0x60a63ae8 (y) into +24..+30
    // LAF's PDT and TRC sides (docs/om1-subject-spec.md 5.8; D unless tagged). tasks 5 and 6: MDET_PDT_CPU3 (0x300a,
    // entry 0x50842033) waits through mdet_ev_wait 0x50855345 on (0x600436dc) bit 1 and reads its queue
    // (mdet_util_q_read 0x508559fb) by kind: 1 pdt_start 0x508422b4, 2 pdt_set_info 0x50842392, 3 pdt_end 0x50842993;
    // MDET_TRC_CPU3 (0x300b, entry 0x50848822) on (0x600436e2) bit 0x100: 1 trc_start 0x50848a47, 2 tracking_color
    // 0x50848b5b, 3 judge_color 0x508490f3, 4 trc_end 0x50849530; core3: their code runs with the core register at 3
    // (their queues' check 0x50855ce5 refuses another core). posts: pdt_request 0x50841d6a and trc_request 0x5084854d
    // copy a request to 0xa3380224 / 0xa338b114 and post their dispatch to CPU 3 (sys_callrequest), which queues it
    // (mdet_util_q_write 0x508557c5) and sets the task's flag. init: the boot chain's steps after the DML driver's
    // (0x501e9720..0x501e972e): mdet_util_q_init 0x50855239 (MDET's two queue records, 72 bytes from ROM 0x609ef4d8 to
    // 0xa338b8a4), pdt_drv_if_init 0x507f9c18 (pdt_drv_init: IRQ 279 attached on CPU 3 through 0x50053fcd with handler
    // 0x507f9b4d, then open and close) and trc_drv_if_init 0x507fbdd9 (IRQ 278, handler 0x507fbd0e); the step's MDET
    // logger init 0x5080445f is left out. cpu3_deferred: CPU 3's deferred-call ring (the post 0x500503d4 picks it by
    // the core register; its write and read indexes at +0x180 / +0x184, the runner 0x5005062d), cpu3_handlers: CPU 3's
    // IRQ handler table (ATTACH 0x5002e84e stores core 3's handlers there; core 0's at 0xa32600c0)
    mdet: {
      api: { start: 0x5080A5E2, end: 0x5080A6DC, change_mode: 0x5080A79A, offer: 0x5080A912 },
      record: { size: 96, buff_id: 4, w: 6, h: 8, movie: 13, zoom: 32, aspect: 34 },
      post: { done: 0x5080AEE5, busy: 0x5080ADE0, fn: 0x5080B987, slot: 0xA3375B98 },
      tasks: [{ name: 'MDET_DL_REQ', entry: 0x5080BAE8, flag: 0x600436D0, bit: 1 },
        { name: 'MDET_DL_LDL', entry: 0x5080C8A1, flag: 0x600436D2, bit: 2 },
        { name: 'MDET_E_SEND_CPU3', entry: 0x50800FE2, flag: 0x600436D8, bit: 0xFE77003E },
        { name: 'MDET_CALC_MAIN_CPU3', entry: 0x50800B03, queue: 0x600436F8 },
        { name: 'MDET_PDT_CPU3', entry: 0x50842033, flag: 0x600436DC, bit: 0x1, core3: true },
        { name: 'MDET_TRC_CPU3', entry: 0x50848822, flag: 0x600436E2, bit: 0x100, core3: true }],
      flags: [0x600436D0, 0x600436D2, 0x600436D4, 0x600436D6, 0x600436D8, 0x600436DC, 0x600436E2, 0x600436E8],
      nested_wait: 0x600436E8,
      queue_message: 16,
      events: { laf_init: 0x50802B6D, laf_start: 0x50802C2D, laf_start_request: 0x50802CED, laf_end: 0x50802DA5,
        laf_end_request: 0x50802E65, laf_end_frame: 0x50802F1D, laf_moving_object_detect: 0x50802FDD,
        laf_chase_object_trc_e1: 0x5080309D, laf_end_wait_clear: 0x508033F5, laf_start_still: 0x508034AD,
        laf_end_still: 0x5080356D, ems2_info_clear: 0x508251D2 },
      posts: { pdt_dispatch: 0x50841EDD, trc_dispatch: 0x508486C6 },
      init: [0x50855239, 0x507F9C18, 0x507FBDD9],
      cpu3_deferred: 0xA32C125C, cpu3_handlers: 0xA3261170,
      laf: { observe: { end_frame_calc: 0x50825B54, exec_trace: 0x50825CEB, internal_start: 0x50835002,
        offer_data: 0x50829B5E },
        area: 0xA337F050, candidates: 0xA337D948, tracking: 0xA337F085, tracking_seen: 0xA337F087,
        main_state: 0xA337F082 },
      status_cb: { set: 0x506E68B4, take: 0x506D98ED },
      take: { posted: 0xA32DF204, queue: 0x60043280, message: 81, handler: 0x506D993E, ctx: 0x62A3F148,
        sources: [0x506D9101, 0x506D913B], mask: 0x750, lv_kind: 0x506D93D0, mode_set: 0x503A47AE, laf_mode: 0x62A41180,
        laf_wait: 0x600430C4 },
      fcs: { init: [0x509748D7, 0x508C70C0, 0x5099CBD9], target: 0xA33B015C },
      dml_done: [0x600436D6, 4], deferred: 53,
      dml: { irq_handler: 0x507F6ABD, callback: 0x50812052 },
      learning: { read: 0x501A921F, group: 0x800F, dest: 0x9511CA00, size: 0x8F3000 },
      yc: { lock: 0x50534D3F, address: 0x50534DD1, release: 0x50534BBD },
      result: { word: 0xA3376B58, records: 0xA3376B5C, count: 8, size: 32, body: 2, parts: [12, 22] },
      table_writer: 0x5083A766,
    },
  },
  E146: {
    name: 'OM-1 II', bin: 'OLY_E_146_1300_0000_0000.BIN', version: '1.3', res_block: 'blk02000000.OE.0101.bin', checked: true,
    rom_len: 33554368, rom_sha256: '125c9ff8f43396f48f55b9b3a62279a9fea29623038e02cb4b397f6a76c7c95c',
    // the reset head's jump into the run-time copy at 0x50000082: mov 0x600210c5,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 10176992, res_sha256: 'b05dac40db4a90d93476a46a705611f4653cfde224befd3bdbd46427d4c41a6b',
    panels: { tft: [900, 600], evf: [1600, 1200] },
    // E143's board; the compositor leaves the register blocks VSC_UNAPPLIED unapplied, as on E147 (I: which of them
    // E146's firmware writes was not read)
    board: { family: 'E143', vsc: { unapplied: VSC_UNAPPLIED } },
    vsc_extra: [0x6800, 0x1400],
    touch: false,
    g4set: G4SET_UNCHECKED,
    // the lens on the mount natively, the default (src/lab/lens.mjs; docs/hle-gaps.md 4.4.3): its driver is E143's
    // but for addresses, the debug log's line numbers and the order of a few instructions (X: its serial layer, init
    // chain, power-on and detect paths and frame table compared with E143's instruction for instruction), the addresses
    // read by src/fw/facts.mjs lensDriver; its start sends E143's 15 frames (X)
    lens_native: true,
    // the SCPU's block at file offset 0x0e520000, byte-identical to E143's (docs/om1-scpu-spec.md section 2; D: the same
    // sha256), so E143's pins and gate
    scpu_lle: {
      block: 'blk0e520000.OE.0107.bin', sha256: '2d930ac588014c250391d6af3a49fe7372852fc5eafbac5d2ac73df04be94807',
      pins: { request: 'PB12', ready: 'PC3', message: 'PC2' }, gate: 0x20008390,
    },
    // the SCPU's backed-up words the firmware writes and reads, [index, byte], and its writes without data or an
    // answer (src/lab/scpudev.mjs S-SCPUDEV; E143's [2, 0] and none): the time-zone record's write and read wrappers
    // at 0x5005c164 and 0x5005c171 pass index 2, byte 0 (D); port_scan: UI_IN's port-scan request 0x5005edec and the
    // inbound 0x08 handler 0x5005eec0 are E143's 0x5005d36a and 0x5005d43e instruction for instruction (D;
    // src/lab/play.mjs H-UIINSCAN)
    scpu: { words: [[2, 0]], quiet: [], port_scan: true },
    // as E143's (D): the SCPU init 0x5004f6d7 attaches 0x5004fc7f at level 5 (0x5004f910..1b); UI_IN's port init
    // registers 0x50152295 (0x5015226f..75); its start stage calls 0x5015227f (0x5014fd27)
    scpu_port: { irq: [0x5004FC7F, 5], register: 0x5004F953, callback: 0x50152295, old_state: 0x5015227F },
    // as E143's (D: the module init, ACC_MAIN, the probe, the sampler's completion, the copy, the correction, the
    // register API and PER_SLOPE compare instruction for instruction with E143's but for addresses; the gauge's getter
    // calls the adjust state machine with a 72-byte frame, which has a seventh operation): the init 0x5004999e calls the
    // device part at 0x500499a5 and stores 0x6034d9d4 and the run-time 0x6006af12 (= 0x50049ef2) at 0x6298d750 /
    // 0x6298d754; the completion 0x50049dfb packs 0x6298d7ce..d2 and 0x6298d7d6; the remap 0x50061a33 reads 0x6034e2c4;
    // PER_ROTATE's init 0x5005bb0e and task 0x5005bc00 compare with E143's instruction for instruction but for absolute
    // addresses, with the same two hysteresis tables, the same words 0xa32c64f0..f8 and the getter's halfwords at
    // 0x6034e2b8; its publish is 0x50025153 (D)
    acc: {
      init: 0x5004999E, device: 0x500499A5, ptrs: [0x6298D750, 0x6298D754], main: 0x50049BB3, probed: 0x6298D7B0,
      reg: { open: 0x5004E3F3, read: 0x5004E5D9, write: 0x5004E5EF, close: 0x5004E5CE },
      dev: [6, 107], who_am_i: [0x0F, 0x6A], setup: [[0x10, 0x10], [0x0D, 0x01]],
      copy: 0x50049EF2, correct: 0x5004A0CD, words: [0x6298D7CE, 0x6298D7D6], counter: 0x6034D9D4,
      refs: 0x6034D9B0, axes: 0x6034E2C4,
      slope: { init: 0x500615E7, main: 0x50061652, get: 0x50061436 },
      rotate: { init: 0x5005BB0E, main: 0x5005BC00, get: 0x5005BBD7, pose: 0xA32C64F8, index: 0xA32C64F4, publish: 0x50025153, event: 0x04020310 },
    },
    // as E143's (D): pool 2's get 0x5000314d and release 0x50003157, block 16512 (the table 0x60029910), memory 0x62424700
    heap_pool: { get: 0x5000314D, put: 0x50003157, bytes: 16512 },
    // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card), and its HLS side (src/lab/media.mjs;
    // docs/hle-gaps.md 4.8.7): E143's (its entry has the meaning of each field), each function paired by the map
    // (bin/xto.mjs) and compared with E143's instruction for instruction but for absolute addresses and source line
    // numbers (D): the reception's getter, slot 2 and the receive body, operator new, the event classes' ctors (697,
    // 711 and 696 as E143's; the senders allocate 44, 36 and 40 bytes), the media control's class ctor (0x50aca769),
    // getMediaCtrlCBC, getMediaProgress, executeMediaFormatStart (the progress event 0x04020011), api_media's format
    // and media status, the flag setter, the mount state getter and setter, UI_IN's level getter and the module event
    // post. Three ids differ: the media control request is TRA 1509 (its ctor's id; E143's 1511), the progress and
    // the result 1511 and 1512 (cbMediaCtrlResult 0x50cfbf3c, the progress send 0x50cfc6e5, the sender 0x50cfcb36 and
    // the reactive's state 6 0x50ad5b24 test them; E143's 1513 and 1514); the API's reply queue is the halfword
    // 0x6004320e (api_media's format reads it at 0x503ecb06; the map's data pairing, 0x60043200, is not it). errlog:
    // E143's movie time query's (MOVIE_TIME_ERRLOG), from the same time code conversion (E146 0x5043fa3d: E143's
    // 0x5044949b instruction for instruction but for the log's line number, X), on the shooting screen with either
    // lens (X)
    card_fs: {
      native: true,
      errlog: [MOVIE_TIME_ERRLOG],
      // the second card slot at the forms the rule reads in its image (X: test_storage's --slot2 sessions)
      second_slot: true,
      hls: {
        reception: 0x50AC655A, sync_slot: 2, new: 0x50DACAF5,
        events: { result: [0x50AD32E7, 44], media: [0x50AD2FD2, 36], mount: [0x50AD324A, 40] },
        ids: { progress: 1511, result: 1512 },
        ctrl: { request: 1509, cmd: 32, media: 34, option: 36, format: 1, cbc: 0x50CFC765, progress: 0x50CFC1E7,
          api: 0x503ECA4D, reply_queue: 0x6004320E, progress_event: 0x04020011, kinds: { progress: 3, done: 72 },
          status: 0x503ECE04, flag: [0x50ABEF30, 15261] },
        mount: { get: 0x50AD4AF7, set: 0x50AD4C8B, unmounted: 0, mounted: 8, rec_end: 2, end: 8 },
        slots: [{ kind: 4, switch: 0x1506 }, { kind: 8, switch: 0x1518 }],
        switch_level: 0x5014FD76, switch_event: 0x02020000, publish: 0x50025160,
      },
    },
    // the power manager and the power-off natively, with E143's IO expanders (X: test_scpu's and test_scpum4's power
    // sessions; docs/hle-gaps.md 4.7.4)
    power_native: true,
    // REC_FILE and REC_IMAGE natively, at the addresses recFile and recImage read (X: test_storage's S2 file, its Exif
    // Model 'OM-1MarkII', made in REC_IMAGE's task 28 since 2026-11-10, docs/hle-gaps.md 4.3.5)
    rec_native: true,
    // S-NVRAM's B store (src/lab/menu.mjs B_WORDS): its format, the halfword the registry bootstrap gives the store
    // (`movhu (0x6009a3cc),d0` at 0x50041778, E143's 0x50040b71; 0x000a, D)
    nvram: { b_format: 0x000A },
    // as E143's (D): the GIO init 0x50002a21 ends with 0x50002b5e (0x50002a2e), slots at 0xa32c1f74; the EDID state is
    // the word 0x62a67880 its getter 0x501d8647 reads. The hot-plug handler's work runs in the display init's HDMI task
    // 0x501dc568 (extra_tasks), not in task 16 as E143's
    hdmi: { gio_slots: 0x50002B5E, state: [0x62A67880, 4] },
    extra_tasks: [
      0x501DC568,   // started by the display task init (E143 0x501c2f13 starts no task; E147 starts 0x501e3eca)
    ],
  },
  E147: {
    name: 'OM-3', bin: 'OLY_E_147_1100_0000_0000.BIN', version: '1.1', res_block: 'blk02000000.OE.0101.bin', checked: true,
    rom_len: 33554368, rom_sha256: '5e8d376e9111a44ac0352f26030d7c1b17026d42c45f3600cfa02a0e8c5b7d59',
    // the reset head's jump into the run-time copy at 0x50000082: mov 0x600210c5,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 10197472, res_sha256: '119370d5dab0d5fc9b1e58357f3fd60595603076127ab60199a4c2bc5712d724',
    panels: { tft: [900, 600], evf: [1024, 768] },
    // the flash library's get-core-id (disassembly notation, flash 0x50002900): E143 has it in the image (0x50002fd3,
    // `mov (0x97f00254),d0; retf`); E147 calls the flash copy from the same 21 sites (paired, X)
    flash_core_id: 0x3FFE18E0,
    // task entries a later build starts where E143 starts none, run natively (each with what starts it)
    // the VSC's per-channel block 0x6800..0x7c00 (word indices 0x1a00..0x1eaf in ten runs of 0x30), which the
    // display init clears (0x501ed5bc, table 0x602eb7a8) and E143's VSC has not (X)
    vsc_extra: [0x6800, 0x1400],
    // the feature registers' values E147 writes for its EVF (1024 x 768 panel) where E143's differ (X: the EVF start)
    vsc_features: { 0x428: [0x22], 0x580: [0], 0x584: [0], 0x588: [0], 0x58c: [0], 0x598: [0] },
    // the touch init starts the touch task itself and both wait for the controller's I2C completion (X): not modelled
    touch: false,
    g4set: G4SET_UNCHECKED,
    // the lens on the mount natively, the default, as on E146 (src/lab/lens.mjs; docs/hle-gaps.md 4.4.3; X: the same
    // compares and frames); LLPSW is bit 6 of group 1 byte 0 in its UI_IN tables (E143's bit 4 of byte 1)
    lens_native: true,
    // property 4513 (the output device) reads the play path makes from one more site than E143's GUI (X)
    prop_sites: [0x503DAF24],
    // the SCPU's backed-up words the firmware writes and reads, [index, byte], and its writes without data or an
    // answer (src/lab/scpudev.mjs S-SCPUDEV; E143's [2, 0] and none): the time-zone record's write and read wrappers
    // at 0x50057330 and 0x5005733d pass index 2, byte 0 (D); port_scan: UI_IN's port-scan request 0x50059f64 and the
    // inbound 0x08 handler 0x5005a038 are E143's instruction for instruction (D; src/lab/play.mjs H-UIINSCAN)
    scpu: { words: [[2, 0]], quiet: [], port_scan: true },
    // as E143's (D): the SCPU init attaches 0x5004f9bc at level 5 (0x5004f64c..57), its registration 0x5004f690 keeps
    // its count at 0xa32bff60 (E143's 0xa32bff5c); UI_IN's port init registers 0x501595dc (0x501595b6..bc); its start
    // stage calls 0x501595c6 (0x5015707b)
    scpu_port: { irq: [0x5004F9BC, 5], register: 0x5004F690, callback: 0x501595DC, old_state: 0x501595C6 },
    // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card). errlog: the file system's first call
    // of the SCPU clock's API (0x50135923 -> 0x5005720a; what it asks is ?) comes at the bring-up before anything ran the
    // SCPU clock's wait 0x50057348, which sets the interface's state field (0x98e00000 bits 2..7) to 42; the API logs
    // this code for any other state (0x50057211..0x5005721d, D); the field is 42 4 ms later (X: 0 at 323 ms, 42 at
    // 327 ms; the wait's `mov 42,d0; call 0x5004fb2c` at 0x50057378, D). On E143 and E146 the field is 42 before the
    // bring-up (X); which boot step sets it first on the camera is ?
    // hls: its HLS side (src/lab/media.mjs; docs/model-survey.md finding 149), E143's (its entry has the meaning of
    // each field), each function paired by the map (bin/xto.mjs) and compared with E143's instruction for instruction
    // but for absolute addresses and source line numbers (D), as E146's: the reception's getter, creator, slot 2 and
    // the receive body, operator new, the event classes' ctors (697, 711 and 696 as E143's; the senders allocate 44, 36
    // and 40 bytes, 0x50d080ff, 0x50d0815a, 0x50bd3c7a), the media control's class ctor (0x50ad49bb) and its sender
    // (0x50addc80), getMediaCtrlCBC, getMediaProgress, executeMediaFormatStart (the progress event 0x04020011),
    // api_media's format and media status, the flag setter, the mount state getter and setter and the module event
    // post. The ids are E146's: the media control request TRA 1509, the progress 1511 and the result 1512
    // (cbMediaCtrlResult 0x50d07505, the progress send 0x50d07cae, the end 0x50d07f43 and the reactive's state 6
    // 0x50adfe58 test them); the API's reply queue is the halfword 0x60043180 (api_media's format reads it at
    // 0x503fa89d). The end sets the flags 15261 and 15262 for the media kinds 4 and 8 as E143's (0x50d08056..
    // 0x50d080a2), though the body has one card slot: its file layer registers both switch codes with UI_IN
    // (0x50896d7e, 0x50896d90) for one drive (`cmp 1,a2` at 0x50896d7a, E143's 2), and its UI_IN tables hold 0x1506
    // alone (X: src/lab/play.mjs uiin_layout; group 0 byte 0 bit 4). UI_IN's level getter 0x501570c5 is E143's
    // 0x5014c015 with 7 groups (`cmp 7,d1`, E143's 5) and the special codes 0x1901, 0x1909 and 0x1906 (E143's 0x1901,
    // 0x1235, 0x200f, 0x1234 and 0x200e; D)
    card_fs: {
      native: true,
      errlog: [[0x19001004, 'the file system\'s first call of the SCPU clock\'s API finds its state not yet set (the clock\'s first wait sets it)'], MOVIE_TIME_ERRLOG],
      hls: {
        reception: 0x50AD0628, sync_slot: 2, new: 0x50DB82B6,
        events: { result: [0x50ADD60E, 44], media: [0x50ADD2F9, 36], mount: [0x50ADD571, 40] },
        ids: { progress: 1511, result: 1512 },
        ctrl: { request: 1509, cmd: 32, media: 34, option: 36, format: 1, cbc: 0x50D07D2E, progress: 0x50D077B0,
          api: 0x503FA7E4, reply_queue: 0x60043180, progress_event: 0x04020011, kinds: { progress: 3, done: 72 },
          status: 0x503FAB9B, flag: [0x50AC8F6B, 15261] },
        mount: { get: 0x50ADEE2B, set: 0x50ADEFBF, unmounted: 0, mounted: 8, rec_end: 2, end: 8 },
        slots: [{ kind: 4, switch: 0x1506 }, { kind: 8, switch: 0x1518 }],
        switch_level: 0x501570C5, switch_event: 0x02020000, publish: 0x500250DF,
      },
    },
    // the power manager and the power-off natively; its power-off sends no IO expander a command (D: the sequence
    // 0x50045807; X: a scan finds the expanders' task names only in a name list no code loads), so S-IOEXP does not
    // run (X: test_scpu's power session; docs/hle-gaps.md 4.7.4)
    power_native: true,
    // REC_FILE and REC_IMAGE natively, at the addresses recFile and recImage read (X: test_storage's S2 file, its Exif
    // Model 'OM-3', made in REC_IMAGE's task 28 since 2026-11-10, docs/hle-gaps.md 4.3.5)
    rec_native: true,
    // S-NVRAM's B store (src/lab/menu.mjs B_WORDS): its format, the halfword the registry bootstrap gives the store
    // (`movhu (0x60095508),d0` at 0x500416f7, E143's 0x50040b71; 0x000a, D)
    nvram: { b_format: 0x000A },
    // the creative dial (src/lab/play.mjs creative_dial): UI_IN's 0x1906 on bits 0..4 of group 5, polarity 1 (its
    // tables, X). UI_IN's level getter 0x501570c5 answers 0x1906 through 0x501571c5: the entry of the board's value
    // table (0x60360010 + 4 board) at the decoded position's index (byte 0xa32d9d0e, 0..4; D). A turn to position k
    // sets the picture-mode family, setting 897, natively: 988, 901, 898, 899, 900 for k = 0..4 (X: test_cdial.mjs,
    // the getter after each turn; the start's position 1 reads 901), and the application opens the Picture Mode page of
    // MONO 1, COLOR 1, ART 1 (Pop Art) and the Color Creator for positions 0, 1, 3 and 4 (X: their frames, the wheel
    // plane left out of the composite); at position 2 (898) no page opens and the screen stays as it was (X). The labels
    // follow those pages; position 2 is unnamed (?). Caduceus for OM-3's camera report (2026-11-10): the body's four
    // positions CRT, ART, COLOR, MONO set 897 to 900, 899, 901, 988, and 898 is no position of the body's dial; which
    // way the dial turns between the lab's positions is not in the firmware (?)
    creative_dial: { labels: ['MONO', 'COLOR', 'position 2', 'ART', 'CRT'] },
    // the still / movie switch (src/lab/play.mjs switch_idle): UI_IN's 0x1909 on bits 0..2 of group 4, polarity 1
    // (its tables, X), which the application's mode reader reads right after the mode dial's 0x1901 (D). At its
    // positions 0 and 1 the application's setting 44 reads 1, at 2 it reads 0 (X); E143 sets 44 to 1 at the mode
    // dial's MOVIE (X), its button functions take their movie column while 44 is 1 and OlyHfwOpeShoot::ctrlRelease
    // is then given no release keys, so S1 and S2 never reach the shooting sequence's phase 101 cases (D, X under
    // control camapp 3: phase 101 throughout; docs/hle-gaps.md 4.1.13). The lab's sessions are stills sessions: the
    // switch starts at position 2. The Super Control Panel agrees (X): at position 2 its shooting-mode cell shows the
    // stills icon and P, at position 1 that cell is empty, the other cells the same. That 44 is the movie mode is I
    // (its name is not read)
    switch_idle: { 0x1909: 2 },
    // as E146's (D): the GIO init 0x50002a11 ends with 0x50002b50 (0x50002a1e), slots at 0xa32c1c44; the EDID state
    // word 0x62a655e4 (its getter at 0x501e078a); the hot-plug work runs in the HDMI task 0x501e3eca
    hdmi: { gio_slots: 0x50002B50, state: [0x62A655E4, 4] },
    // no acc: E147's accelerometer code is not E143's (D): its probe 0x50049771 wants WHO_AM_I 0x70, and its ACC_MAIN
    // 0x50049640 copies every 30 ms only while 0x6298d7b0 is 1 (set by 0x50049616, cleared by 0x50049621); its sensor,
    // its scale and what sets the enable are not read
    extra_tasks: [
      0x501E3ECA,   // started by the display task init (0x501cfd03, E143 0x501c2f13 starts no task), X
    ],
    // E143's board (src/fw/board.mjs) but for the flash library, which E147 runs from its image head linked at
    // 0x3FFDEFE0 (memcpy/memset, the core-id getter: d32 calls from flash into it, X); the compositor leaves the
    // register blocks VSC_UNAPPLIED unapplied
    board: {
      family: 'E143', library: { base: 0x3FFD0000, size: 0x30000, image: [0, 0x30000 - 0xEFE0, 0xEFE0] },
      vsc: { unapplied: VSC_UNAPPLIED },
    },
  },
  E144: {
    name: 'OM-5', bin: 'OLY_E_144_1200_0000_0000.BIN', version: '1.2', res_block: 'blk017c0000.OE.0101.bin', checked: true,
    rom_len: 24903616, rom_sha256: 'cf4babeab5f516514e4a9b6032b0374e643830511e083b9cdd26bcb02980af88',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x600210f9,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 7835616, res_sha256: '1bc282d99c073bee159fbffa85c27b48782a7c083cfcc55bd086410790960b36',
    panels: { tft: [720, 480], evf: [1024, 768] },
    overrides: OVERRIDES_E144,
    // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card)
    // hls 'rule': the HLS media side (Format from Card Setup, the card out and in; src/lab/media.mjs S-MDAEND and
    // S-MEDIA) at the addresses src/fw/facts.mjs mediaHls reads (fact 'media': the family's application runs the media
    // control itself, as the E118 family's), since 2026-11-11 (docs/model-survey.md findings 151 and 152; X:
    // test/test_storage.mjs --hls)
    card_fs: { native: true, hls: 'rule' },
    // REC_FILE natively, at the addresses src/fw/facts.mjs recFileQueue reads (X: test_storage's S2 file, its Exif
    // Model 'OM-5')
    rec_native: true,
    g4set: G4SET_UNCHECKED,
    // the menus are the older Menu_Viewer / Cursor_2CNL framework, not ListMenu (src/fw/ports.mjs FACTS menu.list_menu,
    // read by src/fw/facts.mjs listMenu): no tab/page tables, variable 226 a 382-byte publish (D, the menu-entry chain
    // 0x50301ef8)
    // the VSC ch0 ISR sets a second vsync flag besides 0x60041680, waited by the task whose id is in (0xa2693e80)
    // (0x5018595f..0x501859ba, D)
    vsync_alias_flags: [0x600417B2],
    // the device open's interrupt wait (its timeout's errlog 0x37005206 expected, src/lab/display.mjs
    // EXPECTED_ERRLOG): IRQ 120 (0x5018a924: attach 120, poll (0x620c662c)), called at 0x50181efb, the code at
    // 0x50181f10 (D)
    // the cache flushes besides the DB init's (menu.mjs K-CFLUSH; return addresses): the driver at 0x50003a99 flushes
    // the data cache (0x5004821b: CHCTR 0x8070, the tag area 0x28a00000) before its DMA (X)
    cflush_returns: [0x50003AA0],
    // the save of the 1 MiB state block 0x62be0000 to flash 0x46c60000 (camapp.mjs S-SETSAVE): 0x50003a64 runs its
    // registered callbacks, flushes the cache, sums the block and writes it through the flash access 0x5003b76c,
    // which programs the flash controller 0x98d01800 the lab does not have (D); the application's RPC 0xc0036
    // handler calls it at power-on (0x503021b8, X)
    block_save: { fn: 0x50003A64, returns: [0x503021BF] },
    // drivers of peripherals the lab does not have (play.mjs; [function, d0, name, why]): the internal charger's
    // register write over IIC channel 6 (0x50041179: d0 1, d1 register, a0 value; its 3000 ms waits for the IIC
    // completion flag (0x600417aa) time out and log 0x1d003003 "INTCHA Eve W Err" without the charger, X), which the
    // GUI's power-state change 0x50041a4c makes about 4 s after power-on (X); 0 is its success value (0x5004135c, D)
    return_stubs: [[0x50041179, 0, 'S-INTCHA', 'internal charger IIC write: no charger in the lab']],
    // its board family's (src/fw/board.mjs FAMILIES.E144); its core byte (the getter 0x5000276d `movbu
    // (0x8ff00198),d0`), library (flash 0x41e02000 -> 1536 words at 0x47000800, 0x5000027d..0x5000028e) and preload
    // (the reset head's copies 0x500000f7..0x50000117, 0x5000018b..0x500001c5) are read by bin/port.mjs
    // (src/fw/ports.mjs FACTS.E144)
    board: { family: 'E144' },
  },
  E148: {
    name: 'OM-5 II', bin: 'OLY_E_148_1100_0000_0000.BIN', version: '1.1', res_block: 'blk017c0000.OE.0101.bin', checked: true,
    rom_len: 24903616, rom_sha256: 'f9c6b0bb37675a2b031ccf09292796ab5793994b8ce2053dcfd7f9fe68035cd8',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x600210f9,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 12582848, res_sha256: 'b31199742b06197e17bf3386ab48f3a936c8c333dd1b3b8a04a419bef862a369',
    panels: { tft: [720, 480], evf: [1024, 768] },
    // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card). hls: its HLS side
    // (src/lab/media.mjs; docs/model-survey.md finding 150). E148's application holds no media control process (no
    // OlyHfwOpeMdaCtrlProcessEvFw.cpp, X), unlike the family's other bodies: its OlyHfwOpeMdaCtrl sends the HLS
    // function component a transaction (0x50847f19, E143's 0x50ac937f; CmpCst_Function.cpp), so the block is E143's
    // (its entry has the meaning of each field), each function paired by the map (bin/xto.mjs) and compared with E143's
    // instruction for instruction but for absolute addresses and source line numbers (D): the reception's getter,
    // creator, slot 2 and the receive body, operator new, the event classes' ctors (the senders allocate 44, 36 and 40
    // bytes), the media control's class ctor (0x5084029e), getMediaCtrlCBC, getMediaProgress, executeMediaFormatStart,
    // the end (rcvReqFncMediaCtrlStartComplete 0x50a6c61c, its flags 15261 and 15262), the flag setter and the mount
    // state getter and setter. Its ids are one higher than E143's: the media control request TRA 1512, the progress
    // 1514, the result 1515, and 698 and 712 where E143 has 697 and 711 (the ctors' ids). api_media's format takes one
    // drive (`cmp 1,d0` at 0x502d6139, E143's 2) and reads the reply queue's halfword 0x600417f8 (0x502d61af); the
    // media status (0x502d64ad, API 0xe000b) and UI_IN's level getter (0x5010ff98) are of E143's shape with other
    // registers and special codes, and the module event post is 0x50025611 (E143's 0x50025095 behind another opening,
    // `mov d0,d3; mov d1,a2`; D)
    card_fs: {
      native: true,
      hls: {
        reception: 0x5083BF33, sync_slot: 2, new: 0x50B1BB11,
        events: { result: [0x5084A01D, 44], media: [0x50849D08, 36], mount: [0x50849F80, 40] },
        ids: { progress: 1514, result: 1515 },
        ctrl: { request: 1512, cmd: 32, media: 34, option: 36, format: 1, cbc: 0x50A6C407, progress: 0x50A6BE89,
          api: 0x502D60F6, reply_queue: 0x600417F8, progress_event: 0x04020011, kinds: { progress: 3, done: 72 },
          status: 0x502D64AD, flag: [0x50834A90, 15261] },
        mount: { get: 0x50849183, set: 0x50849317, unmounted: 0, mounted: 8, rec_end: 2, end: 8 },
        slots: [{ kind: 4, switch: 0x1506 }, { kind: 8, switch: 0x1518 }],
        switch_level: 0x5010FF98, switch_event: 0x02020000, publish: 0x50025611,
      },
    },
    // REC_FILE natively, at the addresses src/fw/facts.mjs recFileQueue reads (X: test_storage's S2 file, its Exif
    // Model 'OM-5MarkII')
    rec_native: true,
    // its family's group-4 stand-in (H-G4SET not applied; the producer, the port's place of E143's, is not checked on
    // E144 either, and its start and S1 run so; X: modelcheck)
    g4set: G4SET_UNCHECKED,
    // its board family's (src/fw/board.mjs FAMILIES.E144; the same MMIO family the survey reads, ISC 0x8fe00000,
    // VSC 0x9c000000, engine 0x9c100000), as E144's
    board: { family: 'E144' },
    // through E144 (port_via): the map from E144 pairs 9.50M instructions with 41 conflicts, the one from E143 2.47M
    // with 66 (X: port.json port_via.map and map, bin/port.mjs), and the OM-5 it succeeds has the same main block size
    // and its resource block at the same file offset
    port_via: 'E144',
    // E144's knobs this body takes through that map (src/fw/knobs.mjs; src/fw/ports.mjs KNOBS): its state block's save
    // 0x50003c39 has E144's 0x50003a64 line for line (its first read 0x50003c3d is of 0x61e5d500 where E144's 0x50003a66
    // reads 0x61e635f4, and its cache flush 0x50048f9f returns to 0x50003c75 as E144's 0x5004821b does to 0x50003aa0; D)
    carry: ['cflush_returns', 'block_save'],
  },
  // The bodies at the run-time bases 0x60021020, 0x60020020 and 0x60400020 (docs/model-survey.md tiers A-C). Each
  // entry's .BIN is the one the updater API serves for its code (the name: its reply's model_name; the reply is not
  // committed), pinned in BLOBS.sha256; rom_* and res_* are the main block's and the resource prefix's
  // digests by the lab's own path (src/fw/olyfw.mjs labBlocks, src/fw/resprefix.mjs resPrefix with the block's load
  // address, X). panels: the vendor's specification's dot counts as RGB pixels, 1.037M dots 720 x 480 and 2.36M dots
  // 1024 x 768 (I: unchecked; nothing reads panels yet), null where it gives no geometry or the body has no EVF.
  // board.family: the family scan's (src/fw/board.mjs FAMILIES, whose comments name the bodies scanned, X); the
  // family's per-body facts are read by bin/port.mjs (src/fw/ports.mjs FACTS), none is given here.
  E139: {
    name: 'E-M1 III', bin: 'OLY_E_139_1600_0000_0000.BIN', version: '1.6', res_block: 'blk01a00000.OE.0101.bin', checked: true,
    rom_len: 27262912, rom_sha256: '3f8bcc3248e63a823dd978607f019f2063ead83080b9c93cddc836d556ff42dd',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x600210f9,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 11726816, res_sha256: '0d4c92407626a32ae4173fc2d6efc5360d75b5c271f088339830ffe1455e157e',
    // TFT 1.037M dots, EVF 2.36M dots
    panels: { tft: [720, 480], evf: [1024, 768] },
    // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card); its HLS media side by the rule
    // as E144's (hls 'rule', X: test/test_storage.mjs --hls)
    card_fs: { native: true, hls: 'rule' },
    // REC_FILE natively, at the addresses src/fw/facts.mjs recFileQueue reads (X: test_storage's S2 file, its Exif
    // Model 'E-M1MarkIII')
    rec_native: true,
    // the SCPU clock ticks, as on E143 (src/fw/board.mjs: the family's stands still): its start, S1 and S2 run as with
    // the clock standing still (X: bin/modelcheck.mjs). The sub-CPU link (src/dev/linkpins.mjs, src/lab/scpulink.mjs):
    // its PER_SCPU is E143's but for its pins, ready 77, request 76 and reset 57 (0x50051ed3..0x50051ede, 0x5005362a, D); the GIO driver maps a
    // pin through the board variant's remap table (0x61a22bfc by (0x61f0e4bc), the variant byte BSS in the lab: table 0, which leaves
    // the three alone), its words are (0x600251f4)[pin]: 0x9b80092c, 0x9b800b8c, 0x9b800bac, the level in bit 4 and the
    // output in bit 0 as on E143 (0x500020f3, 0x5004c5ad), and pin 77's slot (0x600258e0)[77] = 67 is a group slot: record 0x600259b4 +
    // 32 x 67 = {77, its pin word, IRQ 40, the group handler, status 0x9b801e4c, enable 0x9b801f28, type-0 bit 0x40,
    // type-1 bit 0x80}, the words shared with the group's other pins (D); the message line is port 3, the word 0x64
    // (the port byte reader 0x50048fbd reads bit 31 of 0x58..0x68, D)
    board: {
      family: 'E144', scpu: { ticks: true, message: 0x64 },
      scpu_link: {
        ready: { pin: 77, word: 0x9B800BAC, status: 0x9B801E4C, enable: 0x9B801F28, bits: [0x40, 0x80], irq: 40, shared: true },
        request: { pin: 76, word: 0x9B800B8C },
        reset: { pin: 57, word: 0x9B80092C },
      },
    },
    // the map from E144 pairs 7.29M instructions with 14 conflicts, the one from E143 2.18M with 110 (X: port.json
    // port_via.map and map, bin/port.mjs)
    port_via: 'E144',
    // E144's knobs this body takes through that map (src/fw/knobs.mjs; src/fw/ports.mjs KNOBS)
    carry: ['cflush_returns', 'block_save'],
    // the device open's interrupt wait (its timeout's errlog 0x37005206 expected, src/lab/display.mjs
    // EXPECTED_ERRLOG): IRQ 88 (0x5018b4dc), called at 0x501827eb, the code at 0x50182800 (D)
    g4set: G4SET_UNCHECKED,
    // the SCPU's backed-up words the firmware writes and reads, [index, byte], and its writes without data or an
    // answer (src/lab/scpudev.mjs S-SCPUDEV; E143's [2, 0] and none): the time-zone record's write and read wrappers
    // at 0x50051013 and 0x50051020 pass index 2, byte 0 (D); port_scan false: no port-scan request of E143's shape
    // in the image (X: a byte scan for 0x5005d36a's head finds none; its sub-CPU is another lineage, with keys)
    scpu: { words: [[2, 0]], quiet: [], port_scan: false },
    overrides: {
      '0x5005b424': { to: '0x50051e16', why: 'PER_SCPU\'s task entry (src/lab/scpulink.mjs PER_SCPU_TASK), which the map from E144 (whose PER_SCPU differs) pairs with a generic table walker at 0x50051cbc: 0x50051e16 runs the reset check 0x5005360d (pin 57 pulsed when the cause is 0 or 8) and the init 0x50051eb2 (block flag, the IRQ 320 callback, pin 77\'s mode, handler and enable, pin 76 = 1, the 0x85 {2} send 0x5005364e), then loops on PER_SCPU_RECEIVE through the table machine with event 11 deferred outside states 0 and 2 (0x50051e25..0x50051e8b), as E143\'s 0x5005b424 (D)' },
      '0x50002b5d': { to: '0x500022c3', why: 'the GIO init\'s slot reset (src/lab/scpulink.mjs GIO_SLOTS), which the map places inside another function (0x50001e0e): 0x500022c3 writes 255 and five zero words to each of the 232 slot states from 0xa26bb79c, the free mark the mode function 0x5004c5ee takes a slot by (0x5004c948), as E143\'s 0x50002b5d for its 325 (D)' },
      '0x5014e374': { to: '0x5011080a', why: 'the joystick decoder publish return, as the map from E143 places it (E144 has no joystick and gives null): the UI_IN code has E143\'s branch on 0x1235/0x1234 (D cmp at 0x50110999/0x501109a5 and 0x50110a59/0x50110a65, E143 0x5014c07a/0x5014c086 and 0x5014c13a/0x5014c146), and 0x501107fe..0x5011080a is E143\'s 0x5014e368..0x5014e374, the call of the publisher 0x500257d0 with d1 0, a0 0 (D; play)' },
    },
  },
  E134: {
    name: 'E-M1X', bin: 'OLY_E_134_2400_0000_0000.BIN', version: '2.4', res_block: 'blk01a00000.OE.0101.bin', checked: true,
    rom_len: 27262912, rom_sha256: '7b0d72f88cfed079c6e3367a910856f9e4f69bc9e020f9c06d7ed0980bd66d3f',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x600210f9,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 22175200, res_sha256: '1b390ea79011cf8a4946344c909078b320f8dc46000ab9f07018b8e0c76e9176',
    // TFT 1.037M dots, EVF 2.36M dots
    panels: { tft: [720, 480], evf: [1024, 768] },
    // UI_OUT, the module of the camera's lamps (src/lab/play.mjs H-UIOUTSTART; D unless tagged): the boot calls its
    // init 0x5010cb57 after its checkpoint "2_9" (0x50180afd), then starts the task whose id is the halfword
    // 0x600413fa (41; the static row of task 41 at 0x500180a8 holds the entry 0x5010cbda) and names it "UI_OUT"
    // (0x50180b04..0x50180b18). The lamp request 0x5010c328 ({lamp id, u16, word}; the id checked through the table
    // 0x5010caa2 reads) sends a 44-byte message to the queue of the halfword 0x6004192e (117), which the init sets up
    // (0x5010cb61), with no timeout (0x50030432(queue, -1) at 0x5010c35f). X: with the init and the task run, the task
    // waits, and a session's 72 lamp requests to the shooting screen, S2 and PLAY all complete
    ui_out: { init: 0x5010CB57, task: 0x5010CBDA },
    // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card), since UI_OUT runs: E134's file
    // layer asks for the card's access lamp around its accesses (0x5066dea4: lamp 6, 0xffff and 500 to start, 0 to
    // stop, I: a blink of 500 ms; from the file layer's 0x50648255, 0x506483cf, 0x5064840c, 0x50648540, 0x50648562 and
    // 0x506595b8), and with UI_OUT not run the 54th send blocked FILECLBK in S-RECFILE's first fopen (X: 53 sends, no
    // read in 10 s of lab time). E143's and E144's file layers make no such request (X). Its HLS media side by the
    // rule as E144's (hls 'rule', X: test/test_storage.mjs --hls)
    card_fs: { native: true, hls: 'rule' },
    // REC_FILE natively, at the addresses src/fw/facts.mjs recFileQueue reads (X: test_storage's S2 file, its Exif
    // Model 'E-M1X')
    rec_native: true,
    // the SCPU clock ticks, as on E143 (src/fw/board.mjs: the family's stands still): its start, S1 and S2 run as with
    // the clock standing still (X: bin/modelcheck.mjs). The sub-CPU link (src/dev/linkpins.mjs, src/lab/scpulink.mjs):
    // its PER_SCPU is E143's but for its pins, ready 77, request 76 and reset 57 (0x500528ac..0x500528b7, 0x50053fad, D); the GIO driver maps a
    // pin through the board variant's remap table (0x61c2299c by (0x6214512c), the variant byte BSS in the lab: table 0, which leaves
    // the three alone), its words are (0x60024054)[pin]: 0x9b80092c, 0x9b800b8c, 0x9b800bac, the level in bit 4 and the
    // output in bit 0 as on E143 (0x5004cfb1), and pin 77's slot (0x60024740)[77] = 67 is a group slot: record 0x60024814 +
    // 32 x 67 = {77, its pin word, IRQ 40, the group handler, status 0x9b801e4c, enable 0x9b801f28, type-0 bit 0x40,
    // type-1 bit 0x80}, the words shared with the group's other pins (D); the message line is port 3, the word 0x64
    // (the port byte reader 0x500486b8 reads bit 31 of 0x58..0x68, D)
    board: {
      family: 'E144', scpu: { ticks: true, message: 0x64 },
      scpu_link: {
        ready: { pin: 77, word: 0x9B800BAC, status: 0x9B801E4C, enable: 0x9B801F28, bits: [0x40, 0x80], irq: 40, shared: true },
        request: { pin: 76, word: 0x9B800B8C },
        reset: { pin: 57, word: 0x9B80092C },
      },
    },
    // the map from E139 pairs 8.12M instructions with 34 conflicts, the one from E144 5.88M with 47; through E139, 106
    // of the overrides carry, 15 against the direct map's answer and 11 fail, through E144 102, 22 and 16 (X: port.json
    // port_via.map, carried, carry_failed, bin/port.mjs with each; since the frame-wait knob left the seeds and E144's
    // rule-placed overrides went, through E139 102, 13 and 10, X). None of E139's knobs carries: the block save's
    // function and the calls before the cache flush's and the DISPLAY send's returns are not paired (carryKnob, X; the
    // DISPLAY sends are read by a rule since, src/fw/facts.mjs displaySends)
    port_via: 'E139',
    g4set: G4SET_UNCHECKED,
    // the SCPU's backed-up words the firmware writes and reads, [index, byte], and its writes without data or an
    // answer (src/lab/scpudev.mjs S-SCPUDEV; E143's [2, 0] and none): the time-zone record's write and read wrappers
    // at 0x5005239a and 0x500523a7 pass index 23, byte 0 (D); the dial init sends 0x21 with no data, no
    // completion and nothing waiting for it (0x50109328..0x50109342, D; its meaning is ?); port_scan false: no
    // port-scan request of E143's shape in the image (X: a byte scan for 0x5005d36a's head finds none)
    scpu: { words: [[23, 0]], quiet: [0x21], port_scan: false },
    overrides: {
      '0x5005b424': { to: '0x500527ef', why: 'PER_SCPU\'s task entry (src/lab/scpulink.mjs PER_SCPU_TASK), which neither map places right: 0x500527ef runs the reset check 0x50053f90 (pin 57 pulsed when the cause is 0 or 8) and the init 0x5005288b (pins 77 and 76 as E139\'s, the 0x85 {2} send 0x50053fd1), then loops on PER_SCPU_RECEIVE through the table machine (0x500527fe..0x50052864), as E139\'s 0x50051e16 and E143\'s 0x5005b424 (D)' },
      '0x50002b5d': { to: '0x50001ce5', why: 'the GIO init\'s slot reset (src/lab/scpulink.mjs GIO_SLOTS), which neither map places: 0x50001ce5 writes 255 and five zero words to each slot state from 0xa28a1e30, the free mark the mode function 0x5004cff0 takes a slot by, as E139\'s 0x500022c3 (D)' },
      '0x50023bab': { to: '0x5021050d', why: 'the EVF vtotal getter (display.mjs DEVICE.evf), which neither map places (E139\'s is the direct map\'s alignment 0x50021641): after the retf at 0x5021050a, `movbu (0x62316834),d1; mov 819,d2; cmp 1,d1` with 787 for mode 1 and 900 for a 20000 us period read through 0x50210666, as E139\'s 0x50021641 (D)' },
      '0x5014b7c7': { to: '0x501092da', why: 'the dial init (menu.mjs DIAL_INIT), which neither map places: like E143\'s it selects the board\'s dial table (src/fw/facts.mjs dialStore) and clears the dial counters, the 16-byte slots from 0xa28b9ecc, the map\'s DIAL_COUNTERS (0x501092f7..0x50109327), after a call of 0x501091eb, which clears ten bytes from 0xa28b9f10 and the three after them; then it posts a message through 0x50053de3 (0x50109342), which E143\'s does not; its one caller is 0x50108d5f (D)' },
    },
  },
  E137: {
    name: 'E-M5 III', bin: 'OLY_E_137_1700_0000_0000.BIN', version: '1.7', res_block: 'blk017e0000.OE.0101.bin', checked: true,
    rom_len: 25034688, rom_sha256: '4097f57751ac30c24589448865b2824891a754744eae63ab14359fd46c1cf4be',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x600210f9,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 24465888, res_sha256: '4d0643ac1b46c33c074f5fad669d197c80a62d9590586904e68a53379ff9712f',
    // TFT 1.037M dots, EVF 2.36M dots
    panels: { tft: [720, 480], evf: [1024, 768] },
    // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card); its HLS media side by the rule
    // as E144's (hls 'rule', X: test/test_storage.mjs --hls)
    card_fs: { native: true, hls: 'rule' },
    // REC_FILE natively, at the addresses src/fw/facts.mjs recFileQueue reads (X: test_storage's S2 file, its Exif
    // Model 'E-M5MarkIII')
    rec_native: true,
    board: { family: 'E144' },
    // the map from E144 pairs 7.94M instructions with 107 conflicts, the one from E139 7.43M with 99; through E144, 119
    // of the overrides carry (66 not null), 14 against the direct map's answer and 12 fail, through E139 109 (64), 15
    // and 8 (X: port.json port_via.map, carried, carry_failed, bin/port.mjs with each; through E144 116 (63), 13 and 12
    // since three of E144's overrides went to rules, X). E144 is taken: E137 has its board traits where E139's differ
    // (no SCPU backup, font limit 0x9fc00; src/fw/ports.mjs FACTS) and its EVF code (the vtotal getter `mov 825,d0;
    // retf` 0x50020f74 and the period setter 0x50021078, as E144's 0x5002183a and 0x5002193e, D). None of E144's knobs
    // carries: the calls before the DISPLAY send's and the cache flush's returns and the block save's function are not
    // paired (carryKnob, X; the DISPLAY sends are read by a rule since, src/fw/facts.mjs displaySends)
    port_via: 'E144',
    g4set: G4SET_UNCHECKED,
  },
  E142: {
    name: 'E-P7', bin: 'OLY_E_142_1100_0000_0000.BIN', version: '1.1', res_block: 'blk01900000.OE.0101.bin', checked: true,
    rom_len: 26214336, rom_sha256: '5dd9af164b4590c7e82f6905c919b3cc450bb58f2d5742ab2a0e3a4eb2e26190',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x600200f9,a0; jmp (a0) (D)
    image_base: 0x60020020,
    res_len: 22091232, res_sha256: '61d008779b2952a50936d58aa45390a7b1e918f4edcd49f20b3c82d235dac9da',
    // TFT 1.037M dots; no EVF
    panels: { tft: [720, 480], evf: null },
    // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card); its HLS media side by the rule
    // as E144's (hls 'rule', X: test/test_storage.mjs --hls)
    card_fs: { native: true, hls: 'rule' },
    // REC_FILE natively, at the addresses src/fw/facts.mjs recFileQueue reads (X: test_storage's S2 file, its Exif
    // Model 'E-P7')
    rec_native: true,
    board: { family: 'E144' },
    // the map from E144 pairs 3.47M instructions with 116 conflicts, the one from E139 4.63M with 115, the one from
    // E137 3.92M with 141; through E144, 116 of the overrides carry (63 not null), 16 against the direct map's answer
    // and 10 fail, through E139 108 (63), 17 and 3, through E137 128 (65), 14 and 4 (X: port.json port_via.map,
    // carried, carry_failed, bin/port.mjs with each). E144 is taken: E142 has its board traits where E139's differ (no
    // SCPU backup: through E144 the four SCPU wait words stay null, through E139 they take the direct map's places,
    // src/fw/ports.mjs FACTS), and E144's get_still_info dump site carries to E142's createDate.year trace at
    // 0x50760ab2, where through E139 it lands on the WBMode trace 0x50760cc9 (D). Through any of the three the touch
    // panel's I2C write and read are E144's (0x5016c8bc, 0x5016cbe8: E144's 0x5018aab3 and 0x5018adf3 instruction for
    // instruction, D), which the map from E143 does not place (it gave the write 0x5016c69f, a reader of the
    // controller's register 0x1c14, D)
    port_via: 'E144',
    // the device open's interrupt wait (its timeout's errlog 0x37005206 expected, src/lab/display.mjs
    // EXPECTED_ERRLOG): IRQ 120 (0x5016c6d5), called at 0x50164055, the code at 0x5016406a (D); reached, X
    // the shared stand-in (G4SET_UNCHECKED); start and S1 run with it (X)
    g4set: G4SET_UNCHECKED,
  },
  E140: {
    name: 'E-M10 IV', bin: 'OLY_E_140_1100_0000_0000.BIN', version: '1.1', res_block: 'blk01900000.OE.0101.bin', checked: true,
    rom_len: 26214336, rom_sha256: '5f2bfb367a7d65278fae1338bb10181ca8de8ebbd9a83f9e89bec4db9ade1fa5',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x600200f9,a0; jmp (a0) (D)
    image_base: 0x60020020,
    res_len: 21919200, res_sha256: '483aa7d7b8b64f11d851f5e9083ceea479b22905f0b338ff9229600e5d315aa6',
    // TFT 1.037M dots, EVF 2.36M dots
    panels: { tft: [720, 480], evf: [1024, 768] },
    // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card); its HLS media side by the rule
    // as E144's (hls 'rule', X: test/test_storage.mjs --hls)
    card_fs: { native: true, hls: 'rule' },
    // REC_FILE natively, at the addresses src/fw/facts.mjs recFileQueue reads (X: test_storage's S2 file, its Exif
    // Model 'E-M10MarkIV')
    rec_native: true,
    board: { family: 'E144' },
    // the map from E142 pairs 6.56M instructions with 81 conflicts, the one from E144 3.49M with 111; through E142, 134
    // of the overrides carry (60 nulls) and none fails, through E144 118 (53) and 8 fail (X: port.json port_via.map,
    // carried, carry_failed, bin/port.mjs with each). The two ports give the same places but for three E143 addresses
    // that through E142, which has no EVF, stay unplaced: the eye-state compare 0x501e806c, which through E144 lands on
    // E140's `cmp 2,d0` after its eye reader 0x5004847f, at 0x5016fe49 (D); the eye-state setter 0x50050efd, which
    // through E144 is filled at 0x500487de, a loop of `calls (a0)`, not a setter (D; E140's stores its eye word
    // (0xa2717360) at 0x5004869b in another shape than E144's 0x5004a521, D); and the YCbCr conversion 0x501db1c8
    // (through E144 0x50165945, not checked). E142 is taken; the eye state's two addresses are open on E140
    port_via: 'E142',
    // the device open's interrupt wait (its timeout's errlog 0x37005206 expected, src/lab/display.mjs
    // EXPECTED_ERRLOG): IRQ 120 (0x5016c5a4), called at 0x50163fee, the code at 0x50164003 (D); reached, X
    // the shared stand-in (G4SET_UNCHECKED); start and S1 run with it (X)
    g4set: G4SET_UNCHECKED,
  },
  E125: {
    name: 'E-M1 II', bin: 'OLY_E_125_3700_0000_0000.BIN', version: '3.7', res_block: 'blk01600000.OE.0101.bin', checked: true,
    rom_len: 23068608, rom_sha256: '0a41fb8e1105751f7817e5664f2edf2a1bdf399f070e91b4e3c84e6943113803',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x600210f9,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 23330784, res_sha256: 'bd25f933ce5572b799776b5eaadc11876cd096e78a4182c71cebc44649ad386e',
    // TFT 1.037M dots, EVF 2.36M dots
    panels: { tft: [720, 480], evf: [1024, 768] },
    // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card); its HLS media side by the rule
    // as E144's (hls 'rule', X: test/test_storage.mjs --hls)
    card_fs: { native: true, hls: 'rule' },
    // REC_FILE natively, at the addresses src/fw/facts.mjs recFileQueue reads (X: test_storage's S2 file, its Exif
    // Model 'E-M1MarkII')
    rec_native: true,
    board: { family: 'E144' },
    // the map from E134 pairs 4.22M instructions with 28 conflicts, the one from E139 3.85M (37), from E144 4.72M
    // (51); through E134 108 of the overrides carry (54 nulls) and 7 fail, 60 lab addresses stay unplaced, through
    // E139 96 (45), 13 and 60, through E144 104 (53), 20 and 68 (X: port.json port_via.map, carried, carry_failed,
    // unmapped, bin/port.mjs with each). All three place the kernel tick init (0x50034f34) and the TFT vtotal function
    // (0x5022aaa8); only through E134 is the EVF vtotal function placed at its entry, 0x501729ab `movbu (0x6223ab28),d1;
    // mov 787,d0; cmp 1,d1` as E139's 0x50021641 (through E139 0x501729a6, a `mov 1,d0; retf` before it, through E144
    // 0x501729e0, inside it, D). E134 is taken
    port_via: 'E134',
    // three of the IMG_PRECON init's callees, which src/lab/take.mjs names in comments only (nothing on E125 reads
    // them): pinned so a re-port's seed set cannot move them again (c1e2e0c's did). E143's call row after the init's
    // `ret [],4` at 0x502a49e9 is 0x501504c0 [],0, 0x501529dc [],4, 0x5015368b [],0, 0x50154a12 [],4, 0x50150f69
    // [],4, 0x50154704 [d2,a2],12, 0x50152f4c [],4, then if d0 is 0 0x50152495 [],4; E125's after 0x501fb8ce is
    // 0x5010499d, 0x50107530, 0x501087df, 0x5010a0f6, 0x50104f54, 0x5010563f, 0x50109de9 [d2,a2],12, 0x50107d07 [],8,
    // then 0x50106e75 (D). 0x50150f69 (a 10064-byte clear and an allocation) matches neither 0x50104f54 nor 0x5010563f
    // (two-call stubs) and stays the map's
    overrides: {
      '0x50154704': { to: '0x50109de9', why: 'the call row\'s [d2,a2],12 callee: E143\'s `mov 115,d1; mov 128,d0; ...; call` allocation, `mov a0,(G); clr d0; movbu d0,(a0); call; mov (G),a0; mov d0,(4,a0); mov 1,d0; call` is E125\'s 0x50109de9 from its `mov 128,d0` on, the same tail (D; the map gave the stub 0x5010563f, `clr d0; mov d0,(G); call; ret`)' },
      '0x50152f4c': { to: '0x50107d07', why: 'the callee after the [d2,a2],12 call: E143\'s allocation and store `mov imm,d0; call alloc [d2,d3,a2],28; mov a0,(G); clr d0` has the shape of E125\'s 0x50107d07 `mov 136,d0; call 0x501075b7,[d2,d3,a2],28; mov a0,(G); clr d0` at the same place in the row (D; the map gave 0x50109de9, the row\'s [d2,a2],12 callee)' },
      '0x50152495': { to: '0x50106e75', why: 'the row\'s conditional callee (d0 0): E143\'s `mov imm,a0; clr d0; mov 4,d1; call ...,[d2,a2],8` is E125\'s 0x50106e75 `mov imm,a0; clr d0; mov 8,d1; call ...,[d2,a2],8` (D; the map gave 0x50106e66, the helper `add 500,d0; mov 1000,d1; ...; divu` that ends just before it, which the init never calls)' },
    },
    // the shared stand-in (G4SET_UNCHECKED)
    g4set: G4SET_UNCHECKED,
    extra_tasks: [
      0x5078D50B,   // OlyHfwBatteryManager's thread ("thread_entry()"), which its init creates (priority 54, stack 1792,
                    // 0x5078d2ba..d3) and starts in the camera application's start (S-CAMAPP, X); E143 has no battery
                    // manager (no "OlyHfwBatteryManager" string, X)
    ],
    // S-CARD's mount test (src/lab/camapp.mjs): E125's DCF remain count 0x505f49ad tests the drive status 0x5061cb03
    // returns for its error bits only, `btst 63,d0; mov 1,d1; beq` at 0x505f49d0, where E143's (0x5087d7dc) goes on
    // only with the mount bit 0x1000 set too, `btst 4096,d1; bne` at 0x5087d80a, the status's bit 12 copied from the
    // device state's bit 16 (0x508a83e7; E125's 0x5061cbb5, D). The lab's drive status is 0x8600 on both (X), so
    // getMovieTimeInMedia's count (from 0x502de73d, E143's from 0x503f1bcd) returned on E143 and on E125 counted the
    // free clusters of drive 0's volume, null in the table 0x622907d4, and divided by its zero cluster field at
    // 0x505feaf0 (X). Of the 16 bodies scanned only E125's count lacks a second test (E129's tests bit 0x80, E145's
    // and E132's `and` the error mask before `btst 4096`; X, a byte scan of the expanded images for the count's
    // property reads 0xf021, 0xf051 and the tests before them). With it the count takes its own not-mounted return
    // (its type-4 call 0x5031a8d0, as E143's 0x5087e9f5, then 0) and the start goes on (X)
    dcf_mount_test: { at: 0x505F49D0, reg: 'd0' },
  },
  E145: {
    name: 'TG-7', bin: 'OLY_E_145_1103_0000_0000.BIN', version: '1.1', res_block: 'blk01380000.OE.0101.bin', checked: true,
    rom_len: 20447168, rom_sha256: 'e52660cc0aad6057831d15f721c5d4bd159fc728cdbf78772a35ec11c33e8c47',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x600210f9,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 13577184, res_sha256: '5404cb456e2f5cddb7fa1ace6fa3210b6b2ea3e55908d71c3140434880b7fd98',
    // TFT 1.04M dots; no EVF
    panels: { tft: [720, 480], evf: null },
    card_fs: { native: true },   // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card)
    board: { family: 'E144' },
    // the map from E142 pairs 2.01M instructions with 121 conflicts, the one from E140 2.17M (116), from E144 1.83M
    // (117); through E142 120 of the overrides carry (60 nulls) and 14 fail, 77 lab addresses stay unplaced, through
    // E140 120 (60), 15 and 79, through E144 106 (53), 20 and 80 (X: port.json port_via.map, carried, carry_failed,
    // unmapped, bin/port.mjs with each). Through E142 the DB init and its flash save return are placed (0x5028eb02,
    // 0x5028eb32), through E140 and E144 not; none of the three places the touch I2C functions, which E145 lacks
    // (src/fw/facts.mjs touchDriver). E142 is taken
    port_via: 'E142',
    // the shared stand-in (G4SET_UNCHECKED)
    g4set: G4SET_UNCHECKED,
  },
  E133: {
    name: 'E-PL9', bin: 'OLY_E_133_1101_0000_0000.BIN', version: '1.1', res_block: 'blk01900000.OE.0101.bin', checked: true,
    rom_len: 26214336, rom_sha256: '8e39c335d54fd8ddea189db82fe708159f43f9995bba42c2cd47dd22b8814267',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x604000f9,a0; jmp (a0) (D)
    image_base: 0x60400020,
    res_len: 21456352, res_sha256: 'd777456e3c2e41db6a55458cb8ec37d1a6589391f8103b3ec38be7cae59aaa43',
    // TFT 1.037M dots; no EVF
    panels: { tft: [720, 480], evf: null },
    card_fs: { native: true },   // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card)
    // REC_FILE natively, as E130's (src/fw/facts.mjs recFileInline; X: test_storage's session, 2026-11-11)
    rec_native: true,
    board: { family: 'E144' },
    // the map from E143 pairs 1.04M instructions; from E142 2.24M with 122 conflicts, from E140 2.35M (120), from E125
    // 5.20M (84), from E145 2.04M (79); through E142 120 of the overrides carry (60 nulls) and 12 fail, through E140
    // 120 (60) and 13, through E125 131 (60) and 3, through E145 133 (72) and 6 (X: port.json port_via.map, carried,
    // carry_failed, bin/port.mjs with each). Through E142 and E140 the start runs to the session's touch start, through
    // E125 it stops at the settings store's unplaced init (E143 0x503c5473; X, the tft child with each). E142 is taken
    port_via: 'E142',
    // the shared stand-in (G4SET_UNCHECKED)
    g4set: G4SET_UNCHECKED,
  },
  E130: {
    name: 'E-M10 III', bin: 'OLY_E_130_1200_0000_0000.BIN', version: '1.2', res_block: 'blk01900000.OE.0101.bin', checked: true,
    rom_len: 26214336, rom_sha256: '8c3099214a3ec1aa29a9058997c4472072bdeddda8c8df93ec707d7a0bc31eb9',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x604000f9,a0; jmp (a0) (D)
    image_base: 0x60400020,
    res_len: 21476832, res_sha256: 'a21935005597087e0a43f0a99cee28376c142a4e55339d76ab2ed8286228cb15',
    // TFT 1.037M dots, EVF 2.36M dots
    panels: { tft: [720, 480], evf: [1024, 768] },
    // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card); its HLS media side by the rule
    // as E144's (hls 'rule', X: test/test_storage.mjs --hls)
    card_fs: { native: true, hls: 'rule' },
    // REC_FILE natively (src/lab/rec.mjs; src/fw/facts.mjs recFileInline: the REC version before the E144 family's;
    // X: test_storage's session, 2026-11-11)
    rec_native: true,
    board: { family: 'E144' },
    // the map from E143 pairs 1.02M instructions; from E142 2.11M with 45 conflicts, from E140 2.15M (47), from E145
    // 1.98M (71); through E142 118 of the overrides carry (60 nulls) and 14 fail, through E140 117 (60) and 16, through
    // E145 133 (72) and 6 (X: port.json port_via.map, carried, carry_failed, bin/port.mjs with each). Through E142 and
    // E140 the start runs to the session's touch start, through E145 it stops before, at the settings store's unplaced
    // init (E143 0x503c5473; X, the tft child with each). E142 is taken
    port_via: 'E142',
    // the shared stand-in (G4SET_UNCHECKED)
    g4set: G4SET_UNCHECKED,
    // the AF module's OSD upload (camapp.mjs S-AFOSD), which neither map places, was a hand override here until the
    // rule framePlane (src/fw/facts.mjs) placed it at the same 0x50022dd8, the plane's mode-3 upload (2026-10-29)
  },
  E129: {
    name: 'TG-5', bin: 'OLY_E_129_1101_0000_0000.BIN', version: '1.1', res_block: 'blk01900000.OE.0101.bin', checked: true,
    rom_len: 26214336, rom_sha256: 'a57f3d72282b2f923bcc38e53f1159f51af708c219e065986936064ca4cf93a5',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x604000f9,a0; jmp (a0) (D)
    image_base: 0x60400020,
    res_len: 17276384, res_sha256: '110a674b5dfe8d127eb241b24c4cb60a5675ce14a1d435687a53eb36c6663f1b',
    // the vendor's specification gives the TFT as 460K dots, not its pixel geometry (I: unchecked); no EVF
    panels: { tft: null, evf: null },
    card_fs: { native: true },   // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card)
    // REC_FILE natively, as E130's (src/fw/facts.mjs recFileInline; X: test_storage's session, 2026-11-11)
    rec_native: true,
    // the family's stub pages and the serial controllers' blocks of channels 9, 2 and 3, as E132's (its sessions write
    // those blocks and no other, X)
    board: { family: 'E144', stub_pages: [0x98800000, 0x98F20000, 0x9A200000, 0x9B800000, 0x9B801000, 0x9BC00000, 0x9BD00000, 0x9A100000, 0x98500000, 0x98600000] },
    // the map from E143 pairs 0.94M instructions; from E145 2.61M with 33 conflicts, from E142 1.76M (129), from E140
    // 1.84M (117); through E145 137 of the overrides carry (72 nulls) and 2 fail, through E142 116 (60) and 16, through
    // E140 117 (60) and 16 (X: port.json port_via.map, carried, carry_failed, bin/port.mjs with each). Through E142 and
    // E140 the display start stops at E143's EVF frame period word, which neither places (this TG-5 has no EVF),
    // through E145 (TG-7, no EVF either) it runs past it (X, the tft child with each). E145 is taken
    port_via: 'E145',
    // the shared stand-in (G4SET_UNCHECKED)
    g4set: G4SET_UNCHECKED,
    // PER_SIO's devices the lab has (src/lab/sio.mjs S-SIOIIC): the internal charger on channel 9 (S-CHARGER,
    // src/lab/charger.mjs), as E132's: its start writes register 1 and reads it back over the same transfers (X)
    sio_devices: [{ channel: 9, device: 'charger' }],
  },
  E132: {
    name: 'TG-5 (KOUICHIRO)', bin: 'OLY_E_132_1300_0000_0000.BIN', version: '1.3', res_block: 'blk01900000.OE.0101.bin', checked: true,
    rom_len: 26214336, rom_sha256: 'e3ecb52bb83d376ff97b2543293e7a20c44490671fae5c1ebad327c8584c09f7',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x604000f9,a0; jmp (a0) (D)
    image_base: 0x60400020,
    res_len: 18550240, res_sha256: 'd0fa5807f2e4fbbf384b464082c35a9a59355c12fb73830987d15d08d4b162bc',
    // a TG-5 (the reply's model_name TG-5(KOUICHIRO)): its TFT of 460K dots, no geometry given; no EVF
    panels: { tft: null, evf: null },
    card_fs: { native: true },   // the card's file system natively (src/lab/storage.mjs; X: modelcheck's card)
    // the family's stub pages (src/fw/board.mjs FAMILIES.E144) and the register blocks of the serial controllers its
    // channels use once PER_SIO's channel map is set (H-SIOMAP, src/lab/sio.mjs): channel map 0x604aa840 (core 0's,
    // the setter's table 0x604aa830 / 0x604aa86c), channel 9 -> index 7, 2 -> index 2 and 3 -> index 3, and the
    // driver's register table 0x604aa1a8 (132 bytes an index): index 7's registers at 0x9a100000.., index 2's at
    // 0x98500000.., index 3's at 0x98600000.. (D). The driver's configurations write them; the transfers on channel 9
    // are S-SIOIIC's, on channel 2 the panel's, on channel 3 the IIC bus driver's (the compass's and the
    // accelerometer's, whose waits S-IICWAIT answers) (I: the pages keep what is written, as the family's)
    board: { family: 'E144', stub_pages: [0x98800000, 0x98F20000, 0x9A200000, 0x9B800000, 0x9B801000, 0x9BC00000, 0x9BD00000, 0x9A100000, 0x98500000, 0x98600000] },
    // as E129, a TG-5 whose main block has E129's size and base: E145 is taken; the map from E145 pairs 2.68M
    // instructions with 20 conflicts, 137 of the overrides carry (72 nulls) and 2 fail (X: port.json port_via.map,
    // carried, carry_failed); the other references were not measured
    port_via: 'E145',
    // the shared stand-in (G4SET_UNCHECKED)
    g4set: G4SET_UNCHECKED,
    // PER_SIO's devices the lab has (src/lab/sio.mjs S-SIOIIC): the internal charger on channel 9 (S-CHARGER,
    // src/lab/charger.mjs), which the charger init 0x5003fa04 configures (0x5003fa27: channel 9 at 400 kHz, D) and the
    // camera application's start writes and reads back (X). The charger request 0x5003fa92: its table of register
    // values 0x5003fb04..0x5003fb84, the address bytes 0x36 at 0x5003faeb and 0x37 at 0x5003fc2b, the read-back test
    // 0x5003fc70..7e (a mismatch to the error path 0x5003fe6e(2)), the type-2 read 0x5003fc87..0x5003fd12, the
    // completion waits' errlogs 0x1d003003 / 0x1d003004; the IIC layer's write 0x5004ba70 and write-read 0x5004bac8
    // (its restart list through 0x5004ba5c -> 0x500505e1 mode 2) start the driver's 0x500506cb and 0x500509be with a1
    // 0 (the polled path 0x50050821), and the interrupt's ends 0x50051719..0x50051770 and 0x500519f2..0x50051a84
    // dispatch through 0x50051814 (D)
    sio_devices: [{ channel: 9, device: 'charger' }],
    // module queues of its API target table (0x608542fc, by target) that E143's has no counterpart of, which S-MODACK
    // answers as it answers E143's (src/lab/camapp.mjs module_queues): target 38 -> 0xe6 and 43 -> 0xdf, named
    // CATEGORY_MAIN and LOGGER_MAIN in the object-name table (name[24] + u16 id, their records at 0x512ef790 and
    // 0x512ef6da, D). Their tasks do not run in the lab. CATEGORY_MAIN: the start's error factor check (0x50be0796,
    // setErrorFactor) asks isCategoryUpdate first (0x50be13b8), which on this body (an industrial TG-5,
    // OlyHfwOpeIndustrial, the CALS quality) is a real check: the synchronous DISPLAY cmd 43 (0x5029c9e9 ->
    // 0x50299470), whose status 0 reads as "update" (the DISPLAY loop's reply word (36,sp), cleared at 0x501ecf4f, is
    // not set by cmd 43's handler 0x501ed607, D; that the send returns it, I); so the start shows "Update folder
    // Allocation"'s progress screen (factor 22 -> request 267 -> GUI 0x10c, "Busy") and updateCategoryInfo
    // (0x50710d83) posts its request to CATEGORY_MAIN (D; E145 has the same check as a stub that returns 0,
    // 0x50743489, D). Without the answer the screen stayed (X). LOGGER_MAIN: its request is posted at the start;
    // without the answer the session stopped after the clock was set, the application's queue 6 full (X; why is ?);
    // it no longer stops without it (X, 2026-11-10: three of its queue's four messages held; docs/hle-gaps.md 4.3.2)
    modack_queues: [[0xE6, 'CATEGORY_MAIN'], [0xDF, 'LOGGER_MAIN']],
  },
  E118: {
    name: 'E-M5 II', bin: 'OLY_E_118_4100_0000_0000.BIN', version: '4.1', res_block: 'blk01460000.OE.0101.bin', checked: true,
    rom_len: 21364672, rom_sha256: 'ecd9603c4a264a358d91ef110a05f9236055e6369399f7c7de5985b21a2fd96a',
    // the reset head's jump into the run-time copy at 0x500000d1: mov 0x60021114,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 19291104, res_sha256: 'b1e448561edfc9c56a08fd5fa5c3d6307fc4741149bb40d951940e82364ccc5f',
    // TFT 1.037M dots, EVF 2.36M dots
    panels: { tft: [720, 480], evf: [1024, 768] },
    // the card native since 2026-10-30 (docs/model-survey.md finding 50): its SD driver switches a card line through
    // the sub-CPU (src/lab/storage.mjs S-SDSWITCH) and its movie record time divides by the movie info's frame rate,
    // 0 before a movie take (src/lab/camapp.mjs S-MOVRATE, docs/model-survey.md finding 59); the blank 8 GiB card
    // formatted FAT32 'NO NAME' at 8192 with 32 KiB clusters, 2116 shots and 0:37:19 from it, S2's file read back (X:
    // bin/modelcheck.mjs, the OSD records); its HLS media side read by the rule as E122's (hls 'rule', X:
    // test/test_storage.mjs --hls)
    card_fs: { native: true, hls: 'rule' },
    // REC_FILE records S2's file natively, its header the header maker's (X: test_storage's S2 file, its Exif Model
    // 'E-M5MarkII', the firmware's count and directory entry; docs/model-survey.md finding 146)
    rec_native: true,
    board: { family: 'E118' },
    // through E122 (port_via): the family's reference, whose overrides it takes over (the evidence at E122's entry)
    port_via: 'E122',
    // as E122's (src/fw/models.mjs E122, the evidence there): the reset path's early driver inits, the table walk
    // 0x50065a9d (called at 0x50000293; the same code as E122's 0x50062ed4, X: twin.mjs bytes with the calls and addresses
    // masked), no disp_sync module ("disp_sync_work" absent, X), the frame period assumed (A-PERIOD; the rule reads no
    // period word on it either, src/fw/facts.mjs framePeriod null, X)
    boot_drivers: 0x50065A9D,
    disp_sync_init: false,
    frame_period_us: { tft: 16683, evf: 16683 },
    // the dial init 0x5016558b takes one fixed id table, 0x601b1e58 (`mov 0x601b1e58,d0` for its slot set-up from 0xa1c184a8), with
    // no board select and no table pointer (D): src/lab/menu.mjs dial_init runs it alone
    dial: { table_ptr: null, table0: 0x601B1E58 },
    // E122's display task (src/fw/models.mjs E122): the static task table's row 0x51, whose entry word (image offset
    // 0x18f70, as on E122 and E120) holds 0x602f3fed (D), which the display task init starts (X: the kernel's start of
    // it from that step); the same opening as E122's 0x502f90f5 in another order (D), which the map does not pair
    extra_tasks: [0x502D2FCD],
    g4set: G4SET_UNCHECKED,
    // the touch panel runs (no touch: false) since 2026-11-10 (docs/model-survey.md findings 84 to 89): as E122's, and
    // its own power-up list's INT waits (src/fw/facts.mjs touchIntWait, inline), register list (touchRegList,
    // S-TPREGLIST) and controller version (src/lab/touchpanel.mjs 0x1c14)
    frame_plane: null,
    overrides: {
      '0x5014b7c7': { to: '0x5016558b', why: 'the dial init (DIAL_INIT): the dial module init, which sets up the dial slots from 0xa1c184a8 with the fixed id table 0x601b1e58 (D); E122\'s, which selects a table by board, does not carry (menu)' },
      '0x5002e758': { to: '0x5004c674', why: 'LEVEL_HANDLERS[2]: the kernel\'s level-handler table kcb[88] after its init holds 0x5004c674 (X); the leg map put levels 2 and 3 on level 1\'s handler and levels 4 and 5 one handler late (irq)' },
      '0x5002e715': { to: '0x5004c636', why: 'LEVEL_HANDLERS[3]: the kernel\'s level-handler table kcb[88] after its init holds 0x5004c636 (X); the leg map put levels 2 and 3 on level 1\'s handler and levels 4 and 5 one handler late (irq)' },
      '0x5002e6d2': { to: '0x5004c5f8', why: 'LEVEL_HANDLERS[4]: the kernel\'s level-handler table kcb[88] after its init holds 0x5004c5f8 (X); the leg map put levels 2 and 3 on level 1\'s handler and levels 4 and 5 one handler late (irq)' },
      '0x5002e68f': { to: '0x5004c5ba', why: 'LEVEL_HANDLERS[5]: the kernel\'s level-handler table kcb[88] after its init holds 0x5004c5ba (X); the leg map put levels 2 and 3 on level 1\'s handler and levels 4 and 5 one handler late (irq)' },
    },
  },
  E122: {
    name: 'PEN-F', bin: 'OLY_E_122_3101_0000_0000.BIN', version: '3.1', res_block: 'blk01460000.OE.0101.bin', checked: true,
    rom_len: 21364672, rom_sha256: 'a2eb1d1f1afe47cce148e9aae0a04dfb82547d9de9437d342e012341140913f4',
    // the reset head's jump into the run-time copy at 0x500000b6: mov 0x600210f9,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 19767776, res_sha256: '8509050a3374abf6237254ad0a2627fa33aaccf7612e2dafae7e6ba481e77407',
    // TFT 1.037M dots, EVF 2.36M dots
    panels: { tft: [720, 480], evf: [1024, 768] },
    // the card native since 2026-10-30 (docs/model-survey.md finding 41): src/fw/facts.mjs fileSystem reads the family's
    // forms; the blank 8 GiB card formatted FAT32 'NO NAME' at 8192 with 32 KiB clusters, 1470 shots and 0:37:19 from
    // it, S2's file read back (X: bin/modelcheck.mjs, the OSD records)
    // hls 'rule': the HLS media side (Format from Card Setup, the card out and in; src/lab/media.mjs S-MDAEND and
    // S-MEDIA) at the addresses src/fw/facts.mjs mediaHls reads (fact 'media'), since 2026-11-10 (docs/model-survey.md
    // findings 124 to 129; X: test/test_storage.mjs --hls)
    card_fs: { native: true, hls: 'rule' },
    // REC_FILE records S2's file natively, its header the header maker's (X: test_storage's S2 file, its Exif Model
    // 'PEN-F', the firmware's count and directory entry; docs/model-survey.md finding 146)
    rec_native: true,
    board: { family: 'E118' },
    // the map from E143 leaves 116 of the lab's addresses unplaced; through E125 113 (107 of its overrides carried, 62
    // nulls, 26 failed), through E130 114 (122 carried, 71 nulls, 18 failed); through E142, E137, E144 and E140 the
    // port stops at the hardware-timer rule on a carried place (X: bin/port.mjs with each). E130 is taken, the family's
    // reference for E118 and E120 (port_via E122), with E122's own overrides first
    port_via: 'E130',
    overrides: OVERRIDES_E122,
    // the early driver inits the reset path runs through 0x50062ed4 (called at 0x50000278, before the kernel): four
    // entries of the table 0x6012b74c, of which 0x50001b8d does the work (the GIO pins' configuration, 0x9b800000 and
    // 0x9b801000, and at 0x50001e0d..0x50001e6c the timer pool: its 15 records and the free masks 0xa1c3ac48 = 0x7fff,
    // 0xa1c3ac4c = 0x3f) and the other three return (D). The software-timer init allocates its channels from that pool
    // and logs 0x19001802 when it finds none free (0x5006600d, X: without the step); the lab's start enters at the
    // kernel, so H-DRVINIT runs it (src/lab/display.mjs)
    boot_drivers: 0x50062ED4,
    // no disp_sync module of E143's form (0x507f2fe0, its work table "disp_sync_work": no such string, X); its display
    // module keeps a disp_sync parameter of its own (disp_update_image_disp_sync_param, 0x502cb203.., D), so the display
    // start has no disp_sync init to run (src/lab/display.mjs)
    disp_sync_init: false,
    // A-PERIOD: the TFT's and the EVF's vtotal functions return constants (0x50302e5f 495 lines, 0x502fa8eb 825, D) and
    // no frame period getter follows them (src/fw/facts.mjs framePeriod null, X); the period is ?, the lab assumes E143's
    // TFT period word's 16683 us (59.94 Hz) for both, which sets only the lab clock's line time
    frame_period_us: { tft: 16683, evf: 16683 },
    // the dial-table select (src/lab/menu.mjs dial_init), of a form src/fw/facts.mjs dialSelect and dialStore do not
    // read: the dial module init 0x50176f46 (E143's DIAL_INIT's place, src/fw/overrides-E122.mjs) stores the board's id
    // table from the preloaded table 0x615fc838 into 0xa1c57f34, indexed through 16 {board byte, index} pairs at
    // 0x601c2fec (D). The board byte is 4: H-DRVINIT's board-id read (0x50001d91) packs three strap pins' level bits,
    // which the lab stub reads 0, and maps id 0 to 4 through the pairs at 0x60026864 (0:4, 3:3, 5:1, 6:2, 7:0; any other
    // id halts at 0x50002388, D); board 4 takes index 1, the table 0x601c3054 (X). Which revision a PEN-F has is ?
    dial: { select: 0x50176F46, select_end: 0x59, table_ptr: 0xA1C57F34, table0: 0x601C3054, board: 4 },
    // the shared stand-in (G4SET_UNCHECKED)
    g4set: G4SET_UNCHECKED,
    // no frame plane of E143's form (src/lab/camapp.mjs S-TAKEFRAME, S-AFOSD): src/fw/facts.mjs framePlane reads none and
    // the map places neither the frame display mode set (E143 0x500256d9) nor the AF upload (0x500257ce) (X); where its
    // AF frames are drawn is ?
    frame_plane: null,
    // the touch panel runs (no touch: false) since 2026-11-10 (docs/model-survey.md findings 84 to 89): its open
    // read by its form (src/fw/facts.mjs touchOpen), the gesture mask's word at its set's store (touchMask), HFW's
    // callback and statuses at the map's places; before, the open was unplaced and the map's mask word another word
    // (X: port.json)
    extra_tasks: [
      0x502F90F5,   // a display task (static row 0x51, stack 0x800) that the display task init starts (OlyTaSt at
                    // 0x502f8f6a, after its mailbox 0x5004adef); it waits on the flag in 0x60041034 and drives the VSC
                    // driver's 0x503078b9 and 0x5030a68b (D); no E143 code pairs with it (X: xwhere)
    ],
  },
  E120: {
    name: 'E-M10 II', bin: 'OLY_E_120_1400_0000_0000.BIN', version: '1.4', res_block: 'blk01460000.OE.0101.bin', checked: true,
    rom_len: 21364672, rom_sha256: '309682c05a96d3079ebcae598169d487fea7f8b2531d8ae99445d63e80ea7a39',
    // the reset head's jump into the run-time copy at 0x500000d1: mov 0x60021114,a0; jmp (a0) (D)
    image_base: 0x60021020,
    res_len: 18415584, res_sha256: 'f12ebf2598496f11bfdecff105f933a9f60c2cfff6a479258e9c6c34cb9236f0',
    // TFT 1.037M dots, EVF 2.36M dots
    panels: { tft: [720, 480], evf: [1024, 768] },
    // the card native since 2026-10-30 (docs/model-survey.md finding 50): the play bring-up mounts it, the blank 8 GiB
    // card formatted FAT32 and DCF folder 100, file 1 (X: a play session per device, and modelcheck's path, finding
    // 56); its HLS media side read by the rule as E122's (hls 'rule', X: test/test_storage.mjs --hls)
    card_fs: { native: true, hls: 'rule' },
    // REC_FILE records S2's file natively, its header the header maker's (X: test_storage's S2 file, its Exif Model
    // 'E-M10MarkII', the firmware's count and directory entry; docs/model-survey.md finding 146)
    rec_native: true,
    board: { family: 'E118' },
    // through E122 (port_via): the family's reference, whose overrides it takes over (the evidence at E122's entry)
    port_via: 'E122',
    // as E122's (src/fw/models.mjs E122, the evidence there): the reset path's early driver inits, the table walk
    // 0x50064732 (called at 0x50000293; the same code as E122's 0x50062ed4, X: twin.mjs bytes with the calls and addresses
    // masked), no disp_sync module ("disp_sync_work" absent, X), the frame period assumed (A-PERIOD; the rule reads no
    // period word on it either, src/fw/facts.mjs framePeriod null, X)
    boot_drivers: 0x50064732,
    disp_sync_init: false,
    frame_period_us: { tft: 16683, evf: 16683 },
    // the dial init 0x5015d3a6 takes one fixed id table, 0x601a8810 (`mov 0x601a8810,d0` for its slot set-up from 0xa1c17b80), with
    // no board select and no table pointer (D): src/lab/menu.mjs dial_init runs it alone
    dial: { table_ptr: null, table0: 0x601A8810 },
    // E122's display task (src/fw/models.mjs E122, E118): the static task table's row 0x51, whose entry word (image
    // offset 0x18f70) holds 0x602e7a9d (D), which the display task init starts (X: the kernel's start of it from that step)
    extra_tasks: [0x502C6A7D],
    g4set: G4SET_UNCHECKED,
    // the touch panel runs (no touch: false) since 2026-11-10, as E122's (docs/model-survey.md findings 84 to 89)
    frame_plane: null,
    overrides: {
      '0x5014b7c7': { to: '0x5015d3a6', why: 'the dial init (DIAL_INIT): the dial module init, which sets up the dial slots from 0xa1c17b80 with the fixed id table 0x601a8810 (D); E122\'s, which selects a table by board, does not carry (menu)' },
      '0x51049ebb': { to: '0x508eaf45', why: 'CA_MAIN, the camera application\'s main task: its object of 68 bytes created, its constructor 0x5090c80e and run 0x5090c824 called, then 0x508eafe2, as E122\'s 0x50b738ce in short call forms (D); neither map places it (camapp)' },
      '0x5002e758': { to: '0x5004c624', why: 'LEVEL_HANDLERS[2]: the kernel\'s level-handler table kcb[88] after its init holds 0x5004c624 (X); the leg map put levels 2 and 3 on level 1\'s handler and levels 4 and 5 one handler late (irq)' },
      '0x5002e715': { to: '0x5004c5e6', why: 'LEVEL_HANDLERS[3]: the kernel\'s level-handler table kcb[88] after its init holds 0x5004c5e6 (X); the leg map put levels 2 and 3 on level 1\'s handler and levels 4 and 5 one handler late (irq)' },
      '0x5002e6d2': { to: '0x5004c5a8', why: 'LEVEL_HANDLERS[4]: the kernel\'s level-handler table kcb[88] after its init holds 0x5004c5a8 (X); the leg map put levels 2 and 3 on level 1\'s handler and levels 4 and 5 one handler late (irq)' },
      '0x5002e68f': { to: '0x5004c56a', why: 'LEVEL_HANDLERS[5]: the kernel\'s level-handler table kcb[88] after its init holds 0x5004c56a (X); the leg map put levels 2 and 3 on level 1\'s handler and levels 4 and 5 one handler late (irq)' },
    },
  },
  // E-M10 Mark I (2014, TruePic VII), firmware 1.4. Local RE project (em10_1) port attempt. PRE-dates all three
  // board families (E143/E144/E118 are 2015-2022), so no port_via sibling; board facts to be supplied by hand from the
  // em10_1 Ghidra RE (runtime base 0x7d991020, verified 2315/3000 strings). image_base is that base (reset head jumps
  // into the relocated copy). This is a minimal entry to measure the cross-build map's placement from E143; overrides
  // are empty until the port report shows what fails.
  E113: {
    name: 'E-M10', bin: 'OLY_E_113_1400_0000_0000.BIN', version: '1.4', res_block: 'blk01200000.OE.0101.bin', checked: false,
    rom_len: 18874304, rom_sha256: 'e2b227662d782a2c75c6c6e872bc34fdfa45d34a9b1b2cee04a4435a00c54f0e',
    image_base: 0x7d991020,
    // res_len/res_sha256 are the resource PREFIX (the block up to its index's last entry, src/fw/resprefix.mjs resExtent),
    // not the whole 25165760-byte block: the earlier values were the full-file length and sha, which checkBlock (it hashes
    // resPrefix(b)) rejects. Measured from E113's own block01200000: extent 13446112 bytes, prefix sha 8c5ec690... (same
    // convention as E120, whose res_len 18415584 is its extent, verified).
    res_len: 13446112, res_sha256: '8c5ec690ec756fa4167a08020ee4017c5cc18f6f711fa027b575401f034f2754',
    // rear LCD 3.0" 1.037M dots; EVF (VF-4-class) ~1.44M dots
    panels: { tft: [720, 480], evf: [800, 600] },
    card_fs: {
      native: false,
      // the cross-build map does not place E113's file-system seams: src/fw/facts.mjs fileSystem reads none of them,
      // so FACTS[E113] carries no `storage` and the lab has nothing to drive a native card FS with. S-CARD keeps the
      // card without one (src/lab/camapp.mjs), pending E113 storage RE (the E118 family's forms, read in E122's code).
      why: 'E113 file-system seams not placed by the cross-build map (no storage fact); card kept without a native FS',
      hls: 'rule',
    },
    rec_native: false,
    // core_byte: the board-identity byte the lab's core-id getter returns (src/fw/facts.mjs coreByte, src/lab/hle.mjs
    // core_id, menu.mjs dial select). The coreByte rule wants one leaf getter `movbu (0x8ff0xxxx),d0; retf`; E113 has
    // NONE (the rule returns null, board defers to hand). Measured why: E143's board byte (0x97f00254) is a strap-lookup
    // code written by a board-detect (`mov 255,d1; movbu d1,(0x97f00254)`, then a table 0x600297a8 overwrites it) for a
    // multi-variant body; E113 (E-M10, one fixed board) has NO such detect — a byte scan finds no `mov 255 -> (0x8ff..)`
    // store and no 0x8ff slot read-then-compared as a board code. So there is no runtime variant byte to pin. In the HLE
    // lab the board-detect never runs, so the reference E143 reads its own core_byte as 0 at menu time (board 0, the
    // default path) — measured. E113 must read 0 the same way: 0x8ff00188 is the E118 family's board-byte slot (its
    // sibling E120's getter `movbu (0x8ff00188),d0`), and E113's own code never touches 0x8ff00188 (0 accesses in its
    // image), so the lab's zero-filled SRAM keeps it 0 = board 0, identical to E143. modelcheck's menu/dial checks gate it.
    // bus_ram (src/dev/bus.mjs Bus extra ranges, src/machine.mjs): extra backed bus ranges E113's firmware reads that
    // the reference E143 never touches, so the bus device (DRAM + the two live-view banks only) faults them (BUS, fault
    // 2). Served zero until written, like the live-view banks. Measured in E113's own image: the registry bootstrap
    // (E113-specific; E143/E120 run different code at this offset and never reach here) verifies a registry/NVRAM-backup
    // partition via the 0x50040b87 checksum routine (reads a header halfword at the block base, then sums `length`
    // halfwords; blank -> header != expected 0xd -> fail -> firmware takes the blank/default path, correct for a first
    // boot). The partition sits above E113's DRAM top (0xA0000000 + dram_size 0x1d971200 = 0xBD971200) inside the
    // 0xB8..0xBF CPU window, which at the reset segment (winreg 0x17161514) aliases it identity -> unbacked -> fault 2.
    // A full-image uint32 scan for aligned block bases in [0xBFF80000, 0xC0000000) finds four store bases, each
    // referenced several times, laid out contiguously to the window top: 0xBFF8A000 (x5, 0x40000), 0xBFFCA000 (x6,
    // 0x20000), 0xBFFEA000 (x8, 0x10000), 0xBFFFA000 (x4, ~0x6000). 0xBFF8A000 and 0xBFFEA000 are proven by boot faults.
    // Back the enclosing region page-aligned: 0xBFF80000..0xC0000000 (0x80000) covers all four stores and their extents
    // (the 0xA000 lead is page alignment). Only E113 sets this; E120/E122 (same E118 board) never access it.
    // buswin_pads: the 0x98100000 block is a GPIO/pad-control register bank, not just the window-control register at
    // offset 0x58 (A17). E113's flash-library pad-setup does read-modify-write on the pad registers at offsets 0x00,
    // 0x04, 0x08, 0x10 (0x51049e62 `mov (a0),d; or 16,d; mov d,(a0)` set-bit-4, and 0x51049e96 `and -17/-193` clear-bit),
    // run during UI_IN init from the relocated flash library (0x47001xxx). The reference body's lab path never touches
    // these offsets, so src/dev/bus.mjs faults on them as unmodelled (the tripwire that surfaced this). With this fact
    // set, the buswin device backs every non-0x58 offset as a scratch register file (reset 0, width 1/2/4) so the RMW
    // reads back its own prior writes; 0x58 keeps its strict window-remap semantics. These pads carry no HLE-relevant
    // side effect (hardware pin direction/drive). Set on the E118 family where this library runs; E143 keeps the tripwire.
    // engine.word22: E113's fills set w[3] bit 22 on single-row remainder fills, which the strict OSD-engine model
    // (src/dev/engine.mjs) reserves (WORD_BITS) and the reference E118 bodies (E120/E122) never set; admitted by hand
    // (its field meaning on E113 is not pinned; seen before the depth correction below and not re-tested without it since). The depth is the family's 3: an earlier `engine.depth: 5` here was
    // WRONG, read off fills seen while the bring-up was still broken (4 bytes a pixel, 2048x57 stride 8192). With the
    // GUI's display sync released (display.sync, the one-channel form of src/fw/facts.mjs displaySync) every OSD
    // command E113 issues is depth 3 on the 896-stride canvas (fills 0x20000310, copies 0x24000320, pictures
    // 0x20001b30), and depth 5 refused all 87 of the start screen's (X: DEPTH x87, the three OSD planes all zero, a
    // one-colour frame); at depth 3 the engine reports no error and the TFT and EVF screens draw (bin/modelcheck.mjs).
    // dram_chip (src/machine.mjs): E113's PHYSICAL DRAM chip is 512 MiB, distinct from dram_size (the derived
    // gui-managed-heap top, 0x1d971200 ~= 474 MiB — a software placement below the chip top on this body). The
    // E118-family chip is 512 MiB (facts.mjs dramSize comment: E118/E120 GUIs end at 0xc0000000); E120/E122 place
    // their GUI at the chip top so dram_size == 512 MiB already, but E113 places it lower. E113's CameraCommon
    // registry (method 0x5069e3dd, kind=2 get-or-create) returns app objects in physical DRAM above the heap top:
    // the second registry call at 0x509af704 returns a2=0xbfd2a000, and 0x509af730 `mov (a2),d0` faults (fault 2)
    // when only ~491 MiB (image-end) is mapped. Mapping the full 512 MiB chip backs 0xbfd2a000 and clears the fault
    // (boot then advances to the H-UIIN divu-by-zero at 0x7d9962c0, the separate engine/geometry wall). Matches the
    // documented E130 precedent (facts.mjs dramSize comment: 384 MiB faulted at 0xbfc59440, "runs on with 512 MiB").
    // This supersedes the earlier (disproven) 0x501d59fc / display-cmd-12 theory: that path is never reached on the
    // faulting trace (probe wallc_order: 0x502140cc/0x501d59fc not hit before the 0x509af730 fault). dram_size, the
    // heap-top fact, is unchanged (273/273 facts hold); only the lab's physical mapping grows.
    // display_planes (src/machine.mjs): a RAM window inside the firmware's framebuffer aperture 0x40060000..0x40690000
    // (the range 0x500d65d2's reg_buffer validator accepts). E113's display-buffer allocator runs on a register-indirect
    // path the lab does not drive, so the 0x60000000 display-buffer struct is never populated and DISPLAY-OPEN's plane
    // reads (reg_buffer at 0x5003a448/0x5003a460/0x5003a4e5, deref at 0x5003a4b8) hit NULL -> range-validator hang at
    // 0x500d675a (Wall E). boot_seeds below points the struct's plane fields here; backing the target with real RAM lets
    // the range-check and derefs pass. STAND-IN: one flat window, not the real multi-plane layout; no byte-match to HW.
    // E113-only (E120/E122 share the E118 board but drive the allocator). docs/om-emu/e113-boot-walls.md Wall E.
    // scpu.storage override (Wall H grind): E113's SCPU-init fn 0x5004a3e0 (task 0x50038e2f chain) reads the port word
    // 0x98e000a0 (RMW `or d1`, disasm 0x5004a40c) which E118's compacted storage map [0x00,0x94] omits (events:null, so
    // no port block) -> scpu.read throws BUS (fault 2). Back 0xa0 as plain storage so the RMW reads back what it writes.
    // STAND-IN: one port word as storage, not the SCPU event-port/level semantics (E143-family's events at 0xa0..0xb8
    // can't be grafted -- E118 puts its clock at 0x98, colliding with that family's events.pending). E113-only.
    board: { family: 'E118', core_byte: 0x8ff00188, bus_ram: [[0xBFF80000, 0x80000]], buswin_pads: true, engine: { word22: true }, dram_chip: 512 << 20, display_planes: { base: 0x40060000, size: 0x40000 }, scpu: { storage: [[0x00, 0x94], [0xa0, 0xa0]] } },
    // boot_seeds (src/lab/menu.mjs bring_up H-E113SEED): [addr, value, width] the lab writes to DRAM before the firmware
    // runs, standing in for native init blocks the lab does not drive. Each is a documented E113 stand-in, NOT a HW
    // byte-match -- see docs/om-emu/e113-boot-walls.md. E113-only (no other model defines boot_seeds).
    //   Wall B: 0x6055f944 = serial-flash geometry config halfword the native flash-config block computes; the divu at
    //     0x7d9962c0 (H-UIIN OSD geometry) divides by it, so 0 -> divide-by-zero. 0x800 derived from E113 lab geometry.
    //   Wall E: 0x60000014/18/30/34/40/5c = the 0x60000000 display-buffer struct's framebuffer-plane pointers, all set
    //     to the display_planes window base. The tft DISPLAY-OPEN path reads them as plane addresses (reg_buffer at
    //     0x5003a448/0x5003a460/0x5003a4e5, plane-base at 0x5003a491, deref at 0x5003a4b8); unpopulated -> NULL -> the
    //     0x500d65d2 range-validator hangs at 0x500d675a. Backing + seeding clears the hang; OPEN completes.
    boot_seeds: [
      [0x6055f944, 0x800, 2],
      [0x60000014, 0x40060000, 4], [0x60000018, 0x40060000, 4],
      [0x60000030, 0x40060000, 4], [0x60000034, 0x40060000, 4],
      [0x60000040, 0x40060000, 4], [0x6000005c, 0x40060000, 4],
    ],
    // xcpu_standin (src/lab/kernel.mjs install_guards): E113 is a 3-core SoC; its menu bring-up performs real inter-CPU
    // rendezvous the one-CPU lab cannot complete. Two primitives on the path: XCPU_WAIT (0x500127cb = this model's
    // A(0x5001258b)), an inter-core doorbell post/wait to an absent core (direct-called, returned via finish()); and the
    // IPI barrier (E113 0x500125a3 = this model's A(0x50012367), vtable-dispatched via perCPU+304..), which sets its own
    // ready bit in the 0x8ff00000 halfword then spins (setlb/Lne at 0x5001260c) until it reads (1<<coreCount)-1 -- bits
    // the absent cores never set, a fault=7 deadman. The barriers fact holds the E143-CANONICAL key (0x50012367, E143
    // runtime 0x60033387), which kernel.mjs:147 feeds through A() to land the hook on E113's 0x500125a3; the earlier
    // E113-address-as-key (0x500125a3) was itself A()-remapped to 0x500127e3 (a mid-instruction non-target), so the
    // barrier was never intercepted and H-UIIN's full UI init spun to fault 7 (the menu bring-up settles before this
    // site; the modelcheck TFT play path reaches it). With the key corrected each returns cleanly (as its own `ret`
    // would), as if every core had synced -- a documented stand-in (the other cores' side effects are skipped, surfacing
    // the next wall). docs/om-emu/e113-boot-walls.md Walls F/G. Other models keep the hard stop.
    // no_ae_init (src/lab/play.mjs play_bring_up): the interpolation 0x5052d4ba is the clamping form (3328 bound, no
    // step table, no division), and the function facts.mjs aeInit takes for its init -- the call target before the
    // wrapper 0x5052bab0 -- is 0x5052ba95, one of four 27-byte stubs that log 0x0e0000ff and return 0x7fff (H-AEINIT:
    // 0x5052ba95 = 32767 when called). The build has no AE init to run, and nothing a missing one leaves undivided.
    no_ae_init: true,
    // no_gui_swap (src/lab/play.mjs install_xcpu): E143's S-CPU2 serves the GUI's post of 0x60acb193 to CPU 2, whose
    // command 3 copies a 28-byte snapshot to 0xa33da484 and replies through 0x60acbfb7. E113's build has no such
    // service: the snapshot destination is absent from its port, and of the 24 callers of its IPI post 0x5003891b
    // (the function before IPI_STORE 0x500389b7, `cmp 3,d1` core bound) the only (func, 0) post to core 2 is the AE
    // histogram worker's requester 0x50534caa (worker task 0x50534c29 runs 0x5053fb7c on buffers at 0xa0a90400 and
    // replies with 0x50534cbe from 0x50534c97) -- a different service, not modelled.
    xcpu_standin: { barriers: [0x50012367], no_gui_swap: true },
    // idle_block (src/lab/kernel.mjs boot, after init): E113's kernel idles through a per-CPU-control-block
    // indirection E143 lacks. The idle-start gate (fn 0x7d9a2b65 / disasm 0x50011b45) reads block field[360]
    // (idle-ready): if !=1 it wires dispatch to the panic self-loop 0x7d9a730b (bra .); if ==1 it calls
    // 0x7d9a7310, which does `mov (308,a0),a0; calls (a0)` -- jumps through field[308] (the idle-dispatcher
    // ptr). CPU0's block = *(table) = 0x7d9b0930 (an image address); its static field[360]=0 and field[308]=
    // 0x7d9edcc9 (a retf sled) are never overwritten in the lab, so the firmware panics at the idle gate during
    // device bring-up (the kernel-init IDLE hooks that mask this are temporary, src/lab/kernel.mjs:88). E143
    // instead reaches the harness idle trampoline IDLE_DONE via the INTC gate (kernel.mjs set_gate), with no
    // such block. This fact bridges E113's indirection to IDLE_DONE: after init the lab sets CPU0 block
    // field[ready]=1 and field[dispatch]=IDLE_DONE, so the firmware's idle dispatch lands on the lab's idle
    // home. docs/om-emu/e113-menu-port.md FINDING 2026-11-17f..h. Other models have no such block.
    idle_block: { table: 0x8ff00004, ready: 360, dispatch: 308 },
    // settle_slp / settle_iwup (src/lab/kernel.mjs settle/elapse_until): E113's genuine display-open
    // ("DISPLAY cmd 2 OPEN tft") runs a kernel object-pool restore (fn 0x50012167 / runtime 0x7d9a3187,
    // reached entirely through kernel frames 0x50011xxx/0x50012xxx during normal task dispatch -- NOT via
    // the idle trampoline, confirmed by stack unwind) that reinitialises the semaphore control-block array,
    // destroying the lab's dynamically-created settle_sem mid-wait. A sem-based park cannot survive this:
    // the sem object is gone (isig_sem -> -42 E_NOEXS) and the lab task is orphaned (the restore cleared the
    // sem's wait queue, so re-create + sig will not relink it; rel_wai is not ISR-callable). Instead E113
    // parks the lab task on slp_tsk (TCB-intrinsic sleep, no object to destroy -- the TCB survives the
    // restore) and wakes it with the interrupt-callable iwup_tsk. Addresses measured in E113's own image
    // (symbol-map.md): slp_tsk = runtime 0x7d9a6a16 = disasm 0x500159f6 (no id arg; checks the wake-up count
    // at task-node +21, else knl_sleep_enter(kind=1), returns wake code at node +64); iwup_tsk = runtime
    // 0x7d9a24d4 = disasm 0x500114b4 (knl_iwup_tsk, interrupt-context wake of a slp_tsk sleeper, deferred
    // dispatch). E143 and the other models leave these unset and keep the acre_sem/isig_sem park (their
    // display-open does not reinit the sem pool). docs/om-emu/e113-menu-port.md.
    settle_slp: 0x500159f6, settle_iwup: 0x500114b4,
    // intc_native_order (src/lab/kernel.mjs _idle, A-INTC-ORDER): E113's GUI bring-up is long (~17 s of guest
    // instructions on this host), so by the time the lab task parks and the firmware quiesces, two device IRQ
    // lines stand asserted together at the idle point -- measured: irq 31 at level 3 and irq 30 at level 5 (both
    // real, firmware-attached: handlers 0x7d9dd92c / 0x7d9dd8f0, generic per-IRQ trampolines into the central
    // dispatcher 0x7d9e3bfb; both lines driven=set at the stop). The lab's default idle guard refuses to proceed
    // when more than one interrupt LEVEL is presented at once (strict_levels), because without a declared priority
    // order it cannot know which the CPU takes first. E113's INTC (AM33 GxICR) is the standard form: a lower level
    // NUMBER is higher priority, which is exactly what the native controller model already resolves to
    // (src/dev/intc.mjs irqLevel: `mask & -mask`, the lowest set level). So the order is not ambiguous for E113 --
    // it is the native model's order -- and the idle point delivers irq 31 (level 3) first, then irq 30 (level 5)
    // at the next idle, each ISR clearing its line (verified: with the guard lifted bring-up advances cleanly past
    // this point to the next task-start wall, not a re-presentation loop). This fact asserts that order and lets
    // _idle proceed instead of throwing. E143 never presents coincident levels in its checks (shorter settle), so
    // it keeps the strict guard (no key) -- the change is E113-gated and leaves the golden untouched.
    intc_native_order: true,
    // cflush_returns (src/lab/menu.mjs _k_cflush): extra call sites from which the firmware may invoke the kernel
    // cache-flush K_CFLUSH (A(0x5004E68A)). The lab models cache-flush as a no-op (emulator memory is coherent) but
    // asserts the caller is a known site, to catch an unexpected flush that might rely on cache semantics. The one
    // listed E143 site K_CFLUSH_RETURN = A(0x5004086A) has no place in E113 (map leaves it unplaced -> 0xfe04086a), and
    // E113's registry bootstrap (E113-specific code; E143/E120 differ here) flushes from its own site. Measured in
    // E113's own image: the registry init 0x50040aeb calls K_CFLUSH from disasm 0x50041b48. E113 is not port_via, so
    // no knob carries; given by hand as E113's own disasm address (as ports.mjs lists E139/E148's own cflush sites).
    cflush_returns: [0x50041b48],
    // EVF device code + output-device property id, measured from E113's own image: its single EVF-writer
    // (`mov (abs32),d0; cmp 6,d0; bne; mov 4014,d0; mov 8,d1`) names propId 4014 and EVF code 6, identical to
    // E120 (same E118 family). The cross-build map leaves E143's PROP_DEVICE_SITES null, so the facts.mjs
    // propDevice/evfCode rules emit no `prop` for E113; supplied by hand here with that measurement.
    // device_read: E113's code reads the output device as property 4013 (151 `mov 4013,d0` sites, 150 of them into the
    // getter 0x50202f98; E120 has none), e.g. the HighLevel display set-up 0x50651fa6, whose value goes to the display
    // size getter 0x501fc1b3 (it takes 1, 2, 4, 8 or 16 only and otherwise leaves its result unwritten: the scaler
    // then divides by a zero height at 0x5022813e). The only writer is the display open's 4014 = 8 / 4 / 1
    // (0x500f49b2). Run in the lab: both ids read 0 before, and both read 1 after the setter 0x501d9e25(4014, 1) (X).
    prop: { device: 4014, evf_code: 6, device_read: 4013, any_site: true },
    // movie_time_size (src/lab/camapp.mjs S-CARD movie time): E113's movie time query 0x504cd2c6 fills 14 bytes through
    // 0x504e20fd (three words and a halfword at +12; E120's 0x5050e894 fills 24), and its callers 0x50205198 and
    // 0x502051c1 keep the record at (4,sp) of a 24-byte frame: E143's 24 bytes overwrote the return address there (X:
    // the tft child returned to 0x8940 from 0x502051e1).
    movie_time_size: 14,
    // output_evf (src/lab/camapp.mjs S-OUTDISP): the internal EVF's code in getOutputDisplay's output enum. E113's
    // getOutputDisplay (0x5087a17b, the override of 0x5104fd44) answers 4 where the TFT's test 0x508872a7 holds and 5
    // where the EVF's 0x5088729e does (`mov 4,d2` 0x5087a1c1, `mov 5,d2` 0x5087a1d1), E120's 5 and 6 at the same two
    // tests (0x508ed775, 0x508ed785: its enum has one more output before them). Answered 6, E113's GUI never
    // reached its output: at POWER_ON it took 0x9601, 0x1100, 0x1002, 0x9b01 over and over (X: S-OUTDISP 1010 times,
    // S-DISPSYNC 405, "event storm: more than 810 GESetEvent calls in step 01-S-CAMAPP start"). Measured in E113's
    // own image (D).
    output_evf: 5,
    // object_pools (src/lab/camapp.mjs find_reactive): E113's allocator is not E143's size-class heap. Its malloc
    // 0x50476040 picks one of three fixed-block bitmap pools by size (<= 128, <= 2048, <= 16384; a larger request gets
    // null), each split per CPU by (0x8050), and 508 sites call the pool getters directly (0x50005f36.. through the
    // locked wrapper 0x50005fde): 192-byte blocks x 3712 from 0x60001fc0 (0x50006044), 16448 x 128 from 0x600b8540
    // (0x500060fc), 2112 x 544 from 0x60326c00 (0x500061ac), ending 0x6043f400. It runs natively: S-HEAP's hooks sit on
    // the map's malloc and free and are not called (X: the lab's heap top is unmoved at the start screen), and the
    // HLS shooting reactive is in the 2112-byte pool (X: 0x6034eacc, the only word of its vtable in RAM).
    object_pools: [0x60001FC0, 0x6043F400],
    // no frame plane of E143's form, as the E118 family's later bodies (E120, E122): E143's FRAME_MODE_SET has no
    // place here and facts.mjs finds no clamp-form uploads
    frame_plane: null,
    // display.timer_sleep (src/lab/menu.mjs S-TIMERSLEEP): the display code's software-timer sleep, called with a0
    // null for a one-shot wait. facts.mjs timerSleep finds it by a byte signature present on the 18 later images but
    // NOT on E113 (older build), so it is supplied by hand. Measured in E113's own image, not carried from the map:
    // E113's TFT command-list processor at 0x50224485 runs the exact family idiom `movhu (2,a2),d0; mov 0,a0; inc d0;
    // call 0x50219e36` (a0 null = default callback, d0 = cmd value + 1), identical to E120's TFT cmd-list sleep call
    // at 0x502d0265 -> its timer_sleep 0x502c384e. The callee 0x50219e36 is the timer_sleep by structure, matching
    // E120 0x502c384e exactly: default-callback pick (`mov 0x7dba5b27,a2; cmp 0,a3; mov a0,a2`), create one-shot
    // (call 0x500347ec, kind 3), start (call 0x50052d48), then with no callback given `mov -1,d0` (timeout -1) +
    // movhu(0x7d9b0570) flag + OlyEvWt flag-wait (call 0x50030118) -- the no-timeout wait that defines timer_sleep.
    // display.panel_flag (src/lab/menu.mjs route_rtos S-PANELDONE): the word holding the id of the event-flag the panel
    // driver's PER_SIO serial transfers complete on. S-PANELDONE answers the display-open wait on it at once, because the
    // lab models no panel-serial channel. The lab's default PANEL_FLAG (A(0x60043188), E143's EVF serial-completion flag)
    // cross-build-maps for E113 to word 0x7d9b06c4 = flag id 108 (58 refs), but E113's 2014 display open does NOT wait on
    // 108 — both the TFT HAL (0x7dbb5d3f) and the api_tft EVF open (0x7dbae225) wait OlyEvWt on word 0x7d9b056e = flag id
    // 138 (13 refs), set by the serial completion callback 0x5021d235 (iOlyEvSt 0x500300c9 / OlyEvSt 0x5003004e on the
    // same word). Measured in E113's own image (image read: u16 at 0x7d9b056e = 138). Supplied by hand because the map
    // places PANEL_FLAG at the wrong analogue for E113's reorganised display build. E143/E120 keep PANEL_FLAG (no key).
    // timer_sleep: see the S-TIMERSLEEP note just below.
    display: { timer_sleep: 0x50219e36, panel_flag: 0x7d9b056e },
    // touch_args.write_len (src/lab/display.mjs tpLength, _i2c_write): the stack slot the touch I2C write takes its
    // data-byte count from. read_len/read_addr are measured by src/fw/facts.mjs touchArgs (ports.mjs FACTS[E113] =
    // {read_len:{const:4}, read_addr:['d1']}, the fixed-count read the const-copy detector finds); only write_len is
    // given by hand, so the paths do not collide (src/fw/model.mjs fact()). The write function (TP_I2C_WRITE ->
    // 0x5022bade = runtime 0x7dbbcafe) loads its length with `mov (152,sp),d2` at 0x7dbbcb4a (disasm 0x5022bb2a) and
    // copies that many data bytes (`beq` past the copy on 0; the memcpy at 0x47001000) — sp+152 is the caller's u16
    // length argument above this function's 148-byte frame, exactly the E118-family slot E122's write uses (its
    // {sp:152}, src/fw/overrides-E122.mjs TP_I2C_WRITE 0x5030c5a9). touchArgs missed it because E113's build loads
    // the length with a 32-bit `mov (d8,sp),dn` (opcode 0x5a), not the `movhu` (f8/fa bc) its stack-arg scan keys on;
    // broadening that scan to 0x5a (a common opcode) across all 14 ported bodies is a needless regression risk, so
    // this one slot is given by hand with its evidence. _i2c_write only reads these bytes to log the I2C trace (no
    // buffer write), so the value is a trace-fidelity fact, not a crash fix. Measured in E113's own image.
    touch_args: { write_len: { sp: 152 } },
    // dial (src/lab/menu.mjs dial_init, dialSelect): E113 is the E118-family single-fixed-table form
    // (table_ptr null) — the dial init takes one fixed id table, with no board select and no table
    // pointer to read back, so src/lab/menu.mjs dial_init runs DIAL_INIT alone (the override 0x5014b7c7
    // below). The cross-build map leaves E143's dial unmeasured for E113 (facts.mjs could not key off
    // E143's structure), supplied by hand. Measured in E113's own image: DIAL_INIT 0x500f9774 builds its
    // dial slots (slot RAM 0xa0a5c67c) from the fixed descriptor table at runtime 0x7dbc0de0 via the
    // `udfu01 12,d0 ... setlb` scaled copy loop — byte-for-byte E120's verified DIAL_INIT 0x5015d3a6
    // (table 0x601a8810, slots 0xa1c17b80) with no board-select branch. table0 is E113's raw instruction
    // immediate (a runtime flash-rodata pointer; E113 keeps the id table in flash, unlike E120's RAM
    // copy); it is logged only (the table_ptr-null branch does not validate it). E143/E120 have no key.
    dial: { table_ptr: null, table0: 0x7dbc0de0 },
    // extra_dropped_sends (src/lab/menu.mjs _sync_send): synchronous queue sends this model issues that have no receiver
    // in the lab, dropped like the built-in DROPPED_SENDS. Each entry is [queue-id, cmd, disasm-site]; a null cmd or site
    // is a wildcard. E113's panel driver enqueues its serial command list to the PER_SIO serial worker on message queue 73
    // before waiting for the transfer completion (flag 138, display.panel_flag above); the lab models neither the queue-73
    // worker nor its completion IRQ, so every queue-73 send is dropped and the completion answered by S-PANELDONE. Queue 73
    // is specifically that serial worker's input queue, so matching the queue id alone is correct — the open sends several
    // commands from adjacent PER_SIO sites (0x500545c3, 0x5005459c, ...). Measured in E113's own image (PER_SIO 0x7d9e55xx,
    // cmd 0). E143/E120 have no serial-to-panel send on this queue (no key).
    extra_dropped_sends: [[73, null, null]],
    // timer_pool_init (src/lab/display.mjs H-SWTIMERPOOL): E113's software-timer init allocates its 16 timer objects
    // from a slot pool rather than filling a table inline (E143/E120). The allocator 0x500510d2 bit-scans the pool
    // free-list bitmap at 0xa0a55e20 (mask 0x7fff) via FFS helper 0x5004ad59; an unseeded (zero) bitmap scans to 32,
    // the allocation returns 0xffff, every record is marked reserved, and the later acre_tmr create 0x50052e09 finds
    // no free slot -> firmware error 0x19001802 at 0x50052edc. The seed routine 0x50005ab9 sets the bitmap (|= 0x7fff
    // / 0x3f) and the record table at 0xa0a55c7c; it is reached via the timer-module init 0x50005a7b, which the
    // firmware runs off an init-fn table (its pointer is the only image reference to 0x50005a7b, the word 0x7d996a9b
    // at 0x500d1dac) that the HLE boot never iterates. Measured in E113's own image; E143/E120 have no such pool.
    // frame: the function is reached only through the init-fn table, never a direct `call`, so no call-site frame
    // exists to infer. It manages its own 4-byte local frame (`add -4,sp` at entry, released by `ret [],4` at
    // 0x50005a88, whose imm=4 = the call frame imm + 4), so the invoking frame is [mask 0x00, size 0x00].
    timer_pool_init: { fn: 0x50005a7b, frame: [0x00, 0x00] },
    // E113's display task (as E120/E122's, src/lab/kernel.mjs allow set): the display task init 0x50219680 starts a
    // task the generic allow list (GUI/GENIFA/EMPTY/EYEFI) does not name, so the kernel's start of it throws "not
    // modelled". Measured in E113's own image: the task body is 0x5021c82c (a real task, `movm [d2,d3,a2,a3],(sp); add
    // -1240,sp; ...`), and its entry pointer (runtime 0x7dbad84c) is referenced once, from the static task table at
    // image offset 0x191a8 (disasm 0x500191a8), exactly the E118-family form E120 uses (its row 0x51). Started by the
    // display task init step (X: boot reaches the start of it from display.mjs:944).
    // The nine that follow 0x5021c82c are the E113 start-up task chain, measured by grinding the kernel native (the
    // grind driver appends each "start firmware task entry 0x..." throw to this list and retries, src/lab/kernel.mjs
    // allow Set). In start order: 0x50031c0c, 0x50032ed8, 0x50038e2f (3-channel periph enable + 0x99700000 reg zero-
    // init + SCPU 0x98e000a0 port), 0x50053c58 (0x98c00000 device-register write + 0x98C00004 busy-bit poll),
    // 0x5003400f, 0x5005cb01, 0x500529db, 0x500441ea, 0x50043fd5. With all nine allowed and the Wall-H HW stand-ins
    // backed (board.mjs stub_pages 0x98000000/0x99700000/0x98c00000, stub_preset [0x98C00004,0]=busy-done, scpu 0xa0),
    // the kernel runs them all to a block and drops into its OWN idle loop 0x500162eb (`bra .`), reached from the
    // scheduler at disasm 0x50011b9a when perCPU[cpu].field[360] (ready count, table 0x8FF00004) != 1 -- i.e. every
    // start-up task has initialised and blocked waiting for an event/IRQ. That idle is distinct from the lab's own
    // idle (kernel.mjs IDLE 0x500159F3/F8); the lab does not yet drive 0x500162eb, so bring-up spins there (fault 7).
    // This is the "event-loop tasks need real modelling" boundary: the old next step was teaching the lab idle-step/IRQ
    // delivery at 0x500162eb. See docs/om-emu/e113-boot-walls.md (Wall H / kernel-idle).
    // UPDATE (idle_block fix, below): with the per-CPU idle block initialised the kernel idle 0x500162eb no longer spins,
    // and bring_up('tft', time:true) advances into the display-open path, which starts a FURTHER five of the same
    // start-up/service family (same grind method): 0x500442dc (the "QPWRSTANDBY" power-standby task: cre_mbx id 16 then
    // a TMO_FEVR receive loop), then its cascade 0x500f5b75, 0x5003ca91, 0x500f7722, 0x500387f7. Added so the real
    // bring-up reaches the true next wall -- the lab's settle_sem (id 112, menu.mjs:290) is deleted by E113's display-open
    // semaphore-pool reinit (isig_sem -> E_NOEXS; docs/om-emu/e113-menu-port.md FINDING 2026-11-17i). E143 unaffected
    // (extra_tasks is per-model; its display-open does not reinit the pool).
    // UPDATE (intc_native_order fix, above): with coincident INTC levels resolved the display-open path runs further
    // and starts one more of the same service family, 0x5005148d (an event-flag worker: OlyEvWt on flag word
    // 0x7d9b04a2 via 0x50030118 mode 3, dispatch on the result bits, loop -- no one sets the flag in the lab, so it
    // parks in WAI). Added so the real bring-up reaches the true next wall. E143 unaffected (per-model).
    extra_tasks: [0x5021c82c, 0x50031c0c, 0x50032ed8, 0x50038e2f, 0x50053c58, 0x5003400f, 0x5005cb01, 0x500529db, 0x500441ea, 0x50043fd5,
      0x500442dc, 0x500f5b75, 0x5003ca91, 0x500f7722, 0x500387f7, 0x5005148d],
    // No stub_tasks: 0x500f95cc is the UI_IN task (this model's A(0x5014b736), src/lab/play.mjs UI_IN), not a lens
    // worker. An earlier entry here made it an immediate return (H-STUBTASK), so play_bring_up's act_tsk left it DMT and
    // no pushed group image ever reached the UI_IN groups' old-state bytes: every switch read 0 through 0x50214fbe, the
    // app took the composite cable (0x02020400) and USB (PC_START_PC_USB_SELECT) for connected, chose TARGET DISP VIDEO
    // and shut down from POWER_ON (X, the tft child). Its entry gate 0x500478f5 reads (0xa0a537f4), 0 in the lab.
    // disp_sync_init (src/lab/display.mjs start): E143's display-sync module is absent from the E118 family (as E120,
    // its evidence there). Measured: the "disp_sync_work" trace string E143 carries (3 occurrences) is absent from
    // E113's image (0 occurrences, same as E120), so there is no disp_sync init to run and A(0x507f2fe0) has no place.
    disp_sync_init: false,
    // frame_period_us (src/lab/display.mjs start, A-PERIOD): E113's TFT/EVF vtotal getters are the constant/mode-switch
    // form (overrides 0x501d8aba/0x50023bab below), so the port's framePeriod rule answers null (src/fw/facts.mjs
    // VTOTAL_CONSTANT) and no frame period word is placed. As the E118 family does (E120/E122), the lab assumes E143's
    // TFT period word 16683 us (59.94 Hz) for both devices; the period only sets the lab clock's per-line time
    // (period x 1000 / vtotal ns), not menu behaviour.
    frame_period_us: { tft: 16683, evf: 16683 },
    g4set: G4SET_UNCHECKED,
    // lab_pri: the injected home task's priority (src/lab/menu.mjs LAB_PRI). E113's kernel configures 16 priority levels
    // (acre_tsk's max-priority field, read at init = 16) and its firmware tasks span priorities 1..13; the default 60
    // (E143: 128 levels) is rejected with E_PAR (-17). 14 is the lowest priority above all firmware tasks, so every
    // driven firmware task preempts the lab's home task. Measured: taskprobe over E113's booted kernel (1..13 used).
    lab_pri: 14,
    // nav_pri: the priority the nav/home task raises itself to for the nav phase (src/lab/nav.mjs NAV_PRI, chg_pri
    // TSK_SELF). E143's 50 (just above its home task's 60) is above E113's 16-level kernel, so chg_pri(50) returns
    // E_PAR (-17). 14 (= lab_pri) is the valid analogue: the home task keeps its priority through the nav phase, the
    // firmware GUI tasks at 1..13 still preempt to process each posted event, and equal priority keeps the home task's
    // own GUI program from running mid-post. This is the configuration check_nav's pri60 mutant exercises (NAV_PRI = LAB_PRI).
    nav_pri: 14,
    overrides: {
      // The settings DB init (src/lab/menu.mjs SETTINGS_DB_INIT): the cross-build map anchors E143's 0x503c5473 at
      // 0x50173d5c, an unrelated function (it takes a semaphore and reads registry item 60881), which loads no defaults:
      // the indexed getter 0x50202f98 read 0 for settings E120 defaults to 1, 3, 30 (216, 469, 733; X) and the shoot
      // count 0x50210978 divided by their product. E113's init is 0x501d8d19, instruction for instruction E120's
      // 0x5027a993 (check, flash save `call ...,[],48` 0x50203a74 returning at the port's 0x501d8d35, then the chain).
      '0x503c5473': { to: '0x501d8d19', why: 'the settings DB init (SETTINGS_DB_INIT): 0x501d8d19, the instruction-for-instruction twin of E120\'s 0x5027a993; the map\'s 0x50173d5c is an unrelated function' },
      '0x503d72c5': { to: '0x501df23d', why: 'the DB init\'s read of the output device (menu.mjs STORE_PROP_SITES): the return of `clr d2; mov 4014,d0; call 0x50202f98` at 0x501df232, the shape of E120\'s 0x50281416 (return 0x50281421); unplaced by the map while the DB init was misplaced' },
      // OlyTaSp (the RTOS task-spawn primitive, src/lab/rtos.mjs RTOS): the cross-build map leaves E143's 0x5002c5da
      // unanchored (it is in port.json `unmapped`), so the Kernel's hook of it throws. Measured in E113's run-time image:
      // its 18 RTOS primitives sit in one contiguous block and 17 anchor; OlyTaSp is the function bracketed by the two
      // that do — OlyTaSt -> 0x500307df (ends `ret [d2,d3],12` at 0x50030894) and OlyTaWu -> 0x5003090a. The function at
      // 0x50030897 between them is byte-for-byte the OlyTaSt/OlyTaSp sibling shape (`mov d0,d2; clr d3; mov 4096,d0;
      // and; cmp; bne ...` event-flag set, ending `ret [d2,d3],12` at 0x50030907), differing from OlyTaSt only by the
      // task-mode immediate (65537 Start vs 65538 Spawn) — the exact Start/Spawn distinction. So OlyTaSp -> 0x50030897.
      '0x5002c5da': { to: '0x50030897', why: 'OlyTaSp (RTOS task-spawn), unanchored by the map; the function between the anchored OlyTaSt 0x500307df and OlyTaWu 0x5003090a, the OlyTaSt/Spawn sibling shape with task-mode immediate 65538 (kernel hook)' },
      // LEVEL_SLOTS[0]: the H-VECINIT check (src/lab/kernel.mjs:103) reads the 7 IVARs the firmware's VECINIT wrote and
      // requires disasm(VECTOR_PAGE | IVAR[level]) == IRQ.LEVEL_SLOTS[level]. Measured E113's run-time IVARs =
      // [0x20,0x48,0x50,0x58,0x60,0x68,0x70]; with VECTOR_PAGE 0x7d9a0000 and IMAGE_BASE 0x7d991020 those disassemble to
      // [0x5000f000,0x5000f028,0x5000f030,0x5000f038,0x5000f040,0x5000f048,0x5000f050] — byte-for-byte the E143 LEVEL_SLOTS
      // (the 0x5000xxxx kernel region is model-invariant, flash-copied code). Levels 1..6 anchor; only level 0's E143
      // address 0x5000f000 is left unplaced by the cross-build map (A() returns 0xfe00f000). Identity override, as E122's.
      '0x5000f000': { to: '0x5000f000', why: 'LEVEL_SLOTS[0]: E113 IVAR[0]=0x20, VECTOR_PAGE 0x7d9a0000 -> disasm 0x5000f000, the E143 slot address unchanged (kernel region is model-invariant); the map leaves it unplaced (irq)' },
      // LEVEL_HANDLERS[5] and [6]: the kcb[88] check (src/lab/kernel.mjs:107-108) requires disasm(kcb[88][level]) ==
      // IRQ.LEVEL_HANDLERS[level]. E113's kcb[88] table after kernel init reads (disasm notation) a uniform-stride-0x3e run
      // 0x50034a29,0x500349eb,0x500349ad,0x5003496f,0x50034931,0x500348f3,0x500348b5 (levels 0..6). Levels 0..4 anchor; the
      // map leaves E143's level-5 handler 0x5002e68f and level-6 0x5002e64c unplaced (A() -> 0xfe02e68f/0xfe02e64c). The
      // measured E113 values continue the table's exact 0x3e progression: L5 -> 0x500348f3, L6 -> 0x500348b5.
      '0x5002e68f': { to: '0x500348f3', why: 'LEVEL_HANDLERS[5]: E113 kcb[88][5] after kernel init = 0x500348f3 (next in the table\'s 0x3e stride after L4 0x50034931); the map leaves it unplaced (irq)' },
      '0x5002e64c': { to: '0x500348b5', why: 'LEVEL_HANDLERS[6]: E113 kcb[88][6] after kernel init = 0x500348b5 (next in the table\'s 0x3e stride after L5 0x500348f3); the map leaves it unplaced (irq)' },
      // TASK_START (src/lab/kernel.mjs:163, the kernel's first-dispatch task-launch trampoline): the map leaves E143's
      // 0x50011825 unplaced. E143's body at 0x50011825 is a 9-instruction trampoline `call UNLOCK; mov d2,d0; calls (a2);
      // call X,[a2],8; mov -127,d0; call Y; break; mov psw,d0; retf`. E113 block00 has one byte-for-byte match: a fresh
      // function (the previous one ends `rets` at 0x50011a37) at 0x50011a39 running the identical sequence `call ..;
      // mov d2,d0 (88); calls (a2) (f0 f2); call 0x500109b2,[a2],8; mov -127,d0 (80 81); call ..; break (ff); mov psw,d0;
      // retf`. The `calls (a2)` dispatching the task entry in a2 with exinf in d2 is the trampoline's signature. -> 0x50011a39.
      '0x50011825': { to: '0x50011a39', why: 'TASK_START kernel task-launch trampoline, unanchored by the map; the only E113 block00 function matching E143 0x50011825\'s `call UNLOCK; mov d2,d0; calls (a2); call X,[a2],8; mov -127,d0; call Y; break; mov psw,d0; retf` shape, a fresh function after the rets at 0x50011a37 (kernel hook)' },
      // TP_I2C_WRITE / TP_I2C_READ (src/lab/display.mjs, the touch panel's I2C transport the DisplayLab hooks): the map
      // leaves E143's 0x501e4dfd/0x501e4f2a unplaced (A() -> 0xfe1e4dfd/0xfe1e4f2a). The facts.mjs touchI2c finder keys
      // off the trace strings "[TP_I2C] write start"/"read start", which E113 (like the whole E118 family) does not hold
      // (X: string scan of E113's image), so it places nothing; neither E143's nor E120's byte signature matches E113's
      // (its touch driver is a third build), so no signature search finds them. Located by structure instead: E113's touch
      // driver sits around the placed touch_api.open 0x5022b31b, and the bulk-register op 0x5022bcd0 calls two sibling
      // transport functions, 0x5022ba06 and 0x5022bade, both entered with d0=0x48 (the touch controller's I2C slave) and
      // d1=0x14 (reg 0x1c14, the controller-version register). Both are byte-for-byte the E118-family I2C-transport shape,
      // matching E120's verified pair (read 0x502d9bd2, write 0x502d9ca6) instruction-for-instruction: guard the args
      // (==255/==1), `movhu (cfg),d0; mov -1,d1; exth; call bus-helper,[d2,d3,a2],20`, a cd-call, `movhu (cfg2),d0; call
      // ,12`, then store a direction byte to a flag word and `call I2C-op,[d2,d3,a2,a3],52`, then loop the data. The
      // direction byte disambiguates the pair exactly as on E120 (which stores 1 for write, 2 for read to 0x61879769):
      // 0x5022bade does `mov 1,d0; movbu d0,(0x607023f5)` = WRITE, 0x5022ba06 does `mov 2,d0; movbu d0,(0x607023f5)` =
      // READ. The read-before-write ordering and ~0xd8 gap also match E120's (read below write, 0xd4 apart), confirming
      // the family layout. So TP_I2C_WRITE -> 0x5022bade, TP_I2C_READ -> 0x5022ba06.
      '0x501e4dfd': { to: '0x5022bade', why: 'TP_I2C_WRITE (touch I2C write), unplaced by the map and untraced by E113; the E118-family write transport by structure (guard ==255/==1; movhu cfg; call bus-helper [d2,d3,a2]/20; cd-call; call I2C-op [d2,d3,a2,a3]/52), its direction byte `mov 1,d0; movbu d0,(0x607023f5)` = write (E120\'s write 0x502d9ca6 stores 1 likewise), slave 0x48 reg 0x14, read below its read sibling 0x5022ba06 as on E120 (display)' },
      '0x501e4f2a': { to: '0x5022ba06', why: 'TP_I2C_READ (touch I2C read), unplaced by the map and untraced by E113; the E118-family read transport by structure, the sibling 0xd8 below the write 0x5022bade, its direction byte `mov 2,d0; movbu d0,(0x607023f5)` = read (E120\'s read 0x502d9bd2 stores 2 likewise), slave 0x48 reg 0x14 (display)' },
      // DIAL_INIT (the dial module init, src/lab/menu.mjs dial_init / MODELS dial above): the cross-build map
      // leaves E143's 0x5014b7c7 unplaced (A() -> 0xfe14b7c7). Measured in E113's own image: 0x500f9774 is the
      // dial module init, byte-for-byte the E118-family form E120's verified DIAL_INIT 0x5015d3a6 takes --
      // `call X,[d2],8; clr d0; mov d0,(0xa0a5c694); call Y,[a2],8`, build the slot struct on stack, then the
      // `udfu01 12,d0 ... setlb/lne` loop copying the fixed id descriptor table (runtime 0x7dbc0de0) into the
      // dial slot RAM 0xa0a5c67c -- with NO board-select branch and NO table pointer (the single-fixed-table
      // form). Its one caller is the dial-module-init wrapper 0x500f95b2 (`call 0x500fa442; call 0x500f9774,
      // [d2,d3,a2,a3],72; ret`), as E118/E120's one caller is the UI_IN module init. E122's, which selects a
      // table by board, does not carry (menu).
      '0x5014b7c7': { to: '0x500f9774', why: 'the dial init (DIAL_INIT): E113\'s dial module init 0x500f9774, which sets up the dial slots (RAM 0xa0a5c67c) from the fixed id descriptor table at runtime 0x7dbc0de0 with no board select and no table pointer (D) -- byte-for-byte E120\'s verified DIAL_INIT 0x5015d3a6 (table 0x601a8810, slots 0xa1c17b80); its one caller 0x500f95b2 is the dial-module-init wrapper; E122\'s board-selecting form does not carry (menu)' },
      // TICK_INIT (src/lab/display.mjs, the kernel tick timers init H-BOOTTIME runs natively). E143\'s monolithic
      // 0x5003121c (inits channels 138..141 then writes the HW timer block) has no 1:1 place in E113: the E118 family
      // splits the tick init into per-channel functions dispatched by a table, so the cross-build map leaves it
      // unplaced. Measured in E113\'s own image: 0x500373c5 is the CPU0/channel-1 tick init -- it registers a kernel
      // timer object with id/IRQ 58 (`mov 58,d0; call 0x50034a98`, IRQ_base 57 + channel 1) and starts HW timer
      // channel 1 at reload 999 (`mov 999,d0; mov d0,(0x9890002c)`) with enable/start writes to the 0x98900000 block
      // (or 64, or 128), matching the E118-family board note (src/fw/board.mjs: "the tick init the boot calls for CPU 0
      // starts channel 1 at reload 999 on IRQ 58"). Its consecutive sibling 0x50037452 is the channel-2 (IRQ 59) init,
      // as the family starts channels 2/3 from CPUs 1/2\'s own inits. The HLE checks only kernel_ticks [1].
      '0x5003121c': { to: '0x500373c5', why: 'TICK_INIT (kernel tick timers), E143\'s monolithic init split per-channel by the E118 family so unplaced by the map; E113\'s CPU0/channel-1 tick init measured in-image: registers kernel timer id/IRQ 58 (`mov 58,d0; call 0x50034a98`) and starts HW channel 1 at reload 999 (`mov 999,d0; mov d0,(0x9890002c)`) + 0x98900000 enable writes, matching the E118 board note (channel 1, reload 999, IRQ 58); sibling 0x50037452 = channel 2' },
      // HW_TIMER_INIT / TIMER_INIT (src/lab/display.mjs, the two H-BOOTTIME inits the boot runs back-to-back right
      // after the tick init). Measured from E113\'s own boot: the boot-init function at 0x5000031b runs the exact E143
      // idiom `mov strptr,a0; call <print>; call 0x5005bb48,[d2,d3],12; call 0x50052d0e,[d2],8; call <print>`, 1:1 with
      // E143\'s 0x5002cd7b `call 0x500642dd (HW_TIMER_INIT),[d2,d3],12; call 0x50058959 (TIMER_INIT),[d2],8` (same
      // regs/stack, same surrounding debug prints; the same boot-init also calls dpc.init 0x5004c68a, confirming the
      // function). HW_TIMER_INIT 0x5005bb48 walks the family\'s 10-entry HW-timer table (`cmp 10,d3`/`cmp 10,d2`,
      // movhu (2/4/6,a0) per entry), the E118-family hw-timer-init shape from src/fw/board.mjs; the map leaves both
      // E143 addresses unplaced (family restructure), so supplied here.
      '0x500642dd': { to: '0x5005bb48', why: 'HW_TIMER_INIT (hardware timer table init), unplaced by the map (E118 family restructure); E113\'s boot at 0x5000031b calls it `[d2,d3],12` exactly where E143 0x5002cd7b calls 0x500642dd; 0x5005bb48 walks the 10-entry HW-timer table (`cmp 10,d3`/`cmp 10,d2`, movhu (2/4/6,a0)) per the E118 board note' },
      '0x50058959': { to: '0x50052d0e', why: 'TIMER_INIT (software timer init), unplaced by the map; E113\'s boot at 0x50000322 calls it `[d2],8` immediately after HW_TIMER_INIT, exactly where E143 0x5002cd82 calls 0x50058959; soft_tick is null on the E118 family (its soft timers run on a second unit the lab does not model), so the HLE starts no channel to check here' },
      // TFT / EVF vtotal getters (src/lab/display.mjs DEVICE.{tft,evf}.vtotal_fn, the per-device vertical-total the frame
      // period's line time is read from). The cross-build map leaves E143's 0x501d8aba (TFT) and 0x50023bab (EVF) both
      // unplaced (A() -> 0xfe1d8aba/0xfe023bab): E143's 0x50023bab falls in the early shared region, but E113's build is
      // shorter there (that offset is 0xff padding in E113's image), so neither getter sits at its E143 address. Measured
      // in E113's own image, both getters are tiny constant/mode-switch leaf functions `mov <vtotal>,d0; retf`:
      //   TFT 0x50224830 returns the constant 495 -- byte-for-byte identical to E120's verified TFT getter 0x502d06f6
      //   (same 6-entry cluster 495,0,2,0,910 and same 4-store setup 256/65536/16777216/0 -> (a0,4,8,12)); 495 = the TFT
      //   panel's 480 active lines (panels.tft [720,480]) + 15 blanking, matching E143/E120 TFT = 495 exactly.
      //   EVF 0x5021d3d6 returns 625 (mode global 0x606fe520 == 1) or 728 (else) -- the mode-switched form E143's EVF
      //   getter also takes (0x50023bab switches its vtotal 1315/1375/675/657 by frame period) and E137's does (reads
      //   global 0x62316834, 787/900/819); it is the only E113 panel getter that reads a refresh-mode global and returns
      //   an EVF-magnitude total. 625/728 = the EVF panel's 600 active lines (panels.evf [800,600]) + blanking, > the TFT
      //   total as on E143/E120 (EVF 825/1315 > TFT 495). In the zero-filled lab SRAM the global reads 0, so the lab takes
      //   the 728 branch (deterministic). framePeriod answers null for constant/mode-switch getters (src/fw/facts.mjs,
      //   VTOTAL_CONSTANT / E122 note), so no frame period word is placed and frame_period_us supplies the period below.
      '0x501d8aba': { to: '0x50224830', why: 'TFT vtotal getter, unplaced by the map; E113\'s `mov 495,d0; retf` at 0x50224830, byte-for-byte E120\'s verified TFT getter (495,0,2,0,910 cluster + 256/65536/16777216/0 setup); 495 = 480 active lines (panels.tft) + 15 blanking, = E143/E120 TFT (display DEVICE.tft.vtotal_fn)' },
      '0x50023bab': { to: '0x5021d3d6', why: 'EVF vtotal getter, unplaced by the map (E143\'s 0x50023bab offset is 0xff padding in E113\'s shorter early region); E113\'s mode-switched `movbu (0x606fe520),d1; mov 625,d0; cmp 1,d1; mov 728,d0; retf` at 0x5021d3d6 -- the only E113 panel getter reading a refresh-mode global, the form E143 (period-switched 1315/1375/675/657) and E137 (global 0x62316834, 787/900/819) EVF getters take; 625/728 = 600 active lines (panels.evf) + blanking, > TFT 495; lab global=0 -> 728 (display DEVICE.evf.vtotal_fn)' },
      // TOUCH_INIT (src/lab/play.mjs H-TPINIT, the touch-panel driver init the display open runs natively on the E118
      // family, touch_init_early). E143\'s 0x501e3dca (clr d0; movbu d0,(flag); movhu (reg0),d0; movhu (reg1),d1; mov
      // 8,a0; call <slave-8 register>; cmp -1,d0; bne +; errprint; ...) is unplaced by the map. Measured in E113\'s own
      // image: 0x5022b19b is the same function -- entry after the previous ret at 0x5022b198, `clr d0; movbu
      // d0,(0x607023a0); movhu (0x7d9b072e),d0; movhu (0x7d9b0580),d1; exth; exth; mov 8,a0; call 0x50030544,[d2,d3],8;
      // cmp -1,d0; bne 0x5022b1ca; mov strptr,a0; call 0x50005e65 (errprint)`, byte-structural match to E143 0x501e3dca
      // (same clear-flag + two-reg load + slave-8 register call + cmp -1 error path). It sits 0x180 before E113\'s placed
      // TP_OPEN 0x5022b31b (A(0x501e40da)), the touch module\'s own cluster; its flag 0x607023a0 is the module\'s
      // (0x607023a4 = TP_MASK_WORD, stored by the mask setter 0x5022b37e just past TP_OPEN).
      '0x501e3dca': { to: '0x5022b19b', why: 'TOUCH_INIT (touch-panel driver init, H-TPINIT), unplaced by the map; E113\'s 0x5022b19b is the same function (entry after ret at 0x5022b198): `clr d0; movbu d0,(0x607023a0); movhu (0x7d9b072e),d0; movhu (0x7d9b0580),d1; mov 8,a0; call 0x50030544 (slave-8 register); cmp -1,d0; bne; call 0x50005e65 (errprint)`, byte-structural match to E143 0x501e3dca (clear flag + two-reg load + slave-8 register + cmp -1 error path); 0x180 before placed TP_OPEN 0x5022b31b, same touch module' },
      // K-CRT-134D (menu.mjs store_init): the C-runtime flash-window clock read `mov (SCPU_CLOCK),d0; retf`, which the
      // lab hooks (never runs) to read the SCPU counter. It is called once in E143, so it is never paired-twice and the
      // cross-build map leaves it unplaced (port.json unmapped 0x3ffe134d); the hook still needs a real E113 address or
      // refuseUnmapped throws at registration. E113's flash library loads from file offset 0x10497e0 (0x1000 bytes) to
      // runtime 0x47001000 (board.library). Its `mov (0x98e00098),d0; retf` sits at file 0x1049e48 = disasm 0x51049e48
      // (SCPU_CLOCK = 0x98e00000 + 0x98, the E118 family's scpu.clock), window offset 0x668 -> runtime 0x47001668
      // (preceded by the `mov (0x98e00050)` / `mov (0x98e0009c)` sibling window getters, exactly as E143's flash lib).
      // The PORT value is that runtime in the lab's disassembly notation: runtime - IMAGE_BASE(0x7d991020) + 0x50000000
      // = 0x19670648 (A()'s hle.mjs runtime() maps it back to 0x47001668; same scheme as placed memcpy 0x1966ffe0 ->
      // 0x47001000, memset 0x196700ec -> 0x4700110c).
      '0x3ffe134d': { to: '0x19670648', why: 'K-CRT-134D C-runtime flash-window SCPU-clock read (`mov (0x98e00098),d0; retf`), hooked by the lab but unplaced by the map (called once in E143, not paired-twice). E113 flash lib loads file 0x10497e0 -> runtime 0x47001000; this function is at file 0x1049e48 (disasm 0x51049e48), window offset 0x668 -> runtime 0x47001668. PORT value 0x19670648 = 0x47001668 - IMAGE_BASE 0x7d991020 + 0x50000000, so A()/runtime() yields 0x47001668 (same scheme as memcpy 0x1966ffe0->0x47001000)' },
      // CCommon's connect-change pair (menu.mjs B2_OBSERVED), unplaced by the map. E113's CCommon block runs
      // [0x508ad3bd twin][0x508ad50e twin][doHdmiConnectChange, string xref 0x508ad66c][0x508ad6c1][...doOutEvf/doComp
      // ConnectChange 0x508ae3a5/0x508ae439], E120's [ConnectChangePlay 0x50927152][doHdmiConnectChange 0x509273ab]
      // [doHdmiAnother.. 0x50927415][SetConnectState 0x509274fd][..doOutEvf/doComp..]. SetConnectState: 0x508ad6c1 (entry
      // after the ret at 0x508ad6be, `mov d0,d2; mov a0,a3; mov d0,(16,a3); mov d2,(abs)` as E120's), whose five callers
      // are exactly the do*ConnectChange functions, as E120's seven. ConnectChangePlay: E113 has two byte-twins (E120 one;
      // E113 keeps no "ConnectChangePlay()" string); the second, 0x508ad50e, is the one placed directly before
      // doHdmiConnectChange as E120's, and E120's call sites 0x509cfd44/0x509cfdf6 match E113's 0x50944bd7/0x50944c30
      // (80 and 47 of 123 context bytes), both callers of 0x508ad50e. (Lower confidence than the rest: the play
      // session's own "ConnectChangePlay did not run" check is the test.)
      // IPI_POST: E120's 0x5005077b matched by bytes; the function before IPI_STORE 0x500389b7 (entry after the `ret`
      // at 0x50038918), core bound `cmp 3,d1`, ring `div 32`, 24 callers each loading (core d0, func a0, arg a1).
      '0x50035afd': { to: '0x5003891b', why: 'IPI post: byte match to E120 0x5005077b, precedes IPI_STORE, 24 (core, func, arg) callers' },
      // AE interpolation (src/fw/facts.mjs aeInit reads the init, its regions and the table form from it): 119 of
      // E120's first 128 bytes at 0x5056ce21 are E113's at 0x5052d4ba.
      '0x50563138': { to: '0x5052d4ba', why: 'AE interpolation: 119/128 byte match to E120 0x5056ce21' },
      // Batch byte transfer from E120 (same E118 family, fully ported): for each E143 address E120 places and E113's
      // port leaves unplaced, the 128 bytes around E120's place were searched in E113's image (6-byte grams voting for
      // an offset); kept where >= 90 of 128 bytes agree and the runner-up offset is >= 25 bytes worse. 32 of 291.
      '0x50038666': { to: '0x50039404', why: 'E120 0x500512f1 byte transfer: 96/128, runner-up 50' },
      '0x5003e0a1': { to: '0x5003a27a', why: 'E120 0x500520e1 byte transfer: 98/128, runner-up 42' },
      '0x50050539': { to: '0x5004c90c', why: 'E120 0x50060c8f byte transfer: 100/128, runner-up 46' },
      '0x50059fa4': { to: '0x500fddb8', why: 'E120 0x50162143 byte transfer: 128/128, runner-up 33' },
      '0x5005d66f': { to: '0x5005657e', why: 'E120 0x5006b15f byte transfer: 102/128, runner-up 18' },
      '0x5005def6': { to: '0x50056e78', why: 'E120 0x5006ba53 byte transfer: 97/128, runner-up 11' },
      '0x5005f464': { to: '0x50059d56', why: 'E120 0x5006e993 byte transfer: 105/128, runner-up 12' },
      '0x5005f587': { to: '0x50059dff', why: 'E120 0x5006ea3c byte transfer: 114/128, runner-up 9' },
      '0x50064323': { to: '0x5005bb83', why: 'E120 0x50070631 byte transfer: 117/128, runner-up 31' },
      '0x5012b8b7': { to: '0x500f8757', why: 'E120 0x501527b5 byte transfer: 112/128, runner-up 56' },
      '0x5015ff58': { to: '0x501d407f', why: 'E120 0x50275ad1 byte transfer: 91/128, runner-up 55' },
      '0x501a986a': { to: '0x501d6204', why: 'E120 0x502773bf byte transfer: 110/128, runner-up 12' },
      '0x502c10b8': { to: '0x501303d7', why: 'E120 0x5014693a byte transfer: 109/128, runner-up 58' },
      '0x502c122b': { to: '0x50130511', why: 'E120 0x50146af9 byte transfer: 125/128, runner-up 54' },
      '0x502c137b': { to: '0x5013068a', why: 'E120 0x50146c72 byte transfer: 106/128, runner-up 17' },
      '0x502c1aac': { to: '0x50130e52', why: 'E120 0x50147531 byte transfer: 118/128, runner-up 29' },
      '0x502c1b83': { to: '0x50130f15', why: 'E120 0x501475f4 byte transfer: 112/128, runner-up 20' },
      '0x503c2e8d': { to: '0x50180ece', why: 'E120 0x5021c865 byte transfer: 108/128, runner-up 47' },
      '0x503c5537': { to: '0x501d8d35', why: 'E120 0x5027a9af byte transfer: 103/128, runner-up 32' },
      '0x5042992d': { to: '0x504c9304', why: 'E120 0x504ed767 byte transfer: 98/128, runner-up 15' },
      '0x50429935': { to: '0x504c930c', why: 'E120 0x504ed76f byte transfer: 100/128, runner-up 16' },
      '0x5042b50d': { to: '0x504cab62', why: 'E120 0x504eefee byte transfer: 118/128, runner-up 15' },
      '0x5048ee61': { to: '0x5045e75d', why: 'E120 0x50462885 byte transfer: 93/128, runner-up 29' },
      '0x5048f331': { to: '0x5045ebdc', why: 'E120 0x50462d2f byte transfer: 122/128, runner-up 13' },
      '0x5048f39d': { to: '0x5045ecf9', why: 'E120 0x50462e4c byte transfer: 120/128, runner-up 47' },
      '0x50585dc2': { to: '0x50541685', why: 'E120 0x50586981 byte transfer: 106/128, runner-up 22' },
      '0x506ea985': { to: '0x50030409', why: 'E120 0x50048409 byte transfer: 92/128, runner-up 39' },
      '0x50ab222a': { to: '0x5062efe0', why: 'E120 0x50651fe0 byte transfer: 104/128, runner-up 18' },
      '0x50bf2f4e': { to: '0x5071e862', why: 'E120 0x5075e171 byte transfer: 96/128, runner-up 61' },
      '0x51242240': { to: '0x5099689a', why: 'E120 0x50a38b5f byte transfer: 105/128, runner-up 14' },
      '0x51251c53': { to: '0x509a82a9', why: 'E120 0x50a4ead4 byte transfer: 92/128, runner-up 38' },
      // API sender's return (facts.mjs API_SEND_RETURN_E143, fact 'api'): 72/128 to E120 0x502a9076 (runner-up 16); the
      // site follows `call 0x50030409` (OlyQeWr) of a two-word [a3, d2] packet to the queue (a2), as E120's does.
      '0x503eba07': { to: '0x50201b8f', why: 'API sender return after its OlyQeWr call; E120 0x502a9076 byte transfer 72/128, runner-up 16' },
      // read side by side against E120's listing (operand-masked transfer, then the instruction streams compared)
      '0x50abe026': { to: '0x5063704e', why: 'module-9 reader: E120 0x5065ab19, masked transfer 145/192 (runner-up 82), same call/branch stream' },
      '0x5042da58': { to: '0x504cd2c6', why: 'movie time query: E120 0x504f1939, the same 40209/40210 result codes around one null check' },
      '0x500421cd': { to: '0x50042d94', why: 'setting save: E120 0x500562a2, identical instruction stream (movhu (4,a2) / (2,a2) guards)' },
      '0x5104fd44': { to: '0x5087a17b', why: 'getOutputDisplay: E120 0x508ed736, masked transfer 109/192, the same first call and vtable +44 query' },
      '0x50597e82': { to: '0x50150689', why: 'exposure calc: E120 0x505922fd, same frame shape (add -552,sp vs -588) after the same exth/call tail' },
      '0x502a63c2': { to: '0x50112f8e', why: 'lens derive (apertures): E120 0x50125c59, identical stream (three movhu clears, then the 0/1/2/3/4/257/256/4096 switch)' },
      // E113's display HAL has one vsync flag word, 0x7d9b0572 (flag 140): set at 0x50226f9a / 0x50226fac (interrupt
      // and task forms), cleared at 0x50226fc6, waited at 0x50226fdd, the same four-user shape as E120's channel 0 word
      // 0x60040f44 (0x502d3301.., after a `ret [d2,d3,a2,a3]` function, where its channel 1's 0x502d475f follows a
      // `ret [a2],8`). The map gave it to E143's HDMI key and put the EVF key (a later body's channel 0) at 0x7dc365dc,
      // a word no code reads; no second word of that shape was found for channel 1 (the HDMI key keeps the map's place,
      // the same word, which the lab finds first as channel 0)
      '0x600430de': { to: '0x7d9b0572', why: 'the channel 0 (TFT, EVF) vsync flag word; see the comment above' },
      '0x51049ebb': { to: '0x50877267', why: 'CA_MAIN, the camera application main task: E120 0x508eaf45, masked transfer 184/192 (runner-up 48)' },
      '0x510c412a': { to: '0x508ad50e', why: 'CCommon::ConnectChangePlay: the twin directly before doHdmiConnectChange (E120\'s layout), called from the sites E120\'s callers match; unplaced by the map' },
      '0x510c4946': { to: '0x508ad6c1', why: 'CCommon::SetConnectState: the function after doHdmiConnectChange that the do*ConnectChange functions call (five sites), as E120\'s 0x509274fd; unplaced by the map' },
      // The touch task and its id (play.mjs TOUCH_TASK, TOUCH_TASK_ID; H-TPINIT's act_tsk). E113's boot at 0x500f6216 runs
      // `call 0x5022b19b (TOUCH_INIT); movhu (0x7d9b0336),d0; exth d0; call 0x500307df (act_tsk)`, E143's 0x60045cc6 row
      // (`call TOUCH_INIT; movhu (0x60042dcc),d0; exth; call act_tsk`): the id word is the ROM constant 0x7d9b0336 = 105,
      // and the static task table's row for id 105 (0x7d9a9ee4: id 0x69, entry 0x7dbbc207, priority 7, stack 0x400) gives
      // the entry 0x5022b1e7, the function right after TOUCH_INIT's ret (the event-flag wait loop on (0x7d9b0580)). The
      // map placed the id at the neighbour word 0x7d9b033a = 107 (task 0x500f3f10, another module's: X, "kernel would
      // start firmware task entry 0x500f3f10: not modelled") and left the task unplaced.
      '0x60042dcc': { to: '0x7d9b0336', why: 'TOUCH_TASK_ID: the ROM id word E113\'s boot reads for the act_tsk right after TOUCH_INIT (0x500f621d), = 105; the map\'s 0x7d9b033a holds 107, another task\'s id' },
      '0x501e3eac': { to: '0x5022b1e7', why: 'TOUCH_TASK: the static task table\'s entry for id 105 (row 0x7d9a9ee4), the wait loop after TOUCH_INIT\'s ret; unplaced by the map' },
      // The kernel's lock/unlock cluster (E143 0x50017a6b..0x50017e85, main image) lives in E113's relocated flash library:
      // the map places it at the library's FILE position (disasm 0x5104a1e5..0x5104a625, inside the 0x510497e0 + 0x1800
      // window), where the code is never run: it is linked for its SRAM copy at 0x47001000.., so its pc-relative calls into
      // the main kernel (0x5104a399 `call 0x879eff10` = 0x50015710 once relocated) land in empty RAM when run in place (X:
      // the lab's LOCK call slid 140.6M zero bytes from 0xb5370f30 into the image start and re-ran boot on every settle
      // idle). Each value is the SRAM runtime in disassembly notation, file-disasm - 0x379d9800 (the placed memcpy's
      // 0x510497e0 -> 0x1966ffe0 -> 0x47001000).
      '0x50017a6b': { to: '0x196709e5', why: 'kernel lock-cluster address in the relocated flash library: the map gives the library\'s file position 0x5104a1e5 (unrunnable in place); its SRAM runtime is 0x47001a05' },
      '0x50017b6a': { to: '0x19670aea', why: 'kernel lock-cluster address in the relocated flash library: the map gives the library\'s file position 0x5104a2ea (unrunnable in place); its SRAM runtime is 0x47001b0a' },
      '0x50017b86': { to: '0x19670b06', why: 'kernel lock-cluster address in the relocated flash library: the map gives the library\'s file position 0x5104a306 (unrunnable in place); its SRAM runtime is 0x47001b26' },
      '0x50017bdd': { to: '0x19670b5f', why: 'LOCK (kernel.mjs), kernel lock-cluster address in the relocated flash library: the map gives the library\'s file position 0x5104a35f (unrunnable in place); its SRAM runtime is 0x47001b7f' },
      '0x50017c54': { to: '0x19670bde', why: 'UNLOCK (kernel.mjs), kernel lock-cluster address in the relocated flash library: the map gives the library\'s file position 0x5104a3de (unrunnable in place); its SRAM runtime is 0x47001bfe' },
      '0x50017d41': { to: '0x19670cd3', why: 'kernel lock-cluster address in the relocated flash library: the map gives the library\'s file position 0x5104a4d3 (unrunnable in place); its SRAM runtime is 0x47001cf3' },
      '0x50017e83': { to: '0x19670e23', why: 'kernel lock-cluster address in the relocated flash library: the map gives the library\'s file position 0x5104a623 (unrunnable in place); its SRAM runtime is 0x47001e43' },
      '0x50017e85': { to: '0x19670e25', why: 'kernel lock-cluster address in the relocated flash library: the map gives the library\'s file position 0x5104a625 (unrunnable in place); its SRAM runtime is 0x47001e45' },
    },
  },
};
export const codeOf = (m) => 'E' + m.bin.slice(6, 9);
export const romPath = (m) => `unpacked/${codeOf(m)}/${m.bin}.blk00000000.OE.0100.bin`;
export const resPath = (m) => `unpacked/${codeOf(m)}/${m.bin}.${m.res_block}`;
// the NAND extract of a body that gives res_nand (src/fw/labfw.mjs labNand, made at provisioning), else null
export const nandPath = (m) => (m.res_nand ? `unpacked/${codeOf(m)}/${m.bin}.nand.bin` : null);
// the SCPU block of a body that gives scpu_lle, else null
export const scpuPath = (m) => (m.scpu_lle ? `unpacked/${codeOf(m)}/${m.bin}.${m.scpu_lle.block}` : null);
