describe('Basic JBrowse and Plugin Test', () => {
  it('visits JBrowse and loads successfully', () => {
    cy.visit('/')

    // Wait for JBrowse to load - check for the root container
    cy.get('#root', { timeout: 10000 }).should('exist')

    // Wait for JBrowse app to initialize - look for text that actually appears
    cy.get('body').should('contain.text', 'New Session')
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

      // Wait for JBrowse to load
      cy.get('#root', { timeout: 15000 }).should('exist')

      // Verify the plugin loaded correctly by checking the request succeeded
      cy.request({
        url: 'http://localhost:9000/dist/jbrowse-plugin-image-gallery-plugin.umd.development.js',
        failOnStatusCode: false,
      }).then(response => {
        expect(response.status).to.eq(200)
      })
    })
  })
})
