// Small DOM builders shared by the wizard's steps. Object-valued DS props (options) must be set
// AFTER insertion or they shadow the element's accessors, so they wait in data-pending-options
// until applyPending() runs on a connected tree.

// DS events deliver the value in event.detail as an array — unwrap.
export const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

export const toOptions = (list) => list.map((o) => (typeof o === 'string' ? { value: o, text: o } : o))

export function caption(text, { required = false, hint = '' } = {}) {
  const el = document.createElement('span')
  el.className = 'cr-field__label'
  el.textContent = text
  if (required) {
    const star = document.createElement('span')
    star.className = 'cr-field__required'
    star.textContent = '*'
    el.append(star)
  }
  if (hint) {
    const tip = document.createElement('obs-tooltip')
    tip.setAttribute('placement', 'top')
    tip.textContent = hint
    el.append(tip)
  }
  return el
}

export function field(label, control, opts) {
  const wrap = document.createElement('div')
  wrap.className = 'cr-field'
  wrap.append(caption(label, opts), control)
  return wrap
}

export function select(role, options, { value = '', placeholder = 'Select', multiple = false, disabled = false } = {}) {
  const el = document.createElement('obs-select')
  el.dataset.role = role
  el.setAttribute('block', '')
  el.setAttribute('placeholder', placeholder)
  if (value) el.setAttribute('value', value)
  if (multiple) el.setAttribute('multiple', '')
  if (disabled) el.setAttribute('disabled', '')
  el.dataset.pendingOptions = JSON.stringify(toOptions(options))
  return el
}

// A segmented control IS obs-radio as-button, per the DS.
export function segmented(role, options, value) {
  const el = document.createElement('obs-radio')
  el.dataset.role = role
  el.setAttribute('as-button', '')
  el.setAttribute('value', value)
  el.dataset.pendingOptions = JSON.stringify(toOptions(options))
  return el
}

export function button(role, text, variant = 'default') {
  const el = document.createElement('obs-button')
  el.dataset.role = role
  el.setAttribute('variant', variant)
  el.textContent = text
  return el
}

// Any other object-valued props (obs-table's columns and rows) wait the same way.
export function setLater(el, props) {
  el.dataset.pendingProps = JSON.stringify(props)
  return el
}

export function applyPending(scope) {
  for (const el of scope.querySelectorAll('[data-pending-options]')) {
    el.options = JSON.parse(el.dataset.pendingOptions)
    delete el.dataset.pendingOptions
  }
  for (const el of scope.querySelectorAll('[data-pending-props]')) {
    Object.assign(el, JSON.parse(el.dataset.pendingProps))
    delete el.dataset.pendingProps
  }
}

// obs-select has no error state of its own (G26): mark it and draw the message beneath it.
export function setError(el, message) {
  el.toggleAttribute('data-invalid', Boolean(message))
  const next = el.nextElementSibling
  if (next?.classList.contains('cr-field__error')) next.remove()
  if (!message) return
  if (el.tagName === 'OBS-INPUT') {
    el.setAttribute('error', '')
    el.setAttribute('error-message', message)
    return
  }
  const msg = document.createElement('span')
  msg.className = 'cr-field__error'
  msg.textContent = message
  el.after(msg)
}

export const valueOf = (el) => el?.value ?? el?.getAttribute('value') ?? ''
