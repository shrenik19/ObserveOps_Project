// Settings -> My Account -> My Profile: where Settings opens. The avatar with its Change action on
// the left; label-beside-field rows on the right; Reset and Update My Profile pinned to the bottom
// right of the pane. Turning Change Password on reveals the three password fields.
//
// No DS avatar (G55), so the initials disc is a token-styled span. No DS form-item, so labels are
// plain captions in a two-column grid, as the SDP connection form does it.

import './myProfile.css'

export const meta = { pageHeader: { heading: 'Settings', icon: 'settings' } }

export const SEEDED = {
  firstName: 'motadata',
  lastName: 'admin',
  userName: 'admin',
  email: '',
  mobile: '',
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE = /^\+?[0-9][0-9 -]{6,18}$/

export const initials = (first, last) =>
  `${String(first).trim().charAt(0)}${String(last).trim().charAt(0)}`.toUpperCase() || '?'

/** The form's values -> { field: message } for each field that fails. Empty means valid. */
export function validate(v) {
  const errors = {}
  if (!v.firstName.trim()) errors.firstName = 'First Name is required'
  if (!v.lastName.trim()) errors.lastName = 'Last Name is required'
  if (!v.email.trim()) errors.email = 'Email Address is required'
  else if (!EMAIL.test(v.email.trim())) errors.email = 'Enter a valid email address'
  if (v.mobile.trim() && !MOBILE.test(v.mobile.trim())) errors.mobile = 'Enter a valid mobile number'
  if (v.changePassword) {
    if (!v.currentPassword) errors.currentPassword = 'Current Password is required'
    if (!v.newPassword) errors.newPassword = 'New Password is required'
    else if (v.newPassword.length < 8) errors.newPassword = 'Use at least 8 characters'
    if (!v.confirmPassword) errors.confirmPassword = 'Confirm Password is required'
    else if (v.newPassword && v.confirmPassword !== v.newPassword) errors.confirmPassword = 'Passwords do not match'
  }
  return errors
}

const row = (role, label, { required = false, type = 'text', disabled = false } = {}) => `
  <span class="my-profile__label">
    ${label}${required ? '<span class="my-profile__required" aria-hidden="true">*</span>' : ''}
  </span>
  <obs-input data-role="${role}" type="${type}" aria-label="${label}" block${disabled ? ' disabled' : ''}></obs-input>
`

const TEMPLATE = `
  <div class="my-profile-page" data-role="my-profile">
    <main class="app-shell__content my-profile__scroll">
      <div class="my-profile__status" data-role="status"></div>
      <section class="my-profile">
        <div class="my-profile__avatar-col">
          <span class="my-profile__avatar" data-role="avatar" aria-hidden="true"></span>
          <obs-button variant="transparent" data-role="change-avatar">Change</obs-button>
          <input type="file" accept="image/*" data-role="avatar-file" hidden>
        </div>
        <div class="my-profile__grid">
          ${row('firstName', 'First Name', { required: true })}
          ${row('lastName', 'Last Name', { required: true })}
          ${row('userName', 'User Name', { required: true, disabled: true })}
          ${row('email', 'Email Address', { required: true, type: 'email' })}
          ${row('mobile', 'Mobile Number', { type: 'tel' })}
          <span class="my-profile__label">Change Password</span>
          <obs-switch data-role="changePassword" checked-text="ON" unchecked-text="OFF"></obs-switch>
          <div class="my-profile__passwords" data-role="passwords" hidden>
            ${row('currentPassword', 'Current Password', { required: true, type: 'password' })}
            ${row('newPassword', 'New Password', { required: true, type: 'password' })}
            ${row('confirmPassword', 'Confirm Password', { required: true, type: 'password' })}
          </div>
        </div>
      </section>
    </main>
    <footer class="my-profile__actions">
      <obs-button variant="default" data-role="reset">Reset</obs-button>
      <obs-button variant="primary" data-role="update">Update My Profile</obs-button>
    </footer>
  </div>
`

const TEXT_FIELDS = ['firstName', 'lastName', 'userName', 'email', 'mobile']
const PASSWORD_FIELDS = ['currentPassword', 'newPassword', 'confirmPassword']

export function mount(root) {
  root.innerHTML = TEMPLATE
  const $ = (role) => root.querySelector(`[data-role="${role}"]`)
  const valueOf = (role) => String($(role).value ?? $(role).getAttribute('value') ?? '')
  const setValue = (role, value) => {
    $(role).setAttribute('value', value)
    $(role).value = value
  }

  let saved = { ...SEEDED }
  let avatarUrl = null

  const paintAvatar = () => {
    const avatar = $('avatar')
    avatar.replaceChildren()
    if (avatarUrl) {
      const img = document.createElement('img')
      img.src = avatarUrl
      img.alt = ''
      avatar.append(img)
    } else {
      avatar.textContent = initials(saved.firstName, saved.lastName)
    }
  }

  const showStatus = (variant, text) => {
    const banner = document.createElement('obs-banner')
    banner.setAttribute('variant', variant)
    banner.setAttribute('closable', '')
    banner.textContent = text
    $('status').replaceChildren(banner)
  }

  const clearErrors = () => {
    for (const el of root.querySelectorAll('obs-input[error]')) {
      el.removeAttribute('error')
      el.removeAttribute('error-message')
    }
  }

  const setPasswordOpen = (open) => {
    $('changePassword').checked = open
    if (open) $('changePassword').setAttribute('checked', '')
    else $('changePassword').removeAttribute('checked')
    $('passwords').hidden = !open
    if (!open) for (const role of PASSWORD_FIELDS) setValue(role, '')
  }

  const fill = () => {
    for (const role of TEXT_FIELDS) setValue(role, saved[role])
    setPasswordOpen(false)
    clearErrors()
    paintAvatar()
  }

  const read = () => ({
    ...Object.fromEntries([...TEXT_FIELDS, ...PASSWORD_FIELDS].map((role) => [role, valueOf(role)])),
    changePassword: !$('passwords').hidden,
  })

  $('changePassword').addEventListener('change', (event) => {
    const detail = Array.isArray(event.detail) ? event.detail[0] : event.detail
    setPasswordOpen(typeof detail === 'boolean' ? detail : !$('passwords').hidden)
  })

  // An edited field drops its error as soon as it is touched again.
  root.addEventListener('input', (event) => {
    const input = event.target.closest?.('obs-input')
    if (input) {
      input.removeAttribute('error')
      input.removeAttribute('error-message')
    }
  })

  $('change-avatar').addEventListener('click', () => $('avatar-file').click())
  $('avatar-file').addEventListener('change', () => {
    const file = $('avatar-file').files?.[0]
    if (!file) return
    if (avatarUrl) URL.revokeObjectURL(avatarUrl)
    avatarUrl = URL.createObjectURL(file)
    paintAvatar()
  })

  $('reset').addEventListener('click', () => {
    $('status').replaceChildren()
    fill()
  })

  $('update').addEventListener('click', () => {
    clearErrors()
    const values = read()
    const errors = validate(values)
    for (const [role, message] of Object.entries(errors)) {
      $(role).setAttribute('error', '')
      $(role).setAttribute('error-message', message)
    }
    if (Object.keys(errors).length) {
      showStatus('error', 'Fix the highlighted fields to update your profile.')
      return
    }
    saved = Object.fromEntries(TEXT_FIELDS.map((role) => [role, values[role].trim()]))
    const message = values.changePassword ? 'Your profile and password have been updated.' : 'Your profile has been updated.'
    fill()
    showStatus('success', message)
  })

  fill()

  return function unmount() {
    if (avatarUrl) URL.revokeObjectURL(avatarUrl)
  }
}
