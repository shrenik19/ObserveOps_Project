// The Create Integration Profile drawer. Profile Name, Integration Type and Description are common
// to every type; picking a ticketing type adds that type's selects, Auto Close Ticket, and the ticket
// Subject and Description templates beneath them. ServiceNow adds them at once. ME Service Desk Plus
// reveals them in steps, as the product's Jira does with Project -> Issue Type: first only Request
// Template, then the fields that template carries.

import { TYPE_FIELDS, TEMPLATE_FIELDS, FIELD_OPTIONS, INTEGRATION_TYPES, SDP, DEFAULT_SUBJECT, DEFAULT_DESCRIPTION } from './catalogue.js'

// DS events deliver the value in event.detail as an array — unwrap.
const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)
const valueOf = (el) => el?.value ?? el?.getAttribute('value') ?? ''
const toOptions = (list) => list.map((o) => ({ value: o, text: o }))

/**
 * A consumer-drawn caption. obs-select, obs-switch and obs-radio ship no `label` (G49), and
 * obs-input's own label cannot carry the product's ⓘ, so every field with a hint uses this too.
 */
export function caption(text, { required = false, hint = '' } = {}) {
  const el = document.createElement('span')
  el.className = 'integration-field__label'
  el.textContent = text
  if (required) {
    const star = document.createElement('span')
    star.className = 'integration-field__required'
    star.textContent = '*'
    el.append(star)
  }
  if (hint) {
    // No trigger slot: obs-tooltip draws its own ⓘ.
    const tip = document.createElement('obs-tooltip')
    tip.setAttribute('placement', 'top')
    tip.textContent = hint
    el.append(tip)
  }
  return el
}

export function field(label, control, opts) {
  const wrap = document.createElement('div')
  wrap.className = 'integration-field'
  wrap.append(caption(label, opts), control)
  return wrap
}

function select(role, options, value) {
  const el = document.createElement('obs-select')
  el.dataset.role = role
  el.setAttribute('placeholder', 'Select')
  el.setAttribute('block', '')
  if (value) el.setAttribute('value', value)
  // Object-valued props only after insertion, or they shadow the element's accessors.
  el.dataset.pendingOptions = JSON.stringify(toOptions(options))
  return el
}

function input(role, { placeholder = '', value = '', type } = {}) {
  const el = document.createElement('obs-input')
  el.dataset.role = role
  el.setAttribute('block', '')
  if (placeholder) el.setAttribute('placeholder', placeholder)
  if (value) el.setAttribute('value', value)
  if (type) el.setAttribute('type', type)
  return el
}

export function upgradeSelects(scope) {
  for (const el of scope.querySelectorAll('obs-select[data-pending-options]')) {
    el.options = JSON.parse(el.dataset.pendingOptions)
    delete el.dataset.pendingOptions
  }
}

export function renderProfileDrawer({ isTaken = () => false, onCreate, onClose } = {}) {
  const drawer = document.createElement('obs-drawer')
  drawer.dataset.role = 'integration-profile-drawer'
  drawer.setAttribute('open', '')
  drawer.setAttribute('title', 'Create Integration Profile')
  drawer.setAttribute('width', '40%')

  const body = document.createElement('div')
  body.className = 'integration-drawer'
  drawer.append(body)

  const name = input('profile-name', { placeholder: 'Must be unique' })
  const type = select('integration-type', INTEGRATION_TYPES)
  const description = input('profile-description')

  const head = document.createElement('div')
  head.className = 'integration-drawer__pair'
  head.append(field('Profile Name', name, { required: true }), field('Integration Type', type, { required: true }))

  // Everything the chosen type adds is rebuilt in here, and only in here.
  const typeSection = document.createElement('div')
  typeSection.className = 'integration-drawer__type'
  typeSection.dataset.role = 'type-section'

  const more = document.createElement('p')
  more.className = 'integration-drawer__more'
  more.append('For more information: ')
  const link = document.createElement('obs-link')
  link.setAttribute('external', '')
  link.textContent = 'Integration Profile'
  more.append(link)

  body.append(head, field('Description', description), typeSection, more)

  let currentType = ''
  let currentTemplate = ''
  // SDP only: the Request Template select, and the section its fields are rebuilt in.
  let template = null
  let templateSection = null

  // A select per label, as [left, right] rows.
  function appendPairs(target, rows) {
    for (const pair of rows) {
      const row = document.createElement('div')
      row.className = 'integration-drawer__pair'
      for (const label of pair) row.append(field(label, select(`field-${label}`, FIELD_OPTIONS[label])))
      target.append(row)
    }
  }

  // Auto Close Ticket and the ticket Subject / Description templates, which close every ticketing form.
  function appendTicketFields(target, ticketType) {
    // SDP calls a ticket a request; ServiceNow calls it an incident.
    const noun = ticketType === SDP ? 'Request' : 'Incident'

    const autoClose = document.createElement('obs-switch')
    autoClose.dataset.role = 'auto-close'
    autoClose.setAttribute('checked-text', 'ON')
    autoClose.setAttribute('unchecked-text', 'OFF')

    const subject = input('ticket-subject', { value: DEFAULT_SUBJECT })
    const body = input('ticket-description', { type: 'textarea', value: DEFAULT_DESCRIPTION })

    target.append(
      field('Auto Close Ticket', autoClose, {
        required: ticketType === SDP,
        hint: `Close the ${noun.toLowerCase()} when the alert that raised it clears.`,
      }),
      field(`${noun} Subject`, subject, { required: true, hint: 'Placeholders like $$$object.name$$$ are filled from the alert.' }),
      field(`${noun} Description`, body, { required: true, hint: 'Placeholders like $$$counter$$$ are filled from the alert.' })
    )
  }

  function renderTemplate(next) {
    currentTemplate = next
    if (!templateSection) return
    // A refused Create marked the select; a pick answers it.
    if (next) setError(template)
    templateSection.replaceChildren()
    const labels = TEMPLATE_FIELDS[next]
    if (!labels) return

    // Packed two per row in the template's order, so a field the template drops leaves no hole.
    const rows = []
    for (let i = 0; i < labels.length; i += 2) rows.push(labels.slice(i, i + 2))
    appendPairs(templateSection, rows)
    appendTicketFields(templateSection, SDP)
    if (drawer.isConnected) upgradeSelects(templateSection)
  }

  function renderType(next) {
    currentType = next
    currentTemplate = ''
    template = null
    templateSection = null
    typeSection.replaceChildren()

    if (next === SDP) {
      // Alone on its row, like Jira's Project; the form below waits for a pick.
      template = select('field-Request Template', FIELD_OPTIONS['Request Template'])
      template.addEventListener('change', (event) => renderTemplate(detailValue(event) ?? valueOf(template)))
      const row = document.createElement('div')
      row.className = 'integration-drawer__pair'
      row.append(field('Request Template', template, {
        required: true,
        hint: 'The fields below depend on the template you pick.',
      }))

      templateSection = document.createElement('div')
      templateSection.className = 'integration-drawer__type'
      templateSection.dataset.role = 'template-section'
      typeSection.append(row, templateSection)
    } else {
      const rows = TYPE_FIELDS[next]
      if (!rows) return
      appendPairs(typeSection, rows)
      appendTicketFields(typeSection, next)
    }
    // Rendered after insertion, so the new selects can take their options now.
    if (drawer.isConnected) upgradeSelects(typeSection)
  }

  type.addEventListener('change', (event) => renderType(detailValue(event) ?? valueOf(type)))

  // --- Footer ---------------------------------------------------------------------------------
  const footer = document.createElement('div')
  footer.setAttribute('slot', 'actions')
  footer.className = 'integration-drawer__footer'

  const note = document.createElement('span')
  note.className = 'integration-drawer__note'
  note.append(caption('', { required: true }), ' fields are mandatory')

  const reset = document.createElement('obs-button')
  reset.dataset.role = 'reset'
  reset.setAttribute('variant', 'default')
  reset.textContent = 'Reset'

  const create = document.createElement('obs-button')
  create.dataset.role = 'create'
  create.setAttribute('variant', 'primary')
  create.textContent = 'Create Integration Profile'

  footer.append(note, reset, create)
  drawer.append(footer)

  // obs-input carries its own error state; obs-select has none (G26), so its message is drawn beneath it.
  // `data-invalid` marks either kind, so validate() has one thing to look for.
  const setError = (el, message) => {
    el.toggleAttribute('data-invalid', Boolean(message))
    if (el.tagName === 'OBS-SELECT') {
      el.nextElementSibling?.classList.contains('integration-field__error') && el.nextElementSibling.remove()
      if (message) {
        const msg = document.createElement('span')
        msg.className = 'integration-field__error'
        msg.textContent = message
        el.after(msg)
      }
      return
    }
    if (message) {
      el.setAttribute('error', '')
      el.setAttribute('error-message', message)
    } else {
      el.removeAttribute('error')
      el.removeAttribute('error-message')
    }
  }

  reset.addEventListener('click', () => {
    for (const el of [name, description]) {
      el.value = ''
      el.removeAttribute('value')
      setError(el)
    }
    type.value = ''
    type.removeAttribute('value')
    setError(type)
    renderType('')
  })

  // Returns the draft, or null with every offending field marked at once.
  drawer.validate = () => {
    const n = String(valueOf(name)).trim()
    const t = currentType || valueOf(type)
    const nameError = !n ? 'Profile Name is required' : isTaken(n) ? 'A profile with this name already exists' : ''
    setError(name, nameError)
    setError(type, t ? '' : 'Select an Integration Type')
    const tpl = currentTemplate || (template ? valueOf(template) : '')
    if (template) setError(template, tpl ? '' : 'Select a Request Template')
    for (const role of ['ticket-subject', 'ticket-description']) {
      const el = typeSection.querySelector(`[data-role="${role}"]`)
      if (el) setError(el, String(valueOf(el)).trim() ? '' : 'This field is required')
    }
    if (drawer.querySelector('[data-invalid]')) return null
    const draft = { name: n, type: t, description: String(valueOf(description)) }
    if (template) draft.template = tpl
    return draft
  }

  create.addEventListener('click', () => {
    const draft = drawer.validate()
    if (draft) onCreate?.(draft)
  })

  // G51: obs-drawer also fires `close` when it is removed from the DOM — act only on a real close.
  drawer.addEventListener('close', () => { if (drawer.isConnected) onClose?.() })

  drawer.upgrade = () => upgradeSelects(drawer)
  drawer.selectType = renderType
  drawer.selectTemplate = renderTemplate
  return drawer
}
