import { href } from './router.js'

// The card grid, used by the Overview and by a module index. Markup and class names are the ones
// the landing page already used, so landing.css transfers unchanged.
export const cardListHTML = (entries) => `
  <div class="landing__cards">
    ${entries
      .map(
        ({ module, screen }) => `
      <a class="card" href="${href(module.key, screen.key)}">
        <obs-icon name="${module.icon}" size="22"></obs-icon>
        <h2 class="card__title">${screen.label}</h2>
        <p class="card__text">${screen.description}</p>
        <span class="card__go">Open screen</span>
      </a>`,
      )
      .join('')}
  </div>
`
