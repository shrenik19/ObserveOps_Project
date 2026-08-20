import { describe, it, expect } from 'vitest'
import { renderScheduleSection, timeSlots } from './scheduleSection.js'

const build = () => {
  const s = renderScheduleSection()
  s.upgrade()
  return s
}

const q = (s, role) => s.element.querySelector(`[data-role="${role}"]`)
const freq = (s) => q(s, 'schedule-frequency')
const every = (s) => q(s, 'lama-data-interval')
const unit = (s) => q(s, 'lama-data-interval-unit')
const count = (s) => q(s, 'lama-send-count')
const atTime = (s) => q(s, 'lama-at-time')
const intervalBlock = (s) => q(s, 'interval-block')
const countBlock = (s) => q(s, 'count-block')
const atTimeBlock = (s) => q(s, 'at-time-block')

const chooseMode = (s, mode) => freq(s).dispatchEvent(new CustomEvent('change', { detail: [mode] }))
const typeIn = (el, v) => {
  el.setAttribute('value', v)
  el.dispatchEvent(new CustomEvent('input', { detail: [v] }))
}
const chooseUnit = (s, v) => unit(s).dispatchEvent(new CustomEvent('change', { detail: [v] }))
const chooseTimes = (s, times) => atTime(s).dispatchEvent(new CustomEvent('change', { detail: [times] }))

describe('timeSlots', () => {
  it('covers the whole day in five-minute steps', () => {
    const slots = timeSlots()
    expect(slots).toHaveLength(288)
    expect(slots[0]).toBe('00:00')
    expect(slots[1]).toBe('00:05')
    expect(slots[12]).toBe('01:00')
    expect(slots.at(-1)).toBe('23:55')
  })
})

describe('initial state', () => {
  it('names the two modes', () => {
    expect(freq(build()).options).toEqual([
      { value: 'interval', text: 'At intervals' },
      { value: 'times', text: 'At fixed times' },
    ])
  })

  it('starts on intervals with the count and time fields hidden', () => {
    const s = build()
    expect(freq(s).getAttribute('value')).toBe('interval')
    expect(intervalBlock(s).hidden).toBe(false)
    expect(countBlock(s).hidden).toBe(true)
    expect(atTimeBlock(s).hidden).toBe(true)
  })

  it('defaults to every 5 minutes', () => {
    const s = build()
    expect(every(s).getAttribute('value')).toBe('5')
    expect(s.value()).toEqual({ mode: 'interval', every: 5, unit: 'minutes' })
  })

  it('offers minutes and hours as units', () => {
    expect(unit(build()).options).toEqual([
      { value: 'minutes', text: 'Minute(s)' },
      { value: 'hours', text: 'Hour(s)' },
    ])
  })

  it('offers every five-minute slot as a time', () => {
    const s = build()
    expect(atTime(s).options).toHaveLength(288)
    expect(atTime(s).options[0]).toEqual({ value: '00:00', text: '00:00' })
  })

  it('lets several times be chosen', () => {
    expect(atTime(build()).hasAttribute('multiple')).toBe(true)
  })
})

describe('interval mode', () => {
  it('reports the chosen unit', () => {
    const s = build()
    chooseUnit(s, 'hours')
    typeIn(every(s), '2')

    expect(s.value()).toEqual({ mode: 'interval', every: 2, unit: 'hours' })
  })

  it('fails on an empty, zero, negative or non-numeric interval', () => {
    const s = build()
    for (const bad of ['', '0', '-5', 'soon']) {
      typeIn(every(s), bad)
      expect(s.validate()).toBe(false)
    }
    expect(every(s).hasAttribute('error')).toBe(true)
  })

  it('passes and clears the mark on a valid interval', () => {
    const s = build()
    typeIn(every(s), '')
    s.validate()
    typeIn(every(s), '15')

    expect(s.validate()).toBe(true)
    expect(every(s).hasAttribute('error')).toBe(false)
  })

  it('does not validate the fixed-times fields while on intervals', () => {
    expect(build().validate()).toBe(true)
  })
})

describe('switching to fixed times', () => {
  it('swaps the interval field for count and time', () => {
    const s = build()
    chooseMode(s, 'times')

    expect(intervalBlock(s).hidden).toBe(true)
    expect(countBlock(s).hidden).toBe(false)
    expect(atTimeBlock(s).hidden).toBe(false)
  })

  it('records the mode on the element so layout can follow it', () => {
    const s = build()
    expect(s.element.dataset.mode).toBe('interval')
    chooseMode(s, 'times')
    expect(s.element.dataset.mode).toBe('times')
  })

  it('ignores an unknown mode', () => {
    const s = build()
    chooseMode(s, 'nonsense')
    expect(freq(s).getAttribute('value')).toBe('interval')
  })

  it('keeps what was entered when switching away and back', () => {
    const s = build()
    chooseMode(s, 'times')
    typeIn(count(s), '3')
    chooseTimes(s, ['09:00', '13:00', '17:30'])
    chooseMode(s, 'interval')
    chooseMode(s, 'times')

    expect(s.value()).toEqual({ mode: 'times', count: 3, times: ['09:00', '13:00', '17:30'] })
  })
})

describe('fixed-times validation', () => {
  it('fails and marks both fields when neither is given', () => {
    const s = build()
    chooseMode(s, 'times')

    expect(s.validate()).toBe(false)
    expect(count(s).hasAttribute('error')).toBe(true)
    expect(atTime(s).hasAttribute('error')).toBe(true)
  })

  it('still fails when only the count is given', () => {
    const s = build()
    chooseMode(s, 'times')
    typeIn(count(s), '2')

    expect(s.validate()).toBe(false)
    expect(count(s).hasAttribute('error')).toBe(false)
    expect(atTime(s).hasAttribute('error')).toBe(true)
  })

  it('still fails when only times are chosen', () => {
    const s = build()
    chooseMode(s, 'times')
    chooseTimes(s, ['09:00'])

    expect(s.validate()).toBe(false)
    expect(count(s).hasAttribute('error')).toBe(true)
    expect(atTime(s).hasAttribute('error')).toBe(false)
  })

  it('passes when both are given', () => {
    const s = build()
    chooseMode(s, 'times')
    typeIn(count(s), '2')
    chooseTimes(s, ['09:00', '17:30'])

    expect(s.validate()).toBe(true)
    expect(s.value()).toEqual({ mode: 'times', count: 2, times: ['09:00', '17:30'] })
  })

  it('rejects a zero or negative count', () => {
    const s = build()
    chooseMode(s, 'times')
    chooseTimes(s, ['09:00'])
    typeIn(count(s), '0')

    expect(s.validate()).toBe(false)
  })

  it('clears the times mark as soon as a time is chosen', () => {
    const s = build()
    chooseMode(s, 'times')
    s.validate()
    expect(atTime(s).hasAttribute('error')).toBe(true)

    chooseTimes(s, ['09:00'])
    expect(atTime(s).hasAttribute('error')).toBe(false)
  })

  it('does not validate the interval while on fixed times', () => {
    const s = build()
    typeIn(every(s), '')
    chooseMode(s, 'times')
    typeIn(count(s), '1')
    chooseTimes(s, ['09:00'])

    expect(s.validate()).toBe(true)
  })
})

describe('reset', () => {
  it('returns to intervals at 5 minutes and forgets the times', () => {
    const s = build()
    chooseMode(s, 'times')
    typeIn(count(s), '4')
    chooseTimes(s, ['09:00'])

    s.reset()

    expect(freq(s).getAttribute('value')).toBe('interval')
    expect(intervalBlock(s).hidden).toBe(false)
    expect(countBlock(s).hidden).toBe(true)
    expect(every(s).getAttribute('value')).toBe('5')
    expect(s.value()).toEqual({ mode: 'interval', every: 5, unit: 'minutes' })

    chooseMode(s, 'times')
    expect(s.value()).toEqual({ mode: 'times', count: null, times: [] })
  })
})
