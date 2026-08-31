// obs-page-header also exposes subtitle / count / meta / accent / back and five slots. A screen
// that needs any of those writes its own element; this helper only covers the common case, which
// is why the page header belongs to the screen rather than to shell metadata.
export const pageHeaderHTML = ({ heading, icon }) => `
  <obs-page-header heading="${heading}">
    <obs-icon slot="before" name="${icon}" size="20"></obs-icon>
  </obs-page-header>
`
