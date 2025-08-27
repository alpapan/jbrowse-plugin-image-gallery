describe('Basic JBrowse and Plugin Test', () => {
  it('visits JBrowse and loads successfully', () => {
    cy.visit('/')

    // The splash screen successfully loads
    cy.contains('Start a new session')
  })

  it('can load JBrowse with ImageGallery plugin configuration', () => {
    cy.fixture('hello_view.json').then(sessionData => {
      cy.writeFile(
        '.jbrowse/hello_view.json',
        JSON.stringify(sessionData, null, 2),
      )
      cy.visit('/?config=hello_view.json')

      // Verify JBrowse loads with the plugin configuration
      cy.get('body').should('be.visible')

      // Basic check that the application loaded
      cy.get('[data-testid="jbrowse-app"]', { timeout: 15000 }).should('exist')
    })
  })
})
