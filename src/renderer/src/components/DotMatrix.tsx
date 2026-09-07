import { memo } from 'react'

/** 5×7 bitmap glyphs (1 = lit dot). */
const FONT: Record<string, string[]> = {
  '%': ['11001', '11001', '00010', '00100', '01000', '10011', '10011'],
  '0': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['01110', '10001', '00001', '00110', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110']
}

function Digit({ glyph }: { glyph: string[] }) {
  return (
    <span className="dm-digit" aria-hidden>
      {glyph.map((row, r) => (
        <span className="dm-row" key={r}>
          {row.split('').map((cell, c) => (
            <span key={c} className={`dm-dot${cell === '1' ? ' is-on' : ''}`} />
          ))}
        </span>
      ))}
    </span>
  )
}

/**
 * Dot-matrix number. Keyed per position+glyph so only changed digits remount and
 * replay the "pop" transition; unchanged digits stay static.
 */
export const DotMatrix = memo(function DotMatrix({ value }: { value: string }) {
  return (
    <span className="dotmatrix" aria-label={value}>
      {value.split('').map((ch, i) => {
        const glyph = FONT[ch]
        return glyph ? <Digit key={`${i}-${ch}`} glyph={glyph} /> : null
      })}
    </span>
  )
})
