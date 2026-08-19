import { describe, it, expect } from 'vitest'
import { renderScheduleSection } from './scheduleSection.js'

const build = () => renderScheduleSection()

const freq = (s) => s.element.querySelector('[data-role="schedule-frequency"]')
const intervalBlock = (s) => s.element.querySelector('[data-role="interval-block"]')
const timesBlock = (s) => s.element.querySelector('[data-role="times-block"]')
const minutes = (s) => s.element.querySelector('[data-role="lama-data-interval"]')
const timeRows = (s) => [...s.element.querySelectorAll('[data-role="send-at-row"]')]
const picker = (row) => row.querySelector('[data-role="send-at-time"]')
const addTime = (s) => s.element.querySelector('[data-repeater="send-at"][data-role="repeater-add"]')
const removeTimes = (s) => [...s.element.querySelectorAll('[data-repeater="send-at"][data-role="repeater-remove"]')]

const chooseMode = (s, mode) => freq(s).dispatchEvent(new CustomEvent('change', { detail: [mode] }))
const typeMinutes = (s, v) => {
  minutes(s).setAttribute('value', v)
  minutes(s).dispatchEvent(new CustomEvent('input', { detail: [v] }))
}
/** obs-date-time-picker reports { time } wrapped in an array — established by rendering it. */
const pickTime = (row, time) => picker(row).dispatchEvent(new CustomEvent('change', { detail: [{ time }] }))
const click = (el) => el.dispatchEvent(new Event('click', { bubbles: true }))

describe('renderScheduleSection — initial state', () => {
  it('offers the two frequency modes', () => {
    const s = build()
    expect(freq(s).options).toEqual([
      { value: 'interval', text: 'Every' },
      { value: 'times', text: 'At fixed times' },
    ])
  })

  it('starts in interval mode, preserving the existing behaviour', () => {
    const s = build()
    expect(freq(s).getAttribute('value')).toBe('interval')
    expect(intervalBlock(s).hidden).toBe(false)
    expect(timesBlock(s).hidden).toBe(true)
  })

  it('defaults the interval to 5 minutes with the unit shown', () => {
    const s = build()
    expect(minutes(s).getAttribute('value')).toBe('5')
    expect(minutes(s).getAttribute('suffix')).toBe('Minute(s)')
  })

  it('reports the interval by default', () => {
    expect(build().value()).toEqual({ mode: 'interval', minutes: 5 })
  })
})

describe('switching modes', () => {
  it('shows the times list and hides the interval', () => {
    const s = build()
    chooseMode(s, 'times')

    expect(timesBlock(s).hidden).toBe(false)
    expect(intervalBlock(s).hidden).toBe(true)
  })

  it('creates one empty time row on first switch', () => {
    const s = build()
    chooseMode(s, 'times')
    expect(timeRows(s)).toHaveLength(1)
  })

  it('does not add another row when switching back and forth', () => {
    const s = build()
    chooseMode(s, 'times')
    chooseMode(s, 'interval')
    chooseMode(s, 'times')

    expect(timeRows(s)).toHaveLength(1)
  })

  it('keeps chosen times when switching away and back', () => {
    const s = build()
    chooseMode(s, 'times')
    pickTime(timeRows(s)[0], '09:30 AM')
    chooseMode(s, 'interval')
    chooseMode(s, 'times')

    expect(s.value()).toEqual({ mode: 'times', times: ['09:30 AM'] })
  })

  it('ignores an unknown mode', () => {
    const s = build()
    chooseMode(s, 'nonsense')
    expect(freq(s).getAttribute('value')).toBe('interval')
  })
})

describe('the times repeater', () => {
  it('shows add only while there is one row', () => {
    const s = build()
    chooseMode(s, 'times')

    expect(addTime(s)).not.toBeNull()
    expect(removeTimes(s)).toHaveLength(0)
  })

  it('shows remove on every row and add on the last once there are two', () => {
    const s = build()
    chooseMode(s, 'times')
    click(addTime(s))

    expect(timeRows(s)).toHaveLength(2)
    expect(removeTimes(s)).toHaveLength(2)
  })

  it('returns to add-only when removed back to one', () => {
    const s = build()
    chooseMode(s, 'times')
    click(addTime(s))
    click(removeTimes(s)[0])

    expect(timeRows(s)).toHaveLength(1)
    expect(removeTimes(s)).toHaveLength(0)
  })

  it('reports several times in order', () => {
    const s = build()
    chooseMode(s, 'times')
    pickTime(timeRows(s)[0], '09:30 AM')
    click(addTime(s))
    pickTime(timeRows(s)[1], '06:00 PM')

    expect(s.value()).toEqual({ mode: 'times', times: ['09:30 AM', '06:00 PM'] })
  })

  it('omits rows where no time was chosen', () => {
    const s = build()
    chooseMode(s, 'times')
    pickTime(timeRows(s)[0], '09:30 AM')
    click(addTime(s))

    expect(s.value()).toEqual({ mode: 'times', times: ['09:30 AM'] })
  })

  it('drops a duplicate time', () => {
    const s = build()
    chooseMode(s, 'times')
    pickTime(timeRows(s)[0], '09:30 AM')
    click(addTime(s))
    pickTime(timeRows(s)[1], '09:30 AM')

    expect(s.value()).toEqual({ mode: 'times', times: ['09:30 AM'] })
  })
})

describe('validate — interval mode', () => {
  it('passes on the default', () => {
    expect(build().validate()).toBe(true)
  })

  it('fails and marks an empty interval', () => {
    const s = build()
    typeMinutes(s, '')

    expect(s.validate()).toBe(false)
    expect(minutes(s).hasAttribute('error')).toBe(true)
  })

  it('fails on zero or a negative interval', () => {
    const s = build()
    typeMinutes(s, '0')
    expect(s.validate()).toBe(false)

    typeMinutes(s, '-5')
    expect(s.validate()).toBe(false)
  })

  it('fails on a non-numeric interval', () => {
    const s = build()
    typeMinutes(s, 'soon')
    expect(s.validate()).toBe(false)
  })

  it('passes and clears the mark once a valid interval is given', () => {
    const s = build()
    typeMinutes(s, '')
    s.validate()
    typeMinutes(s, '15')

    expect(s.validate()).toBe(true)
    expect(minutes(s).hasAttribute('error')).toBe(false)
    expect(s.value()).toEqual({ mode: 'interval', minutes: 15 })
  })

  it('does not validate the times list while in interval mode', () => {
    const s = build()
    chooseMode(s, 'times')
    chooseMode(s, 'interval')

    expect(s.validate()).toBe(true)
  })
})

describe('validate — times mode', () => {
  it('fails when no time has been chosen', () => {
    const s = build()
    chooseMode(s, 'times')

    expect(s.validate()).toBe(false)
    expect(timesBlock(s).querySelector('[data-role="times-error"]').hidden).toBe(false)
  })

  it('passes once one time is chosen', () => {
    const s = build()
    chooseMode(s, 'times')
    pickTime(timeRows(s)[0], '09:30 AM')

    expect(s.validate()).toBe(true)
    expect(timesBlock(s).querySelector('[data-role="times-error"]').hidden).toBe(true)
  })

  it('does not validate the interval while in times mode', () => {
    const s = build()
    typeMinutes(s, '')
    chooseMode(s, 'times')
    pickTime(timeRows(s)[0], '09:30 AM')

    expect(s.validate()).toBe(true)
  })
})

describe('reset', () => {
  it('returns to interval mode at 5 minutes', () => {
    const s = build()
    chooseMode(s, 'times')
    pickTime(timeRows(s)[0], '09:30 AM')
    click(addTime(s))

    s.reset()

    expect(freq(s).getAttribute('value')).toBe('interval')
    expect(intervalBlock(s).hidden).toBe(false)
    expect(timesBlock(s).hidden).toBe(true)
    expect(minutes(s).getAttribute('value')).toBe('5')
    expect(s.value()).toEqual({ mode: 'interval', minutes: 5 })
  })
})
