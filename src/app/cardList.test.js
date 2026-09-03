import { describe, it, expect } from 'vitest'
import { cardListHTML } from './cardList.js'

const entries = [
  {
    module: { key: 'reports', label: 'Reports', icon: 'report' },
    screen: { key: 'categories', label: 'Report module', description: 'Visibility and sharing.' },
  },
  {
    module: { key: 'settings', label: 'Settings', icon: 'settings' },
    screen: { key: 'lama', label: 'LAMA integration', description: 'The profile drawer.' },
  },
]

const render = (html) => {
  const host = document.createElement('div')
  host.innerHTML = html
  return host
}

describe('cardListHTML', () => {
  it('renders one card per entry', () => {
    expect(render(cardListHTML(entries)).querySelectorAll('.card')).toHaveLength(2)
  })

  it('links each card at its route', () => {
    const hrefs = [...render(cardListHTML(entries)).querySelectorAll('.card')].map((a) =>
      a.getAttribute('href'),
    )
    expect(hrefs).toEqual(['#/reports/categories', '#/settings/lama'])
  })

  it('shows the screen label and description', () => {
    const first = render(cardListHTML(entries)).querySelector('.card')
    expect(first.querySelector('.card__title').textContent).toBe('Report module')
    expect(first.querySelector('.card__text').textContent).toBe('Visibility and sharing.')
  })

  it('takes the icon from the module', () => {
    const icon = render(cardListHTML(entries)).querySelector('.card obs-icon')
    expect(icon.getAttribute('name')).toBe('report')
  })

  it('renders an empty grid for no entries', () => {
    expect(render(cardListHTML([])).querySelectorAll('.card')).toHaveLength(0)
  })
})
