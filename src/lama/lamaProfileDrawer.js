// The Create LAMA Profile drawer.
//
// The sixteen product fields below are reproduced for LAYOUT AND CONTEXT ONLY and are deliberately
// inert — no validation, no data, placeholder options in the selects. They exist so the new Custom
// Fields section can be judged where it will actually live. The live part of this drawer is
// customFieldsSection.js.

import { renderCustomFieldsSection } from './customFieldsSection.js'
import { renderScheduleSection } from './scheduleSection.js'
import { augmentAddableSelect } from './augmentAddableSelect.js'

const SELECT_OPTIONS = {
  exchange: ['NSE', 'BSE', 'MCX', 'NCDEX'],
  application: ['Trading', 'Risk Management', 'Surveillance', 'Clearing'],
  // Defaults only — the field accepts a custom endpoint too, via the select's inline add.
  tradingApi: [
    '/metrics/application',
    '/metrics/hardware',
    '/metrics/database',
    '/metrics/network',
    '/metrics/cap-utilization',
  ],
  monitoringHours: ['Market Hours', 'Extended Hours', '24x7'],
  groups: ['Colo Servers', 'Core Network', 'Trading Gateways', 'Datastore'],
}

function input({ role, label, placeholder = '', type, suffix, suffixIcon, prefixIcon, value }) {
  const el = document.createElement('obs-input')
  el.setAttribute('data-role', role)
  el.setAttribute('label', label)
  el.setAttribute('block', '')
  if (placeholder) el.setAttribute('placeholder', placeholder)
  if (type) el.setAttribute('type', type)
  if (suffix) el.setAttribute('suffix', suffix)
  if (suffixIcon) el.setAttribute('suffix-icon', suffixIcon)
  if (prefixIcon) el.setAttribute('prefix-icon', prefixIcon)
  if (value !== undefined) el.setAttribute('value', value)
  return el
}

/**
 * obs-select has NO `label` attribute — obs-input does, obs-select and obs-radio do not (see
 * docs/DS-GAPS.md, G26). Setting one renders nothing, so every select is wrapped with a label the
 * consumer draws. Object-valued props are still assigned only AFTER insertion.
 */
function select({ role, label, options, addable = false, placeholder = 'Select' }) {
  const wrap = document.createElement('div')
  wrap.className = 'lama-drawer__field'

  const caption = document.createElement('span')
  caption.className = 'lama-drawer__field-label'
  caption.textContent = label
  wrap.appendChild(caption)

  const el = document.createElement('obs-select')
  el.setAttribute('data-role', role)
  el.setAttribute('placeholder', placeholder)
  el.setAttribute('block', '')
  if (addable) {
    // The DS's own inline-add: it forces the search row open so the "+" is reachable, which is
    // where the add affordance lives (elements@0.1.19).
    el.setAttribute('can-user-add-options', '')
    // The component prefixes "Add " itself, so add-label="Add" renders "Add Add".
    el.setAttribute('add-label', 'endpoint')
  }
  el.dataset.pendingOptions = JSON.stringify(options)
  wrap.appendChild(el)

  return wrap
}

function pair(...children) {
  const row = document.createElement('div')
  row.className = 'lama-drawer__pair'
  row.append(...children)
  return row
}

function button({ role, label, variant }) {
  const el = document.createElement('obs-button')
  el.setAttribute('data-role', role)
  el.setAttribute('variant', variant)
  el.textContent = label
  return el
}

export function renderLamaProfileDrawer({ onCancel, onCreate } = {}) {
  const drawer = document.createElement('obs-drawer')
  drawer.setAttribute('data-role', 'lama-profile-drawer')
  drawer.setAttribute('open', '')
  drawer.setAttribute('title', 'Create LAMA Profile')
  drawer.setAttribute('width', '50%')

  const body = document.createElement('div')
  body.className = 'lama-drawer'
  drawer.appendChild(body)

  // Built before the layout below, because it is placed inline among the inert fields.
  const schedule = renderScheduleSection()

  // --- The product fields ------------------------------------------------
  // All inert except the schedule, which sits where Data Interval used to.
  body.append(
    pair(
      input({ role: 'lama-name', label: 'Name', placeholder: 'Write name' }),
      input({ role: 'lama-description', label: 'Description', placeholder: 'Write description' })
    ),
    pair(
      select({ role: 'lama-exchange', label: 'Exchange', options: SELECT_OPTIONS.exchange }),
      select({ role: 'lama-application', label: 'Application', options: SELECT_OPTIONS.application })
    ),
    pair(
      input({ role: 'lama-client-auth-api', label: 'Client Authentication API', placeholder: 'Write API endpoint' }),
      select({
        role: 'lama-trading-api',
        label: 'Trading API',
        options: SELECT_OPTIONS.tradingApi,
        addable: true,
        placeholder: 'Select or add an endpoint',
      })
    ),
    pair(
      input({ role: 'lama-member-id', label: 'Member ID', placeholder: 'Write member ID' }),
      input({ role: 'lama-login-id', label: 'Login ID', placeholder: 'Write login ID' })
    ),
    pair(
      input({ role: 'lama-password', label: 'Password', type: 'password', suffixIcon: 'eye' }),
      input({ role: 'lama-secret-key', label: 'Secret Key', type: 'password', suffixIcon: 'eye' })
    ),
    pair(
      schedule.element,
      select({ role: 'lama-monitoring-hours', label: 'Monitoring Hours', options: SELECT_OPTIONS.monitoringHours })
    )
  )

  // Scope By — a segmented control IS obs-radio with as-button, per the DS.
  const scopeWrap = document.createElement('div')
  scopeWrap.className = 'lama-drawer__scope'
  const scopeLabel = document.createElement('span')
  scopeLabel.className = 'lama-drawer__field-label'
  scopeLabel.textContent = 'Scope By'
  const scope = document.createElement('obs-radio')
  scope.setAttribute('data-role', 'lama-scope-by')
  scope.setAttribute('as-button', '')
  scope.setAttribute('value', 'group')
  scopeWrap.append(scopeLabel, scope)
  body.appendChild(scopeWrap)

  const groups = select({ role: 'lama-groups', label: 'Select Groups', options: SELECT_OPTIONS.groups })
  body.appendChild(groups)

  // Special Days — rendered as the product's boxed date + remark + add row. Inert.
  const specialDays = document.createElement('div')
  specialDays.className = 'lama-drawer__special-days'
  specialDays.setAttribute('data-role', 'lama-special-days')
  const specialTitle = document.createElement('span')
  specialTitle.className = 'lama-drawer__field-label'
  specialTitle.textContent = 'Special Days'
  specialDays.appendChild(specialTitle)
  const specialRow = document.createElement('div')
  specialRow.className = 'lama-drawer__pair'
  specialRow.append(
    input({ role: 'lama-special-date', label: '', placeholder: 'Select Date', suffixIcon: 'calendar' }),
    input({ role: 'lama-special-remark', label: '', placeholder: 'Remark' })
  )
  specialDays.appendChild(specialRow)
  body.appendChild(specialDays)

  body.appendChild(input({ role: 'lama-failover-email', label: 'Failover Email', placeholder: 'Write email address' }))

  // --- The live part ----------------------------------------------------
  const customFields = renderCustomFieldsSection()
  body.appendChild(customFields.element)

  const more = document.createElement('p')
  more.className = 'lama-drawer__more'
  more.textContent = 'For more information: LAMA Framework'
  body.appendChild(more)

  // --- Footer -----------------------------------------------------------
  const footer = document.createElement('div')
  footer.setAttribute('slot', 'actions')
  footer.className = 'lama-drawer__footer'

  const note = document.createElement('span')
  note.className = 'lama-drawer__mandatory-note'
  note.textContent = '* fields are mandatory'
  footer.appendChild(note)

  const actions = document.createElement('div')
  actions.className = 'lama-drawer__actions'

  const reset = button({ role: 'lama-reset', label: 'Reset', variant: 'default' })
  reset.addEventListener('click', () => {
    customFields.reset()
    schedule.reset()
  })
  actions.appendChild(reset)

  const create = button({ role: 'lama-create', label: 'Create LAMA Profile', variant: 'primary' })
  create.addEventListener('click', () => {
    // Only the Custom Fields section validates — the rest of the drawer is inert by design.
    // Both live sections must pass; validate BOTH so every offending field is marked at once
    // rather than one per click.
    const scheduleOk = schedule.validate()
    const fieldsOk = customFields.validate()
    if (!scheduleOk || !fieldsOk) return
    onCreate?.({ schedule: schedule.value(), customFields: customFields.value() })
  })
  actions.appendChild(create)

  footer.appendChild(actions)
  drawer.appendChild(footer)

  drawer.addEventListener('close', () => onCancel?.())

  // Object-valued props only after the element is in the document, or they shadow the accessors.
  drawer.upgradeSelects = () => {
    for (const el of drawer.querySelectorAll('obs-select[data-pending-options]')) {
      el.options = JSON.parse(el.dataset.pendingOptions).map((text) => ({ value: text, text }))
      delete el.dataset.pendingOptions
    }
    scope.options = [
      { value: 'group', text: 'Group' },
      { value: 'tag', text: 'Tag' },
    ]

    // Make the DS's inert "+" actually add the typed endpoint. Remove this line and the import
    // when obs-select reports its own additions (G27).
    augmentAddableSelect({ select: drawer.querySelector('[data-role="lama-trading-api"]') })
  }

  return { element: drawer, customFields }
}
